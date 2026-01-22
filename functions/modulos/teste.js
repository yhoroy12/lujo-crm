// ==================== TRANSAÇÕES FIRESTORE - ATENDIMENTO.JS ====================
import { runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
/* =========================
CONFIGURAÇÃO GLOBAL
========================= */

const TRANSACTION_CONFIG = {
    maxAttempts: 3,
    retryDelay: 300, // ms
    timeoutMs: 5000
};
/* =========================
UTILITÁRIOS DE TRANSAÇÃO
========================= */
/**

Executa uma transação com retry automático
@param {Function} transactionFn - Função da transação
@param {Object} options - Opções de configuração
@returns {Promise<any>}
*/
async function executeTransaction(transactionFn, options = {}) {
    const config = { ...TRANSACTION_CONFIG, ...options };
    let lastError;
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
            console.log(`🔄 Tentativa ${attempt}/${config.maxAttempts}`);
            const result = await Promise.race([
                transactionFn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Transaction timeout')), config.timeoutMs)
                )
            ]);

            console.log('✅ Transação concluída com sucesso');
            return result;

        } catch (error) {
            lastError = error;
            console.warn(`⚠️ Tentativa ${attempt} falhou:`, error.message);

            // Se for o último attempt, não tenta novamente
            if (attempt === config.maxAttempts) break;

            // Aguarda antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
    }
    throw new Error(`Transação falhou após ${config.maxAttempts} tentativas: ${lastError.message}`);
}

/* =========================
PUXAR E-MAIL (TRANSACTION)
========================= */
/**

Puxa o próximo e-mail da fila usando transação atômica
Previne race conditions entre múltiplos operadores
*/
async function puxarProximoEmailReal() {
    const { db, fStore, auth } = window.FirebaseApp;
    const currentUser = auth.currentUser;
    if (!currentUser) {
        showToast("Erro: Usuário não autenticado.", "error");
        return;
    }
    const operadorUID = currentUser.uid;
    const agora = new Date();
    try {
        // 1. Buscar candidatos (fora da transação para melhor performance)
        const q = fStore.query(
            fStore.collection(db, "atend_emails_fila"),
            fStore.where("status", "==", "novo"),
            fStore.orderBy("metadata_recebido_em", "asc"),
            fStore.limit(5) // Busca 5 candidatos para aumentar chances
        );
        const querySnapshot = await fStore.getDocs(q);

        if (querySnapshot.empty) {
            showToast("Nenhum e-mail disponível na fila.", "info");
            return;
        }

        // 2. Executar transação para o primeiro e-mail válido
        let emailAtribuido = null;

        for (const docCandidate of querySnapshot.docs) {
            try {
                emailAtribuido = await executeTransaction(async () => {
                    return await runTransaction(db, async (transaction) => {
                        const docRef = fStore.doc(db, "atend_emails_fila", docCandidate.id);
                        const freshDoc = await transaction.get(docRef);

                        // VALIDAÇÃO CRÍTICA: Verificar se ainda está disponível
                        if (!freshDoc.exists()) {
                            throw new Error('EMAIL_NAO_EXISTE');
                        }

                        const dados = freshDoc.data();

                        // VERIFICAÇÃO DE RACE CONDITION
                        if (dados.status !== "novo") {
                            throw new Error('EMAIL_JA_ATRIBUIDO');
                        }

                        if (dados.atribuido_para_uid && dados.atribuido_para_uid !== operadorUID) {
                            throw new Error('EMAIL_JA_ATRIBUIDO');
                        }

                        // CÁLCULO DE TRACKING
                        const eTriagemInicial = !dados.tracking_marcos?.triagem_inicio;
                        const eSetorFinal = dados.grupo !== "triagem";
                        const tempoRetencaoMs = dados.puxado_em
                            ? agora.getTime() - dados.puxado_em.toDate().getTime()
                            : 0;

                        // EVENTO DE HISTÓRICO
                        const eventoPosse = {
                            timestamp: agora,
                            acao: "puxou_fila",
                            operador_uid: operadorUID,
                            setor: dados.grupo || "triagem"
                        };

                        // PAYLOAD DE ATUALIZAÇÃO
                        const updates = {
                            status: "em_atendimento",
                            atribuido_para_uid: operadorUID,
                            puxado_em: agora,
                            historico_custodia: fStore.arrayUnion(eventoPosse),
                            versao_documento: (dados.versao_documento || 0) + 1 // Controle de versão
                        };

                        // MARCOS DE TRACKING
                        if (eTriagemInicial) {
                            updates["tracking_marcos.triagem_inicio"] = agora;
                        } else if (eSetorFinal && !dados.tracking_marcos?.setor_recebido_em) {
                            updates["tracking_marcos.setor_recebido_em"] = agora;
                        }

                        // MOVIMENTAÇÃO ATÔMICA: FILA → ATRIBUÍDO
                        const novoDocRef = fStore.doc(db, "atend_emails_atribuido", docCandidate.id);
                        const dadosCompletos = { ...dados, ...updates };

                        transaction.set(novoDocRef, dadosCompletos);
                        transaction.delete(docRef);

                        console.log('✅ E-mail atribuído com sucesso via transação:', docCandidate.id);

                        return {
                            id: docCandidate.id,
                            dados: dadosCompletos
                        };
                    });
                }, {
                    maxAttempts: 2, // Menos tentativas por candidato
                    retryDelay: 200
                });

                // Se chegou aqui, conseguiu atribuir
                break;

            } catch (error) {
                // Se falhou com este candidato, tenta o próximo
                console.warn(`⚠️ Candidato ${docCandidate.id} não disponível:`, error.message);
                continue;
            }
        }

        // 3. RESULTADO DA OPERAÇÃO
        if (!emailAtribuido) {
            showToast("Todos os e-mails foram atribuídos a outros operadores. Tente novamente.", "warning");
            return;
        }

        // 4. ATUALIZAÇÃO DA UI
        window.currentEmailId = emailAtribuido.id;
        window.currentEmailData = {
            ...emailAtribuido.dados,
            threadId: emailAtribuido.dados.threadId || emailAtribuido.id
        };

        setTimeout(() => {
            exibirEmailNoPalco(window.currentEmailData);
            showToast("✓ E-mail atribuído com sucesso!", "success");
        }, 150);
    } catch (error) {
        console.error("❌ Erro crítico ao puxar e-mail:", error);
        showToast("Erro ao processar solicitação. Tente novamente.", "error");
    }
}

/* =========================
FINALIZAR ATENDIMENTO (TRANSACTION)
========================= */
/**

Finaliza atendimento com verificação de ownership
*/
async function finalizarAtendimentoEmail() {
    const { db, fStore, auth } = window.FirebaseApp;
    const resposta = document.getElementById('resposta-email').value;
    const currentUser = auth.currentUser;
    const agora = new Date();
    if (!resposta.trim()) {
        showToast("Por favor, escreva uma resposta antes de finalizar.", "warning");
        return;
    }
    if (!currentEmailId) {
        showToast("Erro: ID do e-mail atual não encontrado.", "error");
        return;
    }
    const operadorUID = currentUser?.uid;
    try {
        const resultado = await executeTransaction(async () => {
            return await runTransaction(db, async (transaction) => {
                const docRef = fStore.doc(db, "atend_emails_atribuido", currentEmailId);
                const docSnap = await transaction.get(docRef);
                // VALIDAÇÃO 1: Documento existe?
                if (!docSnap.exists()) {
                    throw new Error('DOCUMENTO_NAO_ENCONTRADO');
                }

                const dados = docSnap.data();

                // VALIDAÇÃO 2: Sou eu o dono deste ticket?
                if (dados.atribuido_para_uid !== operadorUID) {
                    throw new Error('SEM_PERMISSAO_OWNERSHIP');
                }

                // VALIDAÇÃO 3: Status correto?
                if (dados.status !== "em_atendimento") {
                    throw new Error('STATUS_INVALIDO');
                }

                // CÁLCULO DE TEMPO DE RETENÇÃO
                const tempoRetencaoMs = dados.puxado_em
                    ? agora.getTime() - dados.puxado_em.toDate().getTime()
                    : 0;

                // EVENTO DE FINALIZAÇÃO
                const eventoFinal = {
                    timestamp: agora,
                    acao: "finalizou",
                    operador_uid: operadorUID,
                    setor: dados.grupo || "atendimento",
                    tempo_retencao_ms: tempoRetencaoMs,
                    resposta_corpo: resposta
                };

                // DOSSIÊ FINAL PARA HISTÓRICO
                const payloadHistorico = {
                    ...dados,
                    status: 'finalizado',
                    resposta_enviada: resposta,
                    operador_finalizador_uid: operadorUID,
                    tracking_marcos: {
                        ...(dados.tracking_marcos || {}),
                        finalizado_em: agora
                    },
                    historico_custodia: fStore.arrayUnion(eventoFinal),
                    enviar_agora: true,
                    email_enviado: false,
                    versao_documento: (dados.versao_documento || 0) + 1
                };

                // MOVIMENTAÇÃO ATÔMICA: ATRIBUÍDO → HISTÓRICO
                const historicoRef = fStore.doc(db, "atend_emails_historico", currentEmailId);
                transaction.set(historicoRef, payloadHistorico);
                transaction.delete(docRef);

                return { success: true };
            });
        });

        if (resultado.success) {
            showToast("✓ Atendimento finalizado! A resposta será enviada pelo sistema.", "success");

            // Limpar estado
            window.currentEmailData = null;
            window.currentEmailId = null;
            window.emailSelecionadoId = null;

            if (typeof resetarPalco === 'function') resetarPalco();
        }
    } catch (error) {
        console.error("❌ Erro ao finalizar atendimento:", error);
        if (error.message === 'SEM_PERMISSAO_OWNERSHIP') {
            showToast("⚠️ Este atendimento não pertence mais a você.", "warning");
            resetarPalco();
        } else if (error.message === 'DOCUMENTO_NAO_ENCONTRADO') {
            showToast("⚠️ Este atendimento já foi processado.", "warning");
            resetarPalco();
        } else {
            showToast("Erro ao processar finalização. Tente novamente.", "error");
        }
    }
}

/* =========================
DEVOLVER PARA FILA (TRANSACTION)
========================= */
/**

Devolve e-mail para a fila com verificação de ownership
*/
window.confirmarDevolucao = async function () {
    const { db, fStore, auth } = window.FirebaseApp;
    const motivo = document.getElementById('txtJustificativa').value.trim();
    const userUID = auth.currentUser?.uid;
    const agora = new Date();
    if (motivo.length < 10) {
        showToast("A justificativa deve ter pelo menos 10 caracteres.", "warning");
        return;
    }
    if (!currentEmailId) {
        showToast("ID do e-mail não identificado.", "error");
        return;
    }
    try {
        const resultado = await executeTransaction(async () => {
            return await runTransaction(db, async (transaction) => {
                const docRef = fStore.doc(db, "atend_emails_atribuido", currentEmailId);
                const docSnap = await transaction.get(docRef);
                // VALIDAÇÃO 1: Documento existe?
                if (!docSnap.exists()) {
                    throw new Error('DOCUMENTO_NAO_ENCONTRADO');
                }

                const dados = docSnap.data();

                // VALIDAÇÃO 2: Ownership
                if (dados.atribuido_para_uid !== userUID) {
                    throw new Error('SEM_PERMISSAO_OWNERSHIP');
                }

                // VALIDAÇÃO 3: Status
                if (dados.status !== "em_atendimento") {
                    throw new Error('STATUS_INVALIDO');
                }

                // EVENTO DE DEVOLUÇÃO
                const eventoDevolver = {
                    timestamp: agora,
                    acao: "devolveu",
                    operador_uid: userUID,
                    setor: dados.grupo || "triagem",
                    justificativa: motivo
                };

                // DADOS PARA RETORNO À FILA
                const dadosAtualizados = {
                    ...dados,
                    status: 'novo',
                    atribuido_para_uid: null,
                    puxado_em: null,
                    motivo_devolucao: motivo,
                    devolvido_uid: userUID,
                    tracking_marcos: {
                        ...(dados.tracking_marcos || {}),
                        devolvido_em: agora
                    },
                    historico_custodia: fStore.arrayUnion(eventoDevolver),
                    versao_documento: (dados.versao_documento || 0) + 1
                };

                // MOVIMENTAÇÃO ATÔMICA: ATRIBUÍDO → FILA
                const filaRef = fStore.doc(db, "atend_emails_fila", currentEmailId);
                transaction.set(filaRef, dadosAtualizados);
                transaction.delete(docRef);

                return { success: true };
            });
        });

        if (resultado.success) {
            showToast("✓ Atendimento devolvido à fila com sucesso.", "success");
            fecharModalJustificativa();
            resetarPalco();
        }
    } catch (error) {
        console.error("❌ Erro na devolução:", error);
        if (error.message === 'SEM_PERMISSAO_OWNERSHIP') {
            showToast("⚠️ Você não pode devolver este atendimento (não é mais seu).", "warning");
            resetarPalco();
        } else if (error.message === 'DOCUMENTO_NAO_ENCONTRADO') {
            showToast("⚠️ Este atendimento já foi processado.", "warning");
            resetarPalco();
        } else {
            showToast("Erro ao processar devolução.", "error");
        }
    }
};

/* =========================
DIRECIONAR PARA SETOR (TRANSACTION)
========================= */
/**

Direciona e-mail para outro setor com verificação de ownership
*/
async function confirmarDirecionamento(novoSetor) {
    const { db, fStore, auth } = window.FirebaseApp;
    const emailId = window.emailSelecionadoId || window.currentEmailId;
    const currentUser = auth.currentUser;
    const agora = new Date();
    if (!emailId) {
        showToast("Nenhum e-mail selecionado.", "warning");
        return;
    }
    const operadorUID = currentUser?.uid;
    try {
        const resultado = await executeTransaction(async () => {
            return await runTransaction(db, async (transaction) => {
                const docRef = fStore.doc(db, "atend_emails_atribuido", emailId);
                const docSnap = await transaction.get(docRef);
                // VALIDAÇÕES
                if (!docSnap.exists()) {
                    throw new Error('DOCUMENTO_NAO_ENCONTRADO');
                }

                const dados = docSnap.data();

                if (dados.atribuido_para_uid !== operadorUID) {
                    throw new Error('SEM_PERMISSAO_OWNERSHIP');
                }

                if (dados.status !== "em_atendimento") {
                    throw new Error('STATUS_INVALIDO');
                }

                // CÁLCULO DE TEMPO
                const tempoRetencaoMs = dados.puxado_em
                    ? agora.getTime() - dados.puxado_em.toDate().getTime()
                    : 0;

                // EVENTO DE DERIVAÇÃO
                const eventoDerivacao = {
                    timestamp: agora,
                    acao: "derivou",
                    operador_uid: operadorUID,
                    setor_origem: dados.grupo || "triagem",
                    setor_destino: novoSetor,
                    tempo_retencao_ms: tempoRetencaoMs
                };

                // DADOS PARA NOVA FILA
                const dadosParaFila = {
                    ...dados,
                    grupo: novoSetor,
                    status: "novo",
                    derivado_por_uid: operadorUID,
                    derivado_em: agora,
                    atribuido_para_uid: null,
                    puxado_em: null,
                    historico_custodia: fStore.arrayUnion(eventoDerivacao),
                    versao_documento: (dados.versao_documento || 0) + 1
                };

                // Marco de triagem (se aplicável)
                if (dados.grupo === "triagem") {
                    dadosParaFila["tracking_marcos.triagem_fim"] = agora;
                }

                // MOVIMENTAÇÃO ATÔMICA
                const filaRef = fStore.doc(db, "atend_emails_fila", emailId);
                transaction.set(filaRef, dadosParaFila);
                transaction.delete(docRef);

                return { success: true };
            });
        });

        if (resultado.success) {
            window.currentEmailId = null;
            window.currentEmailData = null;

            showToast("✓ E-mail direcionado e liberado.", "success");
            fecharModalDirecionar();

            if (typeof resetarPalco === "function") {
                resetarPalco();
            }
        }
    } catch (error) {
        console.error("❌ Erro ao direcionar:", error);
        if (error.message === 'SEM_PERMISSAO_OWNERSHIP') {
            showToast("⚠️ Você não pode direcionar este atendimento.", "warning");
            resetarPalco();
        } else {
            showToast("Erro ao processar direcionamento.", "error");
        }
    }
}

/* =========================
SISTEMA DE HEARTBEAT (OPCIONAL)
========================= */
/**

Sistema de heartbeat para detectar operadores inativos
Recomendado para ambientes com alta concorrência
*/
class AtendimentoHeartbeat {
    constructor() {
        this.interval = null;
        this.HEARTBEAT_INTERVAL = 30000; // 30 segundos
        this.TIMEOUT_THRESHOLD = 120000; // 2 minutos
    }
    start() {
        if (this.interval) return;
        this.interval = setInterval(async () => {
            if (!window.currentEmailId) return;

            const { db, fStore, auth } = window.FirebaseApp;
            const operadorUID = auth.currentUser?.uid;

            try {
                const docRef = fStore.doc(db, "atend_emails_atribuido", window.currentEmailId);
                await fStore.updateDoc(docRef, {
                    ultimo_heartbeat: new Date(),
                    operador_ativo: true
                });

                console.log('💓 Heartbeat enviado');
            } catch (error) {
                console.warn('⚠️ Erro no heartbeat:', error);
                // Se o documento não existe mais, limpar estado local
                if (error.code === 'not-found') {
                    this.stop();
                    resetarPalco();
                    showToast("Este atendimento foi reassumido.", "warning");
                }
            }
        }, this.HEARTBEAT_INTERVAL);

        console.log('✅ Sistema de heartbeat iniciado');
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('⏹️ Heartbeat interrompido');
        }
    }
}

// Instância global do heartbeat
const heartbeat = new AtendimentoHeartbeat();
/* =========================
FUNÇÕES DE INTEGRAÇÃO
========================= */
/**

Sobrescreve funções originais com versões transacionais
Chamar esta função após inicializar o módulo
*/
function integrarTransacoesAtendimento() {
    // Substituir funções globais
    window.puxarProximoEmailReal = puxarProximoEmailReal;
    window.finalizarAtendimentoEmail = finalizarAtendimentoEmail;
    window.confirmarDevolucao = confirmarDevolucao;
    window.confirmarDirecionamento = confirmarDirecionamento;
    // Iniciar heartbeat quando puxar e-mail
    const originalExibir = window.exibirEmailNoPalco;
    window.exibirEmailNoPalco = function (...args) {
        originalExibir.apply(this, args);
        heartbeat.start();
    };
    // Parar heartbeat ao resetar
    const originalResetar = window.resetarPalco;
    window.resetarPalco = function (...args) {
        heartbeat.stop();
        originalResetar.apply(this, args);
    };
    console.log('✅ Sistema de transações integrado ao módulo de atendimento');
}

/* =========================
EXPORTAÇÃO
========================= */
export {
    puxarProximoEmailReal,
    finalizarAtendimentoEmail,
    confirmarDevolucao,
    confirmarDirecionamento,
    integrarTransacoesAtendimento,
    executeTransaction,
    AtendimentoHeartbeat
};
console.log('✅ Sistema de Transações Firestore carregado');
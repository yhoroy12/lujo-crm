// ==================== ATENDIMENTO.JS (ATUALIZADO COM EMAILS) ====================//
if (typeof window.currentEmailData === 'undefined') {
    window.currentEmailData = null;
}
if (typeof window.currentEmailId === 'undefined') {
    window.currentEmailId = null;
}
window.initAtendimentoModule = function () {
    console.log("🔧 Inicializando Workspace de Atendimento");

    initAtendimentoTabs();
    initIdentityCheck();
    initChatActions();
    initStateTransitions();
    initPopupLogic();
    initAutoResize();
    initTopValidationButton();
    initEmailsTab(); // NOVO: Inicializa funcionalidades de emails
    initTicketTimer();
    initHistoricoTab()


    // Define estado inicial visível
    updateTicketFlow('NOVO');


};

// ============================= //
// 1. GERENCIAMENTO DE ABAS      //
// ============================= //
function initAtendimentoTabs() {
    const botoesAba = document.querySelectorAll('.modulo-painel-atendimento .aba-btn');
    const conteudosAba = document.querySelectorAll('.modulo-painel-atendimento .aba-conteudo');

    botoesAba.forEach(btn => {
        btn.addEventListener('click', () => {
            const abaAlvo = btn.dataset.aba;

            botoesAba.forEach(b => b.classList.remove('ativa'));
            conteudosAba.forEach(c => c.classList.remove('ativa'));

            btn.classList.add('ativa');
            const targetContent = document.querySelector(`.modulo-painel-atendimento .${abaAlvo}`);
            if (targetContent) targetContent.classList.add('ativa');

            // Se funcionar sem esse if podemos apagar depois
            if (abaAlvo === 'aba-emails') {
                console.log("Aba de e-mails ativa. O monitoramento real-time já está operando.");
            }
        });
    });
}

// ============================= //
// 2. VALIDAÇÃO DE IDENTIDADE    //
// ============================= //
function initIdentityCheck() {
    const checks = ['checkNome', 'checkTelefone', 'checkEmail'];
    const btnValidar = document.getElementById('btnValidarIdentidade');

    if (!btnValidar) return;

    const validarInputs = () => {
        const todosMarcados = checks.every(id => {
            const el = document.getElementById(id);
            return el && el.checked;
        });
        btnValidar.disabled = !todosMarcados;
    };

    checks.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', validarInputs);
    });

    btnValidar.addEventListener('click', async () => {
        try {
            btnValidar.disabled = true;
            btnValidar.textContent = 'Confirmando...';
            await new Promise(r => setTimeout(r, 400));
        } finally {
            updateTicketFlow('IDENTIDADE_VALIDADA');

            checks.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = true;
            });

            btnValidar.classList.add('hidden');
            addTimelineItem(getCurrentTime(), "Identidade validada");
            const statusBadge = document.getElementById('statusBadge');
            if (statusBadge) statusBadge.textContent = 'IDENTIDADE VALIDADA';
        }
    });
}

// ============================= //
// 3. TRANSIÇÕES DE ESTADO (FSM) //
// ============================= //
function updateTicketFlow(novoEstado) {
    const statusBadge = document.getElementById('statusBadge');
    const stateIndicator = document.getElementById('stateIndicator');

    if (statusBadge) statusBadge.textContent = novoEstado.replace(/_/g, ' ');
    if (stateIndicator) stateIndicator.textContent = novoEstado.replace(/_/g, ' ');

    const actionBarRight = document.querySelector('.action-bar-right');
    if (actionBarRight) {
        actionBarRight.querySelectorAll('button, .info-block').forEach(el => {
            el.classList.add('hidden');
        });
    }

    switch (novoEstado) {
        case 'NOVO':
            showActionButton('btnIniciarValidacao');
            break;
        case 'IDENTIDADE_VALIDADA':
            showActionButton('btnIniciarAtendimento');
            break;
        case 'EM_ATENDIMENTO':
            showActionButton('btnConcluir');
            showActionButton('btnEncaminhar');
            break;
        case 'ENCAMINHADO':
            showActionElement('infoEncaminhado');
            break;
        case 'AGUARDANDO_CLIENTE':
            showActionElement('infoAguardandoCliente');
            break;
    }

    const chatInputContainer = document.getElementById('chatInputContainer');
    if (chatInputContainer) chatInputContainer.classList.remove('hidden');

    const sendBtn = document.getElementById('btnEnviarMensagem');
    if (sendBtn) sendBtn.classList.remove('hidden');
}

function showActionButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.remove('hidden');
        button.disabled = false;
    }
}

function showActionElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.classList.remove('hidden');
}

// ============================= //
// 4. AÇÕES DE TRANSIÇÃO         //
// ============================= //
function initStateTransitions() {
    const btnIniciar = document.getElementById('btnIniciarAtendimento');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            updateTicketFlow('EM_ATENDIMENTO');
            addTimelineItem(getCurrentTime(), "Atendimento iniciado");
        });
    }

    const btnConcluir = document.getElementById('btnConcluir');
    if (btnConcluir) {
        btnConcluir.addEventListener('click', () => {
            if (confirm("Deseja realmente concluir este atendimento?")) {
                addTimelineItem(getCurrentTime(), "Ticket concluído");

                if (timerInterval) clearInterval(timerInterval);

                setTimeout(() => {
                    const workspace = document.getElementById('workspaceGrid');
                    const emptyState = document.getElementById('emptyState');

                    if (workspace) workspace.classList.add('hidden');
                    if (emptyState) emptyState.classList.remove('hidden');

                    const statusBadge = document.getElementById('statusBadge');
                    if (statusBadge) statusBadge.textContent = 'AGUARDANDO';

                    updateTicketFlow('NOVO');
                }, 500);
            }
        });
    }

    const btnEncaminhar = document.getElementById('btnEncaminhar');
    if (btnEncaminhar) {
        btnEncaminhar.addEventListener('click', () => {
            const setor = document.getElementById('setorResponsavel')?.value;
            if (!setor) {
                showToast("⚠️ Selecione o setor responsável antes de encaminhar.");
                return;
            }
            if (confirm(`Encaminhar ticket para o setor: ${setor}?`)) {
                addTimelineItem(getCurrentTime(), `Encaminhado para ${setor}`);

                if (timerInterval) clearInterval(timerInterval);

                setTimeout(() => {
                    const workspace = document.getElementById('workspaceGrid');
                    const emptyState = document.getElementById('emptyState');

                    if (workspace) workspace.classList.add('hidden');
                    if (emptyState) emptyState.classList.remove('hidden');

                    const statusBadge = document.getElementById('statusBadge');
                    if (statusBadge) statusBadge.textContent = 'AGUARDANDO';

                    updateTicketFlow('NOVO');
                }, 500);
            }
        });
    }
}

// ============================= //
// 5. CHAT - ENVIO DE MENSAGENS  //
// ============================= //
function initChatActions() {
    const btnEnviar = document.getElementById('btnEnviarMensagem');
    const input = document.getElementById('chatInput');
    const charCounter = document.getElementById('charCounter');

    if (input && charCounter) {
        input.addEventListener('input', () => {
            charCounter.textContent = `${input.value.length}/1000`;
        });
    }

    const enviar = () => {
        if (!input) return;
        const texto = input.value.trim();
        if (!texto) return;

        const chatbox = document.getElementById('chatbox');
        if (!chatbox) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg atendente';
        msgDiv.innerHTML = `
            <div class="msg-content">${escapeHtml(texto)}</div>
            <div class="msg-time">${getCurrentTime()}</div>
        `;
        chatbox.appendChild(msgDiv);
        scrollChatToBottom();

        input.value = '';
        if (charCounter) charCounter.textContent = '0/1000';
        input.style.height = 'auto';
    };

    if (btnEnviar) btnEnviar.addEventListener('click', enviar);

    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar();
            }
        });
    }
}

// ============================= //
// 6. AUTO-RESIZE DO TEXTAREA    //
// ============================= //
function initAutoResize() {
    const textarea = document.getElementById('chatInput');
    if (!textarea) return;

    textarea.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
}

// ============================= //
// 7. TIMELINE                   //
// ============================= //
function addTimelineItem(hora, texto) {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    timeline.querySelectorAll('.timeline-dot').forEach(dot => {
        dot.classList.remove('active');
    });

    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
        <div class="timeline-dot active"></div>
        <div class="timeline-content">
            <span class="timeline-time">${hora}</span>
            <span class="timeline-text">${escapeHtml(texto)}</span>
        </div>
    `;
    timeline.appendChild(item);
}

// ============================= //
// 8. POPUP E INICIALIZAÇÃO      //
// ============================= //
function initPopupLogic() {
    const popup = document.getElementById('popupAtendimento');
    const btnAceitar = document.getElementById('btnIniciarAtendimentoPopup');

    setTimeout(() => {
        if (popup) {
            const nomeCliente = "Marcos Oliveira";
            const popupCliente = document.getElementById('popupCliente');
            if (popupCliente) popupCliente.textContent = nomeCliente;
            popup.style.display = 'flex';
            popup.setAttribute('aria-hidden', 'false');
        }
    }, 3000);

    if (btnAceitar) {
        btnAceitar.addEventListener('click', () => {
            const popup = document.getElementById('popupAtendimento');
            if (popup) {
                popup.style.display = 'none';
                popup.setAttribute('aria-hidden', 'true');
            }

            const emptyState = document.getElementById('emptyState');
            const workspace = document.getElementById('workspaceGrid');

            if (emptyState) emptyState.classList.add('hidden');
            if (workspace) workspace.classList.remove('hidden');

            const clienteNome = document.getElementById('clienteNome');
            const clienteTelefone = document.getElementById('clienteTelefone');
            const clienteEmail = document.getElementById('clienteEmail');
            const atribuidoEm = document.getElementById('atribuidoEm');
            const chatbox = document.getElementById('chatbox');
            const chatInput = document.getElementById('chatInput');

            if (clienteNome) clienteNome.value = "Marcos Oliveira";
            if (clienteTelefone) clienteTelefone.value = "(11) 98888-7777";
            if (clienteEmail) clienteEmail.value = "marcos@email.com";
            if (atribuidoEm) atribuidoEm.textContent = getCurrentTime();

            if (chatbox) {
                addSystemMessage("Novo ticket atribuído a você.");
                scrollChatToBottom();
            }

            updateTicketFlow('NOVO');
            initTicketTimer();

            if (chatInput) chatInput.focus();
        });
    }
}

// ============================= //
// 9. TIMER DO TICKET            //
// ============================= //
if (typeof timerInterval === 'undefined') {
    var timerInterval = null;
}

function initTicketTimer() {
    if (timerInterval) clearInterval(timerInterval);

    const tempoDecorrido = document.getElementById('tempoDecorrido');
    if (!tempoDecorrido) return;

    let segundos = 0;

    timerInterval = setInterval(() => {
        segundos++;
        const mins = Math.floor(segundos / 60);
        const secs = segundos % 60;
        tempoDecorrido.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);
}

// ============================= //
// 10. BOTÃO SUPERIOR DE VALIDAÇÃO//
// ============================= //
function initTopValidationButton() {
    const btnTopValidacao = document.getElementById('btnIniciarValidacao');
    if (!btnTopValidacao) return;

    btnTopValidacao.addEventListener('click', () => {
        const identitySection = document.getElementById('identitySection');
        if (identitySection) {
            identitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const primeiroCheck = identitySection.querySelector('input[type="checkbox"]');
            if (primeiroCheck) primeiroCheck.focus();
        }
    });
}

// ==========================================
// 11. FUNCIONALIDADES DE EMAILS (MODO FIREBASE)
// ==========================================

const RESPOSTAS_PADROES = [
    { titulo: "Boas-vindas", texto: "Olá! Recebemos sua mensagem e nossa equipe já está analisando. Em breve retornaremos." },
    { titulo: "Financeiro - Boleto", texto: "Verificamos seu pagamento e ele já foi identificado em nosso sistema." },
    { titulo: "Solicitar Print", texto: "Poderia nos enviar um print da tela onde o erro ocorre para analisarmos?" }
];

let emailTimerInterval;

// --- INICIALIZADOR ---
function initEmailsTab() {
    const { db, fStore } = window.FirebaseApp;
    const userUID = window.AuthSystem?.getCurrentUser()?.uid || "9K3d5OoOpON6pAG452jxFD1Twgx2";

    const countBadge = document.getElementById('emailFilaCount');
    const listaEspera = document.getElementById('emailFilaLista');
    const btnPuxar = document.getElementById('btnPuxarEmail') || document.getElementById('btnChamarProximo');
    const txtArea = document.getElementById('resposta-email');
    const btnEnviar = document.getElementById('btnEnviarResposta');

    console.log("📨 Módulo de E-mails iniciado para o operador:", userUID);

    // --- ESCUTADOR 1: FILA DE ESPERA (Monitora e-mails novos para todos) ---
    const qFila = fStore.query(
        fStore.collection(db, "atend_emails_fila"),
        fStore.where("status", "==", "novo"),
        fStore.where("grupo", "==", "triagem"),
        fStore.orderBy("metadata_recebido_em", "asc")
    );

    fStore.onSnapshot(qFila, (snap) => {
        // Atualiza o contador
        const countBadge = document.getElementById('emailFilaCount');
        if (countBadge) {
            countBadge.textContent = snap.size;
            countBadge.style.transform = "scale(1.2)";
            setTimeout(() => countBadge.style.transform = "scale(1)", 200);
        }

        // 2. Atualiza a Lista Visual
        const listaEspera = document.getElementById('emailFilaLista');
        if (!listaEspera) return;

        if (snap.empty) {
            listaEspera.innerHTML = '<div class="item-espera vazia">Fila vazia</div>';
        } else {
            // Limpamos a lista antes de reconstruir
            listaEspera.innerHTML = '';

            snap.forEach(doc => {
                const dados = doc.data();
                listaEspera.innerHTML += `
                    <div class="item-espera">
                        <div class="item-info">
                            <strong>${dados.assunto || 'Sem Assunto'}</strong>
                            <span>${dados.remetente_email || 'Sem E-mail'}</span>
                        </div>
                        <span class="badge-setor">${(dados.grupo || 'Geral').toUpperCase()}</span>
                    </div>
                `;
            });
        }
    }, (error) => {
        console.error("Erro no Listener da Fila:", error);
    });
    // --- ESCUTADOR 2: RETOMADA (Monitora o que já está no SEU nome) ---
    const qAtivo = fStore.query(
        fStore.collection(db, "atend_emails_atribuido"),
        fStore.where("atribuido_para_uid", "==", userUID),
        fStore.where("status", "==", "em_atendimento"),
        fStore.limit(1)
    );

    fStore.onSnapshot(qAtivo, (snap) => {
        if (!snap.empty) {
            const docAtivo = snap.docs[0];
            const dados = docAtivo.data();
            currentEmailId = docAtivo.id; // Define o ID global para poder finalizar depois

            console.log("📌 Atendimento ativo (KPuVslw...) recuperado.");
            exibirEmailNoPalco({
                remetente_email: dados.remetente_email,
                remetente_nome: dados.remetente_nome || "Cliente",
                assunto: dados.assunto,
                corpo_html: dados.corpo_html
            });
        } else {
            // Se não houver nada atribuído a você, garante que o palco esteja limpo
            // (Opcional: você pode decidir se limpa a tela aqui ou não)
        }
    }, (error) => console.error("Erro na Retomada:", error));

    // --- VÍNCULOS DE EVENTOS ---
    if (btnPuxar) btnPuxar.onclick = puxarProximoEmailReal;
    if (txtArea) txtArea.oninput = validarResposta;
    if (btnEnviar) btnEnviar.onclick = finalizarAtendimentoEmail;
    // Dropdown Logic
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.btn-respostas-padroes') && !e.target.closest('.dropdown-respostas')) {
            document.getElementById('dropdownRespostas')?.classList.remove('active');
        }
    });
}

async function puxarProximoEmailReal() {
    const { db, fStore, auth } = window.FirebaseApp;
    const userUID = window.AuthSystem?.getCurrentUser()?.uid || "9K3d5OoOpON6pAG452jxFD1Twgx2";
    const agora = new Date();

    try {
        // Busca o primeiro e-mail disponível
        const q = fStore.query(
            fStore.collection(db, "atend_emails_fila"),
            fStore.where("status", "==", "novo"),
            fStore.orderBy("metadata_recebido_em", "asc"),
            fStore.limit(1)
        );

        const querySnapshot = await fStore.getDocs(q);

        if (querySnapshot.empty) {
            showToast("Nenhum e-mail disponível na fila.", "info");
            return;
        }

        const docFila = querySnapshot.docs[0];
        const emailData = docFila.data();
        const emailId = docFila.id;

        const eTriagemInicial = !emailData.tracking_marcos?.triagem_inicio;
        const eSetorFinal = emailData.grupo !== "triagem";

        // Prepara o novo evento de histórico
        const novoEvento = {
            timestamp: agora,
            acao: "puxou_fila",
            operador_uid: userUID,
            setor: emailData.grupo || "triagem"
        };

        console.log("📨 Puxando e-mail ID:", emailId);

        // 1. Atualização dos campos de controle e Tracking
        const updates = {
            status: "em_atendimento",
            atribuido_para_uid: userUID,
            puxado_em: agora,
            historico_custodia: fStore.arrayUnion(novoEvento)
        };

        // Se for triagem inicial, grava o marco. Se for setor final, grava o marco de recebimento do setor
        if (eTriagemInicial) {
            // Usando a notação de objeto para garantir o aninhamento
            updates.tracking_marcos = {
                ...emailData.tracking_marcos,
                triagem_inicio: agora
            };
        } else if (eSetorFinal && !emailData.tracking_marcos?.setor_recebido_em) {
            updates.tracking_marcos = {
                ...emailData.tracking_marcos,
                setor_recebido_em: agora
            };
        }

        // 2. Salvar os dados completos na nova coleção (atribuídos)
        const novoDocRef = fStore.doc(db, "atend_emails_atribuido", emailId);
        await fStore.setDoc(novoDocRef, {
            ...emailData,
            ...updates
        });

        // 3. Deletamos da fila original
        await fStore.deleteDoc(fStore.doc(db, "atend_emails_fila", emailId));

        // 4. Seta o ID na memória global
        window.currentEmailId = emailId;
        window.currentEmailData = { ...emailData, ...updates, threadId: emailData.threadId || emailId };

        console.log("✅ E-mail atribuído com sucesso:", emailId);

        setTimeout(() => {
            exibirEmailNoPalco({
                id: emailId,
                ...emailData,
                ...updates,
                threadId: emailData.threadId || emailId
            });
            if (typeof setLoading === 'function') setLoading(false);
            showToast("E-mail puxado com sucesso!", "success");
        }, 150);

    } catch (error) {
        console.error("❌ Erro ao puxar e-mail:", error);
        if (typeof setLoading === 'function') setLoading(false);
        showToast("Erro técnico ao tentar puxar o e-mail: " + error.message);
    }
}

// Função unificada para preencher o palco com dados do Firebase
function exibirEmailNoPalco(dados) {
    window.emailSelecionadoId = dados.id || window.currentEmailId;

    window.currentEmailData = {
        ...dados,
        threadId: dados.threadId || dados.id || window.currentEmailId
    };
    const palcoVazio = document.getElementById('palco-vazio');
    const palcoAtivo = document.getElementById('palco-ativo');
    const timerDisp = document.getElementById('timer-atendimento');

    if (palcoVazio) palcoVazio.style.display = 'none';
    if (palcoAtivo) palcoAtivo.style.display = 'flex';

    // Preenchimento com segurança (evita quebrar se o campo vier nulo)
    document.getElementById('ativo-cliente-nome').textContent = dados.remetente_nome || "Cliente";
    document.getElementById('ativo-cliente-email').textContent = dados.remetente_email || "E-mail indisponível";
    document.getElementById('ativo-assunto').textContent = dados.assunto || "(Sem Assunto)";
    const containerMensagem = document.getElementById('ativo-mensagem-conteudo');
    containerMensagem.innerHTML = dados.corpo_html || "O conteúdo deste e-mail está vazio.";

    // --- LÓGICA DE ANEXOS MELHORADA ---
    const btnAnexos = document.getElementById('btn-ver-anexos');
    if (dados.anexos && dados.anexos.length > 0) {
        btnAnexos.style.display = 'flex';
        btnAnexos.onclick = () => {
            // Se houver mais de um anexo, abre a pasta ou o primeiro link
            window.open(dados.anexos[0].url, '_blank');
        };
    }

    // Tenta encontrar o link em diferentes campos possíveis
    let linkFinal = null;

    if (dados.link_drive) {
        linkFinal = dados.link_drive;
    } else if (dados.anexos && Array.isArray(dados.anexos) && dados.anexos.length > 0) {
        linkFinal = dados.anexos[0].url;
    } else if (typeof dados.anexos === 'string') {
        linkFinal = dados.anexos;
    }

    if (linkFinal && linkFinal.trim() !== "") {
        console.log("📎 Link de anexo detectado:", linkFinal);
        btnAnexos.style.display = 'flex';
        btnAnexos.onclick = () => window.open(linkFinal, '_blank');
    } else {
        console.log("ℹ️ Nenhum anexo válido encontrado nos dados.");
        btnAnexos.style.display = 'none';
    }

    // 5. Troca de visualização: Esconde o placeholder e mostra o palco
    document.getElementById('palco-ativo').style.display = 'flex'; // Usando seu ID 'palco-ativo'

    // Reseta o campo de resposta
    document.getElementById('resposta-email').value = "";
    validarResposta(); // Chama sua função de validar o botão

    // Reset de UI
    const txtArea = document.getElementById('resposta-email');
    if (txtArea) txtArea.value = "";
    if (timerDisp) timerDisp.textContent = "00:00";

    validarResposta();
    iniciarCronometroAtendimento();
    carregarHistoricoThread(dados.threadId);

    // Fecha dropdown se estiver aberto
    document.getElementById('dropdownRespostas')?.classList.remove('active');

}
// Função para carregar o histórico de mensagens baseado no threadId
async function carregarHistoricoThread(threadId) {
    if (!threadId) return;

    const { db, fStore } = window.FirebaseApp;

    // 1. Captura os elementos e verifica se eles existem no DOM
    const historicoContainer = document.getElementById('lista-mensagens-anteriores');
    const divPai = document.getElementById('historico-conversa');

    // Se algum elemento essencial não existir, aborta para evitar o erro de 'reading style'
    if (!historicoContainer || !divPai) {
        console.warn("⚠️ Elementos de histórico não encontrados no HTML (lista-mensagens-anteriores ou historico-conversa)");
        return;
    }

    // Estado inicial: carregando
    historicoContainer.innerHTML = "<p style='font-size:12px; color:#999;'>Carregando histórico...</p>";

    try {
        // 2. Consulta ao Firestore
        const q = fStore.query(
            fStore.collection(db, "atend_emails_historico"),
            fStore.where("threadId", "==", threadId),
            fStore.orderBy("finalizado_em", "asc")
        );

        const querySnapshot = await fStore.getDocs(q);

        if (!querySnapshot.empty) {
            divPai.style.display = 'block';
            historicoContainer.innerHTML = ""; // Limpa o "carregando"

            querySnapshot.forEach(doc => {
                const d = doc.data();

                // Tratamento seguro para data
                let dataFormatada = "";
                if (d.finalizado_em) {
                    dataFormatada = d.finalizado_em.toDate().toLocaleString('pt-BR');
                }

                // Usamos um template string limpo
                historicoContainer.innerHTML += `
                    <div class="card-historico" style="background: #f8f9fa; padding: 12px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #007bff; border-bottom: 1px solid #ddd;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="font-size: 11px; color: #555;">RESPOSTA DE: ${d.operador_finalizador_nome || 'Atendente'}</strong>
                            <span style="font-size: 10px; color: #999;">${dataFormatada}</span>
                        </div>
                        <div style="font-size: 13px; color: #333; white-space: pre-wrap; font-family: sans-serif;">${d.resposta_enviada}</div>
                    </div>
                `;
            });
        } else {
            // Se não houver histórico, esconde o bloco
            divPai.style.display = 'none';
        }

    } catch (error) {
        // 3. Tratamento de erro robusto
        console.error("❌ Erro ao buscar histórico:", error);

        // Verifica se o erro é de índice ausente para avisar o dev
        if (error.message.includes("index")) {
            historicoContainer.innerHTML = "<p style='font-size:11px; color:red;'>Erro: O banco de dados requer um índice para esta busca. Verifique o console.</p>";
        } else {
            divPai.style.display = 'none';
        }
    }
}
// --- NOTIFICAÇÕES (TOAST) ---
function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    // Define o ícone com base no tipo
    const icone = tipo === 'success' ? 'fi-rr-check' : 'fi-rr-cross-circle';

    toast.innerHTML = `
        <i class="fi ${icone}"></i>
        <span>${mensagem}</span>
    `;

    container.appendChild(toast);

    // Remove a notificação após 3 segundos com um efeito de fade
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 500);
    }, 3000);
}


// --- RESPOSTAS PADRÕES ---
function toggleMenuRespostas() {
    const menu = document.getElementById('dropdownRespostas');
    menu.classList.toggle('active');
    const lista = document.getElementById('listaRespostasItens');
    lista.innerHTML = '';
    RESPOSTAS_PADROES.forEach((resp, i) => {
        const item = document.createElement('div');
        item.className = 'item-resposta-rapida';
        item.innerHTML = `
            <div style="flex:1"><span class="resposta-titulo">${resp.titulo}</span><div id="preview-${i}" class="preview-expandido">${resp.texto}</div></div>
            <div class="acoes-resposta-item">
                <button class="btn-mini-acao" onclick="togglePreview(${i}, event)"><i class="fi fi-rr-plus"></i></button>
                <button class="btn-mini-acao" onclick="inserirResposta(${i})"><i class="fi fi-rr-enter"></i></button>
            </div>`;
        lista.appendChild(item);
    });
}

function togglePreview(index, e) {
    e.stopPropagation();
    const p = document.getElementById(`preview-${index}`);
    const btn = e.currentTarget.querySelector('i');
    const isVisible = p.style.display === 'block';
    document.querySelectorAll('.preview-expandido').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.fi-rr-minus').forEach(i => i.classList.replace('fi-rr-minus', 'fi-rr-plus'));
    if (!isVisible) {
        p.style.display = 'block';
        btn.classList.replace('fi-rr-plus', 'fi-rr-minus');
    }
}

function inserirResposta(index) {
    const txt = document.getElementById('resposta-email');
    txt.value += RESPOSTAS_PADROES[index].texto;
    validarResposta();
    document.getElementById('dropdownRespostas').classList.remove('active');
    txt.focus();
}

// --- VALIDAÇÃO E FINALIZAÇÃO ---
function validarResposta() {
    const btn = document.getElementById('btnEnviarResposta');
    const val = document.getElementById('resposta-email').value.trim();
    if (val.length > 5) { btn.classList.add('ativo'); btn.disabled = false; }
    else { btn.classList.remove('ativo'); btn.disabled = true; }
}
// --- FINALIZAÇÃO DO ATENDIMENTO ---
async function finalizarAtendimentoEmail() {
    const { db, fStore } = window.FirebaseApp;
    const resposta = document.getElementById('resposta-email').value;
    const currentUser = window.FirebaseApp.auth.currentUser;
    const agora = new Date();

    if (!resposta.trim()) {
        showToast("Por favor, escreva uma resposta antes de finalizar.", "warning");
        return;
    }

    try {
        if (!currentEmailId) {
            showToast("Erro: ID do e-mail atual não encontrado.", "error");
            return;
        }

        console.log("🏁 Finalizando e preparando envio para:", currentEmailData.remetente_email);

        const docRef = fStore.doc(db, "atend_emails_atribuido", currentEmailId);
        const docSnap = await fStore.getDoc(docRef);

        if (!docSnap.exists()) {
            showToast("Documento não encontrado no banco.", "error");
            return;
        }

        const dadosParaFinalizar = docSnap.data();

        // 1. Cálculo de tempo de retenção do último operador
        const tempoRetencaoMs = dadosParaFinalizar.puxado_em
            ? agora.getTime() - dadosParaFinalizar.puxado_em.toDate().getTime()
            : 0;

        // 2. Prepara o evento final para o histórico de custódia
        const eventoFinal = {
            timestamp: agora,
            acao: "finalizou",
            operador_uid: currentUser?.uid || "sistema",
            setor: dadosParaFinalizar.grupo || "atendimento",
            tempo_retencao_ms: tempoRetencaoMs,
            resposta_corpo: resposta // Guarda uma cópia da resposta no log também
        };
        // 3. Monta o Dossiê Final para a coleção de HISTÓRICO
        const payloadHistorico = {
            ...dadosParaFinalizar, // Usa a variável corrigida (currentUser/userLogado)
            status: 'finalizado',
            resposta_enviada: resposta,
            operador_finalizador_uid: currentUser?.uid || "sistema",

            // CORREÇÃO: Garante que finalizado_em entre dentro do map tracking_marcos
            tracking_marcos: {
                ...(dadosParaFinalizar.tracking_marcos || {}),
                finalizado_em: agora
            },

            historico_custodia: fStore.arrayUnion(eventoFinal),
            enviar_agora: true,
            email_enviado: false
        };

        // 4. Salva no Histórico (usando o mesmo ID para consistência)
        const historicoRef = fStore.doc(db, "atend_emails_historico", currentEmailId);
        await fStore.setDoc(historicoRef, payloadHistorico);

        // 5. Remove da "mesa" do operador (Atribuídos)
        await fStore.deleteDoc(docRef);

        showToast("Atendimento finalizado! A resposta será enviada pelo sistema.", "success");

        // 6. Limpa memória e interface
        window.currentEmailData = null;
        window.currentEmailId = null;
        window.emailSelecionadoId = null;

        if (typeof resetarPalco === 'function') resetarPalco();
        if (typeof carregarFilaEmails === 'function') carregarFilaEmails();

    } catch (error) {
        console.error("Erro ao finalizar atendimento:", error);
        showToast("Falha técnica ao processar resposta.", "error");
    }
}
// --- DIRECIONAR PARA OUTRO SETOR ---
// Abre o modal de escolha
function abrirModalDirecionamento() {
    document.getElementById('modalDirecionarEmail').style.display = 'flex';
}

function fecharModalDirecionar() {
    document.getElementById('modalDirecionarEmail').style.display = 'none';
}

// Executa a troca de setor no banco
async function confirmarDirecionamento(novoSetor) {
    const { db, fStore, auth } = window.FirebaseApp;
    const emailId = window.emailSelecionadoId || window.currentEmailId;
    const currentUser = auth.currentUser;
    const agora = new Date();

    if (!emailId) {
        showToast("Nenhum e-mail selecionado.", "warning");
        return;
    }

    try {
        // 1. Referência do documento atual (onde ele está agora)
        const docAtribuidoRef = fStore.doc(db, "atend_emails_atribuido", emailId);
        const docSnap = await fStore.getDoc(docAtribuidoRef);

        if (!docSnap.exists()) {
            showToast("Erro: Documento não encontrado.", "error");
            return;
        }

        const dadosAtuais = docSnap.data();

        // 2. Cálculo de quanto tempo o e-mail ficou com este operador (SLA interno)
        const tempoRetencaoMs = dadosAtuais.puxado_em
            ? agora.getTime() - dadosAtuais.puxado_em.toDate().getTime()
            : 0;

        // 3. Prepara o evento para o histórico de custódia
        const eventoDerivacao = {
            timestamp: agora,
            acao: "derivou",
            operador_uid: currentUser?.uid || "sistema",
            setor_origem: dadosAtuais.grupo || "triagem",
            setor_destino: novoSetor,
            tempo_retencao_ms: tempoRetencaoMs
        };

        // 4. Monta o payload para a Fila Geral com os novos marcos
        const dadosParaFila = {
            ...dadosAtuais,
            grupo: novoSetor,            // Atualiza o grupo para o novo setor
            status: "novo",              // Volta a ser 'novo' para a fila do destino

            // Campos de rastreio rápido (Compatibilidade)
            derivado_por_uid: currentUser?.uid || "sistema",
            derivado_em: agora,

            // Limpa dados do operador que está saindo
            atribuido_para_uid: null,
            puxado_em: null,

            // ATUALIZAÇÃO DO DOSSIÊ (Tracking e Histórico)
            historico_custodia: fStore.arrayUnion(eventoDerivacao)
        };

        // Se o e-mail estava na triagem, fechamos o marco de triagem_fim
        if (dadosAtuais.grupo === "triagem") {
            dadosParaFila["tracking_marcos.triagem_fim"] = agora;
        }

        // 5. Executa a movimentação (Grava na fila e deleta do atribuído)
        await fStore.setDoc(fStore.doc(db, "atend_emails_fila", emailId), dadosParaFila);
        await fStore.deleteDoc(docAtribuidoRef);
        window.currentEmailId = null;
        window.currentEmailData = null;

        // Chame a função que reseta a visualização
        if (typeof resetarPalco === "function") {
            resetarPalco();
        } else {
            // Caso não tenha a resetarPalco, force o esconder/mostrar manualmente:
            document.getElementById('palco-ativo').style.display = 'none';
            document.getElementById('palco-vazio').style.display = 'flex';
        }

        showToast("E-mail direcionado e liberado.");
        fecharModalDirecionar();


    } catch (error) {
        console.error("Erro ao derivar e mover e-mail:", error);
        showToast("Erro ao processar o direcionamento.", "error");
    }
}

// --- DEVOLUÇÃO COM JUSTIFICATIVA ---
window.devolverParaFila = function () {
    document.getElementById('modalJustificativa').style.display = 'flex';
};

window.fecharModalJustificativa = function () {
    document.getElementById('modalJustificativa').style.display = 'none';
    document.getElementById('txtJustificativa').value = '';
};

window.confirmarDevolucao = async function () {
    const { db, fStore, auth } = window.FirebaseApp;
    const motivo = document.getElementById('txtJustificativa').value.trim();
    const userUID = auth.currentUser?.uid;
    const agora = new Date();

    // Validação de segurança
    if (motivo.length < 10) {
        showToast("A justificativa deve ter pelo menos 10 caracteres.", "warning");
        return;
    }

    if (!currentEmailId) {
        showToast("ID do e-mail não identificado.", "error");
        return;
    }

    try {
        const docRef = fStore.doc(db, "atend_emails_atribuido", currentEmailId);
        const docSnap = await fStore.getDoc(docRef);

        if (!docSnap.exists()) {
            showToast("Erro: O atendimento não foi encontrado para devolução.", "error");
            return;
        }

        const dadosOriginal = docSnap.data();

        // 1. Prepara o novo evento de histórico para o array
        const novoEvento = {
            timestamp: agora,
            acao: "devolveu",
            operador_uid: userUID,
            setor: dadosOriginal.grupo || "triagem",
            justificativa: motivo
        };
        // 2. Prepara os dados atualizados para a FILA
        const dadosAtualizados = {
            ...dadosOriginal,
            status: 'novo',
            atribuido_para_uid: null,
            puxado_em: null,
            motivo_devolucao: motivo,
            devolvido_uid: userUID,
            // CORREÇÃO: Atualiza o objeto tracking_marcos preservando os outros campos
            tracking_marcos: {
                ...(dadosOriginal.tracking_marcos || {}),
                devolvido_em: agora
            },
            historico_custodia: fStore.arrayUnion(novoEvento)
        };


        // 3. Volta o documento para a FILA GERAL
        await fStore.setDoc(fStore.doc(db, "atend_emails_fila", currentEmailId), dadosAtualizados);

        // 4. Deleta da coleção de Atribuídos (Mesa do operador)
        await fStore.deleteDoc(docRef);

        showToast("Atendimento devolvido à fila com sucesso.", "success");

        fecharModalJustificativa();
        resetarPalco();

    } catch (error) {
        console.error("Erro na devolução:", error);
        showToast("Erro ao tentar devolver para a fila.", "error");
    }
};

function resetarPalco() {
    // Limpa qualquer ID de atendimento ativo
    currentEmailId = null;

    // Para os cronômetros (verificando os nomes que você usa)
    if (typeof emailTimerInterval !== 'undefined') clearInterval(emailTimerInterval);
    if (typeof timerInterval !== 'undefined') clearInterval(timerInterval);

    // UI
    document.getElementById('palco-ativo').style.display = 'none';
    document.getElementById('palco-vazio').style.display = 'flex';

    // Limpa o campo de texto
    const txtArea = document.getElementById('resposta-email');
    if (txtArea) txtArea.value = '';
}

window.devolverParaFila = function () {
    document.getElementById('modalJustificativa').style.display = 'flex';
};

window.fecharModalJustificativa = function () {
    document.getElementById('modalJustificativa').style.display = 'none';
    document.getElementById('txtJustificativa').value = '';
};

function iniciarCronometroAtendimento() {
    let seg = 0;
    const disp = document.getElementById('timer-atendimento');
    if (emailTimerInterval) clearInterval(emailTimerInterval);
    emailTimerInterval = setInterval(() => {
        seg++;
        const m = Math.floor(seg / 60).toString().padStart(2, '0');
        const s = (seg % 60).toString().padStart(2, '0');
        disp.textContent = `${m}:${s}`;
    }, 1000);
}

// ============================= //
// UTILITÁRIOS                   //
// ============================= //
function getCurrentTime() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function scrollChatToBottom() {
    const chatbox = document.getElementById('chatbox');
    if (!chatbox) return;
    chatbox.scrollTop = chatbox.scrollHeight;
}

function addSystemMessage(text) {
    const chatbox = document.getElementById('chatbox');
    if (!chatbox) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg cliente';
    msgDiv.innerHTML = `
        <div class="msg-content">${escapeHtml(text)}</div>
        <div class="msg-time">${getCurrentTime()}</div>
    `;
    chatbox.appendChild(msgDiv);
    scrollChatToBottom();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showElementById(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

// ============================= //
// HISTÓRICO DE ATENDIMENTOS      //
// ============================= //

// Dados mockados de histórico
const MOCK_HISTORICO = [
    {
        id: 'MS-20251111-223841',
        cliente: 'Marcos Oliveira',
        telefone: '(11) 98888-7777',
        email: 'marcos@email.com',
        tipo: 'financeiro',
        status: 'concluido',
        dataAbertura: '2025-01-09T14:30:00',
        dataConclusao: '2025-01-09T14:52:00',
        tempoAtendimento: 22, // minutos
        validacaoIdentidade: true,
        descricao: 'Cliente solicitou esclarecimentos sobre valores cobrados na última fatura. Foi explicado detalhadamente cada item e fornecido comprovante por e-mail.',
        observacoes: 'Cliente satisfeito com o atendimento. Solicitou fatura detalhada.',
        setorDerivado: null,
        timeline: [
            { hora: '14:30', texto: 'Ticket criado' },
            { hora: '14:32', texto: 'Atribuído ao atendente' },
            { hora: '14:35', texto: 'Identidade validada' },
            { hora: '14:37', texto: 'Atendimento iniciado' },
            { hora: '14:52', texto: 'Ticket concluído' }
        ]
    },
    {
        id: 'MS-20251109-145632',
        cliente: 'Ana Silva',
        telefone: '(11) 97777-6666',
        email: 'ana.silva@email.com',
        tipo: 'conteudo',
        status: 'derivado',
        dataAbertura: '2025-01-09T10:15:00',
        dataConclusao: '2025-01-09T10:28:00',
        tempoAtendimento: 13,
        validacaoIdentidade: true,
        descricao: 'Solicitação de alteração de capa de música já publicada. Cliente deseja trocar a imagem por questões de direitos autorais.',
        observacoes: 'Demanda técnica, encaminhada para a equipe de conteúdo.',
        setorDerivado: 'conteudo',
        timeline: [
            { hora: '10:15', texto: 'Ticket criado' },
            { hora: '10:17', texto: 'Atribuído ao atendente' },
            { hora: '10:20', texto: 'Identidade validada' },
            { hora: '10:22', texto: 'Atendimento iniciado' },
            { hora: '10:28', texto: 'Encaminhado para Conteúdo' }
        ]
    },
    {
        id: 'MS-20251108-092145',
        cliente: 'Carlos Mendes',
        telefone: '(11) 96666-5555',
        email: 'carlos.mendes@email.com',
        tipo: 'strike',
        status: 'derivado',
        dataAbertura: '2025-01-08T09:21:00',
        dataConclusao: '2025-01-08T09:45:00',
        tempoAtendimento: 24,
        validacaoIdentidade: true,
        descricao: 'Cliente recebeu notificação de strike no YouTube. Alega não ter infringido nenhuma regra e solicita revisão urgente.',
        observacoes: 'Caso requer análise jurídica. Encaminhado para Copyright.',
        setorDerivado: 'copyright',
        timeline: [
            { hora: '09:21', texto: 'Ticket criado' },
            { hora: '09:23', texto: 'Atribuído ao atendente' },
            { hora: '09:28', texto: 'Identidade validada' },
            { hora: '09:30', texto: 'Atendimento iniciado' },
            { hora: '09:45', texto: 'Encaminhado para Copyright' }
        ]
    },
    {
        id: 'MS-20251108-163021',
        cliente: 'Patricia Costa',
        telefone: '(11) 95555-4444',
        email: 'patricia@email.com',
        tipo: 'conta',
        status: 'concluido',
        dataAbertura: '2025-01-08T16:30:00',
        dataConclusao: '2025-01-08T16:42:00',
        tempoAtendimento: 12,
        validacaoIdentidade: true,
        descricao: 'Cliente esqueceu a senha de acesso ao painel e solicitou redefinição. Processo de recuperação realizado com sucesso.',
        observacoes: 'Orientações de segurança fornecidas.',
        setorDerivado: null,
        timeline: [
            { hora: '16:30', texto: 'Ticket criado' },
            { hora: '16:32', texto: 'Atribuído ao atendente' },
            { hora: '16:35', texto: 'Identidade validada' },
            { hora: '16:38', texto: 'Atendimento iniciado' },
            { hora: '16:42', texto: 'Ticket concluído' }
        ]
    },
    {
        id: 'MS-20251107-114512',
        cliente: 'Roberto Santos',
        telefone: '(11) 94444-3333',
        email: 'roberto@email.com',
        tipo: 'tecnico',
        status: 'derivado',
        dataAbertura: '2025-01-07T11:45:00',
        dataConclusao: '2025-01-07T12:03:00',
        tempoAtendimento: 18,
        validacaoIdentidade: false,
        descricao: 'Problema técnico com upload de arquivos. Cliente relata erro ao tentar enviar músicas para distribuição.',
        observacoes: 'Problema técnico requer análise. Encaminhado para suporte técnico.',
        setorDerivado: 'tecnico',
        timeline: [
            { hora: '11:45', texto: 'Ticket criado' },
            { hora: '11:47', texto: 'Atribuído ao atendente' },
            { hora: '11:50', texto: 'Atendimento iniciado' },
            { hora: '12:03', texto: 'Encaminhado para Técnico' }
        ]
    }
];

let currentHistoricoFiltrado = [...MOCK_HISTORICO];
let selectedHistoricoId = null;

// ==========================================================
// CONTROLE DO HISTÓRICO (WHATSAPP & GMAIL)
// ==========================================================

let canalHistoricoAtual = 'whatsapp'; // Estado global inicial

// 1. Inicialização da Tab de Histórico
function initHistoricoTab() {
    const subBotoes = document.querySelectorAll('.sub-aba-btn');

    subBotoes.forEach(btn => {
        btn.onclick = () => {
            subBotoes.forEach(b => b.classList.remove('ativa'));
            btn.classList.add('ativa');

            canalHistoricoAtual = btn.dataset.canal;
            console.log("📂 Mudando histórico para:", canalHistoricoAtual);

            ajustarFiltrosPorCanal();
            carregarDadosHistorico();
        };
    });

    // Ouvintes para os filtros existentes
    const searchInp = document.getElementById('searchHistorico');
    const filterPer = document.getElementById('filtroPeriodo');

    if (searchInp) searchInp.addEventListener('input', carregarDadosHistorico);
    if (filterPer) filterPer.addEventListener('change', carregarDadosHistorico);

    // Carregamento inicial
    ajustarFiltrosPorCanal();
    carregarDadosHistorico();
}

// 2. Ajusta a UI conforme o canal (Gmail ou WhatsApp)
function ajustarFiltrosPorCanal() {
    // Esconde filtros que são apenas do WhatsApp quando estiver no Gmail
    const filtrosWhats = ['filtroAreaDerivada', 'filtroTipoDemanda'];
    filtrosWhats.forEach(id => {
        const el = document.getElementById(id)?.closest('.filtro-historico');
        if (el) el.style.display = canalHistoricoAtual === 'gmail' ? 'none' : 'block';
    });

    // Ajusta as opções do Select de Status
    const optDerivado = document.querySelector('#filtroStatus option[value="derivado"]');
    const optDevolvido = document.querySelector('#filtroStatus option[value="devolvido"]');
    const labelDerivado = document.querySelector('.stat-historico-label[id-target="derivado"]');

    if (canalHistoricoAtual === 'gmail') {
        if (optDerivado) optDerivado.style.display = 'none';
        if (optDevolvido) optDevolvido.style.display = 'block';
        if (labelDerivado) labelDerivado.innerText = 'Devolvidos';
    } else {
        if (optDerivado) optDerivado.style.display = 'block';
        if (optDevolvido) optDevolvido.style.display = 'none';
        if (labelDerivado) labelDerivado.innerText = 'Derivados';
    }
}

// 3. Carregamento Principal de Dados
async function carregarDadosHistorico() {
    const lista = document.getElementById('listaHistorico');
    if (!lista) return;

    lista.innerHTML = '<div class="carregando">Carregando...</div>';

    if (canalHistoricoAtual === 'gmail') {
        // --- GMAIL: DADOS REAIS DO FIRESTORE ---
        const { db, fStore } = window.FirebaseApp;
        try {
            const q = fStore.query(
                fStore.collection(db, "atend_emails_historico"),
                fStore.orderBy("finalizado_em", "desc"),
                fStore.limit(30)
            );
            const querySnapshot = await fStore.getDocs(q);

            lista.innerHTML = '';

            if (querySnapshot.empty) {
                lista.innerHTML = '<div class="vazio">Nenhum e-mail no histórico.</div>';
                atualizarStatsHistorico(0);
                return;
            }

            querySnapshot.forEach(doc => {
                lista.appendChild(renderizarCardEmail(doc.data(), doc.id));
            });

            atualizarStatsHistorico(querySnapshot.size);
        } catch (error) {
            console.error("Erro no Firestore Gmail:", error);
            lista.innerHTML = '<div class="erro">Erro ao carregar dados.</div>';
        }
    } else {
        // --- WHATSAPP: DADOS MOCK (HISTORICODATA) ---
        lista.innerHTML = '';
        if (typeof historicoData !== 'undefined' && historicoData.length > 0) {
            historicoData.forEach((item, index) => {
                lista.appendChild(renderizarCardWhats(item, index));
            });
            atualizarStatsHistorico(historicoData.length);
        } else {
            lista.innerHTML = '<div class="vazio">Nenhum registro de WhatsApp.</div>';
        }
    }
}

// 4. Renderizador do Card de WhatsApp
function renderizarCardWhats(item, id) {
    const div = document.createElement('div');
    div.className = 'historico-item';
    div.innerHTML = `
        <div class="historico-info">
            <div class="historico-cliente">
                <strong>${item.cliente}</strong>
                <span class="ticket-id">#${item.id || id}</span>
            </div>
            <div class="historico-detalhes">
                <span class="badge-tipo">${item.tipo || 'Geral'}</span>
                <span class="badge-area">${item.area || 'Atendimento'}</span>
                <span class="historico-data"><i class="fi fi-rr-calendar"></i> ${item.data || 'Agora'}</span>
            </div>
        </div>
        <div class="historico-status">
            <span class="status-tag status-${item.status}">${item.status.toUpperCase()}</span>
            <button class="btn-detalhes" onclick="verDetalhesAtendimento('${id}')">
                <i class="fi fi-rr-eye"></i>
            </button>
        </div>
    `;
    return div;
}

// 5. Renderizador do Card de Email (Gmail)
function renderizarCardEmail(item, id) {
    const div = document.createElement('div');
    div.className = 'historico-item card-email';

    // Formatação da data para o padrão Lujo
    const dataObj = item.finalizado_em ? item.finalizado_em.toDate() : new Date();
    const dataFmt = dataObj.toLocaleDateString('pt-BR');
    const horaFmt = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const statusClass = item.status === 'devolvido' ? 'devolvido' : 'enviado';
    const statusLabel = item.status === 'devolvido' ? 'DEVOLVIDO' : 'ENVIADO';

    div.innerHTML = `
        <div class="card-email-main">
            <div class="card-email-header">
                <span class="card-email-sender">${item.remetente_nome || 'Cliente'}</span>
                <span class="badge-gmail-tag">Gmail</span>
            </div>
            <div class="card-email-subject">
                ${item.assunto || '(Sem Assunto)'}
            </div>
            <div class="card-email-meta">
                <span class="meta-item"><i class="fi fi-rr-calendar"></i> ${dataFmt}</span>
                <span class="meta-item"><i class="fi fi-rr-clock"></i> ${horaFmt}</span>
                <span class="meta-item"><i class="fi fi-rr-envelope"></i> ${item.remetente_email || ''}</span>
            </div>
        </div>
        <div class="card-email-aside">
            <span class="status-email-pill ${statusClass}">${statusLabel}</span>
            <button class="btn-view-email" onclick="abrirDetalhesHistorico('${id}')" title="Ver Detalhes">
                <i class="fi fi-rr-search-alt"></i>
            </button>
        </div>
    `;
    return div;
}
// 6. Atualização das Estatísticas Superiores
function atualizarStatsHistorico(quantidade) {
    const elTotal = document.getElementById('statTotalAtendimentos');
    const elConcluidos = document.getElementById('statConcluidos');
    const elDerivados = document.getElementById('statDerivados'); // Representa Derivados ou Devolvidos

    if (elTotal) elTotal.innerText = quantidade;

    if (canalHistoricoAtual === 'gmail') {
        // Cálculo simples para o Gmail (pode ser refinado conforme você salva os dados)
        if (elConcluidos) elConcluidos.innerText = quantidade;
        if (elDerivados) elDerivados.innerText = '0';
    } else {
        // Mocks para o WhatsApp
        if (elConcluidos) elConcluidos.innerText = Math.floor(quantidade * 0.8);
        if (elDerivados) elDerivados.innerText = Math.floor(quantidade * 0.2);
    }
}
async function abrirDetalhesHistorico(id) {
    console.log("🔍 Buscando detalhes do e-mail:", id);
    const { db, fStore } = window.FirebaseApp;

    try {
        const docRef = fStore.doc(db, "atend_emails_historico", id);
        const docSnap = await fStore.getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Preenche o Assunto
            document.getElementById('detalheEmailAssunto').innerText = data.assunto || '(Sem Assunto)';

            // Preenche os Metadados
            document.getElementById('detalheEmailMeta').innerHTML = `
                <strong>De:</strong> ${data.remetente_nome} &lt;${data.remetente_email}&gt;<br>
                <strong>Finalizado em:</strong> ${data.finalizado_em?.toDate().toLocaleString()}<br>
                <strong>Status:</strong> ${data.status?.toUpperCase()}
            `;

            // Preenche o Corpo (HTML)
            document.getElementById('detalheEmailCorpo').innerHTML = data.corpo_html
                || 'Conteúdo vazio.';

            // Mostra o Modal
            document.getElementById('modalDetalhesEmail').style.display = 'flex';
        } else {
            showToast("Erro: Registro não encontrado no banco de dados.");
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes:", error);
        showToast("Não foi possível carregar os detalhes.");
    }
}

// Função para fechar
function fecharModalDetalhes() {
    document.getElementById('modalDetalhesEmail').style.display = 'none';
}

// Filtros
function initHistoricoFilters() {
    const filtroPeriodo = document.getElementById('filtroPeriodo');
    const filtroDataInicio = document.getElementById('filtroDataInicio');
    const filtroDataFim = document.getElementById('filtroDataFim');
    const filtroStatus = document.getElementById('filtroStatus');
    const filtroAreaDerivada = document.getElementById('filtroAreaDerivada');
    const filtroTipoDemanda = document.getElementById('filtroTipoDemanda');
    const searchInput = document.getElementById('searchHistorico');

    // Período
    if (filtroPeriodo) {
        filtroPeriodo.addEventListener('change', (e) => {
            const periodo = e.target.value;
            const hoje = new Date();
            let dataInicio = new Date();

            switch (periodo) {
                case 'hoje':
                    dataInicio = new Date();
                    break;
                case 'ontem':
                    dataInicio.setDate(hoje.getDate() - 1);
                    break;
                case 'semana':
                    dataInicio.setDate(hoje.getDate() - 7);
                    break;
                case 'mes':
                    dataInicio.setMonth(hoje.getMonth() - 1);
                    break;
                case 'total':
                    dataInicio = null;
                    break;
                case 'customizado':
                    // Não faz nada, usuário define manualmente
                    return;
            }

            if (dataInicio) {
                if (filtroDataInicio) filtroDataInicio.value = dataInicio.toISOString().split('T')[0];
                if (filtroDataFim) filtroDataFim.value = hoje.toISOString().split('T')[0];
            } else {
                if (filtroDataInicio) filtroDataInicio.value = '';
                if (filtroDataFim) filtroDataFim.value = '';
            }

            aplicarFiltrosHistorico();
        });
    }

    // Outros filtros
    [filtroDataInicio, filtroDataFim, filtroStatus, filtroAreaDerivada, filtroTipoDemanda].forEach(filtro => {
        if (filtro) {
            filtro.addEventListener('change', aplicarFiltrosHistorico);
        }
    });

    // Busca
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            aplicarFiltrosHistorico();
        });
    }
}

// Aplicar filtros
function aplicarFiltrosHistorico() {
    const searchTerm = document.getElementById('searchHistorico')?.value.toLowerCase() || '';
    const dataInicio = document.getElementById('filtroDataInicio')?.value;
    const dataFim = document.getElementById('filtroDataFim')?.value;
    const status = document.getElementById('filtroStatus')?.value;
    const area = document.getElementById('filtroAreaDerivada')?.value;
    const tipo = document.getElementById('filtroTipoDemanda')?.value;

    let filtrado = [...MOCK_HISTORICO];

    // Busca textual
    if (searchTerm) {
        filtrado = filtrado.filter(item =>
            item.cliente.toLowerCase().includes(searchTerm) ||
            item.id.toLowerCase().includes(searchTerm) ||
            item.tipo.toLowerCase().includes(searchTerm)
        );
    }

    // Data início
    if (dataInicio) {
        const dataInicioObj = new Date(dataInicio);
        filtrado = filtrado.filter(item => new Date(item.dataAbertura) >= dataInicioObj);
    }

    // Data fim
    if (dataFim) {
        const dataFimObj = new Date(dataFim + 'T23:59:59');
        filtrado = filtrado.filter(item => new Date(item.dataAbertura) <= dataFimObj);
    }

    // Status
    if (status && status !== 'todos') {
        filtrado = filtrado.filter(item => item.status === status);
    }

    // Área derivada
    if (area && area !== 'todas') {
        filtrado = filtrado.filter(item => item.setorDerivado === area);
    }

    // Tipo de demanda
    if (tipo && tipo !== 'todos') {
        filtrado = filtrado.filter(item => item.tipo === tipo);
    }

    currentHistoricoFiltrado = filtrado;
    renderHistorico();
    atualizarEstatisticasHistorico();
}

// Renderizar histórico
function renderHistorico() {
    const container = document.getElementById('listaHistorico');
    if (!container) return;

    if (currentHistoricoFiltrado.length === 0) {
        container.innerHTML = `
            <div class="historico-empty">
                <i class="fi fi-rr-search"></i>
                <h3>Nenhum atendimento encontrado</h3>
                <p>Tente ajustar os filtros para visualizar mais resultados</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentHistoricoFiltrado.map(item => {
        const dataAbertura = new Date(item.dataAbertura);
        const dataConclusao = item.dataConclusao ? new Date(item.dataConclusao) : null;

        return `
            <div class="historico-card" data-ticket-id="${item.id}">
                <div class="historico-card-header">
                    <span class="ticket-number">
                        <i class="fi fi-rr-ticket"></i>
                        ${item.id}
                    </span>
                    <span class="ticket-status-historico ${item.status}">
                        ${item.status === 'concluido' ? '✓ Concluído' :
                item.status === 'derivado' ? '→ Derivado' :
                    '↻ Reaberto'}
                    </span>
                </div>
                
                <div class="historico-cliente">
                    <i class="fi fi-rr-user"></i>
                    ${escapeHtml(item.cliente)}
                </div>
                
                <div class="historico-tipo">
                    <i class="fi fi-rr-document"></i>
                    ${formatarTipoDemanda(item.tipo)}
                </div>
                
                ${item.setorDerivado ? `
                    <div>
                        <span class="historico-setor ${item.setorDerivado}">
                            <i class="fi fi-rr-share"></i>
                            ${formatarSetorDerivado(item.setorDerivado)}
                        </span>
                    </div>
                ` : ''}
                
                <div class="historico-datas">
                    <div class="data-item">
                        <span class="data-label">Abertura</span>
                        <span class="data-value">${formatarData(dataAbertura)}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">${item.status === 'concluido' ? 'Conclusão' : 'Derivado'}</span>
                        <span class="data-value">${dataConclusao ? formatarData(dataConclusao) : '-'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">Tempo</span>
                        <span class="data-value">${item.tempoAtendimento}min</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Adicionar event listeners
    container.querySelectorAll('.historico-card').forEach(card => {
        card.addEventListener('click', function () {
            const ticketId = this.dataset.ticketId;
            abrirModalDetalhes(ticketId);
        });
    });
}

// Atualizar estatísticas
function atualizarEstatisticasHistorico() {
    const total = currentHistoricoFiltrado.length;
    const concluidos = currentHistoricoFiltrado.filter(item => item.status === 'concluido').length;
    const derivados = currentHistoricoFiltrado.filter(item => item.status === 'derivado').length;

    // Tempo médio
    const tempoTotal = currentHistoricoFiltrado.reduce((acc, item) => acc + item.tempoAtendimento, 0);
    const tempoMedio = total > 0 ? Math.round(tempoTotal / total) : 0;

    // Atualizar DOM
    const statTotal = document.getElementById('statTotalAtendimentos');
    const statConcluidos = document.getElementById('statConcluidos');
    const statDerivados = document.getElementById('statDerivados');
    const statTempoMedio = document.getElementById('statTempoMedio');

    if (statTotal) statTotal.textContent = total;
    if (statConcluidos) statConcluidos.textContent = concluidos;
    if (statDerivados) statDerivados.textContent = derivados;
    if (statTempoMedio) statTempoMedio.textContent = `${tempoMedio}min`;
}

// Modal
function initHistoricoModal() {
    const btnFechar1 = document.getElementById('btnFecharModalHistorico');
    const btnFechar2 = document.getElementById('btnFecharModalHistorico2');
    const btnReabrir = document.getElementById('btnReabrirAtendimento');

    [btnFechar1, btnFechar2].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', fecharModalHistorico);
        }
    });

    if (btnReabrir) {
        btnReabrir.addEventListener('click', () => {
            if (selectedHistoricoId) {
                reabrirAtendimento(selectedHistoricoId);
            }
        });
    }
}

// Abrir modal de detalhes
function abrirModalDetalhes(ticketId) {
    const item = MOCK_HISTORICO.find(h => h.id === ticketId);
    if (!item) return;

    selectedHistoricoId = ticketId;

    // Preencher modal
    document.getElementById('modalTituloCliente').textContent = item.cliente;
    document.getElementById('modalTicketNumber').textContent = `Ticket ${item.id}`;

    // Informações principais
    const infoPrincipais = document.getElementById('modalInfoPrincipais');
    if (infoPrincipais) {
        infoPrincipais.innerHTML = `
            <div class="info-item-modal">
                <span class="info-label-modal">Telefone</span>
                <span class="info-value-modal">${escapeHtml(item.telefone)}</span>
            </div>
            <div class="info-item-modal">
                <span class="info-label-modal">E-mail</span>
                <span class="info-value-modal">${escapeHtml(item.email)}</span>
            </div>
            <div class="info-item-modal">
                <span class="info-label-modal">Tipo de Demanda</span>
                <span class="info-value-modal">${formatarTipoDemanda(item.tipo)}</span>
            </div>
            <div class="info-item-modal">
                <span class="info-label-modal">Status</span>
                <span class="info-value-modal">${item.status === 'concluido' ? 'Concluído' : item.status === 'derivado' ? 'Derivado' : 'Reaberto'}</span>
            </div>
            <div class="info-item-modal">
                <span class="info-label-modal">Data Abertura</span>
                <span class="info-value-modal">${formatarDataCompleta(new Date(item.dataAbertura))}</span>
            </div>
            <div class="info-item-modal">
                <span class="info-label-modal">${item.status === 'concluido' ? 'Data Conclusão' : 'Data Derivação'}</span>
                <span class="info-value-modal">${item.dataConclusao ? formatarDataCompleta(new Date(item.dataConclusao)) : '-'}</span>
            </div>
            <div class="info-item-modal">
                <span class="info-label-modal">Tempo de Atendimento</span>
                <span class="info-value-modal">${item.tempoAtendimento} minutos</span>
            </div>
            <div class="info-item-modal">
                <span class="info-label-modal">Canal de Origem</span>
                <span class="info-value-modal">WhatsApp</span>
            </div>
        `;
    }

    // Validação de identidade
    const validacao = document.getElementById('modalValidacaoIdentidade');
    if (validacao) {
        if (item.validacaoIdentidade) {
            validacao.className = 'validacao-identidade';
            validacao.innerHTML = `
                <i class="fi fi-rr-check-circle validacao-icon validada"></i>
                <div class="validacao-text">
                    <strong>Identidade Validada</strong>
                    <p>Nome, telefone e e-mail confirmados durante o atendimento</p>
                </div>
            `;
        } else {
            validacao.className = 'validacao-identidade nao-validada';
            validacao.innerHTML = `
                <i class="fi fi-rr-cross-circle validacao-icon nao-validada"></i>
                <div class="validacao-text">
                    <strong>Identidade Não Validada</strong>
                    <p>Atendimento realizado sem validação completa</p>
                </div>
            `;
        }
    }

    // Descrição
    const descricao = document.getElementById('modalDescricao');
    if (descricao) {
        descricao.innerHTML = `<p>${escapeHtml(item.descricao)}</p>`;
    }

    // Observações
    const observacoes = document.getElementById('modalObservacoes');
    if (observacoes && item.observacoes) {
        observacoes.innerHTML = `<p>${escapeHtml(item.observacoes)}</p>`;
    }

    // Setor responsável
    const setorSection = document.getElementById('modalSetorSection');
    const setorResponsavel = document.getElementById('modalSetorResponsavel');
    if (item.setorDerivado && setorSection && setorResponsavel) {
        setorSection.classList.remove('hidden');
        setorResponsavel.innerHTML = `
            <span class="historico-setor ${item.setorDerivado}" style="font-size: 14px; padding: 8px 16px;">
                <i class="fi fi-rr-users-alt"></i>
                ${formatarSetorDerivado(item.setorDerivado)}
            </span>
        `;
    } else if (setorSection) {
        setorSection.classList.add('hidden');
    }

    // Timeline
    const timeline = document.getElementById('modalTimeline');
    if (timeline && item.timeline) {
        timeline.innerHTML = item.timeline.map(evento => `
            <div class="timeline-item-modal">
                <div class="timeline-dot-modal"></div>
                <div class="timeline-content-modal">
                    <span class="timeline-time-modal">${evento.hora}</span>
                    <span class="timeline-text-modal">${escapeHtml(evento.texto)}</span>
                </div>
            </div>
        `).join('');
    }

    // Botão reabrir (verificar permissão)
    const btnReabrir = document.getElementById('btnReabrirAtendimento');
    if (btnReabrir) {
        if (hasPermission('atendimento.reopen') && item.status === 'concluido') {
            btnReabrir.classList.remove('hidden');
        } else {
            btnReabrir.classList.add('hidden');
        }
    }

    // Abrir modal
    const modal = document.getElementById('modalHistoricoDetalhes');
    if (modal) {
        modal.classList.add('active');
    }
}

// Fechar modal
function fecharModalHistorico() {
    const modal = document.getElementById('modalHistoricoDetalhes');
    if (modal) {
        modal.classList.remove('active');
    }
    selectedHistoricoId = null;
}

// Reabrir atendimento
function reabrirAtendimento(ticketId) {
    const item = MOCK_HISTORICO.find(h => h.id === ticketId);
    if (!item) return;

    if (confirm(`Deseja realmente reabrir o atendimento de ${item.cliente}?\n\nTicket: ${ticketId}`)) {
        // Aqui você implementaria a lógica real de reabertura
        showToast(`✓ Atendimento reaberto com sucesso!\n\nO ticket ${ticketId} foi reaberto e está disponível na fila de atendimentos.`);

        fecharModalHistorico();

        // Atualizar status no mock (apenas para demonstração)
        item.status = 'reaberto';
        renderHistorico();
    }
}

// Funções auxiliares
function formatarTipoDemanda(tipo) {
    const tipos = {
        'conteudo': 'Conteúdo',
        'financeiro': 'Financeiro',
        'conta': 'Conta',
        'strike': 'Strike/Copyright',
        'tecnico': 'Técnico'
    };
    return tipos[tipo] || tipo;
}

function formatarSetorDerivado(setor) {
    const setores = {
        'financeiro': 'Financeiro',
        'copyright': 'Copyright',
        'marketing': 'Marketing',
        'tecnico': 'Técnico',
        'conteudo': 'Conteúdo',
        'atendimento': 'Atendimento'
    };
    return setores[setor] || setor;
}

function formatarData(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');

    return `${dia}/${mes} ${hora}:${min}`;
}

function formatarDataCompleta(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
}

console.log("✅ Módulo de Atendimento carregado com funcionalidade de Emails");
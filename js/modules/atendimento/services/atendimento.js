// ==================== ATENDIMENTO.JS (REFATORADO) ====================
// Módulo de Atendimento com integração completa dos componentes Core
// Padrão baseado em admin.js para consistência

// ===== CONFIGURAÇÃO DO MÓDULO =====
const MODULE_ID = window.atendimentoModuleId || 'atendimento';
window.atendimentoModuleId = MODULE_ID;

// Mock de histórico para inicialização
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
        tempoAtendimento: 22,
        validacaoIdentidade: true,
        descricao: 'Cliente solicitou esclarecimentos sobre valores. Foi explicado cada item.',
        observacoes: 'Cliente satisfeito com o atendimento.',
        setorDerivado: null,
        timeline: [
            { hora: '14:30', texto: 'Ticket criado' },
            { hora: '14:32', texto: 'Atribuído ao atendente' },
            { hora: '14:35', texto: 'Identidade validada' },
            { hora: '14:52', texto: 'Ticket concluído' }
        ]
    }
    // ... adicionar mais mocks conforme necessário
];


// ===== INICIALIZAÇÃO DO MÓDULO =====
/**
 * Ponto de entrada principal do módulo de atendimento
 * Inicializa todos os componentes em ordem correta
 */
if (typeof window.initAtendimentoModule === 'undefined') {
    window.initAtendimentoModule = async function() {
        console.log("🔧 Inicializando Módulo de Atendimento");

        try {
            // 1. Aguardar usuário estar carregado
            console.log("⏳ Aguardando usuário...");
            await window.AuthSystem.ensureUserLoaded();
            console.log("✅ Usuário carregado");

            // 2. Inicializar StateManager (gerencia estado do módulo)
            console.log("⏳ Inicializando StateManager...");
            window.StateManager.init(MODULE_ID, {
                currentTicket: null,
                currentEmail: null,
                activeTab: 'aba-atendimento',
                historicoFiltrado: [...MOCK_HISTORICO],
                canalHistorico: 'whatsapp',
                emailTimerRunning: false,
                ticketTimerRunning: false
            });
            console.log("✅ StateManager inicializado");

            // 3. Inicializar componentes de UI em ordem CRÍTICA
            console.log("⏳ Inicializando abas...");
            const absOk = initAtendimentoTabs();
            if (!absOk) {
                console.error("❌ Falha ao inicializar abas");
                // Continuar mesmo assim (fallback já foi configurado)
            }
            console.log("✅ Abas inicializadas");

            console.log("⏳ Inicializando handlers de modais...");
            initModalHandlers();
            console.log("✅ Modais inicializados");

            console.log("⏳ Inicializando WhatsApp...");
            initAtendimentoWhatsApp();
            console.log("✅ WhatsApp inicializado");

            console.log("⏳ Inicializando e-mails...");
            initEmailsTab();
            console.log("✅ E-mails inicializados");

            console.log("⏳ Inicializando histórico...");
            initHistoricoTab();
            console.log("✅ Histórico inicializado");

            console.log("🎉 Módulo de Atendimento inicializado COM SUCESSO");

        } catch (error) {
            console.error("❌ ERRO CRÍTICO ao inicializar módulo:", error);
            console.error(error.stack);
            // Não falhar silenciosamente - informar o usuário
            showToast('Erro ao inicializar módulo. Recarregue a página.', 'error');
        }
    };
}

// ===== SEÇÃO 1: GERENCIAMENTO DE ABAS PRINCIPAIS =====
/**
 * Inicializa o sistema de abas principais do atendimento
 * Usa TabManager para garantir consistência com outros módulos
 * Abas: Atendimento, E-mails, Demandas, Histórico
 */
function initAtendimentoTabs() {
    const container = document.querySelector('.modulo-painel-atendimento');
    
    if (!container) {
        console.error('❌ Container do módulo atendimento NÃO encontrado');
        return false;
    }

    console.log('📍 Container encontrado:', container);

    // Verificar se TabManager está disponível
    if (!window.TabManager) {
        console.error('❌ TabManager não está carregado');
        return false;
    }

    // ===== TRAVA 1: Inicializar TabManager =====
    window.TabManager.init('.modulo-painel-atendimento', MODULE_ID, {
        tabButtonSelector: '.aba-btn',
        tabContentSelector: '.aba-conteudo',
        activeClass: 'ativa',
        onTabChange: (tabId, tabContent) => {
            console.log(`📑 Aba alterada para: ${tabId}`);
            
            // Atualizar estado (SEGURO)
            if (window.StateManager) {
                window.StateManager.set(MODULE_ID, { activeTab: tabId });
            }

            // Inicializar conteúdo específico da aba
            initializeTabContent(tabId);
        }
    });

    console.log('✅ TabManager inicializado com sucesso');

    // ===== TRAVA 2: Configurar cliques manualmente (FALLBACK) =====
    // Caso TabManager falhe, temos um plano B
    setupTabFallback(container);

    return true;
}

/**
 * FALLBACK: Se TabManager falhar, usar sistema manual
 * Isso garante que as abas funcionem mesmo em condições adversas
 */
function setupTabFallback(container) {
    const buttons = container.querySelectorAll('.aba-btn');
    const contents = container.querySelectorAll('.aba-conteudo');

    console.log(`🔄 Configurando fallback: ${buttons.length} botões, ${contents.length} conteúdos`);

    buttons.forEach(button => {
        // Remover listeners antigos (evitar duplicatas)
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Adicionar novo listener
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const targetTab = this.dataset.aba;
            if (!targetTab) {
                console.warn('⚠️ Botão sem data-aba:', this);
                return;
            }

            console.log(`🎯 Fallback: Ativando aba ${targetTab}`);

            // Desativar todos os botões
            buttons.forEach(btn => btn.classList.remove('ativa'));
            
            // Desativar todos os conteúdos
            contents.forEach(content => content.classList.remove('ativa'));

            // Ativar selecionado
            this.classList.add('ativa');
            
            // Procurar conteúdo correto
            const targetContent = container.querySelector(`.aba-conteudo.${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('ativa');
                console.log(`✅ Aba ativada: ${targetTab}`);

                // Callback
                if (window.StateManager) {
                    window.StateManager.set(MODULE_ID, { activeTab: targetTab });
                }
                initializeTabContent(targetTab);
            } else {
                console.error(`❌ Conteúdo não encontrado: .aba-conteudo.${targetTab}`);
            }
        });
    });
}


/**
 * Inicializa conteúdo específico quando uma aba é ativada
 * Evita carregar dados desnecessários
 */
function initializeTabContent(tabId) {
    switch(tabId) {
        case 'aba-atendimento':
            console.log("☎️ Aba de atendimento ativada");
            // Certificar que elementos de atendimento estão prontos
            ensureAtendimentoReady();
            break;
        case 'aba-emails':
            console.log("📧 Aba de e-mails ativada");
            // Emails já inicializados no initEmailsTab()
            break;
        case 'aba-demandas':
            console.log("📋 Aba de demandas ativada");
            break;
        case 'aba-historico':
            console.log("📚 Aba de histórico ativada");
            carregarDadosHistorico();
            break;
        default:
            console.warn(`⚠️ Aba desconhecida: ${tabId}`);
    }
}

function ensureAtendimentoReady() {
    const workspace = document.getElementById('workspaceGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (workspace && emptyState) {
        console.log('✅ Elementos de atendimento validados');
    } else {
        console.warn('⚠️ Elementos de atendimento faltando');
    }
}

// ===== SEÇÃO 2: VALIDAÇÃO DE IDENTIDADE =====
/**
 * Gerencia o fluxo de validação de identidade
 * Usa ModuleLifecycle para registrar listeners
 * Bloqueia progressão até todos os campos serem validados
 */
function initIdentityCheck() {
    const checks = ['checkNome', 'checkTelefone', 'checkEmail'];
    const btnValidar = document.getElementById('btnValidarIdentidade');

    if (!btnValidar) {
        console.warn("⚠️ Botão de validação não encontrado");
        return;
    }

    // Função de validação
    const validarInputs = () => {
        const todosMarcados = checks.every(id => {
            const el = document.getElementById(id);
            return el && el.checked;
        });
        btnValidar.disabled = !todosMarcados;
    };

    // Registrar listeners nos checkboxes (via ModuleLifecycle)
    checks.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            window.ModuleLifecycle.addListener(
                el,
                'change',
                validarInputs,
                MODULE_ID
            );
        }
    });

    // Registrar listener no botão de validação
    window.ModuleLifecycle.addListener(
        btnValidar,
        'click',
        async () => {
            try {
                btnValidar.disabled = true;
                btnValidar.textContent = 'Confirmando...';
                await new Promise(r => setTimeout(r, 400));

                // Atualizar estado no StateManager
                const state = window.StateManager.get(MODULE_ID);
                window.StateManager.set(MODULE_ID, {
                    currentTicket: {
                        ...(state.currentTicket || {}),
                        validacaoIdentidade: true
                    }
                });

                // Transição de estado visual
                updateTicketFlow('IDENTIDADE_VALIDADA');

                // Desabilitar checkboxes
                checks.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.disabled = true;
                });

                btnValidar.classList.add('hidden');
                addTimelineItem(getCurrentTime(), "Identidade validada");
                
                const statusBadge = document.getElementById('statusBadge');
                if (statusBadge) statusBadge.textContent = 'IDENTIDADE VALIDADA';

            } catch (error) {
                console.error('❌ Erro na validação:', error);
                showToast('Erro ao validar identidade', 'error');
                btnValidar.disabled = false;
                btnValidar.textContent = 'Confirmar Identidade';
            }
        },
        MODULE_ID
    );
}

// ===== SEÇÃO 3: TRANSIÇÕES DE ESTADO DO TICKET =====
/**
 * Gerencia a máquina de estados do ticket (FSM)
 * Estados: NOVO -> IDENTIDADE_VALIDADA -> EM_ATENDIMENTO -> CONCLUIDO/ENCAMINHADO
 * Atualiza UI baseado no estado atual
 */
function updateTicketFlow(novoEstado) {
    const statusBadge = document.getElementById('statusBadge');
    const stateIndicator = document.getElementById('stateIndicator');

    if (statusBadge) statusBadge.textContent = novoEstado.replace(/_/g, ' ');
    if (stateIndicator) stateIndicator.textContent = novoEstado.replace(/_/g, ' ');

    // Limpar ações anteriores
    const actionBarRight = document.querySelector('.action-bar-right');
    if (actionBarRight) {
        actionBarRight.querySelectorAll('button, .info-block').forEach(el => {
            el.classList.add('hidden');
        });
    }

    // Mostrar ações baseado no novo estado
    switch (novoEstado) {
        case 'NOVO':
            showActionButton('btnValidarIdentidade');
            break;
        case 'IDENTIDADE_VALIDADA':
            showActionButton('btnIniciarAtendimento');
            break;
        case 'EM_ATENDIMENTO':
            showActionButton('btnConcluir');
            showActionButton('btnEncaminhar');
            startTicketTimer();
            break;
        case 'ENCAMINHADO':
            showActionElement('infoEncaminhado');
            break;
        case 'AGUARDANDO_CLIENTE':
            showActionElement('infoAguardandoCliente');
            break;
    }

    // Mostrar chat em qualquer estado que não seja inicial
    const chatInputContainer = document.getElementById('chatInputContainer');
    if (chatInputContainer && novoEstado !== 'NOVO') {
        chatInputContainer.classList.remove('hidden');
    }
}

/**
 * Mostra um botão de ação (remove hidden e ativa)
 */
function showActionButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.remove('hidden');
        button.disabled = false;
    }
}

/**
 * Mostra um elemento de informação (remove hidden)
 */
function showActionElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.classList.remove('hidden');
}

// ===== SEÇÃO 4: AÇÕES DE TRANSIÇÃO =====
/**
 * Registra listeners para botões de ação do ticket
 * Usa ModuleLifecycle para garantir cleanup correto
 * Botões: Iniciar, Concluir, Encaminhar
 */
function initStateTransitions() {
    // Botão: Iniciar Atendimento
    const btnIniciar = document.getElementById('btnIniciarAtendimento');
    if (btnIniciar) {
        window.ModuleLifecycle.addListener(
            btnIniciar,
            'click',
            () => {
                updateTicketFlow('EM_ATENDIMENTO');
                addTimelineItem(getCurrentTime(), "Atendimento iniciado");
            },
            MODULE_ID
        );
    }

    // Botão: Concluir Ticket
    const btnConcluir = document.getElementById('btnConcluir');
    if (btnConcluir) {
        window.ModuleLifecycle.addListener(
            btnConcluir,
            'click',
            () => {
                if (confirm("Deseja realmente concluir este atendimento?")) {
                    addTimelineItem(getCurrentTime(), "Ticket concluído");
                    stopTicketTimer();
                    resetarPalcoAtendimento();
                    updateTicketFlow('NOVO');
                }
            },
            MODULE_ID
        );
    }

    // Botão: Encaminhar para Outro Setor
    const btnEncaminhar = document.getElementById('btnEncaminhar');
    if (btnEncaminhar) {
        window.ModuleLifecycle.addListener(
            btnEncaminhar,
            'click',
            () => {
                const setor = document.getElementById('setorResponsavel')?.value;
                if (!setor) {
                    showToast("⚠️ Selecione o setor responsável antes de encaminhar.", 'warning');
                    return;
                }
                if (confirm(`Encaminhar ticket para o setor: ${setor}?`)) {
                    addTimelineItem(getCurrentTime(), `Encaminhado para ${setor}`);
                    stopTicketTimer();
                    resetarPalcoAtendimento();
                    updateTicketFlow('NOVO');
                }
            },
            MODULE_ID
        );
    }
}

// ===== SEÇÃO 5: CHAT E MENSAGENS =====
/**
 * Gerencia o sistema de chat do ticket
 * Usa ModuleLifecycle para registrar listeners
 * Features: Envio de mensagem, auto-resize, contador de caracteres
 */
function initChatActions() {
    const btnEnviar = document.getElementById('btnEnviarMensagem');
    const input = document.getElementById('chatInput');
    const charCounter = document.getElementById('charCounter');

    if (!input || !btnEnviar) {
        console.warn("⚠️ Elementos de chat não encontrados");
        return;
    }

    // Atualizar contador de caracteres em tempo real
    window.ModuleLifecycle.addListener(
        input,
        'input',
        () => {
            if (charCounter) {
                charCounter.textContent = `${input.value.length}/1000`;
            }
        },
        MODULE_ID
    );

    // Função de envio de mensagem
    const enviarMensagem = () => {
        const texto = input.value.trim();
        if (!texto) return;

        const chatbox = document.getElementById('chatbox');
        if (!chatbox) return;

        // Criar elemento da mensagem
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg atendente';
        msgDiv.innerHTML = `
            <div class="msg-content">${escapeHtml(texto)}</div>
            <div class="msg-time">${getCurrentTime()}</div>
        `;
        chatbox.appendChild(msgDiv);
        scrollChatToBottom();

        // Limpar input
        input.value = '';
        if (charCounter) charCounter.textContent = '0/1000';
        input.style.height = 'auto';
    };

    // Listener: Botão Enviar
    window.ModuleLifecycle.addListener(
        btnEnviar,
        'click',
        enviarMensagem,
        MODULE_ID
    );

    // Listener: Enter para enviar (Shift+Enter = quebra linha)
    window.ModuleLifecycle.addListener(
        input,
        'keypress',
        (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
            }
        },
        MODULE_ID
    );

    // Listener: Auto-resize do textarea
    window.ModuleLifecycle.addListener(
        input,
        'input',
        function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        },
        MODULE_ID
    );
}

// ===== SEÇÃO 6: TIMERS DO TICKET =====
/**
 * Gerencia cronômetros de atendimento
 * Mantém referências para cleanup correto quando sair do módulo
 * Exibe tempo decorrido em tempo real
 */
let ticketTimerInterval = null;

function startTicketTimer() {
    if (ticketTimerInterval) clearInterval(ticketTimerInterval);

    const tempoDecorrido = document.getElementById('tempoDecorrido');
    if (!tempoDecorrido) return;

    let segundos = 0;

    ticketTimerInterval = setInterval(() => {
        segundos++;
        const mins = Math.floor(segundos / 60);
        const secs = segundos % 60;
        tempoDecorrido.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);

    console.log("⏱️ Timer do ticket iniciado");
}

function stopTicketTimer() {
    if (ticketTimerInterval) {
        clearInterval(ticketTimerInterval);
        ticketTimerInterval = null;
        console.log("⏱️ Timer do ticket parado");
    }
}

// ===== SEÇÃO 7: TIMELINE DO TICKET =====
/**
 * Gerencia a linha do tempo visual do ticket
 * Mostra sequência de eventos do atendimento
 */
function addTimelineItem(hora, texto) {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    // Remover status "active" dos dots anteriores
    timeline.querySelectorAll('.timeline-dot').forEach(dot => {
        dot.classList.remove('active');
    });

    // Criar novo item de timeline
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

// ===== SEÇÃO 8: MODAIS DO ATENDIMENTO =====
/**
 * Inicializa todos os modais usando ModalManager
 * Garante comportamento consistente e cleanup automático
 * Modais: Justificativa, Direcionamento, Detalhes Email, Histórico
 */
function initModalHandlers() {
    // Modal: Justificativa de Devolução para Fila
    window.ModalManager.setup('modalJustificativa', MODULE_ID, {
        closeButtons: ['#btnCloseJustificativa', '.close-btn'],
        closeOnOverlay: true,
        clearForms: true,
        onClose: () => {
            document.getElementById('txtJustificativa').value = '';
        }
    });

    // Modal: Direcionamento para Outro Setor
    window.ModalManager.setup('modalDirecionarEmail', MODULE_ID, {
        closeButtons: ['#btnCloseDirecionamento', '.close-btn'],
        closeOnOverlay: true
    });

    // Modal: Detalhes do E-mail do Histórico
    window.ModalManager.setup('modalDetalhesEmail', MODULE_ID, {
        closeButtons: ['#btnCloseDetalhesEmail', '.close-btn'],
        closeOnOverlay: true,
        focusFirst: false
    });

    // Modal: Histórico Detalhes do Atendimento
    window.ModalManager.setup('modalHistoricoDetalhes', MODULE_ID, {
        closeButtons: ['#btnFecharModalHistorico', '#btnFecharModalHistorico2', '.close-btn'],
        closeOnOverlay: true,
        focusFirst: false
    });
}

// ===== SEÇÃO 9: SISTEMA DE ATENDIMENTO (WHATSAPP) =====
/**
 * Inicializa a aba de atendimento principal (WhatsApp/Telefone)
 * Gerencia popup de novo atendimento e workspace
 * Features: Simulação de novo cliente, popup aceitação
 */
function initAtendimentoWhatsApp() {
    const popup = document.getElementById('popupAtendimento');
    const btnAceitar = document.getElementById('btnIniciarAtendimentoPopup');

    if (!popup || !btnAceitar) {
        console.warn("⚠️ Elementos do popup não encontrados");
        return;
    }

    // Simular novo atendimento após 3 segundos
    setTimeout(() => {
        const nomeCliente = "Marcos Oliveira";
        const popupCliente = document.getElementById('popupCliente');
        if (popupCliente) popupCliente.textContent = nomeCliente;
        popup.style.display = 'flex';
        popup.setAttribute('aria-hidden', 'false');
    }, 3000);

    // Listener: Aceitar atendimento
    window.ModuleLifecycle.addListener(
        btnAceitar,
        'click',
        () => {
            popup.style.display = 'none';
            popup.setAttribute('aria-hidden', 'true');

            const emptyState = document.getElementById('emptyState');
            const workspace = document.getElementById('workspaceGrid');

            if (emptyState) emptyState.classList.add('hidden');
            if (workspace) workspace.classList.remove('hidden');

            // Preencher dados do cliente
            fillClientData({
                nome: "Marcos Oliveira",
                telefone: "(11) 98888-7777",
                email: "marcos@email.com"
            });

            // Inicializar componentes de interação
            initIdentityCheck();
            initStateTransitions();
            initChatActions();

            updateTicketFlow('NOVO');
            addTimelineItem(getCurrentTime(), "Novo ticket atribuído a você.");
        },
        MODULE_ID
    );
}

/**
 * Preenche os dados do cliente na interface
 * Atualiza StateManager com os dados
 */
function fillClientData(cliente) {
    const clienteNome = document.getElementById('clienteNome');
    const clienteTelefone = document.getElementById('clienteTelefone');
    const clienteEmail = document.getElementById('clienteEmail');
    const atribuidoEm = document.getElementById('atribuidoEm');

    if (clienteNome) clienteNome.value = cliente.nome;
    if (clienteTelefone) clienteTelefone.value = cliente.telefone;
    if (clienteEmail) clienteEmail.value = cliente.email;
    if (atribuidoEm) atribuidoEm.textContent = getCurrentTime();

    // Atualizar estado (StateManager)
    window.StateManager.set(MODULE_ID, {
        currentTicket: cliente
    });
}

/**
 * Reseta o palco de atendimento para estado inicial
 * Limpa dados, para timers, esconde workspace
 */
function resetarPalcoAtendimento() {
    stopTicketTimer();
    
    const workspace = document.getElementById('workspaceGrid');
    const emptyState = document.getElementById('emptyState');

    if (workspace) workspace.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');

    const statusBadge = document.getElementById('statusBadge');
    if (statusBadge) statusBadge.textContent = 'AGUARDANDO';

    // Limpar estado (StateManager)
    window.StateManager.set(MODULE_ID, {
        currentTicket: null
    });
}

// ===== SEÇÃO 10: EMAILS - CONFIGURAÇÃO DE TRANSAÇÕES =====
/**
 * Configuração de transações Firestore para emails
 * Garante operações atômicas e retry automático em caso de falha
 */
const TRANSACTION_CONFIG = {
    maxAttempts: 3,
    retryDelay: 300,
    timeoutMs: 5000
};

/**
 * Executa uma transação Firestore com retry automático
 * Previne race conditions em operações concorrentes
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

            if (attempt === config.maxAttempts) break;
            await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
    }

    throw new Error(`Transação falhou após ${config.maxAttempts} tentativas: ${lastError.message}`);
}

// ===== SEÇÃO 11: EMAILS - INICIALIZAÇÃO =====
/**
 * Inicializa funcionalidades de e-mails com Firestore
 * Configura listeners para fila de e-mails em tempo real
 * Features: Contagem de fila, retomada de atendimento ativo
 */
let emailTimerInterval = null;

const RESPOSTAS_PADROES = [
    { titulo: "Boas-vindas", texto: "Olá! Recebemos sua mensagem e nossa equipe já está analisando. Em breve retornaremos." },
    { titulo: "Financeiro - Boleto", texto: "Verificamos seu pagamento e ele já foi identificado em nosso sistema." },
    { titulo: "Solicitar Print", texto: "Poderia nos enviar um print da tela onde o erro ocorre para analisarmos?" }
];

function initEmailsTab() {
    const { db, fStore } = window.FirebaseApp;
    const userUID = window.AuthSystem?.getCurrentUser()?.uid;
    const userSetor = window.AuthSystem?.getCurrentUser()?.setor;

    if (!Array.isArray(userSetor) || userSetor.length === 0) {
        console.warn("⚠️ Setor do usuário ainda não carregado (deve ser array)");
        return;
    }

    if (!userUID) {
        console.error("❌ Usuário não autenticado");
        return;
    }

    console.log("📨 Módulo de E-mails inicializado para:", userUID);

    const countBadge = document.getElementById('emailFilaCount');
    const listaEspera = document.getElementById('emailFilaLista');
    const btnPuxar = document.getElementById('btnChamarProximo');

    if (!btnPuxar) {
        console.warn("⚠️ Botão de puxar e-mail não encontrado");
        return;
    }

    // ===== LISTENER 1: Fila de E-mails em Tempo Real =====
    try {
        const setoresFiltro = Array.isArray(userSetor) ? userSetor : [userSetor];
        const qFila = fStore.query(
            fStore.collection(db, "atend_emails_fila"),
            fStore.where("status", "==", "novo"),
            fStore.where("grupo", "in", setoresFiltro),
            fStore.orderBy("metadata_recebido_em", "asc"),
            fStore.limit(20)
        );

        fStore.onSnapshot(qFila, (snap) => {
            console.log("📊 Fila atualizada:", snap.size, "e-mails");

            if (countBadge) {
                countBadge.textContent = snap.size;
                countBadge.style.transform = "scale(1.2)";
                setTimeout(() => countBadge.style.transform = "scale(1)", 200);
            }

            if (!listaEspera) return;

            if (snap.empty) {
                listaEspera.innerHTML = '<div class="item-espera vazia">Fila vazia</div>';
            } else {
                listaEspera.innerHTML = '';
                snap.forEach(doc => {
                    const dados = doc.data();
                    listaEspera.innerHTML += `
                        <div class="item-espera">
                            <div class="item-info">
                                <strong>${escapeHtml(dados.assunto || 'Sem Assunto')}</strong>
                                <span>${escapeHtml(dados.remetente_email || 'Sem E-mail')}</span>
                            </div>
                            <span class="badge-setor">${(dados.grupo || 'Geral').toUpperCase()}</span>
                        </div>
                    `;
                });
            }
        }, (error) => {
            console.error("❌ Erro no Listener da Fila:", error);
            if (error.code === 'failed-precondition') {
                console.error("🔗 Índice necessário:", error.message);
            }
            if (error.code === 'permission-denied') {
                showToast("Erro de permissão. Contate o administrador.", 'error');
            }
        });

    } catch (error) {
        console.error("❌ Erro ao configurar listener:", error);
    }

    // ===== LISTENER 2: Retomada de Atendimento Ativo =====
    try {
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
                window.currentEmailId = docAtivo.id;

                console.log("📌 Atendimento ativo recuperado:", docAtivo.id);

                exibirEmailNoPalco({
                    id: docAtivo.id,
                    remetente_email: dados.remetente_email,
                    remetente_nome: dados.remetente_nome || "Cliente",
                    assunto: dados.assunto,
                    corpo_html: dados.corpo_html,
                    threadId: dados.threadId || docAtivo.id
                });
            }
        }, (error) => {
            console.error("❌ Erro na Retomada:", error);
            if (error.code === 'failed-precondition') {
                console.error("🔗 Crie o índice:", error.message);
            }
        });

    } catch (error) {
        console.error("❌ Erro ao configurar listener de retomada:", error);
    }

    // ===== REGISTRAR LISTENERS DE BOTÕES =====
    window.ModuleLifecycle.addListener(
        btnPuxar,
        'click',
        puxarProximoEmailReal,
        MODULE_ID
    );

    const txtArea = document.getElementById('resposta-email');
    const btnEnviar = document.getElementById('btnEnviarResposta');

    if (txtArea) {
        window.ModuleLifecycle.addListener(
            txtArea,
            'input',
            validarResposta,
            MODULE_ID
        );
    }

    if (btnEnviar) {
        window.ModuleLifecycle.addListener(
            btnEnviar,
            'click',
            finalizarAtendimentoEmail,
            MODULE_ID
        );
    }
}

// ===== SEÇÃO 12: EMAILS - PUXAR DA FILA =====
/**
 * Puxa o próximo e-mail da fila com transação atômica
 * Previne race conditions com múltiplos operadores
 * Garante que apenas um operador pegue um e-mail
 */
async function puxarProximoEmailReal() {
    const { db, fStore, auth } = window.FirebaseApp;
    const currentUser = auth.currentUser;

    if (!currentUser) {
        showToast("Erro: Usuário não autenticado.", 'error');
        return;
    }

    const operadorUID = currentUser.uid;
    const agora = new Date();

    try {
        // Buscar candidatos fora da transação (melhora performance)
        const q = fStore.query(
            fStore.collection(db, "atend_emails_fila"),
            fStore.where("status", "==", "novo"),
            fStore.orderBy("metadata_recebido_em", "asc"),
            fStore.limit(5)
        );

        const querySnapshot = await fStore.getDocs(q);

        if (querySnapshot.empty) {
            showToast("Nenhum e-mail disponível na fila.", 'info');
            return;
        }

        let emailAtribuido = null;

        // Tentar pegar o primeiro e-mail disponível
        for (const docCandidate of querySnapshot.docs) {
            try {
                emailAtribuido = await executeTransaction(async () => {
                    return await fStore.runTransaction(db, async (transaction) => {
                        const docRef = fStore.doc(db, "atend_emails_fila", docCandidate.id);
                        const freshDoc = await transaction.get(docRef);

                        // Validação 1: Documento existe?
                        if (!freshDoc.exists()) {
                            throw new Error('EMAIL_NAO_EXISTE');
                        }

                        const dados = freshDoc.data();

                        // Validação 2: Ainda está disponível?
                        if (dados.status !== "novo") {
                            throw new Error('EMAIL_JA_ATRIBUIDO');
                        }

                        // Criar evento de histórico
                        const eventoPosse = {
                            timestamp: agora,
                            acao: "puxou_fila",
                            operador_uid: operadorUID,
                            setor: dados.grupo || "triagem"
                        };

                        // Preparar updates
                        const updates = {
                            status: "em_atendimento",
                            atribuido_para_uid: operadorUID,
                            puxado_em: agora,
                            historico_custodia: fStore.arrayUnion(eventoPosse),
                            versao_documento: (dados.versao_documento || 0) + 1
                        };

                        // Atualizar marcos de rastreio
                        if (!dados.tracking_marcos?.triagem_inicio) {
                            updates["tracking_marcos.triagem_inicio"] = agora;
                        }

                        // TRANSAÇÃO ATÔMICA: Mover de Fila para Atribuído
                        const novoDocRef = fStore.doc(db, "atend_emails_atribuido", docCandidate.id);
                        const dadosCompletos = { ...dados, ...updates };

                        transaction.set(novoDocRef, dadosCompletos);
                        transaction.delete(docRef);

                        return {
                            id: docCandidate.id,
                            dados: dadosCompletos
                        };
                    });
                }, { maxAttempts: 2, retryDelay: 200 });

                break; // Conseguiu atribuir, sair do loop

            } catch (error) {
                console.warn(`⚠️ Candidato ${docCandidate.id} não disponível:`, error.message);
                continue; // Tentar próximo
            }
        }

        // Validar resultado
        if (!emailAtribuido) {
            showToast("Todos os e-mails foram atribuídos. Tente novamente.", 'warning');
            return;
        }

        // Atualizar variáveis globais e estado
        window.currentEmailId = emailAtribuido.id;
        window.currentEmailData = {
            ...emailAtribuido.dados,
            threadId: emailAtribuido.dados.threadId || emailAtribuido.id
        };

        window.StateManager.set(MODULE_ID, {
            currentEmail: emailAtribuido.dados
        });

        setTimeout(() => {
            exibirEmailNoPalco(window.currentEmailData);
            showToast("✓ E-mail atribuído com sucesso!", 'success');
        }, 150);

    } catch (error) {
        console.error("❌ Erro crítico ao puxar e-mail:", error);
        showToast("Erro ao processar solicitação. Tente novamente.", 'error');
    }
}

// ===== SEÇÃO 13: EMAILS - EXIBIR NO PALCO =====
/**
 * Exibe o e-mail no palco principal
 * Preenche dados, inicia timers, carrega histórico
 */
function exibirEmailNoPalco(dados) {
    window.emailSelecionadoId = dados.id || window.currentEmailId;
    window.currentEmailData = {
        ...dados,
        threadId: dados.threadId || dados.id || window.currentEmailId
    };

    const palcoVazio = document.getElementById('palco-vazio');
    const palcoAtivo = document.getElementById('palco-ativo');

    if (palcoVazio) palcoVazio.style.display = 'none';
    if (palcoAtivo) palcoAtivo.style.display = 'flex';

    // Preencher dados com segurança
    setText('#ativo-cliente-nome', dados.remetente_nome || "Cliente");
    setText('#ativo-cliente-email', dados.remetente_email || "E-mail indisponível");
    setText('#ativo-assunto', dados.assunto || "(Sem Assunto)");

    const containerMensagem = document.getElementById('ativo-mensagem-conteudo');
    if (containerMensagem) {
        containerMensagem.innerHTML = dados.corpo_html || "O conteúdo deste e-mail está vazio.";
    }

    // Gerenciar anexos
    const btnAnexos = document.getElementById('btn-ver-anexos');
    let linkFinal = dados.link_drive || (dados.anexos && dados.anexos[0]?.url);
    
    if (btnAnexos) {
        if (linkFinal) {
            btnAnexos.style.display = 'flex';
            btnAnexos.onclick = () => window.open(linkFinal, '_blank');
        } else {
            btnAnexos.style.display = 'none';
        }
    }

    // Resetar interface
    const txtArea = document.getElementById('resposta-email');
    if (txtArea) txtArea.value = "";
    validarResposta();
    iniciarCronometroAtendimento();
    carregarHistoricoThread(dados.threadId);

    // Fechar dropdown de respostas se aberto
    const dropdown = document.getElementById('dropdownRespostas');
    if (dropdown) dropdown.classList.remove('active');
}

// ===== SEÇÃO 14: EMAILS - HISTÓRICO DO THREAD =====
/**
 * Carrega e exibe o histórico de mensagens de um thread
 * Mostra respostas anteriores no mesmo e-mail
 */
async function carregarHistoricoThread(threadId) {
    if (!threadId) return;

    const { db, fStore } = window.FirebaseApp;
    const historicoContainer = document.getElementById('lista-mensagens-anteriores');
    const divPai = document.getElementById('historico-conversa');

    if (!historicoContainer || !divPai) {
        console.warn("⚠️ Elementos de histórico não encontrados");
        return;
    }

    historicoContainer.innerHTML = "<p style='font-size:12px; color:#999;'>Carregando histórico...</p>";

    try {
        const q = fStore.query(
            fStore.collection(db, "atend_emails_historico"),
            fStore.where("threadId", "==", threadId),
            fStore.orderBy("finalizado_em", "asc")
        );

        const querySnapshot = await fStore.getDocs(q);

        if (!querySnapshot.empty) {
            divPai.style.display = 'block';
            historicoContainer.innerHTML = "";

            querySnapshot.forEach(doc => {
                const d = doc.data();
                const dataFormatada = d.finalizado_em 
                    ? d.finalizado_em.toDate().toLocaleString('pt-BR')
                    : "";

                historicoContainer.innerHTML += `
                    <div class="card-historico" style="background: #f8f9fa; padding: 12px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #007bff;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="font-size: 11px; color: #555;">RESPOSTA: ${d.operador_finalizador_nome || 'Atendente'}</strong>
                            <span style="font-size: 10px; color: #999;">${dataFormatada}</span>
                        </div>
                        <div style="font-size: 13px; color: #333; white-space: pre-wrap;">${escapeHtml(d.resposta_enviada)}</div>
                    </div>
                `;
            });
        } else {
            divPai.style.display = 'none';
        }

    } catch (error) {
        console.error("❌ Erro ao buscar histórico:", error);
        if (error.message.includes("index")) {
            historicoContainer.innerHTML = "<p style='color:red;'>Erro: Índice não configurado</p>";
        }
    }
}

// ===== SEÇÃO 15: EMAILS - FINALIZAR ATENDIMENTO =====
/**
 * Finaliza o atendimento de um e-mail
 * Salva resposta no histórico e remove de atribuído
 * Usa transação para garantir consistência
 */
async function finalizarAtendimentoEmail() {
    const { db, fStore, auth } = window.FirebaseApp;
    const resposta = document.getElementById('resposta-email')?.value;
    const currentUser = auth.currentUser;
    const agora = new Date();

    if (!resposta?.trim()) {
        showToast("Por favor, escreva uma resposta.", 'warning');
        return;
    }

    if (!window.currentEmailId) {
        showToast("Erro: ID do e-mail não encontrado.", 'error');
        return;
    }

    const operadorUID = currentUser?.uid;

    try {
        const resultado = await executeTransaction(async () => {
            return await fStore.runTransaction(db, async (transaction) => {
                const docRef = fStore.doc(db, "atend_emails_atribuido", window.currentEmailId);
                const docSnap = await transaction.get(docRef);

                // Validação 1: Documento existe?
                if (!docSnap.exists()) {
                    throw new Error('DOCUMENTO_NAO_ENCONTRADO');
                }

                const dados = docSnap.data();

                // Validação 2: É seu?
                if (dados.atribuido_para_uid !== operadorUID) {
                    throw new Error('SEM_PERMISSAO_OWNERSHIP');
                }

                // Validação 3: Status correto?
                if (dados.status !== "em_atendimento") {
                    throw new Error('STATUS_INVALIDO');
                }

                // Calcular tempo de retenção
                const tempoRetencaoMs = dados.puxado_em
                    ? agora.getTime() - dados.puxado_em.toDate().getTime()
                    : 0;

                // Criar evento final
                const eventoFinal = {
                    timestamp: agora,
                    acao: "finalizou",
                    operador_uid: operadorUID,
                    setor: dados.grupo || "atendimento",
                    tempo_retencao_ms: tempoRetencaoMs,
                    resposta_corpo: resposta
                };

                // Preparar dossiê para histórico
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
                    email_enviado: false,
                    versao_documento: (dados.versao_documento || 0) + 1
                };

                // TRANSAÇÃO ATÔMICA: Atribuído → Histórico
                const historicoRef = fStore.doc(db, "atend_emails_historico", window.currentEmailId);
                transaction.set(historicoRef, payloadHistorico);
                transaction.delete(docRef);

                return { success: true };
            });
        });

        if (resultado.success) {
            showToast("✓ Atendimento finalizado!", 'success');
            window.currentEmailData = null;
            window.currentEmailId = null;
            resetarPalcoEmail();
        }

    } catch (error) {
        console.error("❌ Erro ao finalizar:", error);

        if (error.message === 'SEM_PERMISSAO_OWNERSHIP') {
            showToast("⚠️ Este atendimento não pertence mais a você.", 'warning');
            resetarPalcoEmail();
        } else if (error.message === 'DOCUMENTO_NAO_ENCONTRADO') {
            showToast("⚠️ Este atendimento já foi processado.", 'warning');
            resetarPalcoEmail();
        } else {
            showToast("Erro ao processar finalização.", 'error');
        }
    }
}

// ===== SEÇÃO 16: EMAILS - AÇÕES (DEVOLVER, DIRECIONAR) =====
/**
 * Abre modal para devolver e-mail à fila
 */
window.devolverParaFila = function () {
    window.ModalManager.open('modalJustificativa');
};

/**
 * Abre modal para direcionar e-mail para outro setor
 */
function abrirModalDirecionamento() {
    window.ModalManager.open('modalDirecionarEmail');
}

/**
 * Confirma devolução com justificativa
 * Remove da atribuído e volta para fila
 */
window.confirmarDevolucao = async function () {
    const { db, fStore, auth } = window.FirebaseApp;
    const motivo = document.getElementById('txtJustificativa')?.value.trim();
    const userUID = auth.currentUser?.uid;
    const agora = new Date();

    if (!motivo || motivo.length < 10) {
        showToast("Justificativa mínimo 10 caracteres.", 'warning');
        return;
    }

    if (!window.currentEmailId) {
        showToast("ID do e-mail não identificado.", 'error');
        return;
    }

    try {
        const resultado = await executeTransaction(async () => {
            return await fStore.runTransaction(db, async (transaction) => {
                const docRef = fStore.doc(db, "atend_emails_atribuido", window.currentEmailId);
                const docSnap = await transaction.get(docRef);

                if (!docSnap.exists()) throw new Error('DOCUMENTO_NAO_ENCONTRADO');

                const dados = docSnap.data();

                if (dados.atribuido_para_uid !== userUID) throw new Error('SEM_PERMISSAO_OWNERSHIP');
                if (dados.status !== "em_atendimento") throw new Error('STATUS_INVALIDO');

                const eventoDevolver = {
                    timestamp: agora,
                    acao: "devolveu",
                    operador_uid: userUID,
                    setor: dados.grupo || "triagem",
                    justificativa: motivo
                };

                const dadosAtualizados = {
                    ...dados,
                    status: 'novo',
                    atribuido_para_uid: null,
                    puxado_em: null,
                    motivo_devolucao: motivo,
                    devolvido_uid: userUID,
                    historico_custodia: fStore.arrayUnion(eventoDevolver),
                    versao_documento: (dados.versao_documento || 0) + 1
                };

                const filaRef = fStore.doc(db, "atend_emails_fila", window.currentEmailId);
                transaction.set(filaRef, dadosAtualizados);
                transaction.delete(docRef);

                return { success: true };
            });
        });

        if (resultado.success) {
            showToast("✓ E-mail devolvido à fila.", 'success');
            window.ModalManager.close('modalJustificativa');
            resetarPalcoEmail();
        }

    } catch (error) {
        console.error("❌ Erro na devolução:", error);
        if (error.message === 'SEM_PERMISSAO_OWNERSHIP') {
            showToast("⚠️ Você não pode devolver este e-mail.", 'warning');
            resetarPalcoEmail();
        } else {
            showToast("Erro ao devolver.", 'error');
        }
    }
};

/**
 * Confirma direcionamento para outro setor
 * Move de atribuído para fila do novo setor
 */
async function confirmarDirecionamento(novoSetor) {
    const { db, fStore, auth } = window.FirebaseApp;
    const emailId = window.currentEmailId;
    const currentUser = auth.currentUser;
    const agora = new Date();

    if (!emailId) {
        showToast("Nenhum e-mail selecionado.", 'warning');
        return;
    }

    try {
        const docAtribuidoRef = fStore.doc(db, "atend_emails_atribuido", emailId);
        const docSnap = await fStore.getDoc(docAtribuidoRef);

        if (!docSnap.exists()) {
            showToast("Documento não encontrado.", 'error');
            return;
        }

        const dadosAtuais = docSnap.data();
        const tempoRetencaoMs = dadosAtuais.puxado_em
            ? agora.getTime() - dadosAtuais.puxado_em.toDate().getTime()
            : 0;

        const eventoDerivacao = {
            timestamp: agora,
            acao: "derivou",
            operador_uid: currentUser?.uid || "sistema",
            setor_origem: dadosAtuais.grupo || "triagem",
            setor_destino: novoSetor,
            tempo_retencao_ms: tempoRetencaoMs
        };

        const dadosParaFila = {
            ...dadosAtuais,
            grupo: novoSetor,
            status: "novo",
            derivado_por_uid: currentUser?.uid || "sistema",
            derivado_em: agora,
            atribuido_para_uid: null,
            puxado_em: null,
            historico_custodia: fStore.arrayUnion(eventoDerivacao)
        };

        if (dadosAtuais.grupo === "triagem") {
            dadosParaFila["tracking_marcos.triagem_fim"] = agora;
        }

        // Executar movimentação
        await fStore.setDoc(fStore.doc(db, "atend_emails_fila", emailId), dadosParaFila);
        await fStore.deleteDoc(docAtribuidoRef);

        window.currentEmailId = null;
        window.currentEmailData = null;
        resetarPalcoEmail();

        showToast("E-mail direcionado com sucesso.", 'success');
        window.ModalManager.close('modalDirecionarEmail');

    } catch (error) {
        console.error("Erro ao direcionar:", error);
        showToast("Erro ao processar direcionamento.", 'error');
    }
}

/**
 * Reseta o palco de e-mails
 */
function resetarPalcoEmail() {
    if (emailTimerInterval) {
        clearInterval(emailTimerInterval);
        emailTimerInterval = null;
    }

    const palcoAtivo = document.getElementById('palco-ativo');
    const palcoVazio = document.getElementById('palco-vazio');

    if (palcoAtivo) palcoAtivo.style.display = 'none';
    if (palcoVazio) palcoVazio.style.display = 'flex';

    const txtArea = document.getElementById('resposta-email');
    if (txtArea) txtArea.value = '';
}

// ===== SEÇÃO 17: EMAILS - VALIDAÇÃO E RESPOSTAS PADRÃO =====
/**
 * Valida se há resposta escrita
 * Habilita botão de envio apenas com conteúdo válido
 */
function validarResposta() {
    const btn = document.getElementById('btnEnviarResposta');
    const val = document.getElementById('resposta-email')?.value.trim();
    
    if (val && val.length > 5) {
        btn?.classList.add('ativo');
        btn?.removeAttribute('disabled');
    } else {
        btn?.classList.remove('ativo');
        btn?.setAttribute('disabled', 'disabled');
    }
}

/**
 * Cronômetro do atendimento de e-mail
 */
function iniciarCronometroAtendimento() {
    let seg = 0;
    const disp = document.getElementById('timer-atendimento');
    
    if (emailTimerInterval) clearInterval(emailTimerInterval);
    
    emailTimerInterval = setInterval(() => {
        seg++;
        const m = Math.floor(seg / 60).toString().padStart(2, '0');
        const s = (seg % 60).toString().padStart(2, '0');
        if (disp) disp.textContent = `${m}:${s}`;
    }, 1000);
}

// ===== SEÇÃO 18: HISTÓRICO - INICIALIZAÇÃO =====
/**
 * Inicializa o sistema de histórico de atendimentos
 * Suporta dois canais: WhatsApp e Gmail
 * Usa TabManager para alternar entre canais
 */
let currentHistoricoFiltrado = [...MOCK_HISTORICO];
let selectedHistoricoId = null;
let canalHistoricoAtual = 'whatsapp';


function initHistoricoTab() {
    const subBotoes = document.querySelectorAll('.sub-aba-btn');

    subBotoes.forEach(btn => {
        window.ModuleLifecycle.addListener(
            btn,
            'click',
            () => {
                subBotoes.forEach(b => b.classList.remove('ativa'));
                btn.classList.add('ativa');

                canalHistoricoAtual = btn.dataset.canal;
                console.log("📂 Canal de histórico alterado para:", canalHistoricoAtual);

                ajustarFiltrosPorCanal();
                carregarDadosHistorico();
            },
            MODULE_ID
        );
    });

    // Inicializar filtros
    const searchInp = document.getElementById('searchHistorico');
    if (searchInp) {
        window.ModuleLifecycle.addListener(
            searchInp,
            'input',
            carregarDadosHistorico,
            MODULE_ID
        );
    }

    const filterPer = document.getElementById('filtroPeriodo');
    if (filterPer) {
        window.ModuleLifecycle.addListener(
            filterPer,
            'change',
            carregarDadosHistorico,
            MODULE_ID
        );
    }

    ajustarFiltrosPorCanal();
    carregarDadosHistorico();
}

/**
 * Ajusta UI conforme o canal (WhatsApp vs Gmail)
 */
function ajustarFiltrosPorCanal() {
    const filtrosWhats = ['filtroAreaDerivada', 'filtroTipoDemanda'];
    filtrosWhats.forEach(id => {
        const el = document.getElementById(id)?.closest('.filtro-historico');
        if (el) el.style.display = canalHistoricoAtual === 'gmail' ? 'none' : 'block';
    });

    const optDerivado = document.querySelector('#filtroStatus option[value="derivado"]');
    const optDevolvido = document.querySelector('#filtroStatus option[value="devolvido"]');
    const labelDerivado = document.querySelector('.stat-historico-label[id-target="derivado"]');

    if (canalHistoricoAtual === 'gmail') {
        if (optDerivado) optDerivado.style.display = 'none';
        if (optDevolvido) optDevolvido.style.display = 'block';
        if (labelDerivado) labelDerivado.textContent = 'Devolvidos';
    } else {
        if (optDerivado) optDerivado.style.display = 'block';
        if (optDevolvido) optDevolvido.style.display = 'none';
        if (labelDerivado) labelDerivado.textContent = 'Derivados';
    }
}

/**
 * Carrega dados do histórico baseado no canal
 */
async function carregarDadosHistorico() {
    const lista = document.getElementById('listaHistorico');
    if (!lista) return;

    lista.innerHTML = '<div class="carregando">Carregando...</div>';

    if (canalHistoricoAtual === 'gmail') {
        // GMAIL: Dados do Firestore
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
            console.error("Erro no Firestore:", error);
            lista.innerHTML = '<div class="erro">Erro ao carregar dados.</div>';
        }
    } else {
        // WHATSAPP: Dados Mock
        lista.innerHTML = '';
        if (MOCK_HISTORICO.length > 0) {
            MOCK_HISTORICO.forEach((item, index) => {
                lista.appendChild(renderizarCardWhats(item, index));
            });
            atualizarStatsHistorico(MOCK_HISTORICO.length);
        } else {
            lista.innerHTML = '<div class="vazio">Nenhum registro de WhatsApp.</div>';
        }
    }
}

/**
 * Renderiza card de WhatsApp
 */
function renderizarCardWhats(item, id) {
    const div = document.createElement('div');
    div.className = 'historico-item';
    div.innerHTML = `
        <div class="historico-info">
            <div class="historico-cliente">
                <strong>${escapeHtml(item.cliente)}</strong>
                <span class="ticket-id">#${item.id}</span>
            </div>
            <div class="historico-detalhes">
                <span class="badge-tipo">${escapeHtml(item.tipo || 'Geral')}</span>
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

/**
 * Renderiza card de Email (Gmail)
 */
function renderizarCardEmail(item, id) {
    const div = document.createElement('div');
    div.className = 'historico-item card-email';

    const dataObj = item.finalizado_em ? item.finalizado_em.toDate() : new Date();
    const dataFmt = dataObj.toLocaleDateString('pt-BR');
    const horaFmt = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
        <div class="card-email-main">
            <div class="card-email-header">
                <span class="card-email-sender">${escapeHtml(item.remetente_nome || 'Cliente')}</span>
                <span class="badge-gmail-tag">Gmail</span>
            </div>
            <div class="card-email-subject">${escapeHtml(item.assunto || '(Sem Assunto)')}</div>
            <div class="card-email-meta">
                <span><i class="fi fi-rr-calendar"></i> ${dataFmt}</span>
                <span><i class="fi fi-rr-clock"></i> ${horaFmt}</span>
                <span><i class="fi fi-rr-envelope"></i> ${escapeHtml(item.remetente_email || '')}</span>
            </div>
        </div>
        <div class="card-email-aside">
            <span class="status-email-pill">${item.status.toUpperCase()}</span>
            <button class="btn-view-email" onclick="abrirDetalhesHistorico('${id}')">
                <i class="fi fi-rr-search-alt"></i>
            </button>
        </div>
    `;
    return div;
}

/**
 * Atualiza estatísticas do histórico
 */
function atualizarStatsHistorico(quantidade) {
    const elTotal = document.getElementById('statTotalAtendimentos');
    if (elTotal) elTotal.textContent = quantidade;

    if (canalHistoricoAtual === 'gmail') {
        const elConcluidos = document.getElementById('statConcluidos');
        if (elConcluidos) elConcluidos.textContent = quantidade;
    } else {
        const elConcluidos = document.getElementById('statConcluidos');
        const elDerivados = document.getElementById('statDerivados');
        if (elConcluidos) elConcluidos.textContent = Math.floor(quantidade * 0.8);
        if (elDerivados) elDerivados.textContent = Math.floor(quantidade * 0.2);
    }
}

/**
 * Abre modal com detalhes de um e-mail do histórico
 */
async function abrirDetalhesHistorico(id) {
    console.log("🔍 Buscando detalhes do e-mail:", id);
    const { db, fStore } = window.FirebaseApp;

    try {
        const docRef = fStore.doc(db, "atend_emails_historico", id);
        const docSnap = await fStore.getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            setText('#detalheEmailAssunto', data.assunto || '(Sem Assunto)');

            const metaEl = document.getElementById('detalheEmailMeta');
            if (metaEl) {
                metaEl.innerHTML = `
                    <strong>De:</strong> ${escapeHtml(data.remetente_nome)} &lt;${escapeHtml(data.remetente_email)}&gt;<br>
                    <strong>Finalizado em:</strong> ${data.finalizado_em?.toDate().toLocaleString() || '--'}<br>
                    <strong>Status:</strong> ${(data.status || 'Desconhecido').toUpperCase()}
                `;
            }

            const corpoEl = document.getElementById('detalheEmailCorpo');
            if (corpoEl) {
                corpoEl.innerHTML = data.corpo_html || 'Conteúdo vazio.';
            }

            window.ModalManager.open('modalDetalhesEmail');
        } else {
            showToast("Registro não encontrado.", 'error');
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes:", error);
        showToast("Não foi possível carregar os detalhes.", 'error');
    }
}

/**
 * Fecha modal de detalhes do e-mail
 */
function fecharModalDetalhes() {
    window.ModalManager.close('modalDetalhesEmail');
}

// ===== SEÇÃO 19: FUNÇÕES UTILITÁRIAS =====
/**
 * Obtém hora atual formatada (HH:MM)
 */
function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Define texto em elemento com seletor
 */
function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

/**
 * Scroll para baixo no chat
 */
function scrollChatToBottom() {
    const chatbox = document.getElementById('chatbox');
    if (!chatbox) return;
    chatbox.scrollTop = chatbox.scrollHeight;
}

/**
 * Exibe notificação toast (sucesso, erro, aviso)
 */
function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;

    const iconClass = {
        'success': 'fi-rr-check',
        'error': 'fi-rr-cross-circle',
        'warning': 'fi-rr-triangle-warning',
        'info': 'fi-rr-info'
    }[tipo] || 'fi-rr-check';

    toast.innerHTML = `
        <i class="fi ${iconClass}"></i>
        <span>${escapeHtml(mensagem)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode === container) {
                container.removeChild(toast);
            }
        }, 500);
    }, 3000);
}

// ===== SEÇÃO 20: CLEANUP DO MÓDULO =====
/**
 * Função de cleanup chamada quando sair do módulo
 * Implementa padrão ModuleLifecycle para limpeza automática
 * 
 * O ModuleLifecycle.cleanup() vai chamar isso automaticamente
 * quando o usuário navegar para outro módulo
 */
if (typeof window.cleanupAtendimentoModule === 'undefined') {
    window.cleanupAtendimentoModule = function() {
        console.log("🧹 Limpando módulo de Atendimento");

        // Parar timers
        stopTicketTimer();
        if (emailTimerInterval) {
            clearInterval(emailTimerInterval);
            emailTimerInterval = null;
        }

        // Limpar variáveis globais
        window.currentEmailData = null;
        window.currentEmailId = null;

        // Limpar estado no StateManager
        window.StateManager.reset(MODULE_ID);

        // Fechar modais abertos
        window.ModalManager.closeAll();

        console.log("✅ Módulo de Atendimento limpo");
    };
}

// ===== FIM DO ARQUIVO =====
// ===== DEBUG: Adicionar função de diagnóstico =====
window.debugAtendimentoTabs = function() {
    console.group('🔍 DEBUG ABAS ATENDIMENTO');
    
    const container = document.querySelector('.modulo-painel-atendimento');
    console.log('Container:', container ? '✅ Encontrado' : '❌ NÃO encontrado');

    const buttons = document.querySelectorAll('.aba-btn');
    console.log(`Botões de aba: ${buttons.length} encontrados`);
    buttons.forEach((btn, i) => {
        console.log(`  [${i}] data-aba="${btn.dataset.aba}" class="${btn.className}"`);
    });

    const contents = document.querySelectorAll('.aba-conteudo');
    console.log(`Conteúdos: ${contents.length} encontrados`);
    contents.forEach((cont, i) => {
        console.log(`  [${i}] class="${cont.className}"`);
    });

    const active = document.querySelector('.aba-btn.ativa');
    console.log(`Aba ativa: ${active ? active.dataset.aba : 'Nenhuma'}`);

    if (window.TabManager) {
        console.log('✅ TabManager carregado');
    } else {
        console.log('❌ TabManager NÃO carregado');
    }

    if (window.StateManager) {
        console.log('✅ StateManager carregado');
    } else {
        console.log('❌ StateManager NÃO carregado');
    }

    console.groupEnd();
};
console.log("✅ atendimento.js refatorado carregado com sucesso");
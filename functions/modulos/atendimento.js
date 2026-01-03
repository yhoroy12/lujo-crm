// ==================== ATENDIMENTO.JS (CORRIGIDO) ====================//
window.initAtendimentoModule = function() {
    console.log("🔧 Inicializando Workspace de Atendimento");
    
    initAtendimentoTabs();
    initIdentityCheck();
    initChatActions();
    initStateTransitions();
    initPopupLogic();
    initAutoResize();
    initTopValidationButton();
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

    // CRÍTICO: Confirmar Identidade muda o estado
    btnValidar.addEventListener('click', async () => {
        // Aqui você pode chamar a API de verificação se necessário (await)
        // Simulação de ação assíncrona (se precisar)
        try {
            btnValidar.disabled = true;
            btnValidar.textContent = 'Confirmando...';
            // Simular pequena espera (remova se for chamada real)
            await new Promise(r => setTimeout(r, 400));
        } finally {
            // Muda fluxo após validação funcional
            updateTicketFlow('IDENTIDADE_VALIDADA');

            // Trava checks para evitar alteração após validação
            checks.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.disabled = true;
                }
            });

            // Esconde o botão lateral de confirmar identidade
            btnValidar.classList.add('hidden');

            // Atualiza timeline e badge
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

    // Só escondemos/mostramos elementos da action-bar-right (evita impactar botões do chat)
    const actionBarRight = document.querySelector('.action-bar-right');
    if (actionBarRight) {
        actionBarRight.querySelectorAll('button, .info-block').forEach(el => {
            el.classList.add('hidden');
        });
    }

    switch(novoEstado) {
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

    // Garante visibilidade do input e do botão de envio caso alguém tenha aplicado .hidden globalmente
    const chatInputContainer = document.getElementById('chatInputContainer');
    if (chatInputContainer) chatInputContainer.classList.remove('hidden');

    const sendBtn = document.getElementById('btnEnviarMensagem');
    if (sendBtn) sendBtn.classList.remove('hidden');
}
function showActionButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.classList.remove('hidden');
        // garantir que botões fiquem habilitados por padrão
        button.disabled = false;
    }
}

function showActionElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
    }
}

// ============================= //
// 4. AÇÕES DE TRANSIÇÃO         //
// ============================= //
function initStateTransitions() {
    // IDENTIDADE_VALIDADA -> EM_ATENDIMENTO
    const btnIniciar = document.getElementById('btnIniciarAtendimento');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            updateTicketFlow('EM_ATENDIMENTO');
            addTimelineItem(getCurrentTime(), "Atendimento iniciado");
        });
    }

    // EM_ATENDIMENTO -> CONCLUIDO
    const btnConcluir = document.getElementById('btnConcluir');
    if (btnConcluir) {
        btnConcluir.addEventListener('click', () => {
            if (confirm("Deseja realmente concluir este atendimento?")) {
                addTimelineItem(getCurrentTime(), "Ticket concluído");
                
                // Limpa timer
                if (timerInterval) clearInterval(timerInterval);
                
                // Volta para tela de aguardando
                setTimeout(() => {
                    const workspace = document.getElementById('workspaceGrid');
                    const emptyState = document.getElementById('emptyState');
                    
                    if (workspace) workspace.classList.add('hidden');
                    if (emptyState) emptyState.classList.remove('hidden');
                    
                    // Atualiza badge
                    const statusBadge = document.getElementById('statusBadge');
                    if (statusBadge) statusBadge.textContent = 'AGUARDANDO';
                    
                    // Reset estado
                    updateTicketFlow('NOVO');
                }, 500);
            }
        });
    }

    // EM_ATENDIMENTO -> ENCAMINHADO
    const btnEncaminhar = document.getElementById('btnEncaminhar');
    if (btnEncaminhar) {
        btnEncaminhar.addEventListener('click', () => {
            const setor = document.getElementById('setorResponsavel')?.value;
            if (!setor) {
                alert("⚠️ Selecione o setor responsável antes de encaminhar.");
                return;
            }
            if (confirm(`Encaminhar ticket para o setor: ${setor}?`)) {
                addTimelineItem(getCurrentTime(), `Encaminhado para ${setor}`);
                
                // Limpa timer
                if (timerInterval) clearInterval(timerInterval);
                
                // Volta para tela de aguardando
                setTimeout(() => {
                    const workspace = document.getElementById('workspaceGrid');
                    const emptyState = document.getElementById('emptyState');
                    
                    if (workspace) workspace.classList.add('hidden');
                    if (emptyState) emptyState.classList.remove('hidden');
                    
                    // Atualiza badge
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

    // Contador de caracteres
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

        // TODO: enviar ao servidor (WebSocket / API) se aplicável
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

    textarea.addEventListener('input', function() {
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

    // Remove active de todos os dots
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

    // Simula novo ticket em 3 segundos (apenas demo)
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
            
            // Preenche dados do cliente
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

            // Limpa mensagens de teste se necessário e adiciona mensagem inicial
            if (chatbox) {
                // opcional: limpar, ou manter mensagens de demo
                // chatbox.innerHTML = '';
                addSystemMessage("Novo ticket atribuído a você.");
                scrollChatToBottom();
            }
            
            // Inicia no estado NOVO
            updateTicketFlow('NOVO');
            
            // Inicia timer do ticket
            initTicketTimer();

            // Dar foco no chat input (usabilidade)
            if (chatInput) chatInput.focus();
        });
    }
}

// ============================= //
// 9. TIMER DO TICKET            //
// ============================= //
let timerInterval = null;

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
        // rola para a seção de identidade e foca no primeiro checkbox
        const identitySection = document.getElementById('identitySection');
        if (identitySection) {
            identitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const primeiroCheck = identitySection.querySelector('input[type="checkbox"]');
            if (primeiroCheck) primeiroCheck.focus();
        }
    });
}

// ============================= //
// UTILITÁRIOS                   //
// ============================= //
function getCurrentTime() {
    return new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

function scrollChatToBottom() {
    const chatbox = document.getElementById('chatbox');
    if (!chatbox) return;
    // garantir que scroll funcione em containers flex
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

// simples escape para evitar injeção de HTML ao inserir mensagens
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

console.log("✅ Módulo de Atendimento carregado");
// ==================== ATENDIMENTO.JS ====================

window.initAtendimentoModule = function() {
    console.log("🔧 Inicializando Workspace de Atendimento");
    
    initAtendimentoTabs();
    initIdentityCheck();
    initChatActions();
    initStateTransitions();
    initPopupLogic();
};

// 1. GERENCIAMENTO DE ABAS
function initAtendimentoTabs() {
    const botoesAba = document.querySelectorAll('.aba-btn');
    const conteudosAba = document.querySelectorAll('.aba-conteudo');
    
    botoesAba.forEach(btn => {
        btn.addEventListener('click', () => {
            const abaAlvo = btn.dataset.aba;
            
            botoesAba.forEach(b => b.classList.remove('ativa'));
            conteudosAba.forEach(c => c.classList.remove('ativa'));
            
            btn.classList.add('ativa');
            const targetContent = document.querySelector(`.${abaAlvo}`);
            if (targetContent) targetContent.classList.add('ativa');
        });
    });
}

// 2. VALIDAÇÃO DE IDENTIDADE (CHECKLIST)
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

    btnValidar.addEventListener('click', () => {
        updateTicketFlow('IDENTIDADE_VALIDADA');
        // Desabilita os campos após validar
        checks.forEach(id => document.getElementById(id).disabled = true);
        btnValidar.classList.add('hidden');
    });
}

// 3. LÓGICA DE TRANSIÇÃO DE ESTADOS DA UI
function updateTicketFlow(novoEstado) {
    const statusBadge = document.getElementById('statusBadge');
    const stateIndicator = document.getElementById('stateIndicator');
    
    // Atualiza Labels
    if (statusBadge) statusBadge.textContent = novoEstado.replace('_', ' ');
    if (stateIndicator) stateIndicator.textContent = novoEstado.replace('_', ' ');

    // Gerenciar visibilidade de botões baseado no estado (StateMachine)
    document.querySelectorAll('.btn-action, .action-group, .info-block').forEach(el => el.classList.add('hidden'));

    switch(novoEstado) {
        case 'NOVO':
            document.getElementById('btnIniciarValidacao').classList.remove('hidden');
            break;
        case 'IDENTIDADE_VALIDADA':
            document.getElementById('btnIniciarAtendimento').classList.remove('hidden');
            break;
        case 'EM_ATENDIMENTO':
            document.getElementById('actionsEmAtendimento').classList.remove('hidden');
            break;
        case 'ENCAMINHADO':
            document.getElementById('infoEncaminhado').classList.remove('hidden');
            break;
    }
}

// 4. AÇÕES DE TRANSIÇÃO
function initStateTransitions() {
    // Iniciar Validação (NOVO -> IDENTIDADE_VALIDADA)
    document.getElementById('btnIniciarValidacao')?.addEventListener('click', () => {
        updateTicketFlow('IDENTIDADE_VALIDADA');
    });

    // Iniciar Atendimento (IDENTIDADE_VALIDADA -> EM_ATENDIMENTO)
    document.getElementById('btnIniciarAtendimento')?.addEventListener('click', () => {
        updateTicketFlow('EM_ATENDIMENTO');
        addTimelineItem("14:40", "Atendimento iniciado");
    });

    // Concluir
    document.getElementById('btnConcluir')?.addEventListener('click', () => {
        if(confirm("Deseja realmente concluir este atendimento?")) {
            alert("Ticket finalizado com sucesso!");
            location.reload(); // Volta ao estado vazio
        }
    });
}

// 5. CHAT E TIMELINE
function initChatActions() {
    const btnEnviar = document.getElementById('btnEnviarMensagem');
    const input = document.getElementById('chatInput');

    const enviar = () => {
        const texto = input.value.trim();
        if (!texto) return;

        const chatbox = document.getElementById('chatbox');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg atendente';
        msgDiv.innerHTML = `
            <div class="msg-content">${texto}</div>
            <div class="msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        chatbox.appendChild(msgDiv);
        chatbox.scrollTop = chatbox.scrollHeight;
        input.value = '';
    };

    btnEnviar?.addEventListener('click', enviar);
    input?.addEventListener('keypress', (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } });
}

function addTimelineItem(hora, texto) {
    const timeline = document.getElementById('timeline');
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
        <div class="timeline-dot active"></div>
        <div class="timeline-content">
            <span class="timeline-time">${hora}</span>
            <span class="timeline-text">${texto}</span>
        </div>
    `;
    timeline.prepend(item);
}

// 6. POPUP E INICIALIZAÇÃO DE TICKET
function initPopupLogic() {
    const popup = document.getElementById('popupAtendimento');
    const btnAceitar = document.getElementById('btnIniciarAtendimentoPopup');

    // Simula um novo ticket chegando em 3 segundos
    setTimeout(() => {
        if(popup) {
            document.getElementById('popupCliente').textContent = "Marcos Oliveira";
            popup.style.display = 'flex';
        }
    }, 3000);

    btnAceitar?.addEventListener('click', () => {
        popup.style.display = 'none';
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('workspaceGrid').classList.remove('hidden');
        
        // Dados do cliente mockados
        document.getElementById('clienteNome').value = "Marcos Oliveira";
        document.getElementById('clienteTelefone').value = "(11) 98888-7777";
        document.getElementById('clienteEmail').value = "marcos@email.com";
        document.getElementById('atribuidoEm').textContent = new Date().toLocaleTimeString();
        
        updateTicketFlow('NOVO');
    });
}
// ==================== ATENDIMENTO.JS (ATUALIZADO COM EMAILS) ====================//
window.initAtendimentoModule = function() {
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
            
            // Se ativou a aba de emails, carrega emails
            if (abaAlvo === 'aba-emails') {
                loadEmails();
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
                alert("⚠️ Selecione o setor responsável antes de encaminhar.");
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
        const identitySection = document.getElementById('identitySection');
        if (identitySection) {
            identitySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const primeiroCheck = identitySection.querySelector('input[type="checkbox"]');
            if (primeiroCheck) primeiroCheck.focus();
        }
    });
}

// ============================= //
// 11. FUNCIONALIDADES DE EMAILS //
// ============================= //

// Dados mockados de emails
const MOCK_EMAILS = [
    {
        id: 1,
        remetente: "Marcos Oliveira",
        email: "marcos@email.com",
        assunto: "Dúvida sobre Fatura #99281",
        preview: "Olá, gostaria de entender o valor cobrado...",
        conteudo: `<p>Olá,</p>
                   <p>Gostaria de entender o valor cobrado na minha última fatura. Notei uma diferença em relação ao mês anterior.</p>
                   <br>
                   <p>Att,<br>Marcos Oliveira</p>`,
        data: "14:30",
        etiqueta: "financeiro",
        lido: false,
        anexos: [
            { nome: "Fatura_Janeiro.pdf", tamanho: "2.4 MB", tipo: "pdf" }
        ]
    },
    {
        id: 2,
        remetente: "Ana Silva",
        email: "ana.silva@email.com",
        assunto: "Solicitação de Orçamento",
        preview: "Boa tarde, gostaria de um orçamento...",
        conteudo: `<p>Boa tarde,</p>
                   <p>Gostaria de solicitar um orçamento para os serviços de consultoria em marketing digital.</p>
                   <br>
                   <p>Aguardo retorno,<br>Ana Silva</p>`,
        data: "Ontem",
        etiqueta: "comercial",
        lido: true,
        anexos: []
    },
    {
        id: 3,
        remetente: "Carlos Mendes",
        email: "carlos.mendes@email.com",
        assunto: "Problema com Acesso ao Sistema",
        preview: "Não consigo acessar minha conta desde ontem...",
        conteudo: `<p>Olá,</p>
                   <p>Não consigo acessar minha conta desde ontem. Quando tento fazer login, aparece uma mensagem de erro.</p>
                   <p>Já tentei redefinir a senha mas não recebi o email.</p>
                   <br>
                   <p>Obrigado,<br>Carlos Mendes</p>`,
        data: "Ontem",
        etiqueta: "suporte",
        lido: false,
        anexos: []
    },
    {
        id: 4,
        remetente: "Patricia Costa",
        email: "patricia@email.com",
        assunto: "Renovação de Contrato",
        preview: "Gostaria de renovar meu contrato anual...",
        conteudo: `<p>Prezados,</p>
                   <p>Gostaria de renovar meu contrato anual. Poderia me enviar as opções disponíveis?</p>
                   <br>
                   <p>Atenciosamente,<br>Patricia Costa</p>`,
        data: "2 dias",
        etiqueta: "comercial",
        lido: true,
        anexos: []
    },
    {
        id: 5,
        remetente: "Roberto Santos",
        email: "roberto@email.com",
        assunto: "Feedback sobre Atendimento",
        preview: "Queria parabenizar a equipe pelo excelente atendimento...",
        conteudo: `<p>Boa tarde,</p>
                   <p>Queria parabenizar a equipe pelo excelente atendimento que recebi na semana passada. Todos foram muito prestativos e resolveram meu problema rapidamente.</p>
                   <br>
                   <p>Obrigado,<br>Roberto Santos</p>`,
        data: "3 dias",
        etiqueta: "suporte",
        lido: true,
        anexos: []
    }
];

let currentEmailId = 1;
let currentFolder = 'inbox';
let emailSearchTerm = '';

function initEmailsTab() {
    console.log("📧 Inicializando aba de Emails");
    
    // Folders
    initEmailFolders();
    
    // Labels/Etiquetas
    initEmailLabels();
    
    // Pesquisa
    initEmailSearch();
    
    // Botão Nova Mensagem
    initNewEmailButton();
    
    // Ações do email (responder, encaminhar, etc)
    initEmailActions();
    
    // Toolbar actions
    initEmailToolbar();
}

function initEmailFolders() {
    const folders = document.querySelectorAll('.email-folders .folder');
    
    folders.forEach(folder => {
        folder.addEventListener('click', function() {
            folders.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            
            // Atualizar filtro baseado na pasta
            const folderText = this.textContent.toLowerCase();
            if (folderText.includes('caixa de entrada')) {
                currentFolder = 'inbox';
            } else if (folderText.includes('favoritos')) {
                currentFolder = 'starred';
            } else if (folderText.includes('arquivados')) {
                currentFolder = 'archived';
            } else if (folderText.includes('lixeira')) {
                currentFolder = 'trash';
            }
            
            loadEmails();
        });
    });
}

function initEmailLabels() {
    const labels = document.querySelectorAll('.email-labels button');
    
    labels.forEach(label => {
        label.addEventListener('click', function() {
            const labelText = this.textContent.toLowerCase();
            
            // Filtrar emails por etiqueta
            if (labelText.includes('comercial')) {
                filterEmailsByLabel('comercial');
            } else if (labelText.includes('financeiro')) {
                filterEmailsByLabel('financeiro');
            } else if (labelText.includes('suporte')) {
                filterEmailsByLabel('suporte');
            }
        });
    });
}

function initEmailSearch() {
    const searchInput = document.querySelector('.email-search input');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            emailSearchTerm = e.target.value.toLowerCase();
            loadEmails();
        });
    }
}

function initNewEmailButton() {
    const btnNewEmail = document.querySelector('.btn-primary.full');
    
    if (btnNewEmail) {
        btnNewEmail.addEventListener('click', () => {
            alert('📧 Funcionalidade de nova mensagem em desenvolvimento!\n\nEm breve você poderá:\n• Compor emails\n• Adicionar anexos\n• Usar templates');
        });
    }
}

function initEmailActions() {
    // Botão Responder
    const btnReply = document.querySelector('.email-actions .btn-primary');
    if (btnReply) {
        btnReply.addEventListener('click', () => {
            const email = MOCK_EMAILS.find(e => e.id === currentEmailId);
            if (email) {
                alert(`📧 Respondendo para: ${email.remetente}\n\nEm desenvolvimento: editor de resposta.`);
            }
        });
    }
    
    // Botão Encaminhar
    const btnForward = document.querySelector('.email-actions .btn-secondary');
    if (btnForward) {
        btnForward.addEventListener('click', () => {
            alert('📧 Funcionalidade de encaminhar em desenvolvimento!');
        });
    }
}

function initEmailToolbar() {
    const toolbarButtons = document.querySelectorAll('.email-toolbar button');
    
    toolbarButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (index === 0) {
                // Arquivar
                alert('🗄 Email arquivado com sucesso!');
                // Remover da lista
                const emailItems = document.querySelectorAll('.email-item');
                emailItems.forEach(item => {
                    if (item.classList.contains('active')) {
                        item.remove();
                    }
                });
            } else if (index === 1) {
                // Deletar
                if (confirm('🗑 Tem certeza que deseja excluir este email?')) {
                    alert('Email movido para lixeira!');
                    const emailItems = document.querySelectorAll('.email-item');
                    emailItems.forEach(item => {
                        if (item.classList.contains('active')) {
                            item.remove();
                        }
                    });
                }
            }
        });
    });
}

function loadEmails() {
    const emailsContainer = document.querySelector('.emails');
    if (!emailsContainer) return;
    
    // Filtrar emails
    let filteredEmails = [...MOCK_EMAILS];
    
    // Aplicar filtro de pesquisa
    if (emailSearchTerm) {
        filteredEmails = filteredEmails.filter(email => 
            email.remetente.toLowerCase().includes(emailSearchTerm) ||
            email.assunto.toLowerCase().includes(emailSearchTerm) ||
            email.preview.toLowerCase().includes(emailSearchTerm)
        );
    }
    
    // Renderizar lista
    emailsContainer.innerHTML = filteredEmails.map(email => `
        <article class="email-item ${email.id === currentEmailId ? 'active' : ''}" data-id="${email.id}">
            <header>
                <strong>${escapeHtml(email.remetente)}</strong>
                <span>${email.data}</span>
            </header>
            <h5>${escapeHtml(email.assunto)}</h5>
            <p>${escapeHtml(email.preview)}</p>
            <span class="tag ${email.etiqueta}">${email.etiqueta}</span>
        </article>
    `).join('');
    
    // Adicionar event listeners aos itens
    const emailItems = document.querySelectorAll('.email-item');
    emailItems.forEach(item => {
        item.addEventListener('click', function() {
            const emailId = parseInt(this.dataset.id);
            selectEmail(emailId);
        });
    });
    
    // Carregar primeiro email por padrão
    if (filteredEmails.length > 0 && currentEmailId) {
        displayEmail(currentEmailId);
    }
}

function selectEmail(emailId) {
    currentEmailId = emailId;
    
    // Atualizar classe active
    document.querySelectorAll('.email-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`.email-item[data-id="${emailId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Exibir conteúdo
    displayEmail(emailId);
}

function displayEmail(emailId) {
    const email = MOCK_EMAILS.find(e => e.id === emailId);
    if (!email) return;
    
    const emailBody = document.querySelector('.email-body');
    if (!emailBody) return;
    
    emailBody.innerHTML = `
        <h2>${escapeHtml(email.assunto)}</h2>
        <small>${escapeHtml(email.remetente)} &lt;${escapeHtml(email.email)}&gt;</small>
        
        <hr>
        
        ${email.conteudo}
        
        ${email.anexos.length > 0 ? `
            <div class="attachments">
                <h4>Anexos</h4>
                ${email.anexos.map(anexo => `
                    <div class="file">
                        <span class="${anexo.tipo}">${anexo.tipo.toUpperCase()}</span>
                        <div>
                            <strong>${escapeHtml(anexo.nome)}</strong>
                            <small>${anexo.tamanho}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    // Atualizar contador na toolbar
    const toolbarCounter = document.querySelector('.email-toolbar span');
    if (toolbarCounter) {
        const currentIndex = MOCK_EMAILS.findIndex(e => e.id === emailId) + 1;
        toolbarCounter.textContent = `${currentIndex} de ${MOCK_EMAILS.length}`;
    }
}

function filterEmailsByLabel(label) {
    const filteredEmails = MOCK_EMAILS.filter(email => email.etiqueta === label);
    
    const emailsContainer = document.querySelector('.emails');
    if (!emailsContainer) return;
    
    emailsContainer.innerHTML = filteredEmails.map(email => `
        <article class="email-item ${email.id === currentEmailId ? 'active' : ''}" data-id="${email.id}">
            <header>
                <strong>${escapeHtml(email.remetente)}</strong>
                <span>${email.data}</span>
            </header>
            <h5>${escapeHtml(email.assunto)}</h5>
            <p>${escapeHtml(email.preview)}</p>
            <span class="tag ${email.etiqueta}">${email.etiqueta}</span>
        </article>
    `).join('');
    
    // Re-adicionar event listeners
    const emailItems = document.querySelectorAll('.email-item');
    emailItems.forEach(item => {
        item.addEventListener('click', function() {
            const emailId = parseInt(this.dataset.id);
            selectEmail(emailId);
        });
    });
    
    if (filteredEmails.length > 0) {
        selectEmail(filteredEmails[0].id);
    }
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

console.log("✅ Módulo de Atendimento carregado com funcionalidade de Emails");
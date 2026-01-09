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

// Inicializar histórico
function initHistoricoTab() {
    console.log("📋 Inicializando aba de Histórico");
    
    // Configurar data atual nos filtros
    const hoje = new Date().toISOString().split('T')[0];
    const filtroDataFim = document.getElementById('filtroDataFim');
    if (filtroDataFim) {
        filtroDataFim.value = hoje;
    }
    
    // Event listeners dos filtros
    initHistoricoFilters();
    
    // Event listeners do modal
    initHistoricoModal();
    
    // Carregar dados iniciais
    aplicarFiltrosHistorico();
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
            
            switch(periodo) {
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
        card.addEventListener('click', function() {
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
        alert(`✓ Atendimento reaberto com sucesso!\n\nO ticket ${ticketId} foi reaberto e está disponível na fila de atendimentos.`);
        
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
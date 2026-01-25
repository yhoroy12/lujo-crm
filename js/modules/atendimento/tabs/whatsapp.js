/**
 * ABA: ATENDIMENTO WHATSAPP
 * Gerencia atendimento via WhatsApp/Telefone
 */

const WhatsAppTab = {
  id: 'aba-atendimento',
  moduleId: 'atendimento',
  
  // Cache de elementos
  elements: {},

  async init() {
    console.log('📱 Inicializando aba WhatsApp');
    
    try {
      this.cacheElements();
      this.bindEvents();
      this.setupInitialState();
      console.log('✅ WhatsApp pronto');
    } catch (error) {
      console.error('❌ Erro em WhatsApp:', error);
    }
  },

  cacheElements() {
    this.elements = {
      popup: document.getElementById('popupAtendimento'),
      workspace: document.getElementById('workspaceGrid'),
      emptyState: document.getElementById('emptyState'),
      btnAceitar: document.getElementById('btnIniciarAtendimentoPopup'),
      btnIniciar: document.getElementById('btnIniciarAtendimento'),
      btnConcluir: document.getElementById('btnConcluir'),
      btnEncaminhar: document.getElementById('btnEncaminhar'),
      chatbox: document.getElementById('chatbox'),
      chatInput: document.getElementById('chatInput'),
      btnEnviar: document.getElementById('btnEnviarMensagem'),
      timeline: document.getElementById('timeline'),
      clienteNome: document.getElementById('clienteNome'),
      clienteTelefone: document.getElementById('clienteTelefone'),
      clienteEmail: document.getElementById('clienteEmail'),
      statusBadge: document.getElementById('statusBadge')
    };
  },

  bindEvents() {
    // Botão aceitar atendimento
    if (this.elements.btnAceitar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnAceitar,
        'click',
        () => this.acceptCall(),
        this.moduleId
      );
    }

    // Botão iniciar atendimento
    if (this.elements.btnIniciar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnIniciar,
        'click',
        () => this.startAttendance(),
        this.moduleId
      );
    }

    // Botão concluir
    if (this.elements.btnConcluir) {
      window.ModuleLifecycle.addListener(
        this.elements.btnConcluir,
        'click',
        () => this.concludeTicket(),
        this.moduleId
      );
    }

    // Botão enviar mensagem
    if (this.elements.btnEnviar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnEnviar,
        'click',
        () => this.sendMessage(),
        this.moduleId
      );
    }

    // Enter para enviar (Shift+Enter = quebra linha)
    if (this.elements.chatInput) {
      window.ModuleLifecycle.addListener(
        this.elements.chatInput,
        'keypress',
        (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        },
        this.moduleId
      );
    }
  },

  setupInitialState() {
    // Simular novo atendimento após 3 segundos
    setTimeout(() => {
      if (this.elements.popup) {
        this.elements.popup.style.display = 'flex';
        this.elements.popup.setAttribute('aria-hidden', 'false');
      }
    }, 3000);
  },

  acceptCall() {
    console.log('✅ Atendimento aceito');
    
    if (this.elements.popup) {
      this.elements.popup.style.display = 'none';
      this.elements.popup.setAttribute('aria-hidden', 'true');
    }
    
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.add('hidden');
    }
    
    if (this.elements.workspace) {
      this.elements.workspace.classList.remove('hidden');
    }
    
    this.fillClientData({
      nome: 'Marcos Oliveira',
      telefone: '(11) 98888-7777',
      email: 'marcos@email.com'
    });
    
    this.updateTicketFlow('NOVO');
    this.addTimelineItem(this.getCurrentTime(), 'Novo ticket atribuído a você.');
  },

  fillClientData(cliente) {
    if (this.elements.clienteNome) this.elements.clienteNome.value = cliente.nome;
    if (this.elements.clienteTelefone) this.elements.clienteTelefone.value = cliente.telefone;
    if (this.elements.clienteEmail) this.elements.clienteEmail.value = cliente.email;
    
    window.StateManager.set(this.moduleId, {
      currentTicket: cliente
    });
  },

  updateTicketFlow(novoEstado) {
    if (this.elements.statusBadge) {
      this.elements.statusBadge.textContent = novoEstado.replace(/_/g, ' ');
    }
    
    console.log(`📊 Estado do ticket: ${novoEstado}`);
  },

  startAttendance() {
    console.log('📞 Iniciando atendimento');
    this.updateTicketFlow('EM_ATENDIMENTO');
    this.addTimelineItem(this.getCurrentTime(), 'Atendimento iniciado');
  },

  concludeTicket() {
    if (confirm('Deseja realmente concluir este atendimento?')) {
      console.log('✅ Ticket concluído');
      this.addTimelineItem(this.getCurrentTime(), 'Ticket concluído');
      this.resetAttendanceStage();
    }
  },

  resetAttendanceStage() {
    if (this.elements.workspace) {
      this.elements.workspace.classList.add('hidden');
    }
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.remove('hidden');
    }
    if (this.elements.statusBadge) {
      this.elements.statusBadge.textContent = 'AGUARDANDO';
    }
    
    window.StateManager.set(this.moduleId, {
      currentTicket: null
    });
  },

  sendMessage() {
    const texto = this.elements.chatInput?.value.trim();
    if (!texto) return;
    
    console.log('📤 Mensagem enviada:', texto);
    
    if (this.elements.chatbox) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'msg atendente';
      msgDiv.innerHTML = `
        <div class="msg-content">${this.escapeHtml(texto)}</div>
        <div class="msg-time">${this.getCurrentTime()}</div>
      `;
      this.elements.chatbox.appendChild(msgDiv);
      this.elements.chatbox.scrollTop = this.elements.chatbox.scrollHeight;
    }
    
    if (this.elements.chatInput) {
      this.elements.chatInput.value = '';
      this.elements.chatInput.style.height = 'auto';
    }
  },

  addTimelineItem(hora, texto) {
    if (!this.elements.timeline) return;
    
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-dot active"></div>
      <div class="timeline-content">
        <span class="timeline-time">${hora}</span>
        <span class="timeline-text">${this.escapeHtml(texto)}</span>
      </div>
    `;
    this.elements.timeline.appendChild(item);
  },

  getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default WhatsAppTab;
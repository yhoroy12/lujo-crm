/**
 * ABA: ATENDIMENTO WHATSAPP (VERSÃO PROTEGIDA)
 * Gerencia atendimento via WhatsApp/Telefone
 * 
 * ✅ MELHORIAS IMPLEMENTADAS:
 * - Proteção contra re-inicialização (_initialized)
 * - Lógica de notificação inteligente (só notifica se ocioso E na aba certa)
 * - Cleanup completo de listeners Firebase
 * - Método refresh para re-ativação
 */

const WhatsAppTab = {
  id: 'aba-atendimento',
  moduleId: 'atendimento',
  elements: {},
  
  // ✅ NOVO: Controle de estado
  _initialized: false,
  
  // Listeners Firebase
  unsubscribeChat: null,
  unsubscribeFila: null,

  async init() {
    // ✅ PROTEÇÃO CONTRA RE-INICIALIZAÇÃO
    if (this._initialized) {
      console.warn('⚠️ WhatsAppTab já inicializado. Abortando duplicata.');
      return;
    }

    console.log('📱 Inicializando aba WhatsApp');
    
    // ✅ SOLUÇÃO: Limpa listeners anteriores antes de iniciar novos
    if (this.unsubscribeChat) {
      console.log("🧹 Removendo listener de chat duplicado...");
      this.unsubscribeChat();
      this.unsubscribeChat = null;
    }

    try {
      this.cacheElements();
      this.bindEvents();
      this.setupInitialState();

      const stateAtendimento = window.StateManager.get('atendimento') || {};
      const idSalvo = stateAtendimento.currentTicketId || localStorage.getItem('atendimento_ativo_id');

      if (idSalvo && typeof idSalvo === 'string') {
        console.log("🎯 Recuperando atendimento ativo:", idSalvo);
        await this.restaurarVisualAtendimento(idSalvo);
      }

      // ✅ MARCAR COMO INICIALIZADO
      this._initialized = true;
      console.log('✅ WhatsAppTab inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro em WhatsApp:', error);
      // ✅ RESET EM CASO DE ERRO
      this._initialized = false;
    }
  },

  cacheElements() {
    this.elements = {
      popup: document.getElementById('popupAtendimento'),
      workspace: document.getElementById('workspaceGrid'),
      emptyState: document.getElementById('emptyState'),
      btnAceitar: document.getElementById('btnIniciarAtendimentoPopup'),
      btnEnviar: document.getElementById('btnEnviarMensagem'),
      chatbox: document.getElementById('chatbox'),
      chatInput: document.getElementById('chatInput'),
      clienteNome: document.getElementById('clienteNome'),
      clienteTelefone: document.getElementById('clienteTelefone'),
      clienteEmail: document.getElementById('clienteEmail'),
      statusBadge: document.getElementById('statusBadge'),
      timeline: document.getElementById('timeline')
    };
  },

  bindEvents() {
    if (this.elements.btnAceitar) {
      window.ModuleLifecycle.addListener(this.elements.btnAceitar, 'click', () => this.acceptCall(), this.moduleId);
    }
    if (this.elements.btnEnviar) {
      window.ModuleLifecycle.addListener(this.elements.btnEnviar, 'click', () => this.sendMessage(), this.moduleId);
    }
    if (this.elements.chatInput) {
      window.ModuleLifecycle.addListener(this.elements.chatInput, 'keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      }, this.moduleId);
    }
  },

  setupInitialState() {
    const db = window.FirebaseApp.db;
    const { collection, query, where, onSnapshot } = window.FirebaseApp.fStore;
    const q = query(collection(db, "atend_chat_fila"), where("status", "==", "fila"));

    // ✅ SALVAR REFERÊNCIA PARA CLEANUP
    this.unsubscribeFila = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          this.ticketAtual = change.doc.data();
          this.notificarNovoAtendimento(this.ticketAtual);
        }
      });
    });
  },

  /**
   * ✅ LÓGICA DE NOTIFICAÇÃO INTELIGENTE
   * 
   * REGRAS:
   * - Só notifica se estiver OCIOSO (sem atendimento ativo)
   * - Só notifica se estiver na ABA WHATSAPP, DEMANDAS ou HISTÓRICO
   * - NÃO notifica se estiver na aba EMAILS
   */
  notificarNovoAtendimento(ticket) {
    console.log('🔔 Novo atendimento detectado:', ticket.atendimentoId);

    // ✅ VERIFICAR SE ESTÁ OCIOSO
    const atendimentoAtivo = localStorage.getItem('atendimento_ativo_id');
    const estaOcioso = !atendimentoAtivo;

    if (!estaOcioso) {
      console.log('🔕 Operador OCUPADO. Notificação ignorada (atendimento ativo:', atendimentoAtivo, ')');
      return;
    }

    // ✅ VERIFICAR EM QUAL ABA ESTÁ
    const state = window.StateManager.get('atendimento');
    const abaAtiva = state?.activeTab || 'aba-atendimento';

    // ✅ LISTA DE ABAS QUE PODEM RECEBER NOTIFICAÇÃO
    const abasPermitidas = ['aba-atendimento', 'aba-demandas', 'aba-historico'];

    if (!abasPermitidas.includes(abaAtiva)) {
      console.log(`🔕 Operador em aba não permitida (${abaAtiva}). Notificação ignorada.`);
      return;
    }

    // ✅ TODAS AS CONDIÇÕES ATENDIDAS: MOSTRAR POPUP
    console.log('✅ Exibindo notificação de novo atendimento');
    this.mostrarPopup(ticket);
  },

  /**
   * ✅ NOVO: Método separado para mostrar popup
   */
  mostrarPopup(ticket) {
    const nomeExibicao = document.getElementById('popupCliente');
    if (nomeExibicao) nomeExibicao.textContent = ticket.cliente.nome;
    if (this.elements.popup) this.elements.popup.style.display = 'flex';
  },

  acceptCall() {
    if (!this.ticketAtual) return;
    const ticket = this.ticketAtual;

    localStorage.setItem('atendimento_ativo_id', ticket.atendimentoId);
    window.StateManager.set('atendimento', { currentTicketId: ticket.atendimentoId });

    this.renderizarInterfaceAtendimento(ticket);
    this.vincularOperadorNoFirebase(ticket.atendimentoId);
    this.conectarChat(ticket.atendimentoId);
  },

  async restaurarVisualAtendimento(atendimentoId) {
    try {
      const db = window.FirebaseApp.db;
      const { doc, getDoc } = window.FirebaseApp.fStore;
      const docSnap = await getDoc(doc(db, "atend_chat_fila", atendimentoId));

      if (docSnap.exists()) {
        const ticket = docSnap.data();
        if (ticket.status === 'concluido') {
          localStorage.removeItem('atendimento_ativo_id');
          return;
        }

        this.ticketAtual = ticket;
        window.AtendimentoDataStructure.state.atendimentoId = atendimentoId;

        this.renderizarInterfaceAtendimento(ticket);
        this.conectarChat(atendimentoId);
      }
    } catch (error) {
      console.error("❌ Erro ao restaurar:", error);
    }
  },

  renderizarInterfaceAtendimento(ticket) {
    if (this.elements.popup) this.elements.popup.style.display = 'none';
    if (this.elements.emptyState) this.elements.emptyState.classList.add('hidden');
    if (this.elements.workspace) this.elements.workspace.classList.remove('hidden');

    this.fillClientData({
      nome: ticket.cliente.nome,
      telefone: ticket.cliente.telefone || "Não informado",
      email: ticket.cliente.email || "Não informado"
    });
  },

  conectarChat(atendimentoId) {
    if (this.unsubscribeChat) this.unsubscribeChat();

    const db = window.FirebaseApp.db;
    const { collection, query, orderBy, onSnapshot } = window.FirebaseApp.fStore;

    const q = query(
      collection(db, "atend_chat_fila", atendimentoId, "mensagem"),
      orderBy("timestamp", "asc")
    );

    if (this.elements.chatbox) this.elements.chatbox.innerHTML = '';

    this.unsubscribeChat = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          this.renderizarMensagemNaTela(change.doc.data());
        }
      });
    });
  },

  renderizarMensagemNaTela(msg) {
    if (!this.elements.chatbox) return;

    const msgDiv = document.createElement('div');
    const classeLado = msg.autor === 'operador' ? 'atendente' : 'cliente';
    msgDiv.className = `msg ${classeLado}`;

    const hora = msg.timestamp?.toDate ?
      msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
      this.getCurrentTime();

    msgDiv.innerHTML = `
      <div class="msg-content">${this.escapeHtml(msg.texto)}</div>
      <div class="msg-time">${hora}</div>
    `;

    this.elements.chatbox.appendChild(msgDiv);
    this.elements.chatbox.scrollTop = this.elements.chatbox.scrollHeight;
  },

  async sendMessage() {
    const texto = this.elements.chatInput?.value.trim();
    const atendimentoId = window.AtendimentoDataStructure?.state?.atendimentoId;

    if (!texto || !atendimentoId) return;

    try {
      const db = window.FirebaseApp.db;
      const { collection, addDoc, serverTimestamp } = window.FirebaseApp.fStore;

      this.elements.chatInput.value = '';

      await addDoc(collection(db, "atend_chat_fila", atendimentoId, "mensagem"), {
        texto: texto,
        autor: "operador",
        nome: window.AuthSystem.getCurrentUser()?.name || "Atendente",
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("❌ Erro ao enviar:", error);
    }
  },

  fillClientData(cliente) {
    if (this.elements.clienteNome) this.elements.clienteNome.value = cliente.nome;
    if (this.elements.clienteTelefone) this.elements.clienteTelefone.value = cliente.telefone;
    if (this.elements.clienteEmail) this.elements.clienteEmail.value = cliente.email;
  },

  getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  async vincularOperadorNoFirebase(atendimentoId) {
    try {
      const manager = window.AtendimentoDataStructure;

      const finalUID = window.FirebaseApp.auth?.currentUser?.uid;
      
      if (!finalUID) {
        console.error("❌ Erro Crítico: UID do operador não encontrado. Verifique se o operador está logado no Firebase.");
        if (window.ToastManager) window.ToastManager.show("Sessão expirada. Faça login novamente.", "error");
        return;
      }

      const usuarioLogado = window.AuthSystem?.getCurrentUser() || {};
      const operadorInfo = {
        atribuido_para_uid: finalUID,
        nome: usuarioLogado.name || "Operador",
        role: usuarioLogado.role || "Atendente"
      };

      console.log("🤝 Vinculando operador garantido:", operadorInfo);

      manager.state.atendimentoId = atendimentoId;
      await manager.operadorAceitaAtendimento(operadorInfo);

      console.log("🚀 Firebase atualizado com sucesso!");

    } catch (error) {
      console.error("❌ Falha ao vincular operador:", error);
    }
  },

  /**
   * ✅ NOVO: Método de refresh (chamado ao retornar para a aba)
   */
  async refresh() {
    console.log('🔄 Atualizando WhatsAppTab...');

    try {
      // Verificar se há atendimento ativo para restaurar
      const idSalvo = localStorage.getItem('atendimento_ativo_id');
      
      if (idSalvo) {
        console.log('🎯 Verificando status do atendimento ativo...');
        await this.restaurarVisualAtendimento(idSalvo);
      }

      console.log('✅ WhatsAppTab atualizado');
    } catch (error) {
      console.error('❌ Erro ao atualizar WhatsApp:', error);
    }
  },

  /**
   * ✅ NOVO: Método de cleanup (chamado ao sair da aba)
   */
  cleanup() {
    console.log('🧹 Limpando WhatsAppTab...');

    try {
      // ✅ Limpar listener do chat (se houver)
      if (this.unsubscribeChat) {
        console.log('🧹 Removendo listener de chat');
        this.unsubscribeChat();
        this.unsubscribeChat = null;
      }

      // ✅ IMPORTANTE: NÃO limpar unsubscribeFila
      // Ele precisa continuar rodando para distribuir atendimentos
      console.log('ℹ️ Listener de fila mantido ativo (distribuição contínua)');

      // ✅ NÃO resetar _initialized (tab continua carregada)
      console.log('✅ WhatsAppTab limpo (pronto para reuso)');

    } catch (error) {
      console.warn('⚠️ Erro no cleanup de WhatsApp:', error);
    }
  },

  /**
   * ✅ NOVO: Cleanup completo (apenas quando sair do módulo inteiro)
   */
  destroy() {
    console.log('🗑️ Destruindo WhatsAppTab completamente...');

    // Limpar TUDO, incluindo listener de fila
    if (this.unsubscribeChat) {
      this.unsubscribeChat();
      this.unsubscribeChat = null;
    }

    if (this.unsubscribeFila) {
      this.unsubscribeFila();
      this.unsubscribeFila = null;
    }

    this._initialized = false;
    console.log('✅ WhatsAppTab destruído');
  }
};

// ✅ Expor globalmente
window.WhatsAppTab = WhatsAppTab;

export default WhatsAppTab;

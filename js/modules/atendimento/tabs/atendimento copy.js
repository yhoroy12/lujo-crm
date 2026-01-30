/**
 * ABA: ATENDIMENTO WHATSAPP
 * Gerencia atendimento via WhatsApp/Telefone
 */

const WhatsAppTab = {
  id: 'aba-atendimento',
  moduleId: 'atendimento',
  elements: {},
  unsubscribeChat: null, // Guardar a conexão do chat para limpar depois

  async init() {
    console.log('📱 Inicializando aba WhatsApp');
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
    const q = query(collection(db, "atend_chat_fila"), where("status", "==", "novo"));

    this.unsubscribeFila = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          this.ticketAtual = change.doc.data();
          this.notificarNovoAtendimento(this.ticketAtual);
        }
      });
    });
  },

  notificarNovoAtendimento(ticket) {
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
    this.conectarChat(ticket.atendimentoId); // Inicia o chat em tempo real
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
        this.conectarChat(atendimentoId); // Restaura as mensagens
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

      // 1. Tenta pegar o UID de três fontes diferentes para garantir
      const firebaseUID = window.FirebaseApp.auth?.currentUser?.uid;
      const authSystemUID = window.AuthSystem?.getCurrentUser()?.uid;
      const authSystemId = window.AuthSystem?.getCurrentUser()?.id;

      const finalUID = window.FirebaseApp.auth?.currentUser?.uid;
      // 2. Trava de segurança: Se ainda for undefined, não prossegue
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

      // 3. Executa o aceite no manager
      await manager.operadorAceitaAtendimento(operadorInfo);

      console.log("🚀 Firebase atualizado com sucesso!");

    } catch (error) {
      console.error("❌ Falha ao vincular operador:", error);
    }
  }
};

export default WhatsAppTab;
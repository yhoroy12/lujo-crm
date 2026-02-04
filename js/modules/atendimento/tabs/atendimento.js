/**
 * ABA: ATENDIMENTO WHATSAPP (VERSÃO COMPLETA)
 * Gerencia atendimento via WhatsApp/Telefone
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * - Proteção contra re-inicialização
 * - Notificação inteligente
 * - Sistema de validação de identidade
 * - Salvamento otimizado (apenas ao concluir)
 * - Campos do formulário de atendimento
 */

const WhatsAppTab = {
  id: 'aba-atendimento',
  moduleId: 'atendimento',
  elements: {},
  
  // ✅ Controle de estado
  _initialized: false,
  
  // Listeners Firebase
  unsubscribeChat: null,
  unsubscribeFila: null,
  
  // ✅ NOVO: Estado local dos campos (não salva até finalizar)
  dadosAtendimento: {
    validacao_identidade: {
      concluida: false,
      campos_verificados: []
    },
    tipo_demanda: '',
    setor_responsavel: '',
    descricao_solicitacao: '',
    observacoes_internas: ''
  },

  async init() {
    // ✅ PROTEÇÃO CONTRA RE-INICIALIZAÇÃO
    if (this._initialized) {
      console.warn('⚠️ WhatsAppTab já inicializado. Abortando duplicata.');
      return;
    }

    console.log('📱 Inicializando aba WhatsApp');
    
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

      this._initialized = true;
      console.log('✅ WhatsAppTab inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro em WhatsApp:', error);
      this._initialized = false;
    }
  },

  cacheElements() {
    this.elements = {
      // Popup e workspace
      popup: document.getElementById('popupAtendimento'),
      workspace: document.getElementById('workspaceGrid'),
      emptyState: document.getElementById('emptyState'),
      
      // Botões principais
      btnAceitar: document.getElementById('btnIniciarAtendimentoPopup'),
      btnEnviar: document.getElementById('btnEnviarMensagem'),
      btnConcluir: document.getElementById('btnConcluir'),
      
      // Chat
      chatbox: document.getElementById('chatbox'),
      chatInput: document.getElementById('chatInput'),
      
      // Dados do cliente (coluna 1)
      clienteNome: document.getElementById('clienteNome'),
      clienteTelefone: document.getElementById('clienteTelefone'),
      clienteEmail: document.getElementById('clienteEmail'),
      
      // ✅ NOVO: Checkboxes de validação
      checkNome: document.getElementById('checkNome'),
      checkTelefone: document.getElementById('checkTelefone'),
      checkEmail: document.getElementById('checkEmail'),
      btnValidarIdentidade: document.getElementById('btnValidarIdentidade'),
      
      // ✅ NOVO: Campos do formulário (coluna 3)
      tipoDemanda: document.getElementById('tipoDemanda'),
      setorResponsavel: document.getElementById('setorResponsavel'),
      descricaoSolicitacao: document.getElementById('descricaoSolicitacao'),
      observacoesInternas: document.getElementById('observacoesInternas'),
      
      // Outros
      statusBadge: document.getElementById('statusBadge'),
      timeline: document.getElementById('timeline')
    };
  },

  bindEvents() {
    // Eventos existentes
    if (this.elements.btnAceitar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnAceitar, 
        'click', 
        () => this.acceptCall(), 
        this.moduleId
      );
    }

    if (this.elements.btnEnviar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnEnviar, 
        'click', 
        () => this.sendMessage(), 
        this.moduleId
      );
    }

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

    // ✅ NOVO: Eventos das checkboxes
    [this.elements.checkNome, this.elements.checkTelefone, this.elements.checkEmail].forEach(checkbox => {
      if (checkbox) {
        window.ModuleLifecycle.addListener(
          checkbox,
          'change',
          () => this.verificarCheckboxes(),
          this.moduleId
        );
      }
    });

    // ✅ NOVO: Evento do botão de validar identidade
    if (this.elements.btnValidarIdentidade) {
      window.ModuleLifecycle.addListener(
        this.elements.btnValidarIdentidade,
        'click',
        () => this.confirmarValidacaoIdentidade(),
        this.moduleId
      );
    }

    // ✅ NOVO: Eventos dos campos do formulário (salvar em memória)
    [
      this.elements.tipoDemanda,
      this.elements.setorResponsavel,
      this.elements.descricaoSolicitacao,
      this.elements.observacoesInternas
    ].forEach(field => {
      if (field) {
        window.ModuleLifecycle.addListener(
          field,
          'change',
          () => this.atualizarDadosLocais(),
          this.moduleId
        );
      }
    });

    // ✅ NOVO: Evento do botão Concluir
    if (this.elements.btnConcluir) {
      window.ModuleLifecycle.addListener(
        this.elements.btnConcluir,
        'click',
        () => this.concluirAtendimento(),
        this.moduleId
      );
    }
  },

  /**
   * ✅ NOVO: Verificar se todas as checkboxes estão marcadas
   */
  verificarCheckboxes() {
    const todasMarcadas = 
      this.elements.checkNome?.checked &&
      this.elements.checkTelefone?.checked &&
      this.elements.checkEmail?.checked;

    if (this.elements.btnValidarIdentidade) {
      this.elements.btnValidarIdentidade.disabled = !todasMarcadas;
      
      // Visual feedback
      if (todasMarcadas) {
        this.elements.btnValidarIdentidade.classList.add('btn-ready');
      } else {
        this.elements.btnValidarIdentidade.classList.remove('btn-ready');
      }
    }

    console.log(`✅ Checkboxes: ${todasMarcadas ? 'Todas marcadas' : 'Incompleto'}`);
  },

  /**
   * ✅ NOVO: Confirmar validação de identidade
   * (Salva APENAS a validação no Firebase)
   */
  async confirmarValidacaoIdentidade() {
    const atendimentoId = localStorage.getItem('atendimento_ativo_id');
    
    if (!atendimentoId) {
      console.error('❌ Nenhum atendimento ativo');
      return;
    }

    try {
      const user = window.AuthSystem.getCurrentUser();
      
      // ✅ Atualizar estado local
      this.dadosAtendimento.validacao_identidade = {
        concluida: true,
        validado_por: user?.name || 'Operador',
        validado_em: new Date(),
        campos_verificados: ['nome', 'telefone', 'email']
      };

      // ✅ Salvar APENAS validação no Firebase
      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;

      await updateDoc(doc(db, "atend_chat_fila", atendimentoId), {
        validacao_identidade: {
          concluida: true,
          validado_por: user?.name || 'Operador',
          validado_em: serverTimestamp(),
          campos_verificados: ['nome', 'telefone', 'email']
        }
      });

      console.log('✅ Validação de identidade salva no Firebase');

      // ✅ Feedback visual
      if (this.elements.btnValidarIdentidade) {
        this.elements.btnValidarIdentidade.textContent = '✓ Identidade Confirmada';
        this.elements.btnValidarIdentidade.disabled = true;
        this.elements.btnValidarIdentidade.classList.add('btn-success');
      }

      // ✅ Desabilitar checkboxes (não pode mais alterar)
      [this.elements.checkNome, this.elements.checkTelefone, this.elements.checkEmail].forEach(cb => {
        if (cb) cb.disabled = true;
      });

      // ✅ Mostrar botão "Concluir" (se estava oculto)
      if (this.elements.btnConcluir) {
        this.elements.btnConcluir.classList.remove('hidden');
      }

      // ✅ Toast de sucesso (se tiver)
      if (window.showToast) {
        window.showToast('Identidade validada com sucesso!', 'success');
      }

    } catch (error) {
      console.error('❌ Erro ao salvar validação:', error);
      alert('Erro ao confirmar validação. Tente novamente.');
    }
  },

  /**
   * ✅ NOVO: Atualizar dados locais (NÃO salva no Firebase ainda)
   */
  atualizarDadosLocais() {
    this.dadosAtendimento.tipo_demanda = this.elements.tipoDemanda?.value || '';
    this.dadosAtendimento.setor_responsavel = this.elements.setorResponsavel?.value || '';
    this.dadosAtendimento.descricao_solicitacao = this.elements.descricaoSolicitacao?.value || '';
    this.dadosAtendimento.observacoes_internas = this.elements.observacoesInternas?.value || '';

    console.log('💾 Dados atualizados na memória (não salvos ainda):', this.dadosAtendimento);
  },

  /**
   * ✅ NOVO: Concluir atendimento (SALVA TUDO)
   */
  async concluirAtendimento() {
    const atendimentoId = localStorage.getItem('atendimento_ativo_id');
    
    if (!atendimentoId) {
      console.error('❌ Nenhum atendimento ativo');
      return;
    }

    // ✅ VALIDAÇÃO: Verificar se identidade foi confirmada
    if (!this.dadosAtendimento.validacao_identidade.concluida) {
      alert('⚠️ Por favor, confirme a validação de identidade antes de concluir.');
      return;
    }

    // ✅ Confirmar ação
    if (!confirm('Deseja realmente concluir este atendimento?')) {
      return;
    }

    try {
      console.log('📤 Finalizando atendimento e salvando todos os dados...');

      const user = window.AuthSystem.getCurrentUser();
      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;

      // ✅ Atualizar dados locais com valores atuais
      this.atualizarDadosLocais();

      // ✅ PREPARAR OBJETO DE ATUALIZAÇÃO (só envia campos preenchidos)
      const updateData = {
        status: 'concluido',
        concluido_em: serverTimestamp(),
        concluido_por: user?.name || 'Operador',
        concluido_por_uid: user?.uid || null
      };

      // ✅ Adicionar validação (se não foi salva antes)
      if (this.dadosAtendimento.validacao_identidade.concluida) {
        updateData.validacao_identidade = {
          concluida: true,
          validado_por: this.dadosAtendimento.validacao_identidade.validado_por,
          validado_em: this.dadosAtendimento.validacao_identidade.validado_em || serverTimestamp(),
          campos_verificados: this.dadosAtendimento.validacao_identidade.campos_verificados
        };
      }

      // ✅ Adicionar campos do formulário (apenas se preenchidos)
      if (this.dadosAtendimento.tipo_demanda) {
        updateData.tipo_demanda = this.dadosAtendimento.tipo_demanda;
      }

      if (this.dadosAtendimento.setor_responsavel) {
        updateData.setor_responsavel = this.dadosAtendimento.setor_responsavel;
      }

      if (this.dadosAtendimento.descricao_solicitacao) {
        updateData.descricao_solicitacao = this.dadosAtendamento.descricao_solicitacao;
      }

      if (this.dadosAtendimento.observacoes_internas) {
        updateData.observacoes_internas = this.dadosAtendimento.observacoes_internas;
      }

      console.log('📊 Dados a salvar:', updateData);

      // ✅ SALVAR TUDO DE UMA VEZ
      await updateDoc(doc(db, "atend_chat_fila", atendimentoId), updateData);

      console.log('✅ Atendimento concluído e salvo no Firebase!');

      // ✅ Feedback visual
      if (window.showToast) {
        window.showToast('Atendimento concluído com sucesso!', 'success');
      } else {
        alert('✅ Atendimento concluído com sucesso!');
      }

      // ✅ Limpar interface
      this.limparInterface();

      // ✅ Limpar localStorage
      localStorage.removeItem('atendimento_ativo_id');
      window.StateManager.set('atendimento', { currentTicketId: null });

    } catch (error) {
      console.error('❌ Erro ao concluir atendimento:', error);
      alert('Erro ao finalizar atendimento. Verifique o console.');
    }
  },

  /**
   * ✅ NOVO: Limpar interface após conclusão
   */
  limparInterface() {
    // Ocultar workspace
    if (this.elements.workspace) {
      this.elements.workspace.classList.add('hidden');
    }

    // Mostrar empty state
    if (this.elements.emptyState) {
      this.elements.emptyState.classList.remove('hidden');
    }

    // Limpar chat
    if (this.elements.chatbox) {
      this.elements.chatbox.innerHTML = '';
    }

    // Resetar campos
    if (this.elements.tipoDemanda) this.elements.tipoDemanda.value = '';
    if (this.elements.setorResponsavel) this.elements.setorResponsavel.value = '';
    if (this.elements.descricaoSolicitacao) this.elements.descricaoSolicitacao.value = '';
    if (this.elements.observacoesInternas) this.elements.observacoesInternas.value = '';

    // Resetar checkboxes
    if (this.elements.checkNome) {
      this.elements.checkNome.checked = false;
      this.elements.checkNome.disabled = false;
    }
    if (this.elements.checkTelefone) {
      this.elements.checkTelefone.checked = false;
      this.elements.checkTelefone.disabled = false;
    }
    if (this.elements.checkEmail) {
      this.elements.checkEmail.checked = false;
      this.elements.checkEmail.disabled = false;
    }

    // Resetar botão de validação
    if (this.elements.btnValidarIdentidade) {
      this.elements.btnValidarIdentidade.disabled = true;
      this.elements.btnValidarIdentidade.textContent = 'Confirmar Identidade';
      this.elements.btnValidarIdentidade.classList.remove('btn-success', 'btn-ready');
    }

    // Resetar estado local
    this.dadosAtendimento = {
      validacao_identidade: {
        concluida: false,
        campos_verificados: []
      },
      tipo_demanda: '',
      setor_responsavel: '',
      descricao_solicitacao: '',
      observacoes_internas: ''
    };

    console.log('🧹 Interface limpa');
  },

  setupInitialState() {
    const db = window.FirebaseApp.db;
    const { collection, query, where, onSnapshot } = window.FirebaseApp.fStore;
    const q = query(collection(db, "atend_chat_fila"), where("status", "==", "fila"));

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
   * ✅ Lógica de notificação inteligente
   */
  notificarNovoAtendimento(ticket) {
    console.log('🔔 Novo atendimento detectado:', ticket.atendimentoId);

    const atendimentoAtivo = localStorage.getItem('atendimento_ativo_id');
    const estaOcioso = !atendimentoAtivo;

    if (!estaOcioso) {
      console.log('🔕 Operador OCUPADO. Notificação ignorada');
      return;
    }

    const state = window.StateManager.get('atendimento');
    const abaAtiva = state?.activeTab || 'aba-atendimento';
    const abasPermitidas = ['aba-atendimento', 'aba-demandas', 'aba-historico'];

    if (!abasPermitidas.includes(abaAtiva)) {
      console.log(`🔕 Operador em aba não permitida (${abaAtiva})`);
      return;
    }

    console.log('✅ Exibindo notificação de novo atendimento');
    this.mostrarPopup(ticket);
  },

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
        
        // ✅ NOVO: Restaurar campos do formulário
        this.restaurarCamposFormulario(ticket);
      }
    } catch (error) {
      console.error("❌ Erro ao restaurar:", error);
    }
  },

  /**
   * ✅ NOVO: Restaurar campos do formulário
   */
  restaurarCamposFormulario(ticket) {
    console.log('🔄 Restaurando campos do formulário...');

    // Restaurar validação de identidade
    if (ticket.validacao_identidade?.concluida) {
      if (this.elements.checkNome) {
        this.elements.checkNome.checked = true;
        this.elements.checkNome.disabled = true;
      }
      if (this.elements.checkTelefone) {
        this.elements.checkTelefone.checked = true;
        this.elements.checkTelefone.disabled = true;
      }
      if (this.elements.checkEmail) {
        this.elements.checkEmail.checked = true;
        this.elements.checkEmail.disabled = true;
      }
      
      if (this.elements.btnValidarIdentidade) {
        this.elements.btnValidarIdentidade.textContent = '✓ Identidade Confirmada';
        this.elements.btnValidarIdentidade.disabled = true;
        this.elements.btnValidarIdentidade.classList.add('btn-success');
      }

      this.dadosAtendimento.validacao_identidade = ticket.validacao_identidade;
    }

    // Restaurar campos do formulário
    if (ticket.tipo_demanda && this.elements.tipoDemanda) {
      this.elements.tipoDemanda.value = ticket.tipo_demanda;
      this.dadosAtendimento.tipo_demanda = ticket.tipo_demanda;
    }

    if (ticket.setor_responsavel && this.elements.setorResponsavel) {
      this.elements.setorResponsavel.value = ticket.setor_responsavel;
      this.dadosAtendimento.setor_responsavel = ticket.setor_responsavel;
    }

    if (ticket.descricao_solicitacao && this.elements.descricaoSolicitacao) {
      this.elements.descricaoSolicitacao.value = ticket.descricao_solicitacao;
      this.dadosAtendimento.descricao_solicitacao = ticket.descricao_solicitacao;
    }

    if (ticket.observacoes_internas && this.elements.observacoesInternas) {
      this.elements.observacoesInternas.value = ticket.observacoes_internas;
      this.dadosAtendimento.observacoes_internas = ticket.observacoes_internas;
    }

    console.log('✅ Campos restaurados');
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
        console.error("❌ UID do operador não encontrado");
        return;
      }

      const usuarioLogado = window.AuthSystem?.getCurrentUser() || {};
      const operadorInfo = {
        atribuido_para_uid: finalUID,
        nome: usuarioLogado.name || "Operador",
        role: usuarioLogado.role || "Atendente"
      };

      manager.state.atendimentoId = atendimentoId;
      await manager.operadorAceitaAtendimento(operadorInfo);

    } catch (error) {
      console.error("❌ Falha ao vincular operador:", error);
    }
  },

  async refresh() {
    console.log('🔄 Atualizando WhatsAppTab...');

    try {
      const idSalvo = localStorage.getItem('atendimento_ativo_id');
      
      if (idSalvo) {
        await this.restaurarVisualAtendimento(idSalvo);
      }

      console.log('✅ WhatsAppTab atualizado');
    } catch (error) {
      console.error('❌ Erro ao atualizar WhatsApp:', error);
    }
  },

  cleanup() {
    console.log('🧹 Limpando WhatsAppTab...');

    try {
      if (this.unsubscribeChat) {
        this.unsubscribeChat();
        this.unsubscribeChat = null;
      }

      console.log('✅ WhatsAppTab limpo');
    } catch (error) {
      console.warn('⚠️ Erro no cleanup:', error);
    }
  },

  destroy() {
    console.log('🗑️ Destruindo WhatsAppTab...');

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

window.WhatsAppTab = WhatsAppTab;
export default WhatsAppTab;
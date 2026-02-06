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
      // ✅ Popup de Encaminhamento
      popupEncaminhar: document.getElementById('popupEncaminhar'),
      btnFecharEncaminhar: document.getElementById('btnFecharEncaminhar'),
      btnCancelarEncaminhar: document.getElementById('btnCancelarEncaminhar'),
      btnConfirmarEncaminhar: document.getElementById('btnConfirmarEncaminhar'),
      popupSetorDestino: document.getElementById('popupSetorDestino'),
      popupDescricaoSolicitacao: document.getElementById('popupDescricaoSolicitacao'),
      justificativaEncaminhamento: document.getElementById('justificativaEncaminhamento'),
      charCount: document.getElementById('charCount'),

      // Botões principais do chat
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
      // ✅ Botões de estado
      btnIniciarAtendimento: document.getElementById('btnIniciarAtendimento'),
      btnConcluir: document.getElementById('btnConcluir'),
      btnEncaminhar: document.getElementById('btnEncaminhar'),

      // ✅ NOVO: Campos do formulário (coluna 3)
      tipoDemanda: document.getElementById('tipoDemanda'),
      setorResponsavel: document.getElementById('setorResponsavel'),
      descricaoSolicitacao: document.getElementById('descricaoSolicitacao'),
      observacoesInternas: document.getElementById('observacoesInternas'),
      // Outros elementos do ticket
      ticketId: document.getElementById('ticketId'),
      stateIndicator: document.getElementById('stateIndicator'),
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

    // ✅ NOVO: Evento para botão "Iniciar Atendimento"
    if (this.elements.btnIniciarAtendimento) {
      window.ModuleLifecycle.addListener(
        this.elements.btnIniciarAtendimento,
        'click',
        () => this.iniciarAtendimento(),
        this.moduleId
      );
    }

    // ✅ NOVO: Evento para botão "Encaminhar"
    if (this.elements.btnEncaminhar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnEncaminhar,
        'click',
        () => this.encaminharAtendimento(),
        this.moduleId
      );
    }
    // ✅ Eventos do popup de encaminhamento
    if (this.elements.btnFecharEncaminhar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnFecharEncaminhar,
        'click',
        () => this.fecharPopupEncaminhar(),
        this.moduleId
      );
    }

    if (this.elements.btnCancelarEncaminhar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnCancelarEncaminhar,
        'click',
        () => this.fecharPopupEncaminhar(),
        this.moduleId
      );
    }

    if (this.elements.btnConfirmarEncaminhar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnConfirmarEncaminhar,
        'click',
        () => this.confirmarEncaminhamento(),
        this.moduleId
      );
    }

    if (this.elements.justificativaEncaminhamento) {
      window.ModuleLifecycle.addListener(
        this.elements.justificativaEncaminhamento,
        'input',
        () => this.atualizarContadorCaracteres(),
        this.moduleId
      );
    }

    // ✅ NOVO: Evento do botão Concluir
    if (this.elements.btnConcluir) {
      window.ModuleLifecycle.addListener(
        this.elements.btnConcluir,
        'click',
        () => this.concluirAtendimento(),
        this.moduleId
      );
    }
    // Outros eventos podem ser adicionados aqui

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
   * (Salva APENAS a validação no Firebase) + INTEGRAÇÃO COM STATE MACHINE
   */
  async confirmarValidacaoIdentidade() {
    const atendimentoId = localStorage.getItem('atendimento_ativo_id');

    if (!atendimentoId) {
      console.error('❌ Nenhum atendimento ativo');
      alert('Erro: Nenhum atendimento ativo encontrado');
      return;
    }

    try {
      const user = window.AuthSystem.getCurrentUser();

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // ✅ 1. Obter status atual do Firebase
      const db = window.FirebaseApp.db;
      const { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } = window.FirebaseApp.fStore;
      const docRef = doc(db, 'atend_chat_fila', atendimentoId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Atendimento não encontrado no Firebase');
      }

      const ticketData = docSnap.data();

      // ✅ 2. Normalizar estado atual usando State Machine Manager
      const estadoAtual = window.StateMachineManager.normalizarEstado(ticketData.status);
      const estadoAlvo = 'IDENTIDADE_VALIDADA';

      console.group('🔐 VALIDAÇÃO DE IDENTIDADE');
      console.log('Atendimento ID:', atendimentoId);
      console.log('Status no Firebase:', ticketData.status);
      console.log('Estado Normalizado:', estadoAtual);
      console.log('Estado Alvo:', estadoAlvo);
      console.log('User Role:', user.role);

      // ✅ 3. Validar transição usando State Machine
      const validacao = window.StateMachineManager.validarTransicao(
        estadoAtual,
        estadoAlvo,
        user?.role || 'ATENDENTE'
      );

      console.log('Validação:', validacao);
      console.groupEnd();

      if (!validacao.valido) {
        alert(`⚠️ Transição não permitida: ${validacao.erro}`);
        console.error('❌ Validação falhou:', validacao);
        return;
      }

      // ✅ 4. Preparar dados de validação
      const dadosValidacao = {
        concluida: true,
        validado_por: user?.name || 'Operador',
        validado_por_uid: user?.uid,
        validado_em: new Date(),
        campos_verificados: ['nome', 'telefone', 'email']
      };

      // ✅ 5. Executar transição com State Machine (salva status + log de auditoria)
      await window.StateMachineManager.executarTransicao(
        atendimentoId,
        estadoAtual,
        estadoAlvo,
        'Identidade validada pelo operador'
      );

      // ✅ Criar item de timeline
      const agora = () => window.FirebaseApp.fStore.Timestamp.now();
      const timelineItem = {
        evento: "identidade_validada",
        timestamp: agora(),
        usuario: user?.uid || 'desconhecido',
        descricao: `Identidade do cliente validada por ${user?.name || 'Operador'}`
      };
      // ✅ 6. Atualizar campos de validação no documento
      await updateDoc(docRef, {
        validacao_identidade: dadosValidacao,
        'cliente.validadoEm': serverTimestamp(), // ✅ serverTimestamp() pode ser usado aqui (campo direto)
        timeline: arrayUnion(timelineItem) // ✅ Usando objeto já com timestamp
      });

      // ✅ 7. Atualizar estado local
      this.dadosAtendimento.validacao_identidade = dadosValidacao;

      // ✅ 8. Feedback visual - desabilitar checkboxes
      ['checkNome', 'checkTelefone', 'checkEmail'].forEach(checkId => {
        const checkbox = this.elements[checkId];
        if (checkbox) {
          checkbox.checked = true;
          checkbox.disabled = true;
        }
      });

      // ✅ 9. Atualizar botão de validação
      if (this.elements.btnValidarIdentidade) {
        this.elements.btnValidarIdentidade.textContent = '✓ Identidade Confirmada';
        this.elements.btnValidarIdentidade.disabled = true;
        this.elements.btnValidarIdentidade.classList.remove('btn-primary');
        this.elements.btnValidarIdentidade.classList.add('btn-success');
      }

      console.log('✅ Identidade validada com sucesso');
      console.log('📊 Estado após validação:', await window.StateMachineManager.verificarEstado(atendimentoId));

      // Mensagem de sucesso
      if (window.ToastManager) {
        window.ToastManager.show('✅ Identidade do cliente validada!', 'success');
      } else {
        alert('✅ Identidade do cliente validada!');
      }

    } catch (error) {
      console.error('❌ Erro ao validar identidade:', error);

      // Mensagem de erro detalhada
      let mensagemErro = 'Erro ao validar identidade.';

      if (error.message.includes('Transição não permitida')) {
        mensagemErro = `Transição de estado não permitida. ${error.message}`;
      } else if (error.message.includes('não autenticado')) {
        mensagemErro = 'Você precisa estar autenticado para validar identidade.';
      } else {
        mensagemErro = `Erro: ${error.message}`;
      }

      alert(mensagemErro);
      console.error('Stack trace:', error.stack);
    }
  },
  /**
 * ✅ NOVO: Atualizar visibilidade dos botões baseado no estado
 */
  atualizarBotoesPorEstado(status) {
    // Ocultar todos os botões primeiro
    if (this.elements.btnIniciarAtendimento) {
      this.elements.btnIniciarAtendimento.classList.add('hidden');
    }
    if (this.elements.btnConcluir) {
      this.elements.btnConcluir.classList.add('hidden');
    }
    if (this.elements.btnEncaminhar) {
      this.elements.btnEncaminhar.classList.add('hidden');
    }

    // Normalizar status para garantir comparação
    const statusNormalizado = (status || '').toUpperCase();

    // Mostrar botões conforme estado
    switch (statusNormalizado) {
      case 'IDENTIDADE_VALIDADA':
        if (this.elements.btnIniciarAtendimento) {
          this.elements.btnIniciarAtendimento.classList.remove('hidden');
        }
        break;

      case 'EM_ATENDIMENTO':
        if (this.elements.btnConcluir) {
          this.elements.btnConcluir.classList.remove('hidden');
        }
        if (this.elements.btnEncaminhar) {
          this.elements.btnEncaminhar.classList.remove('hidden');
        }
        break;

      // Outros estados podem não mostrar botões específicos
      case 'NOVO':
      case 'FILA':
      case 'ENCAMINHADO':
      case 'CONCLUIDO':
        // Não mostrar botões de ação nestes estados
        break;

      default:
        console.warn(`⚠️ Estado desconhecido: ${status}`);
    }

    console.log(`✅ Botões atualizados para estado: ${statusNormalizado}`);
  },

  /**
   * ✅ NOVO: Atualizar dados locais (NÃO salva no Firebase ainda)
   */
  atualizarDadosLocais() {
    this.dadosAtendimento.tipo_demanda = this.elements.tipoDemanda?.value || '';
    this.dadosAtendimento.setor_responsavel = this.elements.setorResponsavel?.value || '';
    this.dadosAtendimento.descricao_solicitacao = this.elements.descricaoSolicitacao?.value || '';
    this.dadosAtendimento.observacoes_internas = this.elements.observacoesInternas?.value || '';
    // Remover classes de erro quando preencher
    if (this.elements.setorResponsavel && this.dadosAtendimento.setor_responsavel) {
      this.elements.setorResponsavel.classList.remove('input-error');
    }

    if (this.elements.descricaoSolicitacao && this.dadosAtendimento.descricao_solicitacao) {
      this.elements.descricaoSolicitacao.classList.remove('input-error');
    }
    console.log('💾 Dados atualizados na memória (não salvos ainda):', this.dadosAtendimento);
  },
  /**
 * ✅ Iniciar atendimento (transição: IDENTIDADE_VALIDADA → EM_ATENDIMENTO)
 */
  async iniciarAtendimento() {
    const atendimentoId = localStorage.getItem('atendimento_ativo_id');

    if (!atendimentoId) {
      alert('❌ Nenhum atendimento ativo');
      return;
    }

    try {
      const user = window.AuthSystem.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validar transição
      const validacao = window.StateMachineManager.validarTransicao(
        'IDENTIDADE_VALIDADA',
        'EM_ATENDIMENTO',
        user.role || 'ATENDENTE'
      );

      if (!validacao.valido) {
        alert(`❌ Transição não permitida: ${validacao.erro}`);
        return;
      }

      // Confirmar ação
      if (!confirm('Deseja iniciar o atendimento? O chat será ativado.')) {
        return;
      }

      // Executar transição
      await window.StateMachineManager.executarTransicao(
        atendimentoId,
        'IDENTIDADE_VALIDADA',
        'EM_ATENDIMENTO',
        'Atendimento iniciado pelo operador'
      );

      // Atualizar timestamp de início
      const fStore = window.FirebaseApp.fStore;
      await fStore.updateDoc(
        fStore.doc(window.FirebaseApp.db, "atend_chat_fila", atendimentoId),
        {
          inicioAtendimento: fStore.serverTimestamp()
        }
      );

      // Feedback
      if (window.ToastManager) {
        window.ToastManager.show('✅ Atendimento iniciado!', 'success');
      } else {
        alert('✅ Atendimento iniciado!');
      }

      console.log('✅ Atendimento iniciado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao iniciar atendimento:', error);
      alert(`Erro: ${error.message}`);
    }
  },
  /**
   * ✅ Encaminhar atendimento (transição: EM_ATENDIMENTO → ENCAMINHADO)
   */
  async encaminharAtendimento() {
    const atendimentoId = localStorage.getItem('atendimento_ativo_id');

    if (!atendimentoId) {
      alert('❌ Nenhum atendimento ativo');
      return;
    }

    // ✅ Verificar se há dados preenchidos
    if (!this.dadosAtendimento.setor_responsavel || !this.dadosAtendimento.descricao_solicitacao) {
      alert('⚠️ Para encaminhar, é necessário preencher o setor responsável e a descrição da solicitação.');

      // Destacar campos que precisam ser preenchidos
      if (this.elements.setorResponsavel) {
        this.elements.setorResponsavel.focus();
        this.elements.setorResponsavel.classList.add('input-error');
      }

      if (this.elements.descricaoSolicitacao && !this.dadosAtendimento.descricao_solicitacao) {
        this.elements.descricaoSolicitacao.classList.add('input-error');
      }

      return;
    }

    // ✅ Mostrar popup de confirmação
    this.mostrarPopupEncaminhar();
  },
  /**
 * ✅ NOVO: Mostrar popup de encaminhamento
 */
  mostrarPopupEncaminhar() {
    if (!this.elements.popupEncaminhar) return;

    // Preencher informações no popup
    if (this.elements.popupSetorDestino) {
      this.elements.popupSetorDestino.textContent = this.dadosAtendimento.setor_responsavel || 'Não informado';
    }

    if (this.elements.popupDescricaoSolicitacao) {
      this.elements.popupDescricaoSolicitacao.textContent = this.dadosAtendimento.descricao_solicitacao || 'Não informado';
    }

    // Limpar campos
    if (this.elements.justificativaEncaminhamento) {
      this.elements.justificativaEncaminhamento.value = '';
    }

    if (this.elements.charCount) {
      this.elements.charCount.textContent = '0';
    }

    // Mostrar popup
    this.elements.popupEncaminhar.classList.add('active');

    // Focar no campo de justificativa
    setTimeout(() => {
      if (this.elements.justificativaEncaminhamento) {
        this.elements.justificativaEncaminhamento.focus();
      }
    }, 100);

    console.log('📤 Popup de encaminhamento aberto');
  },
  /**
   * ✅ NOVO: Fechar popup de encaminhamento
   */
  fecharPopupEncaminhar() {
    document.getElementById('popupEncaminhar').classList.remove('active');
  },
  /**
   * ✅ NOVO: Atualizar contador de caracteres
   */
  atualizarContadorCaracteres() {
    if (!this.elements.justificativaEncaminhamento || !this.elements.charCount) return;

    const texto = this.elements.justificativaEncaminhamento.value;
    const contador = texto.length;

    this.elements.charCount.textContent = contador;

    // Alterar cor se atingir limite
    if (contador >= 490) {
      this.elements.charCount.style.color = '#f44336';
    } else if (contador >= 400) {
      this.elements.charCount.style.color = '#ff9800';
    } else {
      this.elements.charCount.style.color = '#666';
    }
  },
  /**
   * ✅ NOVO: Confirmar encaminhamento (chamado pelo popup)
   */
  async confirmarEncaminhamento() {
    const atendimentoId = localStorage.getItem('atendimento_ativo_id');

    if (!atendimentoId) {
      alert('❌ Nenhum atendimento ativo');
      this.fecharPopupEncaminhar();
      return;
    }

    try {
      const user = window.AuthSystem.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter justificativa do popup
      const justificativa = this.elements.justificativaEncaminhamento?.value.trim();

      if (!justificativa || justificativa.length < 10) {
        alert('❌ A justificativa deve ter pelo menos 10 caracteres');
        if (this.elements.justificativaEncaminhamento) {
          this.elements.justificativaEncaminhamento.focus();
          this.elements.justificativaEncaminhamento.classList.add('input-error');
        }
        return;
      }

      // Validar transição
      const validacao = window.StateMachineManager.validarTransicao(
        'EM_ATENDIMENTO',
        'ENCAMINHADO',
        user.role || 'ATENDENTE',
        justificativa
      );

      if (!validacao.valido) {
        alert(`❌ Transição não permitida: ${validacao.erro}`);
        return;
      }

      // Executar transição
      await window.StateMachineManager.executarTransicao(
        atendimentoId,
        'EM_ATENDIMENTO',
        'ENCAMINHADO',
        justificativa
      );

      // Atualizar documento no Firebase com todos os dados
      const fStore = window.FirebaseApp.fStore;
      const updateData = {
        setor_responsavel: this.dadosAtendimento.setor_responsavel,
        descricao_solicitacao: this.dadosAtendimento.descricao_solicitacao,
        encaminhado_por: user.name || 'Operador',
        encaminhado_por_uid: user.uid,
        encaminhado_em: fStore.serverTimestamp()
      };

      // Adicionar observações se existirem
      if (this.dadosAtendimento.observacoes_internas) {
        updateData.observacoes_internas = this.dadosAtendimento.observacoes_internas;
      }

      // Adicionar tipo de demanda se existir
      if (this.dadosAtendimento.tipo_demanda) {
        updateData.tipo_demanda = this.dadosAtendimento.tipo_demanda;
      }

      await fStore.updateDoc(
        fStore.doc(window.FirebaseApp.db, "atend_chat_fila", atendimentoId),
        updateData
      );

      // Fechar popup
      this.fecharPopupEncaminhar();

      // Limpar interface (pois não é mais responsabilidade deste operador)
      this.limparInterface();

      // Feedback
      const setorDestino = this.dadosAtendimento.setor_responsavel || 'outro setor';
      if (window.ToastManager) {
        window.ToastManager.show(`✅ Encaminhado para ${setorDestino}!`, 'success');
      } else {
        alert(`✅ Encaminhado para ${setorDestino}!`);
      }

      console.log('✅ Atendimento encaminhado com sucesso', {
        setor: this.dadosAtendimento.setor_responsavel,
        descricao: this.dadosAtendimento.descricao_solicitacao,
        justificativa: justificativa
      });

    } catch (error) {
      console.error('❌ Erro ao confirmar encaminhamento:', error);
      alert(`Erro: ${error.message}`);
    }
  },
  /**
   * ✅ NOVO: Concluir atendimento (SALVA TUDO) + INTEGRAÇÃO STATE MACHINE
   */
 async concluirAtendimento() {
  const atendimentoId = localStorage.getItem('atendimento_ativo_id');

  if (!atendimentoId) {
    alert('❌ Nenhum atendimento ativo');
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
    const user = window.AuthSystem.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    console.log('📤 Finalizando atendimento e salvando todos os dados...');

    // ✅ Validar transição usando estado FIXO (igual ao encaminhamento)
    const validacao = window.StateMachineManager.validarTransicao(
      'EM_ATENDIMENTO',    // ⭐ ESTADO FIXO - igual ao encaminhar
      'CONCLUIDO',
      user.role || 'ATENDENTE'
    );

    if (!validacao.valido) {
      alert(`❌ Transição não permitida: ${validacao.erro}`);
      return;
    }

    // ✅ Executar transição usando executarTransicao (igual ao encaminhar)
    await window.StateMachineManager.executarTransicao(
      atendimentoId,
      'EM_ATENDIMENTO',
      'CONCLUIDO',
      'Atendimento finalizado pelo operador'
    );

    // ✅ Atualizar dados locais com valores atuais
    this.atualizarDadosLocais();

    // ✅ Preparar dados para salvar (igual ao encaminhar, mas para CONCLUIDO)
    const fStore = window.FirebaseApp.fStore;
    const updateData = {
      status: 'CONCLUIDO',
      concluido_em: fStore.serverTimestamp(),
      concluido_por: user.name || 'Operador',
      concluido_por_uid: user.uid
    };

    // ✅ Adicionar validação (se não foi salva antes)
    if (this.dadosAtendimento.validacao_identidade.concluida) {
      updateData.validacao_identidade = {
        concluida: true,
        validado_por: this.dadosAtendimento.validacao_identidade.validado_por,
        validado_em: this.dadosAtendimento.validacao_identidade.validado_em || fStore.serverTimestamp(),
        campos_verificados: this.dadosAtendimento.validacao_identidade.campos_verificados
      };
    }

    // ✅ Adicionar campos do formulário (igual ao encaminhar)
    if (this.dadosAtendimento.tipo_demanda) {
      updateData.tipo_demanda = this.dadosAtendimento.tipo_demanda;
    }

    if (this.dadosAtendimento.setor_responsavel) {
      updateData.setor_responsavel = this.dadosAtendimento.setor_responsavel;
    }

    if (this.dadosAtendimento.descricao_solicitacao) {
      updateData.descricao_solicitacao = this.dadosAtendimento.descricao_solicitacao;
    }

    if (this.dadosAtendimento.observacoes_internas) {
      updateData.observacoes_internas = this.dadosAtendimento.observacoes_internas;
    }

    console.log('📊 Dados a salvar:', updateData);

    // ✅ Salvar no Firebase (igual ao encaminhar)
    await fStore.updateDoc(
      fStore.doc(window.FirebaseApp.db, "atend_chat_fila", atendimentoId),
      updateData
    );

    console.log('✅ Atendimento concluído com sucesso');

    // ✅ Feedback visual
    if (window.ToastManager) {
      window.ToastManager.show('✅ Atendimento concluído com sucesso!', 'success');
    } else {
      alert('✅ Atendimento concluído com sucesso!');
    }

    // ✅ Limpar interface (igual ao encaminhar)
    this.limparInterface();

    // ✅ Limpar localStorage
    localStorage.removeItem('atendimento_ativo_id');
    window.StateManager.set('atendimento', { currentTicketId: null });

  } catch (error) {
    console.error('❌ Erro ao concluir atendimento:', error);
    alert(`Erro: ${error.message}`);
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

    // ✅ Ocultar botões de ação
    if (this.elements.btnIniciarAtendimento) {
      this.elements.btnIniciarAtendimento.classList.add('hidden');
    }
    if (this.elements.btnConcluir) {
      this.elements.btnConcluir.classList.add('hidden');
    }
    if (this.elements.btnEncaminhar) {
      this.elements.btnEncaminhar.classList.add('hidden');
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
    const fStore = window.FirebaseApp.fStore;
    const q = fStore.query(fStore.collection(db, "atend_chat_fila"), fStore.where("status", "==", "FILA"));

    this.unsubscribeFila = fStore.onSnapshot(q, (snapshot) => {
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

        if (ticket.status === 'concluido' || ticket.status === 'ENCAMINHADO') {
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
    // dados do cliente
    this.fillClientData({
      nome: ticket.cliente.nome,
      telefone: ticket.cliente.telefone || "Não informado",
      email: ticket.cliente.email || "Não informado"
    });
    // ✅ NOVO: Atualizar informações do ticket
    this.atualizarInformacoesTicket(ticket);
  },
  atualizarInformacoesTicket(ticket) {
    // 1. Atualizar ID do ticket
    const ticketIdElement = document.getElementById('ticketId');
    if (ticketIdElement && ticket.atendimentoId) {
      ticketIdElement.textContent = ticket.atendimentoId;
    }

    // 2. Atualizar setor (no lugar onde estava "NOVO")
    const stateIndicatorElement = document.getElementById('stateIndicator');
    if (stateIndicatorElement) {
      // Mostrar setor responsável
      const setor = ticket.setor_responsavel || "suporte";
      stateIndicatorElement.textContent = setor.toUpperCase();

      // Adicionar classe CSS baseada no setor
      stateIndicatorElement.className = 'state-indicator';
      stateIndicatorElement.classList.add(`setor-${setor.toLowerCase().replace(/\s+/g, '-')}`);
    }

    // 3. Atualizar status do ticket
    const statusBadgeElement = document.getElementById('statusBadge');
    if (statusBadgeElement) {
      this.atualizarBadgeStatus(ticket.status, statusBadgeElement); // ✅ Passar elemento
    }
    // ✅ 4. Atualizar botões conforme estado
    this.atualizarBotoesPorEstado(ticket.status);
  },
  atualizarBadgeStatus(status, Element) {
    if (!Element) {
      console.error('❌ Elemento não fornecido para atualizarBadgeStatus');
      return;
    }

    const statusMap = {
      'FILA': { text: 'FILA', class: 'status-fila' },
      'NOVO': { text: 'NOVO', class: 'status-novo' },
      'IDENTIDADE_VALIDADA': { text: 'IDENTIDADE VALIDADA', class: 'status-identidade-validada' },
      'EM_ATENDIMENTO': { text: 'EM ATENDIMENTO', class: 'status-em-atendimento' },
      'ENCAMINHADO': { text: 'ENCAMINHADO', class: 'status-encaminhado' },
      'CONCLUIDO': { text: 'CONCLUIDO', class: 'status-concluido' },
      'identidade_validada': { text: 'IDENTIDADE VALIDADA', class: 'status-identidade-validada' },
      'em_atendimento': { text: 'EM ATENDIMENTO', class: 'status-em-atendimento' },
      'concluido': { text: 'CONCLUIDO', class: 'status-concluido' },
      'encaminhado': { text: 'ENCAMINHADO', class: 'status-encaminhado' }
    };

    const statusInfo = statusMap[status] || { text: status, class: 'status-desconhecido' };

    Element.textContent = statusInfo.text;
    Element.className = 'status-badge ' + statusInfo.class;

    console.log(`✅ Status badge atualizado: ${status} → ${statusInfo.text}`);
  },
  conectarChat(atendimentoId) {
    if (this.unsubscribeChat) this.unsubscribeChat();

    const db = window.FirebaseApp.db;
    const fStore = window.FirebaseApp.fStore;

    const ticketRef = fStore.doc(db, "atend_chat_fila", atendimentoId);
    this.unsubscribeTicket = fStore.onSnapshot(ticketRef, (docSnap) => {
      if (docSnap.exists()) {
        const ticket = docSnap.data();
        this.atualizarInformacoesTicket(ticket);
      }
    });

    const q = fStore.query(
      fStore.collection(db, "atend_chat_fila", atendimentoId, "mensagem"),
      fStore.orderBy("timestamp", "asc")
    );

    if (this.elements.chatbox) this.elements.chatbox.innerHTML = '';

    this.unsubscribeChat = fStore.onSnapshot(q, (snapshot) => {
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
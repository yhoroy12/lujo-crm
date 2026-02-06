/**
 * ABA: HISTÓRICO (VERSÃO COMPLETA COM FIREBASE)
 * Gerencia histórico de atendimentos WhatsApp e Email
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * - Carregamento de dados de 2 coleções (WhatsApp e Email)
 * - Filtros funcionais (período, status, área, tipo)
 * - Renderização de lista
 * - Modal de detalhes completo
 * - Estatísticas calculadas
 */

const HistoricoTab = {
  id: 'aba-historico',
  moduleId: 'atendimento',
  canalAtual: 'whatsapp',
  
  // Dados carregados
  atendimentos: [],
  atendimentosFiltrados: [],

  // ✅ Flag de controle
  _initialized: false,
  
  // Listener do Firebase
  unsubscribeHistorico: null,

  async init() {
    // ✅ PROTEÇÃO CONTRA RE-INICIALIZAÇÃO
    if (this._initialized) {
      console.warn('⚠️ HistoricoTab já inicializado. Abortando duplicata.');
      return;
    }

    console.log('📚 Inicializando aba Histórico');
    
    try {
      this.cacheElements();
      this.bindEvents();
      await this.carregarDados();
      
      // ✅ MARCAR COMO INICIALIZADO
      this._initialized = true;
      
      console.log('✅ Histórico pronto');
    } catch (error) {
      console.error('❌ Erro em Histórico:', error);
      
      // ✅ RESET EM CASO DE ERRO
      this._initialized = false;
    }
  },

  cacheElements() {
    this.elements = {
      // Sub-abas
      subAbaBtns: document.querySelectorAll('.sub-aba-btn'),
      
      // Lista
      listaContainer: document.getElementById('listaHistorico'),
      
      // Filtros
      searchInput: document.getElementById('searchHistorico'),
      filtroPeriodo: document.getElementById('filtroPeriodo'),
      filtroDataInicio: document.getElementById('filtroDataInicio'),
      filtroDataFim: document.getElementById('filtroDataFim'),
      filtroStatus: document.getElementById('filtroStatus'),
      filtroAreaDerivada: document.getElementById('filtroAreaDerivada'),
      filtroTipoDemanda: document.getElementById('filtroTipoDemanda'),
      
      // Estatísticas
      statTotalAtendimentos: document.getElementById('statTotalAtendimentos'),
      statConcluidos: document.getElementById('statConcluidos'),
      statDerivados: document.getElementById('statDerivados'),
      statTempoMedio: document.getElementById('statTempoMedio'),
      
      // Modal
      modalOverlay: document.getElementById('modalHistoricoDetalhes'),
      btnFecharModal: document.getElementById('btnFecharModalHistorico'),
      btnFecharModal2: document.getElementById('btnFecharModalHistorico2')
    };
  },

  bindEvents() {
    // Sub-abas (WhatsApp / Email)
    this.elements.subAbaBtns.forEach(btn => {
      window.ModuleLifecycle.addListener(
        btn,
        'click',
        () => {
          this.canalAtual = btn.dataset.canal;
          this.atualizarAbas(btn);
          this.carregarDados();
        },
        this.moduleId
      );
    });

    // Filtros
    if (this.elements.searchInput) {
      window.ModuleLifecycle.addListener(
        this.elements.searchInput,
        'input',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    if (this.elements.filtroPeriodo) {
      window.ModuleLifecycle.addListener(
        this.elements.filtroPeriodo,
        'change',
        () => {
          this.ajustarCamposData();
          this.carregarDados();
        },
        this.moduleId
      );
    }

    if (this.elements.filtroDataInicio) {
      window.ModuleLifecycle.addListener(
        this.elements.filtroDataInicio,
        'change',
        () => this.carregarDados(),
        this.moduleId
      );
    }

    if (this.elements.filtroDataFim) {
      window.ModuleLifecycle.addListener(
        this.elements.filtroDataFim,
        'change',
        () => this.carregarDados(),
        this.moduleId
      );
    }

    if (this.elements.filtroStatus) {
      window.ModuleLifecycle.addListener(
        this.elements.filtroStatus,
        'change',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    if (this.elements.filtroAreaDerivada) {
      window.ModuleLifecycle.addListener(
        this.elements.filtroAreaDerivada,
        'change',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    if (this.elements.filtroTipoDemanda) {
      window.ModuleLifecycle.addListener(
        this.elements.filtroTipoDemanda,
        'change',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    // Modal
    if (this.elements.btnFecharModal) {
      window.ModuleLifecycle.addListener(
        this.elements.btnFecharModal,
        'click',
        () => this.fecharModal(),
        this.moduleId
      );
    }

    if (this.elements.btnFecharModal2) {
      window.ModuleLifecycle.addListener(
        this.elements.btnFecharModal2,
        'click',
        () => this.fecharModal(),
        this.moduleId
      );
    }
  },

  atualizarAbas(botaoSelecionado) {
    this.elements.subAbaBtns.forEach(btn => {
      btn.classList.remove('ativa');
    });
    botaoSelecionado.classList.add('ativa');
    
    // Ajustar opções de status baseado no canal
    this.ajustarOpcoesStatus();
  },

  ajustarOpcoesStatus() {
    if (!this.elements.filtroStatus) return;
    
    const opcoesWhatsApp = this.elements.filtroStatus.querySelectorAll('.so-whatsapp');
    const opcoesGmail = this.elements.filtroStatus.querySelectorAll('.so-gmail');
    
    if (this.canalAtual === 'whatsapp') {
      opcoesWhatsApp.forEach(opt => opt.style.display = '');
      opcoesGmail.forEach(opt => opt.style.display = 'none');
    } else {
      opcoesWhatsApp.forEach(opt => opt.style.display = 'none');
      opcoesGmail.forEach(opt => opt.style.display = '');
    }
  },

  ajustarCamposData() {
    const periodo = this.elements.filtroPeriodo?.value;
    const customizado = periodo === 'customizado';
    
    if (this.elements.filtroDataInicio) {
      this.elements.filtroDataInicio.disabled = !customizado;
    }
    
    if (this.elements.filtroDataFim) {
      this.elements.filtroDataFim.disabled = !customizado;
    }
  },

  /**
   * ✅ IMPLEMENTADO: Carregar dados do Firebase
   */
  async carregarDados() {
    console.log(`📊 Carregando histórico (${this.canalAtual})`);
    
    try {
      const db = window.FirebaseApp.db;
      const { collection, query, where, orderBy, getDocs, Timestamp } = window.FirebaseApp.fStore;
      
      // Determinar coleção baseado no canal
      const colecao = this.canalAtual === 'whatsapp' ? 'atend_chat_fila' : 'atend_emails_historico';
      
      // Construir query com filtros de período
      const { dataInicio, dataFim } = this.obterPeriodoFiltro();
      
      let q = query(
        collection(db, colecao),
        where('status', 'in', ['CONCLUIDO', 'concluido', 'derivado', 'encaminhado']),
        orderBy('criadoEm', 'desc')
      );
      
      // Adicionar filtro de data se necessário
      if (dataInicio) {
        const timestampInicio = Timestamp.fromDate(dataInicio);
        q = query(q, where('criadoEm', '>=', timestampInicio));
      }
      
      if (dataFim) {
        const timestampFim = Timestamp.fromDate(dataFim);
        q = query(q, where('criadoEm', '<=', timestampFim));
      }
      
      // Executar query
      const snapshot = await getDocs(q);
      
      // Processar dados
      this.atendimentos = [];
      snapshot.forEach(doc => {
        this.atendimentos.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ ${this.atendimentos.length} atendimentos carregados`);
      
      // Aplicar filtros e renderizar
      this.aplicarFiltros();
      this.calcularEstatisticas();
      
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      
      if (this.elements.listaContainer) {
        this.elements.listaContainer.innerHTML = `
          <div class="empty-state" style="padding: 40px; text-align: center;">
            <i class="fi fi-rr-exclamation-triangle" style="font-size: 48px; color: var(--color-danger);"></i>
            <h3>Erro ao Carregar Dados</h3>
            <p>${error.message}</p>
          </div>
        `;
      }
    }
  },

  /**
   * ✅ IMPLEMENTADO: Obter período de filtro
   */
  obterPeriodoFiltro() {
    const periodo = this.elements.filtroPeriodo?.value || 'mes';
    const agora = new Date();
    let dataInicio = null;
    let dataFim = null;
    
    switch (periodo) {
      case 'hoje':
        dataInicio = new Date(agora.setHours(0, 0, 0, 0));
        dataFim = new Date(agora.setHours(23, 59, 59, 999));
        break;
        
      case 'ontem':
        const ontem = new Date(agora);
        ontem.setDate(ontem.getDate() - 1);
        dataInicio = new Date(ontem.setHours(0, 0, 0, 0));
        dataFim = new Date(ontem.setHours(23, 59, 59, 999));
        break;
        
      case 'semana':
        const inicioSemana = new Date(agora);
        inicioSemana.setDate(agora.getDate() - agora.getDay());
        dataInicio = new Date(inicioSemana.setHours(0, 0, 0, 0));
        break;
        
      case 'mes':
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        break;
        
      case 'customizado':
        if (this.elements.filtroDataInicio?.value) {
          dataInicio = new Date(this.elements.filtroDataInicio.value);
        }
        if (this.elements.filtroDataFim?.value) {
          dataFim = new Date(this.elements.filtroDataFim.value);
          dataFim.setHours(23, 59, 59, 999);
        }
        break;
        
      case 'total':
        // Sem filtro de data
        break;
    }
    
    return { dataInicio, dataFim };
  },

  /**
   * ✅ IMPLEMENTADO: Aplicar filtros locais
   */
  aplicarFiltros() {
    let filtrados = [...this.atendimentos];
    
    // Filtro de busca
    const busca = this.elements.searchInput?.value.toLowerCase().trim();
    if (busca) {
      filtrados = filtrados.filter(atend => {
        const nomeCliente = atend.cliente?.nome?.toLowerCase() || '';
        const ticketId = atend.atendimentoId?.toLowerCase() || '';
        const tipoDemanda = atend.tipo_demanda?.toLowerCase() || '';
        
        return nomeCliente.includes(busca) || 
               ticketId.includes(busca) || 
               tipoDemanda.includes(busca);
      });
    }
    
    // Filtro de status
    const status = this.elements.filtroStatus?.value;
    if (status && status !== 'todos') {
      filtrados = filtrados.filter(atend => 
        atend.status?.toLowerCase() === status.toLowerCase()
      );
    }
    
    // Filtro de área derivada
    const area = this.elements.filtroAreaDerivada?.value;
    if (area && area !== 'todas') {
      filtrados = filtrados.filter(atend => 
        atend.setor_responsavel?.toLowerCase() === area.toLowerCase()
      );
    }
    
    // Filtro de tipo de demanda
    const tipo = this.elements.filtroTipoDemanda?.value;
    if (tipo && tipo !== 'todos') {
      filtrados = filtrados.filter(atend => 
        atend.tipo_demanda?.toLowerCase() === tipo.toLowerCase()
      );
    }
    
    this.atendimentosFiltrados = filtrados;
    this.renderizarLista();
  },

  /**
   * ✅ IMPLEMENTADO: Renderizar lista de atendimentos
   */
  renderizarLista() {
    if (!this.elements.listaContainer) return;
    
    if (this.atendimentosFiltrados.length === 0) {
      this.elements.listaContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center;">
          <i class="fi fi-rr-search" style="font-size: 48px; color: var(--color-text-light);"></i>
          <h3>Nenhum Atendimento Encontrado</h3>
          <p>Tente ajustar os filtros</p>
        </div>
      `;
      return;
    }
    
    const html = this.atendimentosFiltrados.map(atend => {
      const statusClass = this.obterClasseStatus(atend.status);
      const statusText = this.obterTextoStatus(atend.status);
      const dataFormatada = this.formatarData(atend.criadoEm);
      const tempoAtendimento = this.calcularTempoAtendimento(atend);
      
      return `
        <div class="historico-item" data-id="${atend.id}" onclick="HistoricoTab.abrirDetalhes('${atend.id}')">
          <div class="historico-item-header">
            <div class="historico-cliente">
              <i class="fi fi-rr-user"></i>
              <span class="cliente-nome">${atend.cliente?.nome || 'Cliente'}</span>
            </div>
            <span class="historico-status ${statusClass}">${statusText}</span>
          </div>
          
          <div class="historico-item-body">
            <div class="historico-info">
              <span class="info-label">Ticket:</span>
              <span class="info-value">${atend.atendimentoId || atend.id}</span>
            </div>
            
            <div class="historico-info">
              <span class="info-label">Data:</span>
              <span class="info-value">${dataFormatada}</span>
            </div>
            
            <div class="historico-info">
              <span class="info-label">Tempo:</span>
              <span class="info-value">${tempoAtendimento}</span>
            </div>
            
            ${atend.tipo_demanda ? `
              <div class="historico-info">
                <span class="info-label">Tipo:</span>
                <span class="info-value">${atend.tipo_demanda}</span>
              </div>
            ` : ''}
            
            ${atend.setor_responsavel ? `
              <div class="historico-info">
                <span class="info-label">Setor:</span>
                <span class="info-value">${atend.setor_responsavel}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.listaContainer.innerHTML = html;
  },

  /**
   * ✅ IMPLEMENTADO: Calcular estatísticas
   */
  calcularEstatisticas() {
    const total = this.atendimentos.length;
    const concluidos = this.atendimentos.filter(a => 
      a.status?.toLowerCase() === 'concluido'
    ).length;
    const derivados = this.atendimentos.filter(a => 
      a.status?.toLowerCase() === 'derivado' || a.status?.toLowerCase() === 'encaminhado'
    ).length;
    
    // Calcular tempo médio
    let tempoTotal = 0;
    let contadorTempo = 0;
    
    this.atendimentos.forEach(atend => {
      if (atend.criadoEm && atend.concluido_em) {
        const inicio = atend.criadoEm.toDate ? atend.criadoEm.toDate() : new Date(atend.criadoEm);
        const fim = atend.concluido_em.toDate ? atend.concluido_em.toDate() : new Date(atend.concluido_em);
        const diferenca = fim - inicio;
        
        if (diferenca > 0) {
          tempoTotal += diferenca;
          contadorTempo++;
        }
      }
    });
    
    const tempoMedio = contadorTempo > 0 
      ? Math.round(tempoTotal / contadorTempo / 1000 / 60) 
      : 0;
    
    // Atualizar UI
    if (this.elements.statTotalAtendimentos) {
      this.elements.statTotalAtendimentos.textContent = total;
    }
    
    if (this.elements.statConcluidos) {
      this.elements.statConcluidos.textContent = concluidos;
    }
    
    if (this.elements.statDerivados) {
      this.elements.statDerivados.textContent = derivados;
    }
    
    if (this.elements.statTempoMedio) {
      this.elements.statTempoMedio.textContent = `${tempoMedio}min`;
    }
  },

  /**
   * ✅ IMPLEMENTADO: Abrir modal de detalhes
   */
  async abrirDetalhes(atendimentoId) {
    const atendimento = this.atendimentos.find(a => a.id === atendimentoId);
    
    if (!atendimento) {
      console.error('Atendimento não encontrado:', atendimentoId);
      return;
    }
    
    // Preencher modal
    const modalTitulo = document.getElementById('modalTituloCliente');
    const modalTicket = document.getElementById('modalTicketNumber');
    
    if (modalTitulo) {
      modalTitulo.textContent = atendimento.cliente?.nome || 'Cliente';
    }
    
    if (modalTicket) {
      modalTicket.textContent = `Ticket #${atendimento.atendimentoId || atendimento.id}`;
    }
    
    // Informações principais
    this.preencherInfoPrincipais(atendimento);
    
    // Validação de identidade
    this.preencherValidacaoIdentidade(atendimento);
    
    // Descrição
    this.preencherDescricao(atendimento);
    
    // Observações
    this.preencherObservacoes(atendimento);
    
    // Setor responsável
    this.preencherSetor(atendimento);
    
    // Timeline
    this.preencherTimeline(atendimento);
    
    // Mostrar modal
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.style.display = 'flex';
    }
  },

  preencherInfoPrincipais(atendimento) {
    const container = document.getElementById('modalInfoPrincipais');
    if (!container) return;
    
    const statusText = this.obterTextoStatus(atendimento.status);
    const dataFormatada = this.formatarData(atendimento.criadoEm);
    const tempoAtendimento = this.calcularTempoAtendimento(atendimento);
    
    container.innerHTML = `
      <div class="info-item-modal">
        <span class="info-label-modal">Status:</span>
        <span class="info-value-modal">${statusText}</span>
      </div>
      <div class="info-item-modal">
        <span class="info-label-modal">Data:</span>
        <span class="info-value-modal">${dataFormatada}</span>
      </div>
      <div class="info-item-modal">
        <span class="info-label-modal">Tempo:</span>
        <span class="info-value-modal">${tempoAtendimento}</span>
      </div>
      <div class="info-item-modal">
        <span class="info-label-modal">Telefone:</span>
        <span class="info-value-modal">${atendimento.cliente?.telefone || 'Não informado'}</span>
      </div>
      <div class="info-item-modal">
        <span class="info-label-modal">Email:</span>
        <span class="info-value-modal">${atendimento.cliente?.email || 'Não informado'}</span>
      </div>
      <div class="info-item-modal">
        <span class="info-label-modal">Atendido por:</span>
        <span class="info-value-modal">${atendimento.operador?.nome || atendimento.concluido_por || 'Sistema'}</span>
      </div>
    `;
  },

  preencherValidacaoIdentidade(atendimento) {
    const container = document.getElementById('modalValidacaoIdentidade');
    if (!container) return;
    
    const validado = atendimento.validacao_identidade?.concluida;
    const icone = validado ? 'fi-rr-check-circle' : 'fi-rr-cross-circle';
    const cor = validado ? 'color: var(--color-success)' : 'color: var(--color-danger)';
    const texto = validado 
      ? `Identidade confirmada por ${atendimento.validacao_identidade.validado_por}` 
      : 'Identidade não validada';
    
    container.innerHTML = `
      <i class="fi ${icone} validacao-icon" style="${cor}"></i>
      <div class="validacao-text">
        <strong>Status de Validação</strong>
        <p>${texto}</p>
      </div>
    `;
  },

  preencherDescricao(atendimento) {
    const container = document.getElementById('modalDescricao');
    if (!container) return;
    
    container.innerHTML = `
      <p>${atendimento.descricao_solicitacao || 'Nenhuma descrição registrada.'}</p>
    `;
  },

  preencherObservacoes(atendimento) {
    const section = document.getElementById('modalObservacoesSection');
    const container = document.getElementById('modalObservacoes');
    
    if (!section || !container) return;
    
    if (atendimento.observacoes_internas) {
      section.style.display = 'block';
      container.innerHTML = `<p>${atendimento.observacoes_internas}</p>`;
    } else {
      section.style.display = 'none';
    }
  },

  preencherSetor(atendimento) {
    const section = document.getElementById('modalSetorSection');
    const container = document.getElementById('modalSetorResponsavel');
    
    if (!section || !container) return;
    
    if (atendimento.setor_responsavel) {
      section.style.display = 'block';
      container.innerHTML = `
        <span class="setor-badge">${atendimento.setor_responsavel}</span>
      `;
    } else {
      section.style.display = 'none';
    }
  },

  preencherTimeline(atendimento) {
    const container = document.getElementById('modalTimeline');
    if (!container) return;
    
    const timeline = atendimento.timeline || [];
    
    if (timeline.length === 0) {
      container.innerHTML = '<p style="color: var(--color-text-light);">Nenhum evento registrado</p>';
      return;
    }
    
    const html = timeline.map(evento => {
      const data = evento.timestamp?.toDate ? evento.timestamp.toDate() : new Date();
      const horaFormatada = data.toLocaleString('pt-BR');
      
      return `
        <div class="timeline-item-modal">
          <div class="timeline-dot-modal"></div>
          <div class="timeline-content-modal">
            <span class="timeline-time-modal">${horaFormatada}</span>
            <span class="timeline-text-modal">${evento.descricao || evento.evento}</span>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  },

  fecharModal() {
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.style.display = 'none';
    }
  },

  // Funções utilitárias
  obterClasseStatus(status) {
    const statusLower = status?.toLowerCase();
    const mapa = {
      'concluido': 'status-concluido',
      'derivado': 'status-derivado',
      'encaminhado': 'status-derivado',
      'devolvido': 'status-devolvido',
      'reaberto': 'status-reaberto'
    };
    return mapa[statusLower] || 'status-default';
  },

  obterTextoStatus(status) {
    const statusLower = status?.toLowerCase();
    const mapa = {
      'concluido': 'Concluído',
      'derivado': 'Derivado',
      'encaminhado': 'Encaminhado',
      'devolvido': 'Devolvido',
      'reaberto': 'Reaberto'
    };
    return mapa[statusLower] || status;
  },

  formatarData(timestamp) {
    if (!timestamp) return 'Data não disponível';
    
    const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  calcularTempoAtendimento(atendimento) {
    if (!atendimento.criadoEm || !atendimento.concluido_em) {
      return 'N/A';
    }
    
    const inicio = atendimento.criadoEm.toDate ? atendimento.criadoEm.toDate() : new Date(atendimento.criadoEm);
    const fim = atendimento.concluido_em.toDate ? atendimento.concluido_em.toDate() : new Date(atendimento.concluido_em);
    
    const diferencaMs = fim - inicio;
    const minutos = Math.round(diferencaMs / 1000 / 60);
    
    if (minutos < 60) {
      return `${minutos}min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const minutosRestantes = minutos % 60;
      return `${horas}h ${minutosRestantes}min`;
    }
  },

  /**
   * ✅ Método de refresh (chamado ao retornar para a aba)
   */
  async refresh() {
    console.log('🔄 Atualizando histórico...');
    
    try {
      await this.carregarDados();
      console.log('✅ Histórico atualizado');
    } catch (error) {
      console.error('❌ Erro ao atualizar Histórico:', error);
    }
  },

  /**
   * ✅ Método cleanup (chamado ao sair da aba)
   */
  cleanup() {
    console.log('🧹 Limpando HistoricoTab...');
    
    try {
      // Fechar modal se estiver aberto
      this.fecharModal();
      
      // Limpar listener do Firebase se existir
      if (this.unsubscribeHistorico) {
        this.unsubscribeHistorico();
        this.unsubscribeHistorico = null;
      }
      
      console.log('✅ HistoricoTab limpo');
    } catch (error) {
      console.warn('⚠️ Erro no cleanup de Histórico:', error);
    }
  },

  /**
   * ✅ Cleanup completo (apenas quando sair do módulo inteiro)
   */
  destroy() {
    console.log('🗑️ Destruindo HistoricoTab...');
    
    this.cleanup();
    this.atendimentos = [];
    this.atendimentosFiltrados = [];
    this._initialized = false;
    
    console.log('✅ HistoricoTab destruído');
  }
};

// ✅ Expor globalmente
window.HistoricoTab = HistoricoTab;

export default HistoricoTab;

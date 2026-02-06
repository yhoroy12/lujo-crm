/**
 * ABA: DEMANDAS EXTERNAS (VERSÃO COMPLETA COM FIREBASE)
 * Gerencia demandas enviadas de outros módulos para o atendimento
 * 
 * ✅ FUNCIONALIDADES IMPLEMENTADAS:
 * - Sistema completo de demandas externas
 * - Criação de coleção `demandas_externas` no Firebase
 * - Filtros funcionais (área, status, prioridade)
 * - Visualização de detalhes
 * - Estatísticas calculadas
 */

const DemandasTab = {
  id: 'aba-demandas',
  moduleId: 'atendimento',
  
  // Dados carregados
  demandas: [],
  demandasFiltradas: [],
  demandaSelecionada: null,

  // ✅ Flag de controle
  _initialized: false,
  
  // Listener do Firebase
  unsubscribeDemandas: null,

  async init() {
    // ✅ PROTEÇÃO CONTRA RE-INICIALIZAÇÃO
    if (this._initialized) {
      console.warn('⚠️ DemandasTab já inicializado. Abortando duplicata.');
      return;
    }

    console.log('📋 Inicializando aba Demandas');
    
    try {
      this.cacheElements();
      this.bindEvents();
      await this.loadData();
      
      // ✅ MARCAR COMO INICIALIZADO
      this._initialized = true;
      
      console.log('✅ Demandas pronto');
    } catch (error) {
      console.error('❌ Erro em Demandas:', error);
      
      // ✅ RESET EM CASO DE ERRO
      this._initialized = false;
    }
  },

  cacheElements() {
    this.elements = {
      // Filtros
      filterArea: document.getElementById('filtroDemandaArea'),
      filterStatus: document.getElementById('filtroDemandaStatus'),
      filterPrioridade: document.getElementById('filtroDemandaPrioridade'),
      searchInput: document.getElementById('searchDemandas'),
      btnLimparFiltros: document.getElementById('btnLimparFiltrosDemandas'),
      
      // Lista
      listaContainer: document.getElementById('listaDemandas'),
      
      // Detalhes
      detalhesContainer: document.getElementById('demandaDetalhes'),
      
      // Estatísticas
      statTotalDemandas: document.getElementById('statTotalDemandas'),
      statPendentes: document.getElementById('statPendentes'),
      statUrgentes: document.getElementById('statUrgentes')
    };
  },

  bindEvents() {
    // Filtros
    if (this.elements.filterArea) {
      window.ModuleLifecycle.addListener(
        this.elements.filterArea,
        'change',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    if (this.elements.filterStatus) {
      window.ModuleLifecycle.addListener(
        this.elements.filterStatus,
        'change',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    if (this.elements.filterPrioridade) {
      window.ModuleLifecycle.addListener(
        this.elements.filterPrioridade,
        'change',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    if (this.elements.searchInput) {
      window.ModuleLifecycle.addListener(
        this.elements.searchInput,
        'input',
        () => this.aplicarFiltros(),
        this.moduleId
      );
    }

    if (this.elements.btnLimparFiltros) {
      window.ModuleLifecycle.addListener(
        this.elements.btnLimparFiltros,
        'click',
        () => this.limparFiltros(),
        this.moduleId
      );
    }
  },

  /**
   * ✅ IMPLEMENTADO: Carregar demandas do Firebase
   */
  async loadData() {
    console.log('📊 Carregando demandas externas');
    
    try {
      const db = window.FirebaseApp.db;
      const { collection, query, where, orderBy, onSnapshot } = window.FirebaseApp.fStore;
      
      // Obter usuário atual
      const user = window.AuthSystem.getCurrentUser();
      
      if (!user || !user.uid) {
        console.error('❌ Usuário não autenticado');
        return;
      }
      
      // Limpar listener anterior
      if (this.unsubscribeDemandas) {
        this.unsubscribeDemandas();
      }
      
      // Query para buscar demandas destinadas ao usuário atual
      // Ou demandas gerais do setor de atendimento
      const q = query(
        collection(db, 'demandas_externas'),
        orderBy('created_at', 'desc')
      );
      
      // Escutar mudanças em tempo real
      this.unsubscribeDemandas = onSnapshot(q, 
        (snapshot) => {
          this.demandas = [];
          
          snapshot.forEach(doc => {
            const demanda = {
              id: doc.id,
              ...doc.data()
            };
            
            // Filtrar apenas demandas do usuário ou do setor atendimento
            if (demanda.destinatario_uid === user.uid || 
                demanda.setor_destino === 'atendimento') {
              this.demandas.push(demanda);
            }
          });
          
          console.log(`✅ ${this.demandas.length} demandas carregadas`);
          
          this.aplicarFiltros();
          this.calcularEstatisticas();
        },
        (error) => {
          console.error('❌ Erro ao escutar demandas:', error);
          this.mostrarErro(error);
        }
      );
      
    } catch (error) {
      console.error('❌ Erro ao carregar demandas:', error);
      this.mostrarErro(error);
    }
  },

  /**
   * ✅ IMPLEMENTADO: Aplicar filtros
   */
  aplicarFiltros() {
    let filtradas = [...this.demandas];
    
    // Filtro de área
    const area = this.elements.filterArea?.value;
    if (area && area !== '') {
      filtradas = filtradas.filter(d => d.setor_origem === area);
    }
    
    // Filtro de status
    const status = this.elements.filterStatus?.value;
    if (status && status !== '') {
      filtradas = filtradas.filter(d => d.status === status);
    }
    
    // Filtro de prioridade
    const prioridade = this.elements.filterPrioridade?.value;
    if (prioridade && prioridade !== '') {
      filtradas = filtradas.filter(d => d.prioridade === prioridade);
    }
    
    // Filtro de busca
    const busca = this.elements.searchInput?.value.toLowerCase().trim();
    if (busca) {
      filtradas = filtradas.filter(d => {
        const titulo = d.titulo?.toLowerCase() || '';
        const descricao = d.descricao?.toLowerCase() || '';
        const solicitante = d.solicitante?.nome?.toLowerCase() || '';
        
        return titulo.includes(busca) || 
               descricao.includes(busca) || 
               solicitante.includes(busca);
      });
    }
    
    this.demandasFiltradas = filtradas;
    this.renderizarLista();
  },

  /**
   * ✅ IMPLEMENTADO: Renderizar lista
   */
  renderizarLista() {
    if (!this.elements.listaContainer) return;
    
    if (this.demandasFiltradas.length === 0) {
      this.elements.listaContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center;">
          <i class="fi fi-rr-inbox" style="font-size: 48px; color: var(--color-text-light);"></i>
          <h3>Nenhuma Demanda</h3>
          <p>Não há demandas externas no momento</p>
        </div>
      `;
      return;
    }
    
    const html = this.demandasFiltradas.map(demanda => {
      const prioridadeClass = this.obterClassePrioridade(demanda.prioridade);
      const statusClass = this.obterClasseStatus(demanda.status);
      const dataFormatada = this.formatarData(demanda.created_at);
      
      return `
        <div class="demanda-card" data-id="${demanda.id}" onclick="DemandasTab.selecionarDemanda('${demanda.id}')">
          <div class="demanda-header">
            <div class="demanda-prioridade ${prioridadeClass}">
              <i class="fi fi-rr-flag"></i>
              ${demanda.prioridade || 'Normal'}
            </div>
            <div class="demanda-status ${statusClass}">
              ${this.obterTextoStatus(demanda.status)}
            </div>
          </div>
          
          <div class="demanda-body">
            <h4 class="demanda-titulo">${demanda.titulo || 'Sem título'}</h4>
            <p class="demanda-descricao">${this.truncarTexto(demanda.descricao, 100)}</p>
          </div>
          
          <div class="demanda-footer">
            <div class="demanda-info">
              <i class="fi fi-rr-user"></i>
              <span>${demanda.solicitante?.nome || 'Desconhecido'}</span>
            </div>
            <div class="demanda-info">
              <i class="fi fi-rr-briefcase"></i>
              <span>${demanda.setor_origem || 'N/A'}</span>
            </div>
            <div class="demanda-info">
              <i class="fi fi-rr-calendar"></i>
              <span>${dataFormatada}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.listaContainer.innerHTML = html;
  },

  /**
   * ✅ IMPLEMENTADO: Selecionar demanda
   */
  selecionarDemanda(demandaId) {
    const demanda = this.demandas.find(d => d.id === demandaId);
    
    if (!demanda) {
      console.error('Demanda não encontrada:', demandaId);
      return;
    }
    
    this.demandaSelecionada = demanda;
    this.renderizarDetalhes();
  },

  /**
   * ✅ IMPLEMENTADO: Renderizar detalhes
   */
  renderizarDetalhes() {
    if (!this.elements.detalhesContainer || !this.demandaSelecionada) return;
    
    const demanda = this.demandaSelecionada;
    const prioridadeClass = this.obterClassePrioridade(demanda.prioridade);
    const statusClass = this.obterClasseStatus(demanda.status);
    const dataFormatada = this.formatarData(demanda.created_at);
    
    this.elements.detalhesContainer.innerHTML = `
      <div class="demanda-detalhes-header">
        <div class="detalhes-titulo-grupo">
          <h3>${demanda.titulo || 'Sem título'}</h3>
          <div class="detalhes-badges">
            <span class="badge ${prioridadeClass}">${demanda.prioridade || 'Normal'}</span>
            <span class="badge ${statusClass}">${this.obterTextoStatus(demanda.status)}</span>
          </div>
        </div>
        <button class="btn-close-detalhes" onclick="DemandasTab.fecharDetalhes()">
          <i class="fi fi-rr-cross"></i>
        </button>
      </div>
      
      <div class="demanda-detalhes-body">
        <!-- Informações do Solicitante -->
        <div class="detalhes-secao">
          <h4 class="detalhes-secao-titulo">
            <i class="fi fi-rr-user"></i>
            Solicitante
          </h4>
          <div class="detalhes-info-grid">
            <div class="detalhes-info-item">
              <span class="info-label">Nome:</span>
              <span class="info-value">${demanda.solicitante?.nome || 'Desconhecido'}</span>
            </div>
            <div class="detalhes-info-item">
              <span class="info-label">Setor:</span>
              <span class="info-value">${demanda.setor_origem || 'N/A'}</span>
            </div>
            <div class="detalhes-info-item">
              <span class="info-label">Data:</span>
              <span class="info-value">${dataFormatada}</span>
            </div>
          </div>
        </div>
        
        <!-- Descrição -->
        <div class="detalhes-secao">
          <h4 class="detalhes-secao-titulo">
            <i class="fi fi-rr-document"></i>
            Descrição
          </h4>
          <div class="detalhes-descricao">
            <p>${demanda.descricao || 'Sem descrição'}</p>
          </div>
        </div>
        
        <!-- Tipo de Solicitação -->
        ${demanda.tipo_solicitacao ? `
          <div class="detalhes-secao">
            <h4 class="detalhes-secao-titulo">
              <i class="fi fi-rr-tags"></i>
              Tipo de Solicitação
            </h4>
            <p>${demanda.tipo_solicitacao}</p>
          </div>
        ` : ''}
        
        <!-- Dados Relacionados -->
        ${demanda.dados_relacionados ? `
          <div class="detalhes-secao">
            <h4 class="detalhes-secao-titulo">
              <i class="fi fi-rr-database"></i>
              Dados Relacionados
            </h4>
            <pre class="detalhes-dados">${JSON.stringify(demanda.dados_relacionados, null, 2)}</pre>
          </div>
        ` : ''}
        
        <!-- Ações -->
        <div class="detalhes-secao">
          <h4 class="detalhes-secao-titulo">
            <i class="fi fi-rr-settings"></i>
            Ações
          </h4>
          <div class="detalhes-acoes">
            ${demanda.status === 'pendente' ? `
              <button class="btn btn-primary" onclick="DemandasTab.iniciarDemanda('${demanda.id}')">
                <i class="fi fi-rr-play"></i>
                Iniciar Atendimento
              </button>
            ` : ''}
            
            ${demanda.status === 'andamento' ? `
              <button class="btn btn-success" onclick="DemandasTab.concluirDemanda('${demanda.id}')">
                <i class="fi fi-rr-check"></i>
                Concluir
              </button>
              <button class="btn btn-secondary" onclick="DemandasTab.pausarDemanda('${demanda.id}')">
                <i class="fi fi-rr-pause"></i>
                Aguardando Resposta
              </button>
            ` : ''}
            
            <button class="btn btn-danger" onclick="DemandasTab.cancelarDemanda('${demanda.id}')">
              <i class="fi fi-rr-cross-circle"></i>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * ✅ IMPLEMENTADO: Ações de demandas
   */
  async iniciarDemanda(demandaId) {
    try {
      const user = window.AuthSystem.getCurrentUser();
      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;
      
      await updateDoc(doc(db, 'demandas_externas', demandaId), {
        status: 'andamento',
        atendente_responsavel: {
          uid: user.uid,
          nome: user.name,
          inicio_em: serverTimestamp()
        },
        updated_at: serverTimestamp()
      });
      
      alert('✅ Demanda iniciada!');
      this.fecharDetalhes();
      
    } catch (error) {
      console.error('❌ Erro ao iniciar demanda:', error);
      alert('Erro ao iniciar demanda');
    }
  },

  async concluirDemanda(demandaId) {
    if (!confirm('Deseja marcar esta demanda como concluída?')) return;
    
    try {
      const user = window.AuthSystem.getCurrentUser();
      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;
      
      await updateDoc(doc(db, 'demandas_externas', demandaId), {
        status: 'concluido',
        concluido_por: user.name,
        concluido_em: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      alert('✅ Demanda concluída!');
      this.fecharDetalhes();
      
    } catch (error) {
      console.error('❌ Erro ao concluir demanda:', error);
      alert('Erro ao concluir demanda');
    }
  },

  async pausarDemanda(demandaId) {
    try {
      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;
      
      await updateDoc(doc(db, 'demandas_externas', demandaId), {
        status: 'aguardando',
        updated_at: serverTimestamp()
      });
      
      alert('✅ Demanda pausada - aguardando resposta');
      this.fecharDetalhes();
      
    } catch (error) {
      console.error('❌ Erro ao pausar demanda:', error);
      alert('Erro ao pausar demanda');
    }
  },

  async cancelarDemanda(demandaId) {
    const motivo = prompt('Motivo do cancelamento:');
    if (!motivo) return;
    
    try {
      const user = window.AuthSystem.getCurrentUser();
      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;
      
      await updateDoc(doc(db, 'demandas_externas', demandaId), {
        status: 'cancelado',
        motivo_cancelamento: motivo,
        cancelado_por: user.name,
        cancelado_em: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      alert('✅ Demanda cancelada');
      this.fecharDetalhes();
      
    } catch (error) {
      console.error('❌ Erro ao cancelar demanda:', error);
      alert('Erro ao cancelar demanda');
    }
  },

  fecharDetalhes() {
    this.demandaSelecionada = null;
    
    if (this.elements.detalhesContainer) {
      this.elements.detalhesContainer.innerHTML = `
        <div class="empty-state">
          <i class="fi fi-rr-inbox"></i>
          <h3>Selecione uma Demanda</h3>
          <p>Clique em uma demanda para ver os detalhes</p>
        </div>
      `;
    }
  },

  /**
   * ✅ IMPLEMENTADO: Calcular estatísticas
   */
  calcularEstatisticas() {
    const total = this.demandas.length;
    const pendentes = this.demandas.filter(d => d.status === 'pendente').length;
    const urgentes = this.demandas.filter(d => d.prioridade === 'urgente').length;
    
    if (this.elements.statTotalDemandas) {
      this.elements.statTotalDemandas.textContent = total;
    }
    
    if (this.elements.statPendentes) {
      this.elements.statPendentes.textContent = pendentes;
    }
    
    if (this.elements.statUrgentes) {
      this.elements.statUrgentes.textContent = urgentes;
    }
  },

  limparFiltros() {
    if (this.elements.filterArea) this.elements.filterArea.value = '';
    if (this.elements.filterStatus) this.elements.filterStatus.value = '';
    if (this.elements.filterPrioridade) this.elements.filterPrioridade.value = '';
    if (this.elements.searchInput) this.elements.searchInput.value = '';
    
    this.aplicarFiltros();
  },

  mostrarErro(error) {
    if (this.elements.listaContainer) {
      this.elements.listaContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px; text-align: center;">
          <i class="fi fi-rr-exclamation-triangle" style="font-size: 48px; color: var(--color-danger);"></i>
          <h3>Erro ao Carregar Demandas</h3>
          <p>${error.message}</p>
          <button class="btn btn-primary" onclick="DemandasTab.loadData()">Tentar Novamente</button>
        </div>
      `;
    }
  },

  // Funções utilitárias
  obterClassePrioridade(prioridade) {
    const mapa = {
      'urgente': 'prioridade-urgente',
      'alta': 'prioridade-alta',
      'media': 'prioridade-media',
      'baixa': 'prioridade-baixa'
    };
    return mapa[prioridade?.toLowerCase()] || 'prioridade-media';
  },

  obterClasseStatus(status) {
    const mapa = {
      'pendente': 'status-pendente',
      'andamento': 'status-andamento',
      'aguardando': 'status-aguardando',
      'concluido': 'status-concluido',
      'cancelado': 'status-cancelado'
    };
    return mapa[status?.toLowerCase()] || 'status-default';
  },

  obterTextoStatus(status) {
    const mapa = {
      'pendente': 'Pendente',
      'andamento': 'Em Andamento',
      'aguardando': 'Aguardando Resposta',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado'
    };
    return mapa[status?.toLowerCase()] || status;
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

  truncarTexto(texto, maxLength) {
    if (!texto) return '';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
  },

  /**
   * ✅ Método de refresh (chamado ao retornar para a aba)
   */
  async refresh() {
    console.log('🔄 Atualizando dados de Demandas...');
    
    try {
      await this.loadData();
      console.log('✅ Demandas atualizado');
    } catch (error) {
      console.error('❌ Erro ao atualizar Demandas:', error);
    }
  },

  /**
   * ✅ Método cleanup (chamado ao sair da aba)
   */
  cleanup() {
    console.log('🧹 Limpando DemandasTab...');
    
    try {
      // Limpar listener do Firebase
      if (this.unsubscribeDemandas) {
        this.unsubscribeDemandas();
        this.unsubscribeDemandas = null;
      }
      
      console.log('✅ DemandasTab limpo');
    } catch (error) {
      console.warn('⚠️ Erro no cleanup de Demandas:', error);
    }
  },

  /**
   * ✅ Cleanup completo (apenas quando sair do módulo inteiro)
   */
  destroy() {
    console.log('🗑️ Destruindo DemandasTab...');
    
    this.cleanup();
    this.demandas = [];
    this.demandasFiltradas = [];
    this.demandaSelecionada = null;
    this._initialized = false;
    
    console.log('✅ DemandasTab destruído');
  }
};

// ✅ Expor globalmente
window.DemandasTab = DemandasTab;

export default DemandasTab;

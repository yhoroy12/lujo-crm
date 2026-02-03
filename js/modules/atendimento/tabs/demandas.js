/**
 * ABA: DEMANDAS EXTERNAS (VERSÃO PROTEGIDA)
 * Gerencia demandas externas
 * 
 * ✅ MELHORIAS IMPLEMENTADAS:
 * - Proteção contra re-inicialização (_initialized)
 * - Método cleanup básico
 * - Método refresh para atualização
 */

const DemandasTab = {
  id: 'aba-demandas',
  moduleId: 'atendimento',

  // ✅ NOVO: Flag de controle
  _initialized: false,

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
      this.loadData();
      
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
      filterArea: document.getElementById('filtroDemandaArea'),
      filterStatus: document.getElementById('filtroDemandaStatus'),
      searchInput: document.getElementById('searchDemandas'),
      listaContainer: document.getElementById('listaDemandas')
    };
  },

  bindEvents() {
    if (this.elements.filterArea) {
      window.ModuleLifecycle.addListener(
        this.elements.filterArea,
        'change',
        () => this.loadData(),
        this.moduleId
      );
    }

    if (this.elements.filterStatus) {
      window.ModuleLifecycle.addListener(
        this.elements.filterStatus,
        'change',
        () => this.loadData(),
        this.moduleId
      );
    }

    if (this.elements.searchInput) {
      window.ModuleLifecycle.addListener(
        this.elements.searchInput,
        'input',
        () => this.loadData(),
        this.moduleId
      );
    }
  },

  loadData() {
    console.log('📊 Carregando demandas');
    // Implementar filtro e busca
  },

  /**
   * ✅ NOVO: Método de refresh (chamado ao retornar para a aba)
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
   * ✅ NOVO: Método cleanup (chamado ao sair da aba)
   */
  cleanup() {
    console.log('🧹 Limpando DemandasTab...');
    
    try {
      // Limpar filtros (opcional)
      // Limpar listeners específicos (já gerenciados pelo ModuleLifecycle)
      
      // ✅ NÃO resetar _initialized (tab continua carregada)
      console.log('✅ DemandasTab limpo');
    } catch (error) {
      console.warn('⚠️ Erro no cleanup de Demandas:', error);
    }
  },

  /**
   * ✅ NOVO: Cleanup completo (apenas quando sair do módulo inteiro)
   */
  destroy() {
    console.log('🗑️ Destruindo DemandasTab...');
    this._initialized = false;
    console.log('✅ DemandasTab destruído');
  }
};

// ✅ Expor globalmente
window.DemandasTab = DemandasTab;

export default DemandasTab;

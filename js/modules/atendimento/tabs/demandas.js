/**
 * ABA: DEMANDAS EXTERNAS
 * Gerencia demandas externas
 */

const DemandasTab = {
  id: 'aba-demandas',
  moduleId: 'atendimento',

  async init() {
    console.log('📋 Inicializando aba Demandas');
    
    try {
      this.cacheElements();
      this.bindEvents();
      this.loadData();
      console.log('✅ Demandas pronto');
    } catch (error) {
      console.error('❌ Erro em Demandas:', error);
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
  }
};

export default DemandasTab;
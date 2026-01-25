/**
 * ABA: HISTÓRICO
 * Gerencia histórico de atendimentos
 */

const HistoricoTab = {
  id: 'aba-historico',
  moduleId: 'atendimento',
  canalAtual: 'whatsapp',

  async init() {
    console.log('📚 Inicializando aba Histórico');
    
    try {
      this.cacheElements();
      this.bindEvents();
      this.carregarDados();
      console.log('✅ Histórico pronto');
    } catch (error) {
      console.error('❌ Erro em Histórico:', error);
    }
  },

  cacheElements() {
    this.elements = {
      subAbaBtns: document.querySelectorAll('.sub-aba-btn'),
      listaContainer: document.getElementById('listaHistorico'),
      searchInput: document.getElementById('searchHistorico'),
      filterPeriodo: document.getElementById('filtroPeriodo')
    };
  },

  bindEvents() {
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

    if (this.elements.searchInput) {
      window.ModuleLifecycle.addListener(
        this.elements.searchInput,
        'input',
        () => this.carregarDados(),
        this.moduleId
      );
    }

    if (this.elements.filterPeriodo) {
      window.ModuleLifecycle.addListener(
        this.elements.filterPeriodo,
        'change',
        () => this.carregarDados(),
        this.moduleId
      );
    }
  },

  atualizarAbas(botaoSelecionado) {
    this.elements.subAbaBtns.forEach(btn => {
      btn.classList.remove('ativa');
    });
    botaoSelecionado.classList.add('ativa');
  },

  carregarDados() {
    console.log(`📊 Carregando histórico (${this.canalAtual})`);
    // Implementar carregamento de dados
  }
};

export default HistoricoTab;
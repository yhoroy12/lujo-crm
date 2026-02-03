/**
 * ABA: HISTÓRICO (VERSÃO PROTEGIDA)
 * Gerencia histórico de atendimentos
 * 
 * ✅ MELHORIAS IMPLEMENTADAS:
 * - Proteção contra re-inicialização (_initialized)
 * - Método cleanup básico
 * - Método refresh para atualização
 */

const HistoricoTab = {
  id: 'aba-historico',
  moduleId: 'atendimento',
  canalAtual: 'whatsapp',

  // ✅ NOVO: Flag de controle
  _initialized: false,

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
      this.carregarDados();
      
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
  },

  /**
   * ✅ NOVO: Método de refresh (chamado ao retornar para a aba)
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
   * ✅ NOVO: Método cleanup (chamado ao sair da aba)
   */
  cleanup() {
    console.log('🧹 Limpando HistoricoTab...');
    
    try {
      // Limpar filtros (opcional)
      // Limpar listeners específicos (já gerenciados pelo ModuleLifecycle)
      
      // ✅ NÃO resetar _initialized (tab continua carregada)
      console.log('✅ HistoricoTab limpo');
    } catch (error) {
      console.warn('⚠️ Erro no cleanup de Histórico:', error);
    }
  },

  /**
   * ✅ NOVO: Cleanup completo (apenas quando sair do módulo inteiro)
   */
  destroy() {
    console.log('🗑️ Destruindo HistoricoTab...');
    this._initialized = false;
    console.log('✅ HistoricoTab destruído');
  }
};

// ✅ Expor globalmente
window.HistoricoTab = HistoricoTab;

export default HistoricoTab;

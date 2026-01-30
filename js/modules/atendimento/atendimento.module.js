/**
 * ATENDIMENTO MODULE - Controlador Principal
 * Coordena: abas, services, state management, timers
 */

// Mock de histórico para inicialização
const MOCK_HISTORICO = [
    {
        id: 'MS-20251111-223841',
        cliente: 'Marcos Oliveira',
        telefone: '(11) 98888-7777',
        email: 'marcos@email.com',
        tipo: 'financeiro',
        status: 'concluido',
        dataAbertura: '2025-01-09T14:30:00',
        dataConclusao: '2025-01-09T14:52:00',
        tempoAtendimento: 22,
        validacaoIdentidade: true,
        descricao: 'Cliente solicitou esclarecimentos sobre valores.',
        observacoes: 'Cliente satisfeito.',
        setorDerivado: null,
        timeline: [
            { hora: '14:30', texto: 'Ticket criado' },
            { hora: '14:32', texto: 'Atribuído' },
            { hora: '14:35', texto: 'Identidade validada' },
            { hora: '14:52', texto: 'Ticket concluído' }
        ]
    }
];

const AtendimentoModule = {
  id: 'atendimento',
  
  // Referências de timers
  ticketTimerInterval: null,
  emailTimerInterval: null,

  async init() {
    console.log('🔧 Inicializando módulo Atendimento');
    
    try {
      // 1. Carregar template HTML
      await this.loadTemplate();
      console.log('✅ Template carregado');
      
      // 2. Inicializar State Manager
      this.initState();
      console.log('✅ State inicializado');
      
      // 3. Carregar serviços
      await this.loadServices();
      console.log('✅ Services carregados');
      
      // 4. Inicializar abas
      this.setupTabs();
      console.log('✅ Abas configuradas');
      
      // 5. Bind eventos globais
      this.bindGlobalEvents();
      console.log('✅ Eventos configurados');
  
      console.log('🎉 Atendimento pronto');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Atendimento:', error);
      throw error;
    }
  },

  /**
   * 1. Carregar template HTML
   */
  async loadTemplate() {
    try {
      const response = await fetch('../js/modules/atendimento/templates/atendimento.html');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const html = await response.text();
      const container = document.getElementById('app-container');
      if (!container) throw new Error('Container #app-container não encontrado');
      
      container.innerHTML = html;
    } catch (error) {
      console.error('❌ Erro ao carregar template:', error);
      throw error;
    }
  },

  /**
   * 2. Inicializar State Manager
   */
  initState() {
    if (!window.StateManager) {
      throw new Error('StateManager não carregado');
    }
    
    window.StateManager.init(this.id, {
      currentTicket: null,
      currentEmail: null,
      activeTab: 'aba-atendimento',
      historicoFiltrado: [...MOCK_HISTORICO],
      canalHistorico: 'whatsapp',
      emailTimerRunning: false,
      ticketTimerRunning: false
    });
  },

  /**
   * 3. Carregar Services (Lazy Loading)
   */
  async loadServices() {
    try {
      console.log('📦 Carregando infraestrutura de dados do Firebase...');
        await import('./services/atendimento-chat-sistem/atendimento-data-structure.js');
        await import('./services/atendimento-chat-sistem/atendimento-acceptance-manager.js');
        await import('./services/atendimento-chat-sistem/atendimento-restoration-manager.js');
        if (!window.AtendimentoDataStructure && typeof AtendimentoDataStructureManager !== 'undefined') {
        window.AtendimentoDataStructure = new AtendimentoDataStructureManager();
      }

      window.AtendimentoServices = {};
      console.log('Infraestrutura de dados e Services prontos');
    } catch (error) {
      console.error('❌ Erro ao preparar services:', error);
      throw error;
    }
  },

  /**
   * 4. Configurar abas com TabManager
   */
  setupTabs() {
    if (!window.TabManager) {
      throw new Error('TabManager não carregado');
    }
    
    window.TabManager.init('.modulo-painel-atendimento', this.id, {
      tabButtonSelector: '.aba-btn',
      tabContentSelector: '.aba-conteudo',
      activeClass: 'ativa',
      onTabChange: (tabId, tabContent) => {
        console.log(`📑 Aba alterada para: ${tabId}`);
        window.StateManager.set(this.id, { activeTab: tabId });
        this.loadTabContent(tabId);
      }
    });
  },

  /**
   * Carregar conteúdo dinâmico das abas
   */
async loadTabContent(tabId) {
    try {
        const scriptName = tabId.replace('aba-', '');
        // Caminho relativo ao atendimento.module.js
        const modulePath = `./tabs/${scriptName}.js`; 
        
        console.log(`📦 Carregando script da aba: ${modulePath}`);
        
        const tabModule = await import(modulePath);
        const moduleInstance = tabModule.EmailsTab || tabModule.default || tabModule;

        if (moduleInstance && typeof moduleInstance.init === 'function') {
            await moduleInstance.init();
        } else if (tabModule.init) {
            await tabModule.init();
        }
        
    } catch (error) {
        console.error(`❌ Erro ao carregar aba ${tabId}:`, error);
    }
},

  /**
   * 5. Bind eventos globais
   */
  bindGlobalEvents() {
    // Eventos que afetam todo o módulo
  },

  /**
   * Parar todos os timers
   */
  stopAllTimers() {
    if (this.ticketTimerInterval) {
      clearInterval(this.ticketTimerInterval);
      this.ticketTimerInterval = null;
    }
    if (this.emailTimerInterval) {
      clearInterval(this.emailTimerInterval);
      this.emailTimerInterval = null;
    }
  },

  /**
   * Cleanup - Chamado quando sair do módulo
   */
  cleanup() {
    console.log('🧹 Limpando Atendimento');
    
    try {
      this.stopAllTimers();
      
      if (window.ModuleLifecycle) {
        window.ModuleLifecycle.cleanup(this.id);
      }
      
      if (window.StateManager) {
        window.StateManager.reset(this.id);
      }
      
      if (window.ModalManager) {
        window.ModalManager.closeAll();
      }
      
      console.log('✅ Atendimento limpo');
    } catch (error) {
      console.error('⚠️ Erro durante cleanup:', error);
    }
  }
};

export default AtendimentoModule;
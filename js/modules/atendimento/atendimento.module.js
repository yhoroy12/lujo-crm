/**
 * ATENDIMENTO MODULE - Controlador Principal (VERSÃO FINAL CORRIGIDA)
 * Coordena: abas, services, state management, timers
 * 
 * ✅ CORREÇÕES IMPLEMENTADAS:
 * - Sistema de cache de tabs (previne re-importação)
 * - Proteção contra re-inicialização do módulo
 * - Cleanup granular por aba
 * - Método de re-ativação de abas
 * - Cleanup completo com destroy() das tabs
 * - Logs detalhados para debug
 */

const AtendimentoModule = {
  id: 'atendimento',
  
  // ✅ Controle de estado interno
  _initialized: false,
  _currentTab: null,
  
  // ✅ Cache de tabs carregadas
  _loadedTabs: new Set(),
  
  // Referências de timers
  ticketTimerInterval: null,
  emailTimerInterval: null,

  async init() {
    // ✅ PROTEÇÃO: Re-inicialização
    if (this._initialized) {
      console.warn('⚠️ Atendimento já foi inicializado. Abortando duplicata.');
      return;
    }

    console.log('🔧 Inicializando módulo Atendimento');
    
    try {
      await this.loadTemplate();
      console.log('✅ Template carregado');
      
      this.initState();
      console.log('✅ State inicializado');
      
      await this.loadServices();
      console.log('✅ Services carregados');
      
      this.setupTabs();
      console.log('✅ Abas configuradas');
      
      this.bindGlobalEvents();
      console.log('✅ Eventos configurados');

      this._initialized = true;
  
      console.log('🎉 Atendimento pronto');
      console.log(`📊 Cache: ${this._loadedTabs.size} tabs carregadas`);
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Atendimento:', error);
      this._initialized = false;
      throw error;
    }
  },

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

  initState() {
    if (!window.StateManager) {
      throw new Error('StateManager não carregado');
    }
    
    window.StateManager.init(this.id, {
      currentTicket: null,
      currentEmail: null,
      activeTab: 'aba-atendimento',
      historicoFiltrado: null,
      canalHistorico: 'whatsapp',
      emailTimerRunning: false,
      ticketTimerRunning: false
    });
  },

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
      console.log('✅ Infraestrutura de dados e Services prontos');
    } catch (error) {
      console.error('❌ Erro ao preparar services:', error);
      throw error;
    }
  },

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
        
        // ✅ Cleanup da aba anterior
        if (this._currentTab && this._currentTab !== tabId) {
          console.log(`🧹 Preparando cleanup da aba anterior: ${this._currentTab}`);
          this.cleanupTab(this._currentTab);
        }
        
        this._currentTab = tabId;
        window.StateManager.set(this.id, { activeTab: tabId });
        this.loadTabContent(tabId);
      }
    });
  },

  /**
   * ✅ Carregar conteúdo dinâmico das abas COM CACHE
   */
  async loadTabContent(tabId) {
    try {
      // ✅ VERIFICAÇÃO DE CACHE
      if (this._loadedTabs.has(tabId)) {
        console.log(`♻️ Tab ${tabId} já carregada (usando cache)`);
        await this.reactivateTab(tabId);
        return;
      }

      const scriptName = tabId.replace('aba-', '');
      const modulePath = `./tabs/${scriptName}.js`; 
      
      console.log(`📦 Carregando script da aba: ${modulePath}`);
      
      const tabModule = await import(modulePath);
      const moduleInstance = tabModule.EmailsTab || tabModule.default || tabModule;

      if (moduleInstance && typeof moduleInstance.init === 'function') {
        await moduleInstance.init();
      } else if (tabModule.init) {
        await tabModule.init();
      }

      this._loadedTabs.add(tabId);
      console.log(`✅ Tab ${tabId} carregada e adicionada ao cache (${this._loadedTabs.size} tabs no cache)`);
      
    } catch (error) {
      console.error(`❌ Erro ao carregar aba ${tabId}:`, error);
      this._loadedTabs.delete(tabId);
    }
  },

  /**
   * ✅ Re-ativar aba já carregada
   */
  async reactivateTab(tabId) {
    console.log(`🔄 Re-ativando tab: ${tabId}`);
    
    const tabInstances = {
      'aba-atendimento': window.WhatsAppTab,
      'aba-emails': window.EmailsTab,
      'aba-demandas': window.DemandasTab,
      'aba-historico': window.HistoricoTab
    };

    const tabInstance = tabInstances[tabId];
    
    if (tabInstance) {
      if (typeof tabInstance.refresh === 'function') {
        await tabInstance.refresh();
        console.log(`✅ Tab ${tabId} re-ativada via refresh()`);
      } else {
        console.log(`ℹ️ Tab ${tabId} não possui método refresh`);
      }
    }
  },

  /**
   * ✅ Cleanup granular de uma aba específica
   */
  cleanupTab(tabId) {
    console.log(`🧹 Limpando aba: ${tabId}`);

    const tabInstances = {
      'aba-atendimento': window.WhatsAppTab,
      'aba-emails': window.EmailsTab,
      'aba-demandas': window.DemandasTab,
      'aba-historico': window.HistoricoTab
    };

    const tabInstance = tabInstances[tabId];
    
    if (tabInstance && typeof tabInstance.cleanup === 'function') {
      try {
        tabInstance.cleanup();
        console.log(`✅ Cleanup customizado executado: ${tabId}`);
      } catch (error) {
        console.warn(`⚠️ Erro no cleanup de ${tabId}:`, error);
      }
    }

    console.log(`✅ Aba ${tabId} limpa (mantida no cache)`);
  },

  bindGlobalEvents() {
    // Eventos que afetam todo o módulo
  },

  stopAllTimers() {
    if (this.ticketTimerInterval) {
      clearInterval(this.ticketTimerInterval);
      this.ticketTimerInterval = null;
      console.log('⏹️ Timer de ticket parado');
    }
    if (this.emailTimerInterval) {
      clearInterval(this.emailTimerInterval);
      this.emailTimerInterval = null;
      console.log('⏹️ Timer de email parado');
    }
  },

  /**
   * ✅ CORRIGIDO: Cleanup completo com destroy() das tabs
   */
  cleanup() {
    console.log('🧹 Limpando Atendimento');
    
    try {
      // 1. Parar timers
      this.stopAllTimers();
      
      // 2. ✅ DESTRUIR TODAS AS TABS CARREGADAS
      console.log(`🗑️ Destruindo ${this._loadedTabs.size} tabs...`);
      
      const tabInstances = {
        'aba-atendimento': window.WhatsAppTab,
        'aba-emails': window.EmailsTab,
        'aba-demandas': window.DemandasTab,
        'aba-historico': window.HistoricoTab
      };

      for (const tabId of this._loadedTabs) {
        const tabInstance = tabInstances[tabId];
        
        if (tabInstance && typeof tabInstance.destroy === 'function') {
          try {
            tabInstance.destroy();
            console.log(`✅ Tab ${tabId} destruída`);
          } catch (error) {
            console.warn(`⚠️ Erro ao destruir ${tabId}:`, error);
          }
        }
      }
      
      // 3. Limpar referências globais
      delete window.WhatsAppTab;
      delete window.EmailsTab;
      delete window.DemandasTab;
      delete window.HistoricoTab;
      
      // 4. Chama o gerenciador de ciclo de vida global
      if (window.ModuleLifecycle) {
        window.ModuleLifecycle.cleanup(this.id);
      }
      
      // 5. Reseta o estado do módulo
      if (window.StateManager) {
        window.StateManager.reset(this.id);
      }
      
      // 6. Fecha todos os modais
      if (window.ModalManager) {
        window.ModalManager.closeAll();
      }

      // 7. Reset de controles internos
      this._loadedTabs.clear();
      this._currentTab = null;
      this._initialized = false;
      
      console.log('✅ Atendimento limpo completamente');
      console.log(`📊 Estado final: ${this._loadedTabs.size} tabs no cache, initialized: ${this._initialized}`);
      
    } catch (error) {
      console.error('⚠️ Erro durante cleanup:', error);
      
      // Forçar reset mesmo com erro
      this._loadedTabs.clear();
      this._currentTab = null;
      this._initialized = false;
    }
  },

  /**
   * ✅ Debug helper
   */
  debug() {
    console.group('🔍 ATENDIMENTO MODULE DEBUG');
    console.log('📊 Estado:', {
      initialized: this._initialized,
      currentTab: this._currentTab,
      loadedTabs: Array.from(this._loadedTabs),
      ticketTimerRunning: this.ticketTimerInterval !== null,
      emailTimerRunning: this.emailTimerInterval !== null
    });
    
    console.log('🔧 State Manager:', window.StateManager?.get(this.id));
    console.log('📈 ModuleLifecycle:', window.ModuleLifecycle?.getStats());
    
    console.groupEnd();
  },

  /**
   * ✅ Força reset completo
   */
  forceReset() {
    console.warn('🔄 Forçando reset completo do módulo Atendimento...');
    
    this.cleanup();
    
    console.log('✅ Reset completo executado');
  }
};

export default AtendimentoModule;

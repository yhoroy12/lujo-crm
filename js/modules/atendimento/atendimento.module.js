/**
 * ATENDIMENTO MODULE - Controlador Principal (VERSÃO CORRIGIDA)
 * Coordena: abas, services, state management, timers
 * 
 * CORREÇÕES IMPLEMENTADAS:
 * ✅ Sistema de cache de tabs (previne re-importação)
 * ✅ Proteção contra re-inicialização do módulo
 * ✅ Cleanup granular por aba
 * ✅ Rastreamento de aba ativa
 * ✅ Logs detalhados para debug
 */

const AtendimentoModule = {
  id: 'atendimento',
  
  // ✅ NOVO: Controle de estado interno
  _initialized: false,
  _currentTab: null,
  
  // ✅ NOVO: Cache de tabs carregadas
  _loadedTabs: new Set(),
  
  // Referências de timers
  ticketTimerInterval: null,
  emailTimerInterval: null,

  async init() {
    // ✅ CORREÇÃO 1: Proteção contra re-inicialização
    if (this._initialized) {
      console.warn('⚠️ Atendimento já foi inicializado. Abortando duplicata.');
      return;
    }

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

      // ✅ NOVO: Marcar como inicializado
      this._initialized = true;
  
      console.log('🎉 Atendimento pronto');
      console.log(`📊 Cache: ${this._loadedTabs.size} tabs carregadas`);
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Atendimento:', error);
      // ✅ NOVO: Reset em caso de erro
      this._initialized = false;
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
      historicoFiltrado: null,
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
      console.log('✅ Infraestrutura de dados e Services prontos');
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
        
        // ✅ CORREÇÃO 2: Cleanup da aba anterior
        if (this._currentTab && this._currentTab !== tabId) {
          console.log(`🧹 Preparando cleanup da aba anterior: ${this._currentTab}`);
          this.cleanupTab(this._currentTab);
        }
        
        // ✅ NOVO: Atualizar aba atual
        this._currentTab = tabId;
        
        // Atualizar state
        window.StateManager.set(this.id, { activeTab: tabId });
        
        // Carregar conteúdo (com cache)
        this.loadTabContent(tabId);
      }
    });
  },

  /**
   * ✅ CORREÇÃO 3: Carregar conteúdo dinâmico das abas COM CACHE
   */
  async loadTabContent(tabId) {
    try {
      // ✅ VERIFICAÇÃO DE CACHE
      if (this._loadedTabs.has(tabId)) {
        console.log(`♻️ Tab ${tabId} já carregada (usando cache)`);
        
        // ✅ IMPORTANTE: Mesmo com cache, precisa re-ativar a aba
        // pois o usuário pode ter saído e voltado
        await this.reactivateTab(tabId);
        return;
      }

      const scriptName = tabId.replace('aba-', '');
      const modulePath = `./tabs/${scriptName}.js`; 
      
      console.log(`📦 Carregando script da aba: ${modulePath}`);
      
      // ✅ PRIMEIRA VEZ: Importa e inicializa
      const tabModule = await import(modulePath);
      const moduleInstance = tabModule.EmailsTab || tabModule.default || tabModule;

      if (moduleInstance && typeof moduleInstance.init === 'function') {
        await moduleInstance.init();
      } else if (tabModule.init) {
        await tabModule.init();
      }

      // ✅ ADICIONAR AO CACHE
      this._loadedTabs.add(tabId);
      console.log(`✅ Tab ${tabId} carregada e adicionada ao cache (${this._loadedTabs.size} tabs no cache)`);
      
    } catch (error) {
      console.error(`❌ Erro ao carregar aba ${tabId}:`, error);
      // ✅ NOVO: Remover do cache se falhou
      this._loadedTabs.delete(tabId);
    }
  },

  /**
   * ✅ NOVO: Re-ativar aba já carregada
   * Útil para abas que precisam atualizar dados ao voltar
   */
  async reactivateTab(tabId) {
    console.log(`🔄 Re-ativando tab: ${tabId}`);
    
    const scriptName = tabId.replace('aba-', '');
    
    // Verificar se a tab tem método de reativação
    const tabInstances = {
      'aba-atendimento': window.WhatsAppTab,
      'aba-emails': window.EmailsTab,
      'aba-demandas': window.DemandasTab,
      'aba-historico': window.HistoricoTab
    };

    const tabInstance = tabInstances[tabId];
    
    if (tabInstance) {
      // Se a tab tem método onReactivate, chama
      if (typeof tabInstance.onReactivate === 'function') {
        await tabInstance.onReactivate();
        console.log(`✅ Tab ${tabId} re-ativada via onReactivate()`);
      } 
      // Se a tab tem método refresh, chama
      else if (typeof tabInstance.refresh === 'function') {
        await tabInstance.refresh();
        console.log(`✅ Tab ${tabId} re-ativada via refresh()`);
      }
      // Senão, apenas loga
      else {
        console.log(`ℹ️ Tab ${tabId} não possui método de re-ativação`);
      }
    }
  },

  /**
   * ✅ NOVO: Cleanup granular de uma aba específica
   */
  cleanupTab(tabId) {
    console.log(`🧹 Limpando aba: ${tabId}`);

    const scriptName = tabId.replace('aba-', '');
    
    // Chamar cleanup específico da tab (se existir)
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

    // ✅ IMPORTANTE: NÃO remove do cache aqui
    // A tab continua carregada, apenas "dormente"
    console.log(`✅ Aba ${tabId} limpa (mantida no cache)`);
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
      console.log('⏹️ Timer de ticket parado');
    }
    if (this.emailTimerInterval) {
      clearInterval(this.emailTimerInterval);
      this.emailTimerInterval = null;
      console.log('⏹️ Timer de email parado');
    }
  },

  /**
   * ✅ CORRIGIDO: Cleanup completo - Chamado quando sair do módulo
   */
  cleanup() {
    console.log('🧹 Limpando Atendimento');
    
    try {
      // 1. Parar timers
      this.stopAllTimers();
      
      // 2. ✅ NOVO: Limpar TODAS as tabs carregadas
      console.log(`🧹 Limpando ${this._loadedTabs.size} tabs...`);
      
      for (const tabId of this._loadedTabs) {
        this.cleanupTab(tabId);
      }
      
      // 3. ✅ Limpar conexão do WhatsApp se houver
      if (window.WhatsAppTab && window.WhatsAppTab.unsubscribeChat) {
        window.WhatsAppTab.unsubscribeChat();
        window.WhatsAppTab.unsubscribeChat = null;
        console.log("✅ Connection Firebase Chat encerrada");
      }

      // 4. ✅ Limpar fila do WhatsApp se houver
      if (window.WhatsAppTab && window.WhatsAppTab.unsubscribeFila) {
        window.WhatsAppTab.unsubscribeFila();
        window.WhatsAppTab.unsubscribeFila = null;
        console.log("✅ Listener de fila encerrado");
      }

      // 5. ✅ Limpar listeners globais de emails.js
      if (window.EmailsTab) {
        // Remover funções globais
        delete window.validarResposta;
        delete window.confirmarDevolucao;
        delete window.fecharModalDevolucao;
        console.log("✅ Funções globais de emails removidas");
      }
      
      // 6. ✅ Chama o gerenciador de ciclo de vida global
      if (window.ModuleLifecycle) {
        window.ModuleLifecycle.cleanup(this.id);
      }
      
      // 7. ✅ Reseta o estado do módulo
      if (window.StateManager) {
        window.StateManager.reset(this.id);
      }
      
      // 8. ✅ Fecha todos os modais
      if (window.ModalManager) {
        window.ModalManager.closeAll();
      }

      // 9. ✅ NOVO: Reset de controles internos
      this._loadedTabs.clear();
      this._currentTab = null;
      this._initialized = false;
      
      console.log('✅ Atendimento limpo completamente');
      console.log(`📊 Estado final: ${this._loadedTabs.size} tabs no cache, initialized: ${this._initialized}`);
      
    } catch (error) {
      console.error('⚠️ Erro durante cleanup:', error);
      
      // ✅ NOVO: Forçar reset mesmo com erro
      this._loadedTabs.clear();
      this._currentTab = null;
      this._initialized = false;
    }
  },

  /**
   * ✅ NOVO: Debug helper
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
   * ✅ NOVO: Força reset completo (útil para hot reload)
   */
  forceReset() {
    console.warn('🔄 Forçando reset completo do módulo Atendimento...');
    
    this.cleanup();
    
    // Limpar referências globais
    delete window.WhatsAppTab;
    delete window.EmailsTab;
    delete window.DemandasTab;
    delete window.HistoricoTab;
    
    console.log('✅ Reset completo executado');
  }
};

export default AtendimentoModule;

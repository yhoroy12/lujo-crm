/**
 * =====================================================
 * MAIN.JS - Orquestrador Principal da SPA (CORRIGIDO)
 * Gerencia navegação, módulos e otimizações Blaze
 * =====================================================
 */

const SPA = {
  currentModule: null,
  currentModuleId: null,
  loadedModules: new Map(),
  cssCache: new Set(),
  
  /**
   * Inicializa a SPA
   */
  async init() {
    console.log('🚀 Inicializando SPA');
    
    try {
      // 1. Aguardar autenticação
      await this.waitForAuth();
      console.log('✅ Autenticação pronta');
      
      // 2. Aguardar permissões
      await this.waitForPermissions();
      console.log('✅ Permissões carregadas');
      
      // 3. Gerar navegação
      this.setupNavigation();
      console.log('✅ Navegação configurada');
      
      // 4. Carregar módulo padrão
      const defaultModule = 'atendimento';
      await this.loadModule(defaultModule);
      
      // 5. Setup hotkeys e atalhos globais
      this.setupHotkeys();
      console.log('✅ Hotkeys configurados');
      
      // 6. Setup busca global
      this.setupGlobalSearch();
      console.log('✅ Busca global configurada');
      
      console.log('🎉 SPA pronto para uso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar SPA:', error);
      this.showError('Erro ao inicializar sistema. Recarregue a página.');
    }
  },

  /**
   * Aguarda autenticação estar pronta
   */
  waitForAuth() {
    return new Promise((resolve) => {
      const checkAuth = setInterval(() => {
        if (window.AuthSystem && window.AuthSystem.isAuthenticated()) {
          clearInterval(checkAuth);
          console.log('👤 Usuário autenticado:', window.AuthSystem.getCurrentUser().name);
          resolve();
        }
      }, 100);
      
      // Timeout de segurança
      setTimeout(() => {
        clearInterval(checkAuth);
        resolve();
      }, 5000);
    });
  },

  /**
   * Aguarda permissões estar prontas
   */
  waitForPermissions() {
    return new Promise((resolve) => {
      const checkPerms = setInterval(() => {
        if (window.PermissionsSystem && window.ROUTES && window.RoutesUtil) {
          clearInterval(checkPerms);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkPerms);
        resolve();
      }, 5000);
    });
  },

  /**
   * Configura navegação do sidebar
   */
  setupNavigation() {
    const user = window.AuthSystem.getCurrentUser();
    if (!user) {
      console.error('❌ Usuário não encontrado');
      return;
    }

    // Gerar links do sidebar baseado em rotas disponíveis
    const availableRoutes = window.RoutesUtil.getAvailableRoutes(user);
    const navContainer = document.querySelector('[data-role="nav-container"]') || 
                         document.querySelector('nav') ||
                         document.querySelector('.sidebar');

    if (!navContainer) {
      console.warn('⚠️ Container de navegação não encontrado');
      return;
    }

    // Gerar HTML para sidebar
    const sidebarHTML = availableRoutes.map(route => `
      <a href="#" 
         class="sidebar-link" 
         data-module="${route.id}" 
         title="${route.description}"
         data-permission="${route.permission}">
        <i class="fi ${route.icon}"></i>
        <span class="link-label">${route.name}</span>
      </a>
    `).join('');

    navContainer.innerHTML = sidebarHTML;

    // Registrar listeners
    document.querySelectorAll('[data-module]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleId = link.dataset.module;
        
        // Verificar permissão
        if (!window.AuthSystem.hasPermission(link.dataset.permission)) {
          this.showError('Você não tem permissão para acessar este módulo');
          return;
        }
        
        this.loadModule(moduleId);
      });
    });

    console.log(`📍 Navegação gerada com ${availableRoutes.length} módulos`);
  },

  /**
   * Carrega um módulo dinamicamente
   */
  async loadModule(moduleId) {
    console.log(`📦 Carregando módulo: ${moduleId}`);
    
    // 1. Verificar se módulo existe
    const route = window.RoutesUtil.getRoute(moduleId);
    if (!route) {
      console.error(`❌ Módulo não encontrado: ${moduleId}`);
      return;
    }

    // 2. Verificar permissão
    const user = window.AuthSystem.getCurrentUser();
    if (!window.RoutesUtil.canAccess(moduleId, user)) {
      console.error(`❌ Sem permissão para acessar: ${moduleId}`);
      this.showError('Você não tem permissão para acessar este módulo');
      return;
    }

    // 3. Se já é o módulo atual, ignora
    if (this.currentModuleId === moduleId) {
      console.log(`⚠️ Módulo ${moduleId} já está ativo`);
      return;
    }

    try {
      // 4. Cleanup do módulo anterior
      if (this.currentModule && typeof this.currentModule.cleanup === 'function') {
        console.log(`🧹 Limpando módulo anterior: ${this.currentModuleId}`);
        this.currentModule.cleanup();
      }

      // 5. Mostrar loading
      const container = document.getElementById('app-container');
      if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;"><p>⏳ Carregando...</p></div>';
      }

      // 6. Carregar CSS do módulo (otimização Blaze)
      await this.loadModuleCSS(route);

      // 7. Carregar módulo (reutilizar se já foi carregado)
      let moduleExport;
      if (this.loadedModules.has(moduleId)) {
        console.log(`♻️ Reutilizando módulo em cache: ${moduleId}`);
        moduleExport = this.loadedModules.get(moduleId);
      } else {
        console.log(`📥 Importando módulo: ${route.modulePath}`);
        moduleExport = await import(`../../${route.modulePath}`);
        this.loadedModules.set(moduleId, moduleExport);
      }

      // 8. Inicializar módulo
      this.currentModule = moduleExport.default;
      this.currentModuleId = moduleId;

      if (typeof this.currentModule.init !== 'function') {
        throw new Error(`Módulo ${moduleId} não possui método init()`);
      }

      await this.currentModule.init();

      // 9. Atualizar UI (sidebar highlight)
      this.updateSidebarActive(moduleId);

      console.log(`✅ Módulo carregado: ${moduleId}`);

    } catch (error) {
      console.error(`❌ Erro ao carregar módulo ${moduleId}:`, error);
      
      const container = document.getElementById('app-container');
      if (container) {
        container.innerHTML = `
          <div style="color: red; padding: 40px; text-align: center;">
            <h3>❌ Erro ao carregar módulo</h3>
            <p>${error.message}</p>
            <p style="color: #999; font-size: 12px;">Verifique o console para mais detalhes</p>
          </div>
        `;
      }
    }
  },

  /**
   * Carrega CSS do módulo (otimização Blaze)
   * Evita carregar CSS redundante
   */
  async loadModuleCSS(route) {
    if (!route.cssPath) return;
    
    // Verificar se CSS já foi carregado
    if (this.cssCache.has(route.cssPath)) {
      console.log(`♻️ CSS já em cache: ${route.cssPath}`);
      return;
    }

    const linkId = `style-${route.id}`;
    
    // Verificar se link já existe no DOM
    if (document.getElementById(linkId)) {
      console.log(`♻️ CSS já no DOM: ${route.cssPath}`);
      this.cssCache.add(route.cssPath);
      return;
    }

    // Criar link do CSS
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = route.cssPath;
    
    // Remover CSS de outros módulos (otimização de memória)
    this.removeOtherModuleCSS(route.id);
    
    document.head.appendChild(link);
    this.cssCache.add(route.cssPath);
    
    console.log(`📄 CSS carregado: ${route.cssPath}`);
  },

  /**
   * Remove CSS de outros módulos (economia Blaze)
   */
  removeOtherModuleCSS(currentModuleId) {
    // Manter apenas CSS global e do módulo atual
    const keepCSS = ['global'];
    
    document.querySelectorAll('link[id^="style-"]').forEach(link => {
      const moduleId = link.id.replace('style-', '');
      
      if (!keepCSS.includes(moduleId) && moduleId !== currentModuleId) {
        link.remove();
        this.cssCache.delete(link.href);
        console.log(`🧹 CSS removido: ${link.href}`);
      }
    });
  },

  /**
   * Atualiza highlight do link ativo no sidebar
   */
  updateSidebarActive(moduleId) {
    document.querySelectorAll('[data-module]').forEach(link => {
      if (link.dataset.module === moduleId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  },

  /**
   * ===== SISTEMA DE BUSCA GLOBAL (CORRIGIDO) =====
   */
setupGlobalSearch() {
    const searchModal = document.getElementById('globalSearch');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const btnSearch = document.getElementById('btnSearch');
    const btnCloseSearch = document.querySelector('.btn-close-search');

    if (!searchModal || !searchInput) {
      console.warn('⚠️ Elementos de busca não encontrados');
      return;
    }

    // ===== INICIALIZAR SEARCH FECHADO =====
    searchModal.classList.add('hidden');
    searchModal.setAttribute('aria-hidden', 'true');

    // ===== ABRIR BUSCA =====
    const openSearch = () => {
      console.log('🔍 Abrindo busca global');
      searchModal.classList.remove('hidden');
      searchModal.setAttribute('aria-hidden', 'false');
      searchInput.focus();
      searchResults.innerHTML = '';
    };

    // ===== FECHAR BUSCA =====
    const closeSearch = () => {
      console.log('🔍 Fechando busca global');
      searchModal.classList.add('hidden');
      searchModal.setAttribute('aria-hidden', 'true');
      searchInput.value = '';
      searchResults.innerHTML = '';
    };

    // ===== LISTENERS =====

    // Botão de busca
    if (btnSearch) {
      btnSearch.addEventListener('click', openSearch);
    }

    // Botão fechar
    if (btnCloseSearch) {
      btnCloseSearch.addEventListener('click', closeSearch);
    }

    // ESC para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !searchModal.classList.contains('hidden')) {
        closeSearch();
      }
    });

    // Ctrl+/ para abrir busca
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        if (searchModal.classList.contains('hidden')) {
          openSearch();
        } else {
          closeSearch();
        }
      }
    });

    // Fechar ao clicar no overlay
    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) {
        closeSearch();
      }
    });

    // Busca em tempo real
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();

      if (!term) {
        searchResults.innerHTML = '';
        return;
      }

      // Filtrar rotas disponíveis
      const user = window.AuthSystem.getCurrentUser();
      const availableRoutes = window.RoutesUtil.getAvailableRoutes(user);
      
      const results = availableRoutes.filter(route =>
        route.name.toLowerCase().includes(term) ||
        route.description.toLowerCase().includes(term)
      );

      // Renderizar resultados
      if (results.length === 0) {
        searchResults.innerHTML = '<li style="padding: 12px 16px; color: #999;">Nenhum resultado encontrado</li>';
        return;
      }

      searchResults.innerHTML = results.map(route => `
        <li class="search-result-item" data-module="${route.id}">
          <i class="fi ${route.icon}" style="margin-right: 8px;"></i>
          <strong>${route.name}</strong>
          <p style="font-size: 12px; color: #999; margin: 0;">${route.description}</p>
        </li>
      `).join('');

      // Registrar listeners nos resultados
      document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const moduleId = item.dataset.module;
          closeSearch();
          this.loadModule(moduleId);
        });
      });
    });

    console.log('✅ Busca global configurada');
  },

  /**
   * Configura hotkeys globais
   */
  setupHotkeys() {
    document.addEventListener('keydown', (e) => {
      // Alt + Número para navegar módulos
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const routes = Object.values(window.ROUTES)
          .sort((a, b) => a.order - b.order);
        
        const moduleIndex = parseInt(e.key) - 1;
        if (routes[moduleIndex]) {
          this.loadModule(routes[moduleIndex].id);
        }
      }

      // Ctrl/Cmd + L para logout
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        if (confirm('Deseja sair do sistema?')) {
          window.AuthSystem.logout();
        }
      }
    });

    console.log('⌨️ Hotkeys configurados (Alt+[1-9] = módulos, Ctrl+L = logout, Ctrl+/ = busca)');
  },

  /**
   * Mostra mensagem de erro
   */
  showError(message) {
    // Usar toast do sistema se disponível
    if (typeof window.showToast === 'function') {
      window.showToast(message, 'error');
    } else {
      alert(message);
    }
  },

  /**
   * Debug: imprime estado atual
   */
  debug() {
    console.group('🔍 SPA DEBUG');
    console.log('Módulo atual:', this.currentModuleId);
    console.log('Módulos em cache:', Array.from(this.loadedModules.keys()));
    console.log('CSS em cache:', Array.from(this.cssCache));
    console.log('Usuário:', window.AuthSystem.getCurrentUser());
    console.groupEnd();
  }
};

/**
 * =====================================================
 * OTIMIZAÇÕES PARA BLAZE
 * =====================================================
 */

const BlazeOptimizations = {
  /**
   * Cache de queries Firestore
   * Reduz leituras desnecessárias
   */
  queryCache: new Map(),
  queryCacheExpiry: 5 * 60 * 1000, // 5 minutos

  /**
   * Executar query com cache
   */
  async executeQuery(queryKey, queryFn) {
    const now = Date.now();
    const cached = this.queryCache.get(queryKey);

    if (cached && now - cached.timestamp < this.queryCacheExpiry) {
      console.log(`♻️ Query em cache: ${queryKey}`);
      return cached.data;
    }

    console.log(`📊 Executando query: ${queryKey}`);
    const data = await queryFn();
    
    this.queryCache.set(queryKey, {
      data,
      timestamp: now
    });

    return data;
  },

  /**
   * Limpar cache de queries expiradas
   */
  cleanExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.queryCacheExpiry) {
        this.queryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} queries removidas do cache`);
    }
  },

  /**
   * Batch operations para economizar escritas
   */
  batchQueue: [],
  batchTimeout: null,

  async queueWrite(operation) {
    this.batchQueue.push(operation);

    // Se atingiu 10 operações, executar batch
    if (this.batchQueue.length >= 10) {
      await this.executeBatch();
      return;
    }

    // Se não há timeout, criar um
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.executeBatch();
      }, 5000); // Aguardar 5 segundos por mais operações
    }
  },

  async executeBatch() {
    if (this.batchQueue.length === 0) return;

    const operations = this.batchQueue.splice(0);
    clearTimeout(this.batchTimeout);
    this.batchTimeout = null;

    console.log(`📦 Executando batch de ${operations.length} operações`);

    try {
      // Executar operações em paralelo
      await Promise.all(operations.map(op => op()));
      console.log(`✅ Batch concluído`);
    } catch (error) {
      console.error(`❌ Erro no batch:`, error);
      // Re-enfileirar operações falhadas
      this.batchQueue.unshift(...operations);
    }
  }
};

/**
 * ===== FUNÇÃO GLOBAL showToast (se não existir) =====
 */
if (typeof window.showToast === 'undefined') {
  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fi-rr-check-circle',
      error: 'fi-rr-cross-circle',
      warning: 'fi-rr-triangle-warning',
      info: 'fi-rr-info'
    };

    toast.innerHTML = `
      <i class="fi ${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode === container) {
          container.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };
}

/**
 * =====================================================
 * INICIALIZAÇÃO
 * =====================================================
 */

// Inicializar SPA quando documento está pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    SPA.init();
    
    // Limpar cache a cada 10 minutos
    setInterval(() => {
      BlazeOptimizations.cleanExpiredCache();
    }, 10 * 60 * 1000);
  });
} else {
  SPA.init();
}

// Exposer globalmente
window.SPA = SPA;
window.BlazeOptimizations = BlazeOptimizations;

console.log('✅ main.js carregado - SPA pronto para uso');
console.log('💡 Execute: window.SPA.debug() para ver estado atual');
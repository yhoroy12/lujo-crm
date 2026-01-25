/**
 * =====================================================
 * ROUTES.JS - Mapa de Rotas e Módulos da SPA
 * Define todos os módulos disponíveis, ícones, permissões
 * =====================================================
 */

window.ROUTES = {
  // ===== MÓDULO: ATENDIMENTO =====
  atendimento: {
    id: 'atendimento',
    name: 'Atendimento',
    icon: 'fi-rr-headset',
    color: '#3498db',
    description: 'Sistema de atendimento ao cliente',
    permission: 'atendimento.view',
    modulePath: 'js/modules/atendimento/atendimento.module.js',
    cssPath: '../public/css/atendimento.css',
    roles: ['CEO', 'GERENTE_MASTER', 'GERENTE', 'SUPERVISOR', 'OPERADOR'],
    order: 1
  },

  // ===== MÓDULO: CONTEÚDO =====
  conteudo: {
    id: 'conteudo',
    name: 'Conteúdo',
    icon: 'fi-rr-document',
    color: '#9b59b6',
    description: 'Gerenciamento de conteúdo',
    permission: 'conteudo.view',
    modulePath: 'js/modules/conteudo/conteudo.module.js',
    cssPath: '../public/css/conteudo.css',
    roles: ['CEO', 'GERENTE_MASTER', 'GERENTE'],
    order: 2
  },

  // ===== MÓDULO: COPYRIGHT =====
  copyright: {
    id: 'copyright',
    name: 'Copyright',
    icon: 'fi-rr-shield-check',
    color: '#e74c3c',
    description: 'Gerenciamento de direitos autorais',
    permission: 'copyright.view',
    modulePath: 'js/modules/copyright/copyright.module.js',
    cssPath: '../public/css/copyright.css',
    roles: ['CEO', 'GERENTE_MASTER', 'GERENTE', 'SUPERVISOR'],
    order: 3
  },

  // ===== MÓDULO: FINANCEIRO =====
  financeiro: {
    id: 'financeiro',
    name: 'Financeiro',
    icon: 'fi-rr-dollar',
    color: '#2ecc71',
    description: 'Gestão financeira e pagamentos',
    permission: 'financeiro.view',
    modulePath: 'js/modules/financeiro/financeiro.module.js',
    cssPath: '../public/css/financeiro.css',
    roles: ['CEO', 'GERENTE_MASTER', 'GERENTE'],
    order: 4
  },

  // ===== MÓDULO: TÉCNICO =====
  tecnico: {
    id: 'tecnico',
    name: 'Suporte Técnico',
    icon: 'fi-rr-tools',
    color: '#f39c12',
    description: 'Suporte técnico e issues',
    permission: 'tecnico.view',
    modulePath: 'js/modules/tecnico/tecnico.module.js',
    cssPath: '../public/css/tecnico.css',
    roles: ['CEO', 'GERENTE_MASTER', 'GERENTE', 'SUPERVISOR', 'OPERADOR'],
    order: 5
  },

  // ===== MÓDULO: MARKETING =====
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    icon: 'fi-rr-megaphone',
    color: '#1abc9c',
    description: 'Campanhas e estratégias de marketing',
    permission: 'marketing.view',
    modulePath: 'js/modules/marketing/marketing.module.js',
    cssPath: '../public/css/marketing.css',
    roles: ['CEO', 'GERENTE_MASTER'],
    order: 6
  },

  // ===== MÓDULO: GESTÃO/GERÊNCIA =====
  gestor: {
    id: 'gestor',
    name: 'Gestão',
    icon: 'fi-rr-chart-line',
    color: '#34495e',
    description: 'Controle e indicadores de gestão',
    permission: 'gestor.view',
    modulePath: 'js/modules/gestor/gestor.module.js',
    cssPath: '../public/css/gerencia/gerencia.css',
    roles: ['CEO', 'GERENTE_MASTER', 'GERENTE'],
    order: 7
  },

  // ===== MÓDULO: RELATÓRIOS =====
  relatorios: {
    id: 'relatorios',
    name: 'Relatórios',
    icon: 'fi-rr-briefcase',
    color: '#16a085',
    description: 'Relatórios e análises',
    permission: 'relatorios.view',
    modulePath: 'js/modules/relatorios/relatorios.module.js',
    cssPath: '../public/css/relatorios.css',
    roles: ['CEO', 'GERENTE_MASTER', 'GERENTE', 'SUPERVISOR'],
    order: 8
  },

  // ===== MÓDULO: USUÁRIOS E PERMISSÕES (ADMIN) =====
  'usuarios-permissoes': {
    id: 'usuarios-permissoes',
    name: 'Administração',
    icon: 'fi-rr-user-lock',
    color: '#c0392b',
    description: 'Gerenciamento de usuários e permissões',
    permission: 'admin.view',
    modulePath: 'js/modules/usuarios-permissoes/usuarios-permissoes.module.js',
    cssPath: '../public/css/admin.css',
    roles: ['CEO', 'GERENTE_MASTER', 'ADMIN'],
    order: 99
  }
};

/**
 * =====================================================
 * UTILIDADES DE ROTAS
 * =====================================================
 */

window.RoutesUtil = {
  /**
   * Retorna todas as rotas disponíveis para um usuário
   * Filtra por permissões do usuário
   */
  getAvailableRoutes(user) {
    if (!user) {
      console.warn('⚠️ Usuário não fornecido');
      return [];
    }

    return Object.values(window.ROUTES)
      .filter(route => {
        // Verificar permissão
        const hasPermission = window.AuthSystem.hasPermission(route.permission);
        
        // Verificar role
        const hasRole = route.roles.includes(user.role);
        
        return hasPermission && hasRole;
      })
      .sort((a, b) => a.order - b.order);
  },

  /**
   * Retorna uma rota específica
   */
  getRoute(routeId) {
    return window.ROUTES[routeId] || null;
  },

  /**
   * Valida se usuário pode acessar uma rota
   */
  canAccess(routeId, user) {
    const route = this.getRoute(routeId);
    if (!route) return false;

    const hasPermission = window.AuthSystem.hasPermission(route.permission);
    const hasRole = route.roles.includes(user.role);

    return hasPermission && hasRole;
  },

  /**
   * Retorna a próxima rota disponível
   */
  getNextRoute(currentRouteId, user) {
    const availableRoutes = this.getAvailableRoutes(user);
    const currentIndex = availableRoutes.findIndex(r => r.id === currentRouteId);
    
    if (currentIndex === -1 || currentIndex === availableRoutes.length - 1) {
      return availableRoutes[0] || null;
    }
    
    return availableRoutes[currentIndex + 1];
  },

  /**
   * Retorna a rota anterior disponível
   */
  getPreviousRoute(currentRouteId, user) {
    const availableRoutes = this.getAvailableRoutes(user);
    const currentIndex = availableRoutes.findIndex(r => r.id === currentRouteId);
    
    if (currentIndex <= 0) {
      return availableRoutes[availableRoutes.length - 1] || null;
    }
    
    return availableRoutes[currentIndex - 1];
  },

  /**
   * Gera HTML para sidebar baseado em rotas disponíveis
   */
  generateSidebarHTML(user) {
    const routes = this.getAvailableRoutes(user);
    
    return routes.map(route => `
      <a href="#" class="sidebar-link" data-module="${route.id}" 
         title="${route.description}" data-permission="${route.permission}">
        <i class="fi ${route.icon}"></i>
        <span class="link-label">${route.name}</span>
      </a>
    `).join('');
  },

  /**
   * Debug: imprime todas as rotas
   */
  debug() {
    console.group('📍 ROUTES DEBUG');
    console.table(Object.values(window.ROUTES).map(r => ({
      ID: r.id,
      Nome: r.name,
      Permissão: r.permission,
      Roles: r.roles.join(', '),
      Ordem: r.order
    })));
    console.groupEnd();
  }
};

/**
 * =====================================================
 * INICIALIZAÇÃO
 * =====================================================
 */

console.log('✅ Routes.js carregado com sucesso');
console.log(`📍 ${Object.keys(window.ROUTES).length} rotas disponíveis`);

// Debug em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('💡 Execute: window.RoutesUtil.debug() para ver todas as rotas');
}
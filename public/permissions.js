// ==================== PERMISSIONS.JS - SISTEMA DE PERMISSÕES GRANULAR ====================

/* 
 * LUJO NETWORK CRM - SISTEMA DE PERMISSÕES
 * Arquitetura baseada em RBAC (Role-Based Access Control)
 * Preparado para migração futura para Firebase
 */

// ===== DEFINIÇÃO DE TODAS AS PERMISSÕES DO SISTEMA =====
const PERMISSIONS = {
  // MÓDULO: ATENDIMENTO
  ATEND_VIEW: "atendimento.view",
  ATEND_CREATE: "atendimento.create",
  ATEND_UPDATE: "atendimento.update",
  ATEND_DELETE: "atendimento.delete",
  ATEND_ASSIGN: "atendimento.assign",
  ATEND_CLOSE: "atendimento.close",
  ATEND_REOPEN: "atendimento.reopen",
  ATEND_EXPORT: "atendimento.export",

  // MÓDULO: CHAT
  CHAT_VIEW: "chat.view",
  CHAT_SEND: "chat.send",
  CHAT_HISTORY: "chat.history",

  // MÓDULO: GERÊNCIA
  GERENCIA_VIEW: "gerencia.view",
  GERENCIA_ASSIGN_TASKS: "gerencia.assign_tasks",
  GERENCIA_VIEW_METRICS: "gerencia.view_metrics",
  GERENCIA_MANAGE_TEAM: "gerencia.manage_team",

  // MÓDULO: RELATÓRIOS
  RELAT_VIEW: "relatorios.view",
  RELAT_EXPORT: "relatorios.export",
  RELAT_VIEW_FINANCIAL: "relatorios.view_financial",
  RELAT_VIEW_ALL: "relatorios.view_all",

  // MÓDULO: CONTEÚDO
  CONT_VIEW: "conteudo.view",
  CONT_REQUEST: "conteudo.request",
  CONT_UPDATE_STATUS: "conteudo.update_status",
  CONT_APPROVE: "conteudo.approve",
  CONT_PRODUCTIVITY: "conteudo.productivity",

  // MÓDULO: COPYRIGHT
  COPYR_VIEW: "copyright.view",
  COPYR_CREATE_ACCOUNT: "copyright.create_account",
  COPYR_APPROVE_ACCOUNT: "copyright.approve_account",
  COPYR_VIEW_CONTRACTS: "copyright.view_contracts",
  COPYR_MANAGE_STRIKES: "copyright.manage_strikes",
  COPYR_MANAGE_TAKEDOWNS: "copyright.manage_takedowns",
  COPYR_SEND_NOTIFICATIONS: "copyright.send_notifications",

  // MÓDULO: FINANCEIRO
  FIN_VIEW: "financeiro.view",
  FIN_VIEW_SUMMARY: "financeiro.view_summary",
  FIN_CREATE: "financeiro.create",
  FIN_UPDATE: "financeiro.update",
  FIN_APPROVE: "financeiro.approve",
  FIN_EXECUTE_PAYMENT: "financeiro.execute_payment",
  FIN_EXPORT: "financeiro.export",

  // MÓDULO: MARKETING
  MKT_VIEW: "marketing.view",
  MKT_CREATE_CAMPAIGN: "marketing.create_campaign",
  MKT_APPROVE: "marketing.approve",
  MKT_ANALYTICS: "marketing.analytics",

  // MÓDULO: TÉCNICO
  TEC_VIEW: "tecnico.view",
  TEC_CREATE_TICKET: "tecnico.create_ticket",
  TEC_RESOLVE: "tecnico.resolve",

  // MÓDULO: USUÁRIOS (ADMIN)
  USER_VIEW: "usuarios.view",
  USER_CREATE: "usuarios.create",
  USER_UPDATE: "usuarios.update",
  USER_DELETE: "usuarios.delete",
  USER_MANAGE_ROLES: "usuarios.manage_roles",

  // MÓDULO: CONFIGURAÇÕES (ADMIN)
  CONFIG_VIEW: "configuracoes.view",
  CONFIG_UPDATE: "configuracoes.update",
  CONFIG_SYSTEM: "configuracoes.system",

  // PERMISSÕES ESPECIAIS
  SUPER_ADMIN: "system.super_admin", // Acesso total irrestrito
  VIEW_ALL_DATA: "system.view_all_data", // CEO visualiza tudo
  AUDIT_LOGS: "system.audit_logs" // Ver logs de auditoria
};

// ===== ROLES (CARGOS/PERFIS) =====
const ROLES = {
  // OPERADORES
  ATENDENTE: {
    name: "Atendente",
    description: "Atendimento ao cliente via WhatsApp, e-mail e telefone",
    permissions: [
      PERMISSIONS.ATEND_VIEW,
      PERMISSIONS.ATEND_CREATE,
      PERMISSIONS.ATEND_UPDATE,
      PERMISSIONS.ATEND_CLOSE,
      PERMISSIONS.CHAT_VIEW,
      PERMISSIONS.CHAT_SEND,
      PERMISSIONS.CHAT_HISTORY,
      PERMISSIONS.CONT_REQUEST,
      PERMISSIONS.FIN_VIEW_SUMMARY,
      PERMISSIONS.COPYR_VIEW
    ]
  },

  COPYRIGHT: {
    name: "Copyright",
    description: "Análise legal, direitos autorais e conflitos de conteúdo",
    permissions: [
      PERMISSIONS.ATEND_VIEW,
      PERMISSIONS.COPYR_VIEW,
      PERMISSIONS.COPYR_CREATE_ACCOUNT,
      PERMISSIONS.COPYR_APPROVE_ACCOUNT,
      PERMISSIONS.COPYR_VIEW_CONTRACTS,
      PERMISSIONS.COPYR_MANAGE_STRIKES,
      PERMISSIONS.COPYR_MANAGE_TAKEDOWNS,
      PERMISSIONS.COPYR_SEND_NOTIFICATIONS,
      PERMISSIONS.CONT_VIEW,
      PERMISSIONS.TEC_VIEW,
      PERMISSIONS.TEC_CREATE_TICKET
    ]
  },

  CONTEUDO: {
    name: "Conteúdo",
    description: "Gestão de solicitações e produtividade de conteúdo",
    permissions: [
      PERMISSIONS.CONT_VIEW,
      PERMISSIONS.CONT_REQUEST,
      PERMISSIONS.CONT_UPDATE_STATUS,
      PERMISSIONS.CONT_PRODUCTIVITY,
      PERMISSIONS.ATEND_VIEW
    ]
  },

  // SUPERVISÃO
  SUPERVISOR: {
    name: "Supervisor",
    description: "Lidera operadores, distribui tarefas e acompanha métricas",
    permissions: [
      // Herda todas do Atendente
      ...ROLES.ATENDENTE?.permissions || [],
      PERMISSIONS.ATEND_ASSIGN,
      PERMISSIONS.ATEND_REOPEN,
      PERMISSIONS.ATEND_EXPORT,
      PERMISSIONS.GERENCIA_VIEW,
      PERMISSIONS.GERENCIA_ASSIGN_TASKS,
      PERMISSIONS.GERENCIA_VIEW_METRICS,
      PERMISSIONS.RELAT_VIEW,
      PERMISSIONS.RELAT_EXPORT,
      PERMISSIONS.FIN_VIEW
    ]
  },

  // GERÊNCIA
  GERENTE: {
    name: "Gerente",
    description: "Gestão estratégica e operacional da área",
    permissions: [
      // Herda todas do Supervisor
      ...ROLES.SUPERVISOR?.permissions || [],
      PERMISSIONS.GERENCIA_MANAGE_TEAM,
      PERMISSIONS.RELAT_VIEW_FINANCIAL,
      PERMISSIONS.RELAT_VIEW_ALL,
      PERMISSIONS.FIN_CREATE,
      PERMISSIONS.FIN_UPDATE,
      PERMISSIONS.FIN_APPROVE,
      PERMISSIONS.CONT_APPROVE,
      PERMISSIONS.MKT_VIEW,
      PERMISSIONS.MKT_CREATE_CAMPAIGN,
      PERMISSIONS.MKT_APPROVE
    ]
  },

  // CEO
  CEO: {
    name: "CEO",
    description: "Visão estratégica total - somente visualização",
    permissions: [
      PERMISSIONS.VIEW_ALL_DATA,
      PERMISSIONS.RELAT_VIEW_ALL,
      PERMISSIONS.RELAT_VIEW_FINANCIAL,
      PERMISSIONS.GERENCIA_VIEW,
      PERMISSIONS.GERENCIA_VIEW_METRICS,
      PERMISSIONS.FIN_VIEW,
      PERMISSIONS.MKT_ANALYTICS,
      PERMISSIONS.AUDIT_LOGS
    ]
  },

  // ADMINISTRADOR
  ADMIN: {
    name: "Administrador",
    description: "Gestão total do sistema",
    permissions: [
      PERMISSIONS.SUPER_ADMIN, // Acesso total
      ...Object.values(PERMISSIONS) // Todas as permissões
    ]
  }
};

// ===== BANCO DE DADOS DE USUÁRIOS (SIMULADO) =====
let USERS_DB = {
  ana: {
    password: '123456',
    name: 'Ana Silva',
    email: 'ana@lujonetwork.com',
    role: 'ATENDENTE',
    active: true,
    createdAt: '2025-01-01',
    customPermissions: [] // Permissões adicionais além do role
  },
  carlos: {
    password: '123456',
    name: 'Carlos Souza',
    email: 'carlos@lujonetwork.com',
    role: 'SUPERVISOR',
    active: true,
    createdAt: '2025-01-01',
    customPermissions: []
  },
  marina: {
    password: '123456',
    name: 'Marina Lopes',
    email: 'marina@lujonetwork.com',
    role: 'GERENTE',
    active: true,
    createdAt: '2025-01-01',
    customPermissions: []
  },
  juan: {
    password: '123456',
    name: 'Juan Copyright',
    email: 'juan@lujonetwork.com',
    role: 'COPYRIGHT',
    active: true,
    createdAt: '2025-01-01',
    customPermissions: []
  },
  jeff: {
    password: '123456',
    name: 'Jeff CEO',
    email: 'jeff@lujonetwork.com',
    role: 'CEO',
    active: true,
    createdAt: '2025-01-01',
    customPermissions: []
  },
  admin: {
    password: 'admin123',
    name: 'Administrador',
    email: 'admin@lujonetwork.com',
    role: 'ADMIN',
    active: true,
    createdAt: '2025-01-01',
    customPermissions: []
  }
};

// ===== FUNÇÕES DE AUTENTICAÇÃO =====

function login(username, password) {
  const user = USERS_DB[username];
  
  if (!user || user.password !== password) {
    return { success: false, error: 'Usuário ou senha inválidos' };
  }

  if (!user.active) {
    return { success: false, error: 'Usuário inativo' };
  }

  const sessionData = {
    username,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: getUserPermissions(username),
    loginTime: new Date().toISOString()
  };

  sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
  
  return { success: true, user: sessionData };
}

function logout() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

function getCurrentUser() {
  const data = sessionStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

function isAuthenticated() {
  return getCurrentUser() !== null;
}

// ===== FUNÇÕES DE AUTORIZAÇÃO =====

function getUserPermissions(username) {
  const user = USERS_DB[username];
  if (!user) return [];

  const rolePermissions = ROLES[user.role]?.permissions || [];
  const customPermissions = user.customPermissions || [];

  // Se é ADMIN, retorna todas
  if (user.role === 'ADMIN') {
    return Object.values(PERMISSIONS);
  }

  // Combina permissões do role + customizadas
  return [...new Set([...rolePermissions, ...customPermissions])];
}

function hasPermission(permission) {
  const user = getCurrentUser();
  if (!user) return false;

  // Super Admin tem tudo
  if (user.permissions.includes(PERMISSIONS.SUPER_ADMIN)) {
    return true;
  }

  return user.permissions.includes(permission);
}

function canAccessModule(module) {
  const moduleMap = {
    'atendimento': PERMISSIONS.ATEND_VIEW,
    'gerencia': PERMISSIONS.GERENCIA_VIEW,
    'relatorios': PERMISSIONS.RELAT_VIEW,
    'conteudo': PERMISSIONS.CONT_VIEW,
    'copyright': PERMISSIONS.COPYR_VIEW,
    'financeiro': PERMISSIONS.FIN_VIEW,
    'marketing': PERMISSIONS.MKT_VIEW,
    'tecnico': PERMISSIONS.TEC_VIEW,
    'usuarios': PERMISSIONS.USER_VIEW,
    'configuracoes': PERMISSIONS.CONFIG_VIEW
  };

  const requiredPermission = moduleMap[module];
  return requiredPermission ? hasPermission(requiredPermission) : false;
}

function can(action) {
  return hasPermission(action);
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function requirePermission(permission) {
  if (!requireAuth()) return false;
  
  if (!hasPermission(permission)) {
    showAccessDenied();
    return false;
  }
  return true;
}

function showAccessDenied() {
  const content = document.getElementById('content');
  if (content) {
    content.innerHTML = `
      <div class="card" style="text-align: center; padding: 60px 40px;">
        <i class="fi fi-rr-lock" style="font-size: 64px; color: #ccc; margin-bottom: 20px;"></i>
        <h2 style="color: #f44336; margin-bottom: 15px;">🔒 Acesso Negado</h2>
        <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
          Você não tem permissão para acessar este recurso.
        </p>
        <p style="color: #999; font-size: 14px;">
          Entre em contato com o administrador do sistema.
        </p>
        <button class="btn btn-primary" onclick="voltarMain()" style="margin-top: 30px;">
          ← Voltar ao Início
        </button>
      </div>
    `;
  }
}

// ===== FUNÇÕES PARA ADMINISTRAÇÃO =====

function getAllUsers() {
  return Object.entries(USERS_DB).map(([username, data]) => ({
    username,
    ...data
  }));
}

function getAllRoles() {
  return Object.entries(ROLES).map(([key, data]) => ({
    key,
    ...data
  }));
}

function getAllPermissions() {
  return Object.entries(PERMISSIONS).map(([key, value]) => ({
    key,
    value,
    module: value.split('.')[0],
    action: value.split('.')[1]
  }));
}

function createUser(username, userData) {
  if (USERS_DB[username]) {
    return { success: false, error: 'Usuário já existe' };
  }

  USERS_DB[username] = {
    ...userData,
    active: true,
    createdAt: new Date().toISOString(),
    customPermissions: userData.customPermissions || []
  };

  saveUsersDB();
  return { success: true };
}

function updateUser(username, updates) {
  if (!USERS_DB[username]) {
    return { success: false, error: 'Usuário não encontrado' };
  }

  USERS_DB[username] = {
    ...USERS_DB[username],
    ...updates
  };

  saveUsersDB();
  return { success: true };
}

function deleteUser(username) {
  if (!USERS_DB[username]) {
    return { success: false, error: 'Usuário não encontrado' };
  }

  delete USERS_DB[username];
  saveUsersDB();
  return { success: true };
}

function updateRolePermissions(roleKey, permissions) {
  if (!ROLES[roleKey]) {
    return { success: false, error: 'Role não encontrada' };
  }

  ROLES[roleKey].permissions = permissions;
  saveRolesDB();
  return { success: true };
}

// ===== PERSISTÊNCIA LOCAL (SIMULA BANCO) =====

function saveUsersDB() {
  localStorage.setItem('LUJO_USERS_DB', JSON.stringify(USERS_DB));
}

function loadUsersDB() {
  const data = localStorage.getItem('LUJO_USERS_DB');
  if (data) {
    USERS_DB = JSON.parse(data);
  }
}

function saveRolesDB() {
  localStorage.setItem('LUJO_ROLES_DB', JSON.stringify(ROLES));
}

function loadRolesDB() {
  const data = localStorage.getItem('LUJO_ROLES_DB');
  if (data) {
    Object.assign(ROLES, JSON.parse(data));
  }
}

// Carregar dados salvos ao iniciar
loadUsersDB();
loadRolesDB();

// ===== HELPERS =====

function getRoleLabel(roleKey) {
  return ROLES[roleKey]?.name || roleKey;
}

function getModuleFromPermission(permission) {
  return permission.split('.')[0];
}

function getActionFromPermission(permission) {
  return permission.split('.')[1];
}

// ===== EXPORTAR PARA USO GLOBAL =====
window.PermissionsSystem = {
  PERMISSIONS,
  ROLES,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  hasPermission,
  canAccessModule,
  can,
  requireAuth,
  requirePermission,
  getAllUsers,
  getAllRoles,
  getAllPermissions,
  createUser,
  updateUser,
  deleteUser,
  updateRolePermissions,
  getRoleLabel
};
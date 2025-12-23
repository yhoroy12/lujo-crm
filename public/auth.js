// ==================== AUTH.JS - LUJO CRM (PERMISSÕES GRANULARES) ====================

// ===== DEFINIÇÃO DE PERMISSÕES DO SISTEMA =====
const PERMISSIONS = {
  // Sistema
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  USER_MANAGE: "USER_MANAGE",

  // Atendimento
  ATEND_VIEW: "ATEND_VIEW",
  ATEND_CREATE: "ATEND_CREATE",
  ATEND_ASSIGN: "ATEND_ASSIGN",

  // Supervisão / Gerência
  SUP_VIEW: "SUP_VIEW",
  SUP_REPORTS: "SUP_REPORTS",
  SUP_MANAGE_TEAM: "SUP_MANAGE_TEAM",

  // Copyright
  COPYR_VIEW: "COPYR_VIEW",
  COPYR_CREATE_ACCOUNT: "COPYR_CREATE_ACCOUNT",
  COPYR_APPROVE: "COPYR_APPROVE",
  COPYR_STRIKE: "COPYR_STRIKE",
  COPYR_CONTRACT: "COPYR_CONTRACT",

  // Conteúdo (produtividade)
  CONT_VIEW: "CONT_VIEW",
  CONT_REQUEST: "CONT_REQUEST",
  CONT_PRODUCTIVITY: "CONT_PRODUCTIVITY",

  // Financeiro
  FIN_VIEW: "FIN_VIEW",
  FIN_APPROVE: "FIN_APPROVE",

  // Marketing
  MKT_VIEW: "MKT_VIEW"
};

// ===== ROLES BASE (EDITÁVEIS PELO ADMIN NO FUTURO) =====
const ROLES = {
  atendente: [
    PERMISSIONS.ATEND_VIEW,
    PERMISSIONS.ATEND_CREATE,
    PERMISSIONS.CONT_REQUEST
  ],

  supervisor: [
    PERMISSIONS.ATEND_VIEW,
    PERMISSIONS.ATEND_ASSIGN,
    PERMISSIONS.SUP_VIEW,
    PERMISSIONS.SUP_REPORTS,
    PERMISSIONS.CONT_PRODUCTIVITY
  ],

  gerente: [
    PERMISSIONS.ATEND_VIEW,
    PERMISSIONS.SUP_VIEW,
    PERMISSIONS.SUP_MANAGE_TEAM,
    PERMISSIONS.SUP_REPORTS,
    PERMISSIONS.FIN_VIEW,
    PERMISSIONS.MKT_VIEW
  ],

  copyright: [
    PERMISSIONS.COPYR_VIEW,
    PERMISSIONS.COPYR_CREATE_ACCOUNT,
    PERMISSIONS.COPYR_APPROVE,
    PERMISSIONS.COPYR_STRIKE,
    PERMISSIONS.COPYR_CONTRACT
  ],

  admin: Object.values(PERMISSIONS) // acesso total
};

// ===== USUÁRIOS (SIMULADO - FUTURO FIREBASE) =====
const users = {
  ana: {
    password: "123456",
    name: "Ana Silva",
    role: "atendente"
  },
  carlos: {
    password: "123456",
    name: "Carlos Souza",
    role: "supervisor"
  },
  marina: {
    password: "123456",
    name: "Marina Lopes",
    role: "gerente"
  },
  juan: {
    password: "123456",
    name: "Juan Copyright",
    role: "copyright"
  },
  admin: {
    password: "123456",
    name: "Administrador",
    role: "admin"
  }
};

// ===== LOGIN =====
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (!users[username] || users[username].password !== password) {
    alert("Usuário ou senha inválidos");
    return;
  }

  const user = users[username];

  const authUser = {
    username,
    name: user.name,
    role: user.role,
    permissions: [...ROLES[user.role]]
  };

  sessionStorage.setItem("authUser", JSON.stringify(authUser));
  window.location.href = "main.html";
});

// ===== HELPERS =====
function getAuthUser() {
  const data = sessionStorage.getItem("authUser");
  return data ? JSON.parse(data) : null;
}

function isAuthenticated() {
  return !!getAuthUser();
}

function hasPermission(permission) {
  const user = getAuthUser();
  if (!user) return false;

  if (user.permissions.includes(PERMISSIONS.SYSTEM_ADMIN)) return true;
  return user.permissions.includes(permission);
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function requirePermission(permission) {
  if (!requireAuth()) return false;

  if (!hasPermission(permission)) {
    alert("Você não tem permissão para esta ação.");
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.removeItem("authUser");
  window.location.href = "login.html";
}

// ===== APLICAR PERMISSÕES NO DOM =====
function applyPermissions() {
  document.querySelectorAll("[data-permission]").forEach(el => {
    const perm = el.dataset.permission;
    if (!hasPermission(perm)) {
      el.style.display = "none";
    }
  });
}

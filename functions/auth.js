// ==================== AUTH.JS - Sistema de Autenticação CORRIGIDO ====================

// ===== ELEMENTOS DO DOM =====
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loading = document.getElementById('loading');

// ===== PREVENIR LOOP =====
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('login.html')) {
    initLoginPage();
    return;
  }
  
  const savedUser = sessionStorage.getItem('currentUser');
  if (savedUser && window.location.pathname.includes('Main.html')) {
    return;
  }
});

// ===== INICIALIZAR PÁGINA DE LOGIN =====
function initLoginPage() {
  // Event listener para profile chips
  document.querySelectorAll('.profile-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (usernameInput && passwordInput) {
        usernameInput.value = chip.dataset.user;
        passwordInput.value = chip.dataset.pass;
      }
    });
  });

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }
}

// ===== LOGIN =====
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Limpar erros
    document.getElementById('usernameError')?.classList.remove('show');
    document.getElementById('passwordError')?.classList.remove('show');
    usernameInput.classList.remove('error');
    passwordInput.classList.remove('error');

    // Validar com PermissionsSystem
    if (!window.PermissionsSystem) {
      alert('Sistema de permissões não carregado. Recarregue a página.');
      return;
    }

    const result = window.PermissionsSystem.login(username, password);
    
    if (!result.success) {
      if (result.error.includes('usuário') || result.error.includes('Usuário')) {
        usernameInput.classList.add('error');
        document.getElementById('usernameError')?.classList.add('show');
      } else {
        passwordInput.classList.add('error');
        document.getElementById('passwordError')?.classList.add('show');
      }
      return;
    }

    // Login bem-sucedido
    loginBtn.disabled = true;
    if (loading) loading.classList.add('show');

    setTimeout(() => {
      window.location.href = 'Main.html';
    }, 800);
  });
}

// ===== FUNÇÕES AUXILIARES =====

function isAuthenticated() {
  return window.PermissionsSystem?.isAuthenticated() || false;
}

function getCurrentUser() {
  return window.PermissionsSystem?.getCurrentUser() || null;
}

function hasPermission(permission) {
  return window.PermissionsSystem?.hasPermission(permission) || false;
}

function hasModuleAccess(module) {
  return window.PermissionsSystem?.hasModuleAccess(module) || false;
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
    alert('Você não tem permissão para esta ação.');
    return false;
  }
  return true;
}

function logout() {
  if (window.PermissionsSystem) {
    window.PermissionsSystem.logout();
  } else {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
}

function getRoleLabel(role) {
  const labels = {
    ATENDENTE: 'Atendente',
    SUPERVISOR: 'Supervisor',
    GERENTE: 'Gerente',
    COPYRIGHT: 'Copyright',
    CEO: 'CEO',
    ADMIN: 'Administrador'
  };
  return labels[role] || role;
}

console.log("✅ Sistema de Autenticação carregado");
// ==================== AUTH.JS - Sistema de Autenticação CORRIGIDO ====================

// ===== BANCO DE DADOS SIMULADO =====
const users = {
  ana: {
    password: '123456',
    name: 'Ana Silva',
    role: 'atendente',
    permissions: ['atendimento']
  },
  carlos: {
    password: '123456',
    name: 'Carlos Souza',
    role: 'supervisor',
    permissions: ['atendimento', 'gerencia', 'relatorios']
  },
  marina: {
    password: '123456',
    name: 'Marina Lopes',
    role: 'gerente',
    permissions: ['atendimento', 'gerencia', 'relatorios', 'conteudo', 'marketing']
  },
  juan: {
    password: '123456',
    name: 'Juan Copyright',
    role: 'copyright',
    permissions: ['atendimento', 'conteudo']
  },
  admin: {
    password: '123456',
    name: 'Administrador',
    role: 'admin',
    permissions: ['atendimento', 'gerencia', 'relatorios', 'conteudo', 'marketing', 'financeiro', 'tecnico']
  }
};

// ===== ELEMENTOS DO DOM =====
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loading = document.getElementById('loading');

// ===== PREVENIR LOOP - NÃO REDIRECIONAR SE JÁ ESTIVER NA PÁGINA DE LOGIN =====
window.addEventListener('DOMContentLoaded', () => {
  // Se estiver na página login.html, não fazer nada
  if (window.location.pathname.includes('login.html')) {
    return;
  }
  
  // Se estiver em outra página, verificar autenticação
  const savedUser = sessionStorage.getItem('currentUser');
  if (savedUser && window.location.pathname.includes('Main.html')) {
    // Usuário está logado e na página correta, OK
    return;
  }
});

// ===== LOGIN =====
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    // Limpar erros anteriores
    document.getElementById('usernameError')?.classList.remove('show');
    document.getElementById('passwordError')?.classList.remove('show');
    usernameInput.classList.remove('error');
    passwordInput.classList.remove('error');

    // Validar usuário
    if (!users[username]) {
      usernameInput.classList.add('error');
      document.getElementById('usernameError')?.classList.add('show');
      return;
    }

    // Validar senha
    if (users[username].password !== password) {
      passwordInput.classList.add('error');
      document.getElementById('passwordError')?.classList.add('show');
      return;
    }

    // Login bem-sucedido
    loginBtn.disabled = true;
    if (loading) loading.classList.add('show');

    setTimeout(() => {
      const user = users[username];
      
      // Salvar sessão
      sessionStorage.setItem('currentUser', JSON.stringify({
        username,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      }));

      // Redirecionar para o sistema principal
      window.location.href = 'Main.html';
    }, 800);
  });
}

// ===== PREENCHER COM PERFIL DE TESTE =====
document.querySelectorAll('.profile-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (usernameInput && passwordInput) {
      usernameInput.value = chip.dataset.user;
      passwordInput.value = chip.dataset.pass;
    }
  });
});

// ===== FUNÇÕES AUXILIARES PARA INTEGRAÇÃO COM O SISTEMA =====

// Verificar se usuário está logado
function isAuthenticated() {
  return sessionStorage.getItem('currentUser') !== null;
}

// Obter usuário atual
function getCurrentUser() {
  const user = sessionStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

// Verificar se usuário tem permissão para acessar um módulo
function hasPermission(module) {
  const user = getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(module);
}

// Redirecionar para login se não estiver autenticado
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Verificar permissão e redirecionar se não tiver acesso
function requirePermission(module) {
  if (!requireAuth()) return false;
  
  if (!hasPermission(module)) {
    alert('Você não tem permissão para acessar este módulo.');
    return false;
  }
  return true;
}

// Logout
function logout() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// Helper: Label do perfil
function getRoleLabel(role) {
  const labels = {
    atendente: 'Atendente',
    supervisor: 'Supervisor',
    gerente: 'Gerente',
    copyright: 'Copyright',
    admin: 'Administrador'
  };
  return labels[role] || role;
}
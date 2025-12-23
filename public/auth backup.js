// ==================== AUTH.JS - Sistema de Autenticação ====================

// ===== BANCO DE DADOS SIMULADO =====
const users = {
  atendente: {
    password: '123456',
    name: 'Ana Silva',
    role: 'atendente',
    permissions: ['atendimento', 'chat']
  },
  supervisor: {
    password: '123456',
    name: 'Carlos Souza',
    role: 'supervisor',
    permissions: ['atendimento', 'chat', 'gerencia', 'relatorios']
  },
  gerente: {
    password: '123456',
    name: 'Marina Lopes',
    role: 'gerente',
    permissions: ['atendimento', 'chat', 'gerencia', 'relatorios', 'conteudo', 'marketing']
  },
  admin: {
    password: '123456',
    name: 'Roberto Admin',
    role: 'admin',
    permissions: ['atendimento', 'chat', 'gerencia', 'relatorios', 'conteudo', 'marketing', 'financeiro', 'tecnico', 'configuracoes']
  }
};

// Módulos do sistema
const modules = {
  atendimento: { name: 'Atendimento', icon: '📞', desc: 'Gestão de atendimentos' },
  chat: { name: 'Chat', icon: '💬', desc: 'Conversas em tempo real' },
  gerencia: { name: 'Gerência', icon: '👥', desc: 'Supervisão de equipe' },
  relatorios: { name: 'Relatórios', icon: '📊', desc: 'Métricas e análises' },
  conteudo: { name: 'Conteúdo', icon: '📥', desc: 'Gestão de conteúdo' },
  marketing: { name: 'Marketing', icon: '⭐', desc: 'Campanhas e promoções' },
  financeiro: { name: 'Financeiro', icon: '💰', desc: 'Controle financeiro' },
  tecnico: { name: 'Técnico', icon: '🔧', desc: 'Suporte técnico' },
  configuracoes: { name: 'Configurações', icon: '⚙️', desc: 'Ajustes do sistema' }
};

// ===== ELEMENTOS DO DOM =====
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loading = document.getElementById('loading');

// ===== VERIFICAR SESSÃO AO CARREGAR =====
window.addEventListener('DOMContentLoaded', () => {
  const savedUser = sessionStorage.getItem('currentUser');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    showDashboard(user);
  }
});

// ===== LOGIN =====
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  // Limpar erros anteriores
  document.getElementById('usernameError').classList.remove('show');
  document.getElementById('passwordError').classList.remove('show');
  usernameInput.classList.remove('error');
  passwordInput.classList.remove('error');

  // Validar
  if (!users[username]) {
    usernameInput.classList.add('error');
    document.getElementById('usernameError').classList.add('show');
    return;
  }

  if (users[username].password !== password) {
    passwordInput.classList.add('error');
    document.getElementById('passwordError').classList.add('show');
    return;
  }

  // Simular loading
  loginBtn.disabled = true;
  loading.classList.add('show');

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
    
    loginBtn.disabled = false;
    loading.classList.remove('show');
  }, 1000);
});

// ===== PREENCHER COM PERFIL DE TESTE =====
document.querySelectorAll('.profile-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    usernameInput.value = chip.dataset.user;
    passwordInput.value = chip.dataset.pass;
  });
});

// ===== MOSTRAR DASHBOARD =====
function showDashboard(user) {
  loginScreen.style.display = 'none';
  dashboard.classList.add('active');

  // Atualizar informações do usuário
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = getRoleLabel(user.role);
  document.getElementById('roleDisplay').textContent = getRoleLabel(user.role);
  document.getElementById('userAvatar').textContent = user.name[0].toUpperCase();

  // Renderizar permissões
  renderPermissions(user.permissions);
}

// ===== RENDERIZAR MÓDULOS COM BASE NAS PERMISSÕES =====
function renderPermissions(permissions) {
  const grid = document.getElementById('permissionsGrid');
  grid.innerHTML = '';

  Object.keys(modules).forEach(moduleKey => {
    const module = modules[moduleKey];
    const hasAccess = permissions.includes(moduleKey);

    const card = document.createElement('div');
    card.className = `permission-card ${!hasAccess ? 'locked' : ''}`;
    card.innerHTML = `
      ${!hasAccess ? '<i class="fi fi-rr-lock lock-icon"></i>' : ''}
      <div class="permission-icon">${module.icon}</div>
      <h3>${module.name}</h3>
      <p>${module.desc}</p>
    `;

    grid.appendChild(card);
  });
}

// ===== LOGOUT =====
function logout() {
  sessionStorage.removeItem('currentUser');
  dashboard.classList.remove('active');
  loginScreen.style.display = 'block';
  loginForm.reset();
}

// ===== HELPER: LABEL DO PERFIL =====
function getRoleLabel(role) {
  const labels = {
    atendente: 'Atendente',
    supervisor: 'Supervisor',
    gerente: 'Gerente',
    admin: 'Administrador'
  };
  return labels[role] || role;
}

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
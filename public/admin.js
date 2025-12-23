// ==================== ADMIN.JS - CORRIGIDO (TODOS OS BUGS RESOLVIDOS) ====================

console.log('🔧 Admin.js carregado!');

// ===== VARIÁVEIS GLOBAIS =====
let currentEditingUser = null;
let currentEditingRole = null;

// ===== VERIFICAR PERMISSÃO DE ADMIN AO CARREGAR =====
window.addEventListener('DOMContentLoaded', () => {
  console.log('📋 Inicializando painel admin...');

  // Verificar se PermissionsSystem está carregado
  if (typeof PermissionsSystem === 'undefined') {
    console.error('❌ PermissionsSystem não carregado!');
    alert('Erro: Sistema de permissões não carregado. Verifique se permissions.js foi incluído.');
    return;
  }

  if (!PermissionsSystem.requireAuth()) {
    console.log('❌ Não autenticado');
    return;
  }
  
  const user = PermissionsSystem.getCurrentUser();
  console.log('👤 Usuário atual:', user);
  
  // Verificar se é admin
  if (!PermissionsSystem.hasPermission(PermissionsSystem.PERMISSIONS.SUPER_ADMIN)) {
    alert('⛔ Acesso negado! Apenas administradores podem acessar este painel.');
    window.location.href = 'Main.html';
    return;
  }

  console.log('✅ Permissão de admin verificada!');

  // Inicializar interface
  initTabs();
  loadUsers();
  loadRoles();
  loadPermissionsMatrix();
  initEventListeners();
  
  console.log('✅ Painel admin inicializado com sucesso!');
});

// ===== SISTEMA DE ABAS =====
function initTabs() {
  console.log('🔧 Inicializando sistema de abas...');
  
  const tabBtns = document.querySelectorAll('.aba-btn');
  const tabContents = document.querySelectorAll('.aba-conteudo');

  console.log(`📋 Encontradas ${tabBtns.length} abas`);

  tabBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      console.log(`📌 Aba clicada: ${btn.dataset.aba}`);
      
      // Remove active de todos
      tabBtns.forEach(b => b.classList.remove('ativa'));
      tabContents.forEach(c => c.classList.remove('ativa'));

      // Ativa o clicado
      btn.classList.add('ativa');
      const targetClass = btn.dataset.aba;
      const targetTab = document.querySelector('.' + targetClass);
      
      if (targetTab) {
        targetTab.classList.add('ativa');
        console.log(`✅ Aba ${targetClass} ativada`);
      } else {
        console.error(`❌ Aba ${targetClass} não encontrada`);
      }
    });
  });
}

// ===== INICIALIZAR EVENT LISTENERS =====
function initEventListeners() {
  console.log('🔧 Inicializando event listeners...');

  // Botão Novo Usuário
  const btnNovoUsuario = document.getElementById('btnNovoUsuario');
  if (btnNovoUsuario) {
    btnNovoUsuario.addEventListener('click', () => {
      console.log('➕ Botão Novo Usuário clicado');
      openCreateUserModal();
    });
    console.log('✅ Listener do botão Novo Usuário configurado');
  } else {
    console.error('❌ Botão btnNovoUsuario não encontrado!');
  }

  // Busca de usuários
  const searchUser = document.getElementById('searchUser');
  if (searchUser) {
    searchUser.addEventListener('keyup', filterUsers);
    console.log('✅ Listener de busca configurado');
  }

  // Fechar modais
  const btnCloseUserModal = document.getElementById('btnCloseUserModal');
  const btnCancelUser = document.getElementById('btnCancelUser');
  const btnCloseRoleModal = document.getElementById('btnCloseRoleModal');
  const btnCancelRole = document.getElementById('btnCancelRole');

  if (btnCloseUserModal) btnCloseUserModal.addEventListener('click', closeUserModal);
  if (btnCancelUser) btnCancelUser.addEventListener('click', closeUserModal);
  if (btnCloseRoleModal) btnCloseRoleModal.addEventListener('click', closeRoleModal);
  if (btnCancelRole) btnCancelRole.addEventListener('click', closeRoleModal);

  // Formulários
  const userForm = document.getElementById('userForm');
  const roleForm = document.getElementById('roleForm');

  if (userForm) {
    userForm.addEventListener('submit', saveUser);
    console.log('✅ Listener do form de usuário configurado');
  }

  if (roleForm) {
    roleForm.addEventListener('submit', saveRole);
    console.log('✅ Listener do form de role configurado');
  }

  // Fechar modal ao clicar fora
  const userModal = document.getElementById('userModal');
  const roleModal = document.getElementById('roleModal');

  if (userModal) {
    userModal.addEventListener('click', (e) => {
      if (e.target === userModal) closeUserModal();
    });
  }

  if (roleModal) {
    roleModal.addEventListener('click', (e) => {
      if (e.target === roleModal) closeRoleModal();
    });
  }
}

// ==================== GERENCIAMENTO DE USUÁRIOS ====================

function loadUsers() {
  console.log('📋 Carregando usuários...');
  
  const users = PermissionsSystem.getAllUsers();
  const tbody = document.getElementById('usersTableBody');
  
  if (!tbody) {
    console.error('❌ Elemento usersTableBody não encontrado!');
    return;
  }

  console.log(`👥 ${users.length} usuários encontrados`);
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td><strong>${user.name}</strong></td>
      <td>${user.email}</td>
      <td><span class="role-badge">${PermissionsSystem.getRoleLabel(user.role)}</span></td>
      <td>
        <span class="status-badge ${user.active ? 'status-active' : 'status-inactive'}">
          ${user.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="editUser('${user.username}')">
            <i class="fi fi-rr-edit"></i> Editar
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteUserConfirm('${user.username}')">
            <i class="fi fi-rr-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  console.log('✅ Usuários carregados na tabela');
}

function filterUsers() {
  const searchValue = document.getElementById('searchUser').value.toLowerCase();
  const rows = document.querySelectorAll('#usersTableBody tr');
  
  console.log(`🔍 Filtrando por: "${searchValue}"`);
  
  let visibleCount = 0;
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const shouldShow = text.includes(searchValue);
    row.style.display = shouldShow ? '' : 'none';
    if (shouldShow) visibleCount++;
  });

  console.log(`✅ ${visibleCount} usuários visíveis`);
}

function openCreateUserModal() {
  console.log('➕ Abrindo modal de novo usuário...');
  
  currentEditingUser = null;
  document.getElementById('modalTitle').textContent = 'Novo Usuário';
  document.getElementById('userForm').reset();
  document.getElementById('userUsername').disabled = false;
  loadCustomPermissionsCheckboxes();
  document.getElementById('userModal').classList.add('active');
  
  console.log('✅ Modal aberto');
}

function editUser(username) {
  console.log(`✏️ Editando usuário: ${username}`);
  
  currentEditingUser = username;
  const users = PermissionsSystem.getAllUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) {
    console.error(`❌ Usuário ${username} não encontrado`);
    return;
  }

  document.getElementById('modalTitle').textContent = 'Editar Usuário';
  document.getElementById('userName').value = user.name;
  document.getElementById('userEmail').value = user.email;
  document.getElementById('userUsername').value = user.username;
  document.getElementById('userUsername').disabled = true;
  document.getElementById('userPassword').value = user.password;
  document.getElementById('userRole').value = user.role;
  document.getElementById('userActive').value = user.active.toString();
  
  loadCustomPermissionsCheckboxes(user.customPermissions);
  document.getElementById('userModal').classList.add('active');
  
  console.log('✅ Modal de edição aberto');
}

function closeUserModal() {
  console.log('❌ Fechando modal de usuário...');
  document.getElementById('userModal').classList.remove('active');
  currentEditingUser = null;
}

function saveUser(event) {
  event.preventDefault();
  console.log('💾 Salvando usuário...');

  const userData = {
    name: document.getElementById('userName').value,
    email: document.getElementById('userEmail').value,
    password: document.getElementById('userPassword').value,
    role: document.getElementById('userRole').value,
    active: document.getElementById('userActive').value === 'true',
    customPermissions: getSelectedCustomPermissions()
  };

  console.log('📋 Dados do usuário:', userData);

  if (currentEditingUser) {
    // Editar usuário existente
    console.log(`✏️ Atualizando usuário: ${currentEditingUser}`);
    const result = PermissionsSystem.updateUser(currentEditingUser, userData);
    if (result.success) {
      alert('✅ Usuário atualizado com sucesso!');
      console.log('✅ Usuário atualizado');
    } else {
      alert('❌ Erro: ' + result.error);
      console.error('❌ Erro ao atualizar:', result.error);
      return;
    }
  } else {
    // Criar novo usuário
    const username = document.getElementById('userUsername').value;
    console.log(`➕ Criando novo usuário: ${username}`);
    const result = PermissionsSystem.createUser(username, userData);
    if (result.success) {
      alert('✅ Usuário criado com sucesso!');
      console.log('✅ Usuário criado');
    } else {
      alert('❌ Erro: ' + result.error);
      console.error('❌ Erro ao criar:', result.error);
      return;
    }
  }

  closeUserModal();
  loadUsers();
}

function deleteUserConfirm(username) {
  console.log(`🗑️ Solicitação de exclusão: ${username}`);
  
  if (username === 'admin') {
    alert('❌ Não é possível excluir o usuário administrador padrão!');
    return;
  }

  if (confirm(`⚠️ Tem certeza que deseja excluir o usuário "${username}"?`)) {
    const result = PermissionsSystem.deleteUser(username);
    if (result.success) {
      alert('✅ Usuário excluído com sucesso!');
      console.log(`✅ Usuário ${username} excluído`);
      loadUsers();
    } else {
      alert('❌ Erro: ' + result.error);
      console.error('❌ Erro ao excluir:', result.error);
    }
  }
}

function loadCustomPermissionsCheckboxes(selectedPermissions = []) {
  console.log('📋 Carregando checkboxes de permissões customizadas...');
  
  const container = document.getElementById('customPermissionsCheckboxes');
  const allPermissions = PermissionsSystem.getAllPermissions();
  
  // Agrupar por módulo
  const grouped = {};
  allPermissions.forEach(perm => {
    if (!grouped[perm.module]) {
      grouped[perm.module] = [];
    }
    grouped[perm.module].push(perm);
  });

  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="checkbox-group">
      <div class="checkbox-group-title">${capitalizeModule(module)}</div>
      ${perms.map(perm => `
        <div class="checkbox-item">
          <input 
            type="checkbox" 
            id="perm-${perm.value}" 
            value="${perm.value}"
            ${selectedPermissions.includes(perm.value) ? 'checked' : ''}
          >
          <label for="perm-${perm.value}">
            <strong>${perm.action}</strong>
            <span class="permission-code">${perm.value}</span>
          </label>
        </div>
      `).join('')}
    </div>
  `).join('');

  console.log('✅ Checkboxes carregadas');
}

function getSelectedCustomPermissions() {
  const checkboxes = document.querySelectorAll('#customPermissionsCheckboxes input[type="checkbox"]:checked');
  const selected = Array.from(checkboxes).map(cb => cb.value);
  console.log(`📋 ${selected.length} permissões customizadas selecionadas`);
  return selected;
}

// ==================== GERENCIAMENTO DE ROLES ====================

function loadRoles() {
  console.log('📋 Carregando roles...');
  
  const roles = PermissionsSystem.getAllRoles();
  const container = document.getElementById('rolesGrid');
  
  if (!container) {
    console.error('❌ Elemento rolesGrid não encontrado!');
    return;
  }

  console.log(`🛡️ ${roles.length} roles encontradas`);
  
  container.innerHTML = roles.map(role => `
    <div class="role-card">
      <h3>${role.name}</h3>
      <p>${role.description}</p>
      <div class="role-stats">
        <span>📋 ${role.permissions.length} permissões</span>
        <button class="btn btn-sm btn-primary" onclick="editRole('${role.key}')">
          <i class="fi fi-rr-edit"></i> Editar
        </button>
      </div>
    </div>
  `).join('');

  console.log('✅ Roles carregadas');
}

function editRole(roleKey) {
  console.log(`✏️ Editando role: ${roleKey}`);
  
  currentEditingRole = roleKey;
  const roles = PermissionsSystem.getAllRoles();
  const role = roles.find(r => r.key === roleKey);
  
  if (!role) {
    console.error(`❌ Role ${roleKey} não encontrada`);
    return;
  }

  document.getElementById('roleModalTitle').textContent = `Editar Perfil: ${role.name}`;
  document.getElementById('roleInfoName').textContent = role.name;
  document.getElementById('roleInfoDesc').textContent = role.description;
  
  loadRolePermissionsCheckboxes(role.permissions);
  document.getElementById('roleModal').classList.add('active');
  
  console.log('✅ Modal de edição de role aberto');
}

function closeRoleModal() {
  console.log('❌ Fechando modal de role...');
  document.getElementById('roleModal').classList.remove('active');
  currentEditingRole = null;
}

function saveRole(event) {
  event.preventDefault();
  console.log('💾 Salvando role...');

  const selectedPermissions = getSelectedRolePermissions();
  console.log(`📋 ${selectedPermissions.length} permissões selecionadas`);
  
  const result = PermissionsSystem.updateRolePermissions(currentEditingRole, selectedPermissions);
  
  if (result.success) {
    alert('✅ Permissões do perfil atualizadas com sucesso!');
    console.log('✅ Role atualizada');
    closeRoleModal();
    loadRoles();
  } else {
    alert('❌ Erro: ' + result.error);
    console.error('❌ Erro ao atualizar role:', result.error);
  }
}

function loadRolePermissionsCheckboxes(selectedPermissions = []) {
  console.log('📋 Carregando checkboxes de permissões da role...');
  
  const container = document.getElementById('rolePermissionsCheckboxes');
  const allPermissions = PermissionsSystem.getAllPermissions();
  
  // Agrupar por módulo
  const grouped = {};
  allPermissions.forEach(perm => {
    if (!grouped[perm.module]) {
      grouped[perm.module] = [];
    }
    grouped[perm.module].push(perm);
  });

  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="checkbox-group">
      <div class="checkbox-group-title">${capitalizeModule(module)}</div>
      ${perms.map(perm => `
        <div class="checkbox-item">
          <input 
            type="checkbox" 
            id="role-perm-${perm.value}" 
            value="${perm.value}"
            ${selectedPermissions.includes(perm.value) ? 'checked' : ''}
          >
          <label for="role-perm-${perm.value}">
            <strong>${perm.action}</strong>
            <span class="permission-code">${perm.value}</span>
          </label>
        </div>
      `).join('')}
    </div>
  `).join('');

  console.log('✅ Checkboxes da role carregadas');
}

function getSelectedRolePermissions() {
  const checkboxes = document.querySelectorAll('#rolePermissionsCheckboxes input[type="checkbox"]:checked');
  const selected = Array.from(checkboxes).map(cb => cb.value);
  console.log(`📋 ${selected.length} permissões da role selecionadas`);
  return selected;
}

// ==================== MATRIZ DE PERMISSÕES ====================

function loadPermissionsMatrix() {
  console.log('📋 Carregando matriz de permissões...');
  
  const allPermissions = PermissionsSystem.getAllPermissions();
  const container = document.getElementById('permissionsMatrix');
  
  if (!container) {
    console.error('❌ Elemento permissionsMatrix não encontrado!');
    return;
  }
  
  // Agrupar por módulo
  const grouped = {};
  allPermissions.forEach(perm => {
    if (!grouped[perm.module]) {
      grouped[perm.module] = [];
    }
    grouped[perm.module].push(perm);
  });

  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="module-group">
      <h4>
        <i class="fi fi-rr-cube"></i>
        ${capitalizeModule(module)}
      </h4>
      <div class="permissions-list">
        ${perms.map(perm => `
          <div class="permission-item">
            <strong>${perm.action}</strong>
            <code>${perm.value}</code>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  console.log('✅ Matriz de permissões carregada');
}

// ==================== HELPERS ====================

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function capitalizeModule(module) {
  const map = {
    'atendimento': 'Atendimento',
    'chat': 'Chat',
    'gerencia': 'Gerência',
    'relatorios': 'Relatórios',
    'conteudo': 'Conteúdo',
    'copyright': 'Copyright',
    'financeiro': 'Financeiro',
    'marketing': 'Marketing',
    'tecnico': 'Técnico',
    'usuarios': 'Usuários',
    'configuracoes': 'Configurações',
    'system': 'Sistema'
  };
  return map[module] || module.charAt(0).toUpperCase() + module.slice(1);
}

function logout() {
  if (confirm('Deseja sair do painel de administração?')) {
    PermissionsSystem.logout();
  }
}

console.log('✅ admin.js carregado completamente');
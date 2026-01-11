/* ===============================
   ADMIN MODULE - REFATORADO
================================ */

const MODULE_ID = 'admin';

window.initAdminModule = function() {
  console.log("🧠 Inicializando módulo ADMIN");

  // Inicializar estado
  window.StateManager.init(MODULE_ID, {
    users: [...USERS_MOCK],
    currentEditingUserId: null,
    currentEditingRole: null
  });

  initAdminTabs();
  initUserModal();
  initRoleModal();
  renderUsers();
  renderRoles();
  renderPermissionsMatrix();
  initSearch();
};

/* ===============================
   DADOS MOCK
================================ */
const USERS_MOCK = [
  {
    id: 1,
    name: "Administrador",
    email: "admin@local",
    username: "admin",
    role: "ADMIN",
    active: true,
    createdAt: "2024-01-01"
  },
  {
    id: 2,
    name: "Ana Silva",
    email: "ana@local",
    username: "ana",
    role: "ATENDENTE",
    active: true,
    createdAt: "2024-01-15"
  },
  {
    id: 3,
    name: "Carlos Souza",
    email: "carlos@local",
    username: "carlos",
    role: "SUPERVISOR",
    active: true,
    createdAt: "2024-02-01"
  }
];

/* ===============================
   TABS
================================ */
function initAdminTabs() {
  window.TabManager.init('.modulo-painel-admin', MODULE_ID, {
    onTabChange: (tabId) => {
      console.log(`Admin: aba alterada para ${tabId}`);
    }
  });
}

/* ===============================
   USERS
================================ */
function renderUsers() {
  const state = window.StateManager.get(MODULE_ID);
  
  window.ListManager.render({
    data: state.users,
    container: '#usersTableBody',
    template: (user) => {
      const statusClass = user.active ? "status-active" : "status-inactive";
      const statusText = user.active ? "Ativo" : "Inativo";

      return `
        <tr>
          <td>${window.Utils.escapeHtml(user.name)}</td>
          <td>${window.Utils.escapeHtml(user.email)}</td>
          <td><span class="role-badge">${user.role}</span></td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>${window.Utils.formatDate(user.createdAt)}</td>
          <td class="action-btns">
            <button class="btn btn-sm btn-secondary btn-edit-user" data-user-id="${user.id}">
              Editar
            </button>
            <button class="btn btn-sm btn-danger btn-delete-user" data-user-id="${user.id}">
              Excluir
            </button>
          </td>
        </tr>
      `;
    },
    emptyMessage: 'Nenhum usuário encontrado',
    onRender: () => {
      // Adicionar listeners aos botões renderizados
      document.querySelectorAll('.btn-edit-user').forEach(btn => {
        window.ModuleLifecycle.addListener(btn, 'click', function() {
          editUser(parseInt(this.dataset.userId));
        }, MODULE_ID);
      });

      document.querySelectorAll('.btn-delete-user').forEach(btn => {
        window.ModuleLifecycle.addListener(btn, 'click', function() {
          deleteUser(parseInt(this.dataset.userId));
        }, MODULE_ID);
      });
    }
  });
}

function editUser(userId) {
  const state = window.StateManager.get(MODULE_ID);
  const user = state.users.find(u => u.id === userId);
  
  if (!user) return;

  window.StateManager.set(MODULE_ID, { currentEditingUserId: userId });

  document.getElementById("modalTitle").textContent = "Editar Usuário";
  document.getElementById("userName").value = user.name;
  document.getElementById("userEmail").value = user.email;
  document.getElementById("userUsername").value = user.username;
  document.getElementById("userPassword").value = "";
  document.getElementById("userRole").value = user.role;
  document.getElementById("userActive").value = user.active.toString();

  window.ModalManager.open('userModal');
  renderPermissionsCheckboxes();
}

function deleteUser(userId) {
  if (!confirm("Deseja realmente excluir este usuário?")) return;

  const state = window.StateManager.get(MODULE_ID);
  const newUsers = state.users.filter(u => u.id !== userId);
  
  window.StateManager.set(MODULE_ID, { users: newUsers });
  renderUsers();
  
  alert("Usuário excluído com sucesso!");
}

function saveUser() {
  const state = window.StateManager.get(MODULE_ID);
  
  const userData = {
    name: document.getElementById("userName").value,
    email: document.getElementById("userEmail").value,
    username: document.getElementById("userUsername").value,
    role: document.getElementById("userRole").value,
    active: document.getElementById("userActive").value === "true"
  };

  let newUsers;

  if (state.currentEditingUserId) {
    // Editar existente
    newUsers = state.users.map(u => 
      u.id === state.currentEditingUserId 
        ? { ...u, ...userData }
        : u
    );
  } else {
    // Criar novo
    const newUser = {
      id: Date.now(),
      ...userData,
      createdAt: new Date().toISOString().split("T")[0]
    };
    newUsers = [...state.users, newUser];
  }

  window.StateManager.set(MODULE_ID, { 
    users: newUsers,
    currentEditingUserId: null
  });

  renderUsers();
  window.ModalManager.close('userModal');
  
  alert("Usuário salvo com sucesso!");
}

/* ===============================
   USER MODAL
================================ */
function initUserModal() {
  // Configurar modal
  window.ModalManager.setup('userModal', MODULE_ID);

  // Botão novo usuário
  const btnNovo = document.getElementById("btnNovoUsuario");
  if (btnNovo) {
    window.ModuleLifecycle.addListener(btnNovo, 'click', () => {
      window.StateManager.set(MODULE_ID, { currentEditingUserId: null });
      document.getElementById("modalTitle").textContent = "Novo Usuário";
      document.getElementById("userForm").reset();
      window.ModalManager.open('userModal');
      renderPermissionsCheckboxes();
    }, MODULE_ID);
  }

  // Form submit
  const form = document.getElementById("userForm");
  if (form) {
    window.ModuleLifecycle.addListener(form, 'submit', (e) => {
      e.preventDefault();
      saveUser();
    }, MODULE_ID);
  }
}

/* ===============================
   ROLES
================================ */
function renderRoles() {
  if (!window.PermissionsSystem) return;

  const container = document.getElementById("rolesGrid");
  if (!container) return;

  const roles = window.PermissionsSystem.ROLES;
  
  container.innerHTML = Object.entries(roles).map(([key, role]) => `
    <div class="role-card">
      <h3>${window.Utils.escapeHtml(role.name)}</h3>
      <p>${window.Utils.escapeHtml(role.description)}</p>
      <div class="role-stats">
        <span>${role.permissions.length} permissões</span>
        <button class="btn btn-sm btn-secondary btn-edit-role" data-role="${key}">
          Editar
        </button>
      </div>
    </div>
  `).join('');

  // Adicionar listeners
  container.querySelectorAll('.btn-edit-role').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      editRole(this.dataset.role);
    }, MODULE_ID);
  });
}

function editRole(roleKey) {
  if (!window.PermissionsSystem) return;

  const role = window.PermissionsSystem.ROLES[roleKey];
  if (!role) return;

  window.StateManager.set(MODULE_ID, { currentEditingRole: roleKey });

  document.getElementById("roleModalTitle").textContent = `Editar Perfil: ${role.name}`;
  document.getElementById("roleInfoName").textContent = role.name;
  document.getElementById("roleInfoDesc").textContent = role.description;

  renderRolePermissionsCheckboxes(role.permissions);
  window.ModalManager.open('roleModal');
}

/* ===============================
   ROLE MODAL
================================ */
function initRoleModal() {
  window.ModalManager.setup('roleModal', MODULE_ID);

  const form = document.getElementById("roleForm");
  if (form) {
    window.ModuleLifecycle.addListener(form, 'submit', (e) => {
      e.preventDefault();
      saveRolePermissions();
    }, MODULE_ID);
  }
}

function saveRolePermissions() {
  alert("Permissões do perfil salvas com sucesso!");
  window.ModalManager.close('roleModal');
}

/* ===============================
   PERMISSIONS CHECKBOXES
================================ */
function renderPermissionsCheckboxes() {
  const container = document.getElementById("customPermissionsCheckboxes");
  if (!container || !window.PermissionsSystem) return;

  const permissions = window.PermissionsSystem.PERMISSIONS;
  const grouped = groupPermissionsByModule(permissions);

  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="checkbox-group">
      <div class="checkbox-group-title">${module}</div>
      ${perms.map(perm => `
        <div class="checkbox-item">
          <input type="checkbox" id="perm_${perm.key}" value="${perm.value}">
          <label for="perm_${perm.key}">
            ${perm.label}
            <span class="permission-code">${perm.value}</span>
          </label>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderRolePermissionsCheckboxes(rolePermissions) {
  const container = document.getElementById("rolePermissionsCheckboxes");
  if (!container || !window.PermissionsSystem) return;

  const permissions = window.PermissionsSystem.PERMISSIONS;
  const grouped = groupPermissionsByModule(permissions);

  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="checkbox-group">
      <div class="checkbox-group-title">${module}</div>
      ${perms.map(perm => {
        const checked = rolePermissions.includes(perm.value) ? 'checked' : '';
        return `
          <div class="checkbox-item">
            <input type="checkbox" id="role_perm_${perm.key}" value="${perm.value}" ${checked}>
            <label for="role_perm_${perm.key}">
              ${perm.label}
              <span class="permission-code">${perm.value}</span>
            </label>
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
}

function groupPermissionsByModule(permissions) {
  const grouped = {};

  Object.entries(permissions).forEach(([key, value]) => {
    const module = value.split('.')[0];
    const moduleName = module.charAt(0).toUpperCase() + module.slice(1);

    if (!grouped[moduleName]) grouped[moduleName] = [];

    grouped[moduleName].push({
      key,
      value,
      label: key.replace(/_/g, ' ')
    });
  });

  return grouped;
}

/* ===============================
   PERMISSIONS MATRIX
================================ */
function renderPermissionsMatrix() {
  const container = document.getElementById("permissionsMatrix");
  if (!container || !window.PermissionsSystem) return;

  const permissions = window.PermissionsSystem.PERMISSIONS;
  const grouped = groupPermissionsByModule(permissions);

  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="module-group">
      <h4>📦 ${module}</h4>
      <div class="permissions-list">
        ${perms.map(perm => `
          <div class="permission-item">
            ${perm.label}
            <code>${perm.value}</code>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/* ===============================
   SEARCH
================================ */
function initSearch() {
  const searchInput = document.getElementById("searchUser");
  if (!searchInput) return;

  window.ModuleLifecycle.addListener(
    searchInput,
    'input',
    window.Utils.debounce((e) => {
      const query = e.target.value.toLowerCase();
      const rows = document.querySelectorAll("#usersTableBody tr");

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? "" : "none";
      });
    }, 300),
    MODULE_ID
  );
}

console.log("✅ Admin module refatorado carregado");
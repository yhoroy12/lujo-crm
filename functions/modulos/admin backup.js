/* ===============================
   ADMIN MODULE - CORE
================================ */

// Expor função globalmente ANTES de definir
window.initAdminModule = function() {
  console.log("🧠 Inicializando módulo ADMIN");

  initAdminTabs();
  initUserModal();
  initRoleModal();
  renderUsers();
  renderRoles();
  renderPermissionsMatrix();
  initSearch();
};

/* ===============================
   TABS (ABAS)
================================ */

function initAdminTabs() {
  const tabButtons = document.querySelectorAll(".aba-btn");
  const tabContents = document.querySelectorAll(".aba-conteudo");

  if (!tabButtons.length || !tabContents.length) {
    console.warn("Admin Tabs não encontradas");
    return;
  }

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetClass = btn.dataset.aba;

      tabButtons.forEach(b => b.classList.remove("ativa"));
      tabContents.forEach(c => c.classList.remove("ativa"));

      btn.classList.add("ativa");

      const target = document.querySelector(`.${targetClass}`);
      if (target) target.classList.add("ativa");
    });
  });
}

/* ===============================
   USERS DATA
================================ */

let USERS = [
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

function renderUsers() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  USERS.forEach(user => {
    const tr = document.createElement("tr");

    const statusClass = user.active ? "status-active" : "status-inactive";
    const statusText = user.active ? "Ativo" : "Inativo";

    tr.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><span class="role-badge">${user.role}</span></td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>${user.createdAt}</td>
      <td class="action-btns">
        <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Excluir</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ===============================
   USER MODAL
================================ */

let currentEditingUserId = null;

function initUserModal() {
  const modal = document.getElementById("userModal");
  const btnOpen = document.getElementById("btnNovoUsuario");
  const btnClose = document.getElementById("btnCloseUserModal");
  const btnCancel = document.getElementById("btnCancelUser");
  const form = document.getElementById("userForm");

  if (!modal || !btnOpen || !form) return;

  btnOpen.addEventListener("click", () => {
    currentEditingUserId = null;
    document.getElementById("modalTitle").textContent = "Novo Usuário";
    modal.classList.add("active");
    form.reset();
    renderPermissionsCheckboxes();
  });

  [btnClose, btnCancel].forEach(btn => {
    btn?.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    saveUser();
  });
}

function editUser(userId) {
  const user = USERS.find(u => u.id === userId);
  if (!user) return;

  currentEditingUserId = userId;

  document.getElementById("modalTitle").textContent = "Editar Usuário";
  document.getElementById("userName").value = user.name;
  document.getElementById("userEmail").value = user.email;
  document.getElementById("userUsername").value = user.username;
  document.getElementById("userPassword").value = "";
  document.getElementById("userRole").value = user.role;
  document.getElementById("userActive").value = user.active.toString();

  document.getElementById("userModal").classList.add("active");
  renderPermissionsCheckboxes();
}

function deleteUser(userId) {
  if (!confirm("Deseja realmente excluir este usuário?")) return;

  USERS = USERS.filter(u => u.id !== userId);
  renderUsers();
  alert("Usuário excluído com sucesso!");
}

function saveUser() {
  const userData = {
    name: document.getElementById("userName").value,
    email: document.getElementById("userEmail").value,
    username: document.getElementById("userUsername").value,
    role: document.getElementById("userRole").value,
    active: document.getElementById("userActive").value === "true"
  };

  if (currentEditingUserId) {
    const user = USERS.find(u => u.id === currentEditingUserId);
    if (user) {
      Object.assign(user, userData);
    }
  } else {
    const newUser = {
      id: Date.now(),
      ...userData,
      createdAt: new Date().toISOString().split("T")[0]
    };
    USERS.push(newUser);
  }

  renderUsers();
  document.getElementById("userModal").classList.remove("active");
  alert("Usuário salvo com sucesso!");
}

/* ===============================
   PERMISSIONS CHECKBOXES
================================ */

function renderPermissionsCheckboxes() {
  const container = document.getElementById("customPermissionsCheckboxes");
  if (!container || typeof window.PermissionsSystem === "undefined") return;

  const permissions = window.PermissionsSystem.PERMISSIONS;
  const grouped = groupPermissionsByModule(permissions);

  container.innerHTML = "";

  Object.entries(grouped).forEach(([module, perms]) => {
    const group = document.createElement("div");
    group.className = "checkbox-group";

    const title = document.createElement("div");
    title.className = "checkbox-group-title";
    title.textContent = module;
    group.appendChild(title);

    perms.forEach(perm => {
      const item = document.createElement("div");
      item.className = "checkbox-item";

      item.innerHTML = `
        <input type="checkbox" id="perm_${perm.key}" value="${perm.value}">
        <label for="perm_${perm.key}">
          ${perm.label}
          <span class="permission-code">${perm.value}</span>
        </label>
      `;

      group.appendChild(item);
    });

    container.appendChild(group);
  });
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
   ROLES / PERFIS
================================ */

function renderRoles() {
  const container = document.getElementById("rolesGrid");
  if (!container || typeof window.PermissionsSystem === "undefined") return;

  const roles = window.PermissionsSystem.ROLES;
  container.innerHTML = "";

  Object.entries(roles).forEach(([key, role]) => {
    const card = document.createElement("div");
    card.className = "role-card";

    card.innerHTML = `
      <h3>${role.name}</h3>
      <p>${role.description}</p>
      <div class="role-stats">
        <span>${role.permissions.length} permissões</span>
        <button class="btn btn-sm btn-secondary" onclick="editRole('${key}')">Editar</button>
      </div>
    `;

    container.appendChild(card);
  });
}

/* ===============================
   ROLE MODAL
================================ */

let currentEditingRole = null;

function initRoleModal() {
  const modal = document.getElementById("roleModal");
  const btnClose = document.getElementById("btnCloseRoleModal");
  const btnCancel = document.getElementById("btnCancelRole");
  const form = document.getElementById("roleForm");

  if (!modal) return;

  [btnClose, btnCancel].forEach(btn => {
    btn?.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  });

  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      saveRolePermissions();
    });
  }
}

function editRole(roleKey) {
  if (typeof window.PermissionsSystem === "undefined") return;

  const role = window.PermissionsSystem.ROLES[roleKey];
  if (!role) return;

  currentEditingRole = roleKey;

  document.getElementById("roleModalTitle").textContent = `Editar Perfil: ${role.name}`;
  document.getElementById("roleInfoName").textContent = role.name;
  document.getElementById("roleInfoDesc").textContent = role.description;

  renderRolePermissionsCheckboxes(role.permissions);
  document.getElementById("roleModal").classList.add("active");
}

function renderRolePermissionsCheckboxes(rolePermissions) {
  const container = document.getElementById("rolePermissionsCheckboxes");
  if (!container || typeof window.PermissionsSystem === "undefined") return;

  const permissions = window.PermissionsSystem.PERMISSIONS;
  const grouped = groupPermissionsByModule(permissions);

  container.innerHTML = "";

  Object.entries(grouped).forEach(([module, perms]) => {
    const group = document.createElement("div");
    group.className = "checkbox-group";

    const title = document.createElement("div");
    title.className = "checkbox-group-title";
    title.textContent = module;
    group.appendChild(title);

    perms.forEach(perm => {
      const item = document.createElement("div");
      item.className = "checkbox-item";

      const checked = rolePermissions.includes(perm.value) ? "checked" : "";

      item.innerHTML = `
        <input type="checkbox" id="role_perm_${perm.key}" value="${perm.value}" ${checked}>
        <label for="role_perm_${perm.key}">
          ${perm.label}
          <span class="permission-code">${perm.value}</span>
        </label>
      `;

      group.appendChild(item);
    });

    container.appendChild(group);
  });
}

function saveRolePermissions() {
  alert("Permissões do perfil salvas com sucesso!");
  document.getElementById("roleModal").classList.remove("active");
}

/* ===============================
   PERMISSIONS MATRIX
================================ */

function renderPermissionsMatrix() {
  const container = document.getElementById("permissionsMatrix");
  if (!container || typeof window.PermissionsSystem === "undefined") return;

  const permissions = window.PermissionsSystem.PERMISSIONS;
  const grouped = groupPermissionsByModule(permissions);

  container.innerHTML = "";

  Object.entries(grouped).forEach(([module, perms]) => {
    const moduleGroup = document.createElement("div");
    moduleGroup.className = "module-group";

    const title = document.createElement("h4");
    title.textContent = `📦 ${module}`;
    moduleGroup.appendChild(title);

    const list = document.createElement("div");
    list.className = "permissions-list";

    perms.forEach(perm => {
      const item = document.createElement("div");
      item.className = "permission-item";
      item.innerHTML = `
        ${perm.label}
        <code>${perm.value}</code>
      `;
      list.appendChild(item);
    });

    moduleGroup.appendChild(list);
    container.appendChild(moduleGroup);
  });
}

/* ===============================
   SEARCH
================================ */

function initSearch() {
  const searchInput = document.getElementById("searchUser");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const rows = document.querySelectorAll("#usersTableBody tr");

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? "" : "none";
    });
  });
}
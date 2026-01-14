/* ===============================
   ADMIN MODULE - VERSÃO MODULAR (v9/v10)
================================ */

if (typeof MODULE_ID === 'undefined') {
    var MODULE_ID = 'admin';
}  

window.initAdminModule = function() {
  console.log("🧠 Inicializando módulo ADMIN (Firebase Modular)");

  window.StateManager.init(MODULE_ID, {
    users: [],
    currentEditingUserId: null
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
   USERS (LISTAGEM REAL-TIME)
================================ */
function renderUsers() {  
  const { db, fStore } = window.FirebaseApp || {};
  
  // Verifica se as funções modulares estão disponíveis
  if (!db || !fStore || !fStore.collection) {
      console.warn("⏳ Aguardando ferramentas do Firestore...");
      setTimeout(renderUsers, 1000);
      return;
  }

  const { collection, onSnapshot, query, orderBy } = fStore;
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("name", "asc"));

  // Escuta em tempo real usando a sintaxe funcional
  onSnapshot(q, (snapshot) => {
    const users = [];
    snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    
    window.StateManager.set(MODULE_ID, { users: users });

    window.ListManager.render({
      data: users,
      container: '#usersTableBody',
      template: (user) => {
        const statusClass = user.active ? "status-active" : "status-inactive";
        return `
          <tr>
            <td>${user.name || 'Sem nome'}</td>
            <td>${user.email}</td>
            <td><span class="role-badge">${user.role}</span></td>
            <td><span class="status-badge ${statusClass}">${user.active ? "Ativo" : "Inativo"}</span></td>
            <td>${user.createdAt ? window.Utils.formatDate(user.createdAt) : '--'}</td>
            <td class="action-btns">
              <button class="btn btn-sm btn-secondary btn-edit-user" data-user-id="${user.id}">Editar</button>
            </td>
          </tr>
        `;
      },
      onRender: () => {
        document.querySelectorAll('.btn-edit-user').forEach(btn => {
          btn.onclick = () => editUser(btn.dataset.userId);
        });
      }
    });
  }, (error) => {
      console.error("Erro no Firestore:", error);
  });
}
function editUser(userId) {
  const state = window.StateManager.get(MODULE_ID);
  const user = state.users.find(u => u.id === userId);
  
  if (!user) return;

  window.StateManager.set(MODULE_ID, { currentEditingUserId: userId });

  document.getElementById("modalTitle").textContent = "Editar Usuário";
  document.getElementById("userName").value = user.name || '';
  document.getElementById("userEmail").value = user.email || '';
  document.getElementById("userUsername").value = user.username || '';
  document.getElementById("userPassword").value = "";
  document.getElementById("userRole").value = user.role || 'ATENDENTE';
  document.getElementById("userActive").value = (user.active !== undefined) ? user.active.toString() : "true";

  window.ModalManager.open('userModal');
  renderPermissionsCheckboxes();
  
  setTimeout(() => {
    if (user.customPermissions) {
       marcarPermissoesAutomaticas(user.customPermissions);
    }
  }, 150);
}

/* ===============================
   SALVAR USUÁRIO (FIREBASE AUTH + FIRESTORE)
================================ */
async function saveUser() {
  const state = window.StateManager.get(MODULE_ID);
  const { db, auth, fStore, fAuth } = window.FirebaseApp || {};
  
  if (!db || !fStore) return alert("Erro: Firestore não carregado.");

  const { doc, setDoc, updateDoc } = fStore;
  const { createUserWithEmailAndPassword } = fAuth;

  const email = document.getElementById("userEmail").value;
  const password = document.getElementById("userPassword").value;
  
  const userData = {
    name: document.getElementById("userName").value,
    email: email,
    username: document.getElementById("userUsername").value,
    role: document.getElementById("userRole").value,
    active: document.getElementById("userActive").value === "true",
    customPermissions: Array.from(document.querySelectorAll('#customPermissionsCheckboxes input:checked')).map(cb => cb.value),
    updatedAt: new Date().toISOString()
  };

  try {
    if (window.setLoading) window.setLoading(true);

    if (state.currentEditingUserId) {
      // ATUALIZAÇÃO: updateDoc(referencia, dados)
      const userRef = doc(db, "users", state.currentEditingUserId);
      await updateDoc(userRef, userData);
      alert("Usuário atualizado!");
    } else {
      // CRIAÇÃO AUTH
      if (!password || password.length < 6) throw new Error("Senha deve ter 6+ caracteres.");
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      // CRIAÇÃO FIRESTORE: setDoc(doc(db, colecao, id), dados)
      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        ...userData,
        createdAt: new Date().toISOString()
      });
      alert("Usuário criado com sucesso!");
    }
    window.ModalManager.close('userModal');
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro: " + error.message);
  } finally {
    if (window.setLoading) window.setLoading(false);
  }
}
/* ===============================
   FUNÇÕES DE UI E AUXILIARES
================================ */

function initUserModal() {
  window.ModalManager.setup('userModal', MODULE_ID);
  const btnNovo = document.getElementById("btnNovoUsuario");
  if (btnNovo) {
    btnNovo.onclick = () => {
      window.StateManager.set(MODULE_ID, { currentEditingUserId: null });
      document.getElementById("userForm").reset();
      window.ModalManager.open('userModal');
      renderPermissionsCheckboxes();
    };
  }
  document.getElementById("userForm").onsubmit = (e) => { e.preventDefault(); saveUser(); };
}

function groupPermissionsByModule(permissions) {
  const grouped = {};
  Object.entries(permissions).forEach(([key, value]) => {
    const module = value.split('.')[0];
    const moduleName = module.charAt(0).toUpperCase() + module.slice(1);
    if (!grouped[moduleName]) grouped[moduleName] = [];
    grouped[moduleName].push({ key, value, label: key.replace(/_/g, ' ') });
  });
  return grouped;
}

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
        <button class="btn btn-sm btn-secondary btn-edit-role" data-role="${key}">Editar</button>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.btn-edit-role').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() { editRole(this.dataset.role); }, MODULE_ID);
  });
}

function editRole(roleKey) {
  const role = window.PermissionsSystem.ROLES[roleKey];
  if (!role) return;
  window.StateManager.set(MODULE_ID, { currentEditingRole: roleKey });
  document.getElementById("roleModalTitle").textContent = `Editar Perfil: ${role.name}`;
  document.getElementById("roleInfoName").textContent = role.name;
  document.getElementById("roleInfoDesc").textContent = role.description;
  renderRolePermissionsCheckboxes(role.permissions);
  window.ModalManager.open('roleModal');
}

function initRoleModal() {
  window.ModalManager.setup('roleModal', MODULE_ID);
  const form = document.getElementById("roleForm");
  if (form) {
    window.ModuleLifecycle.addListener(form, 'submit', (e) => {
      e.preventDefault();
      alert("Alterações de perfis globais desabilitadas nesta versão.");
      window.ModalManager.close('roleModal');
    }, MODULE_ID);
  }
}

function renderPermissionsCheckboxes() {
  const container = document.getElementById("customPermissionsCheckboxes");
  if (!container || !window.PermissionsSystem) return;
  const grouped = groupPermissionsByModule(window.PermissionsSystem.PERMISSIONS);
  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="checkbox-group">
      <div class="checkbox-group-title">${module}</div>
      ${perms.map(perm => `
        <div class="checkbox-item">
          <input type="checkbox" id="perm_${perm.key}" value="${perm.value}">
          <label for="perm_${perm.key}">${perm.label} <span class="permission-code">${perm.value}</span></label>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderRolePermissionsCheckboxes(rolePermissions) {
  const container = document.getElementById("rolePermissionsCheckboxes");
  if (!container) return;
  const grouped = groupPermissionsByModule(window.PermissionsSystem.PERMISSIONS);
  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="checkbox-group">
      <div class="checkbox-group-title">${module}</div>
      ${perms.map(perm => {
        const checked = rolePermissions.includes(perm.value) ? 'checked' : '';
        return `
          <div class="checkbox-item">
            <input type="checkbox" id="role_perm_${perm.key}" value="${perm.value}" ${checked}>
            <label for="role_perm_${perm.key}">${perm.label} <span class="permission-code">${perm.value}</span></label>
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
    grouped[moduleName].push({ key, value, label: key.replace(/_/g, ' ') });
  });
  return grouped;
}

function renderPermissionsMatrix() {
  const container = document.getElementById("permissionsMatrix");
  if (!container) return;
  const grouped = groupPermissionsByModule(window.PermissionsSystem.PERMISSIONS);
  container.innerHTML = Object.entries(grouped).map(([module, perms]) => `
    <div class="module-group">
      <h4>📦 ${module}</h4>
      <div class="permissions-list">
        ${perms.map(perm => `<div class="permission-item">${perm.label} <code>${perm.value}</code></div>`).join('')}
      </div>
    </div>
  `).join('');
}

function initSearch() {
  const searchInput = document.getElementById("searchUser");
  if (!searchInput) return;
  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll("#usersTableBody tr").forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
  };
}
console.log("✅ Admin module carregado com correções definitivas");
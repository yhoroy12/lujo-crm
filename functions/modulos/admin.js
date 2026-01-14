/* ===============================
   ADMIN MODULE - SPA SAFE
================================ */

if (window.__ADMIN_MODULE_LOADED__) {
  console.warn("⚠️ admin.js já carregado, ignorando reexecução");
} else {
  window.__ADMIN_MODULE_LOADED__ = true;

  if (typeof MODULE_ID === 'undefined') {
    var MODULE_ID = 'admin';
  }

  window.initAdminModule = function () {
    console.log("🧠 Inicializando módulo ADMIN");

    // ===============================
    // STATE
    // ===============================
    window.StateManager.init(MODULE_ID, {
      users: [],
      currentEditingUserId: null
    });

    // ===============================
    // INIT
    // ===============================
    initAdminTabs();
    initUserModal();
    initRoleModal();
    renderUsers();
    renderRoles();
    renderPermissionsMatrix();
    initSearch();
  };

  /* ===============================
     USERS
  ============================== */
  function renderUsers() {
    const { db, fStore } = window.FirebaseApp || {};
    if (!db || !fStore) return;

    const { collection, onSnapshot, query, orderBy } = fStore;

    const q = query(collection(db, "users"), orderBy("name"));

    onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      window.StateManager.set(MODULE_ID, { users });

      window.ListManager.render({
        data: users,
        container: '#usersTableBody',
        template: (user) => `
          <tr>
            <td>${user.name || '-'}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.active ? 'Ativo' : 'Inativo'}</td>
            <td>
              <button class="btn-edit-user" data-id="${user.id}">Editar</button>
            </td>
          </tr>
        `,
        onRender: () => {
          document.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.onclick = () => editUser(btn.dataset.id);
          });
        }
      });
    });
  }

  function editUser(userId) {
    const state = window.StateManager.get(MODULE_ID);
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    window.StateManager.set(MODULE_ID, { currentEditingUserId: userId });

    document.getElementById("userName").value = user.name || '';
    document.getElementById("userEmail").value = user.email || '';
    document.getElementById("userRole").value = user.role;

    window.ModalManager.open('userModal');
  }

  /* ===============================
     SAVE USER
  ============================== */
  async function saveUser() {
    const { db, fStore, auth, fAuth } = window.FirebaseApp;
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

    if (!currentUser) {
      alert("Usuário não autenticado");
      return;
    }

    const selectedRole = document.getElementById("userRole").value;

    if (!window.AuthHierarchy.canAssignRole(currentUser.roleLevel, selectedRole)) {
      alert("Você não tem permissão para atribuir este cargo.");
      return;
    }

    const data = {
      name: document.getElementById("userName").value,
      email: document.getElementById("userEmail").value,
      role: selectedRole,
      roleLevel: window.AuthHierarchy.getRoleLevel(selectedRole),
      updatedAt: new Date().toISOString()
    };

    const state = window.StateManager.get(MODULE_ID);

    try {
      if (state.currentEditingUserId) {
        await fStore.updateDoc(
          fStore.doc(db, "users", state.currentEditingUserId),
          data
        );
      } else {
        const pwd = document.getElementById("userPassword").value;
        const cred = await fAuth.createUserWithEmailAndPassword(auth, data.email, pwd);

        await fStore.setDoc(
          fStore.doc(db, "users", cred.user.uid),
          { uid: cred.user.uid, ...data, createdAt: new Date().toISOString() }
        );
      }

      window.ModalManager.close('userModal');
      alert("Usuário salvo com sucesso");
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  }

  /* ===============================
     MODALS
  ============================== */
  function initUserModal() {
    window.ModalManager.setup('userModal', MODULE_ID);
    const form = document.getElementById("userForm");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        saveUser();
      };
    }
  }

  function initAdminTabs() {
    window.TabManager.init('.modulo-painel-admin', MODULE_ID);
  }

  function initRoleModal() {}
  function renderRoles() {}
  function renderPermissionsMatrix() {}
  function initSearch() {}
}


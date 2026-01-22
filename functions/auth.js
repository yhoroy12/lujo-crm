// ==================== AUTH.JS - SISTEMA DE PERMISSÕES CORRIGIDO ====================
      // ==================== HIERARQUIA DO SISTEMA ====================

const ROLE_LEVELS = {
  ADMIN: 999, // somente sistema
  CEO: 100, // jeff
  GERENTE_MASTER: 80, // mauricio
  GERENTE: 60, // lisbeth
  SUPERVISOR: 40, // cesar
  OPERADOR: 20, // matheus,carlos,reginaldo...
  ESTAGIARIO: 0
};

// Cargos autorizados a criar perfis e usuários
const ROLE_CAN_MANAGE_USERS = [
  'ADMIN',
  'CEO',
  'GERENTE_MASTER',
  'GERENTE'
];


import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===== ELEMENTOS DO DOM =====
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loading = document.getElementById('loading');

// ===== SISTEMA DE PERMISSÕES GLOBAL =====
window.AuthSystem = {
  /**
   * Verifica se usuário está autenticado
   */
  isAuthenticated: () => {
    return sessionStorage.getItem('currentUser') !== null;
  },

  /**
   * Retorna dados do usuário atual
   */
  getCurrentUser: () => {
    const userData = sessionStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Verifica se usuário tem uma permissão específica
   * ADMIN tem acesso a tudo
   */
  hasPermission: (permission) => {
    const user = window.AuthSystem.getCurrentUser();
    
    if (!user) {
      console.warn('🚫 Nenhum usuário logado');
      return false;
    }

    // ADMIN tem acesso total
    if (user.role === 'ADMIN') {
      console.log('✅ Permissão concedida (ADMIN):', permission);
      return true;
    }

    // Verifica permissões customizadas
    const hasCustomPermission = user.permissions && 
                                user.permissions.includes(permission);
    
    // Verifica permissões do role base (do permissions.js)
    const rolePermissions = window.PermissionsSystem?.ROLES[user.role]?.permissions || [];
    const hasRolePermission = rolePermissions.includes(permission);

    const hasAccess = hasCustomPermission || hasRolePermission;
    
    console.log(hasAccess ? '✅' : '❌', 
                'Permissão:', permission, 
                '| Role:', user.role,
                '| Custom:', hasCustomPermission,
                '| Role Base:', hasRolePermission);
    
    return hasAccess;
  },

  /**
   * Faz logout
   */
  logout: async () => {
    try {
      if (window.FirebaseApp?.auth) {
        await signOut(window.FirebaseApp.auth);
      }
      sessionStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Erro no logout:', error);
      // Força logout mesmo com erro
      sessionStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    }
  }
};

// Expor funções globais (compatibilidade)
window.logout = window.AuthSystem.logout;
window.isAuthenticated = window.AuthSystem.isAuthenticated;
window.hasPermission = window.AuthSystem.hasPermission;
window.AuthHierarchy = {
  ROLE_LEVELS,
  getRoleLevel,
  canManageUsers,
  canCreateRole,
  canAssignRole,
  isAdminSystem
};

// ===== INICIALIZAÇÃO =====
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('login.html')) {
    initLoginPage();
  }

  // Monitora estado do Firebase Auth
  waitForFirebase().then(() => {
    onAuthStateChanged(window.FirebaseApp.auth, (user) => {
      if (user) {
        console.log("🔥 Firebase: Usuário conectado:", user.email);
      } else {
        console.log("❄️ Firebase: Nenhum usuário ativo");
      }
    });
  });
});

/**
 * Aguarda Firebase estar pronto
 */
function waitForFirebase() {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.FirebaseApp?.auth && window.FirebaseApp?.db) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}

/**
 * Inicializa página de login (chips de teste)
 */
function initLoginPage() {
  document.querySelectorAll('.profile-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (usernameInput && passwordInput) {
        usernameInput.value = chip.dataset.user;
        passwordInput.value = chip.dataset.pass;
      }
    });
  });
}

// ===== PROCESSO DE LOGIN ATUALIZADO (E-MAIL OU USERNAME) =====
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Captura o valor do input (que pode ser e-mail ou username)
    const identificador = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!window.FirebaseApp?.auth || !window.FirebaseApp?.db) {
      alert('⚠️ Sistema Firebase não inicializado. Recarregue a página.');
      return;
    }

    if (!identificador || !password) {
      alert('⚠️ Preencha todos os campos.');
      return;
    }

    if (loginBtn) loginBtn.disabled = true;
    if (loading) loading.classList.add('show');

    try {
      let emailFinal = identificador;

      // --- LÓGICA DE USERNAME ---
      // Se não houver '@', assumimos que é um username e buscamos o e-mail no Firestore
      // --- LÓGICA DE USERNAME (CORRIGIDA) ---
      if (!identificador.includes('@')) {
        console.log('🔍 Identificador reconhecido como username. Buscando e-mail...');
        
        // Extração correta das funções de dentro do fStore
        const { db, fStore } = window.FirebaseApp;
        const { collection, query, where, getDocs, limit } = fStore; // Agora pegando de fStore

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", identificador), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error('Username não encontrado.');
        }

        emailFinal = querySnapshot.docs[0].data().email;
        console.log('✅ Username mapeado para:', emailFinal);
      }

      // 1. Autenticar no Firebase Auth usando o e-mail (original ou o que encontramos)
      const userCredential = await signInWithEmailAndPassword(
        window.FirebaseApp.auth, 
        emailFinal, 
        password
      );
      
      const fbUser = userCredential.user;

      // 2. Buscar dados completos do Firestore para a sessão
      const userDocRef = doc(window.FirebaseApp.db, "users", fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error('Perfil não encontrado no Firestore.');
      }

      const userData = userDoc.data();

      // 3. Montar objeto de sessão
      const resolvedRole = AuthHierarchy.getRoleLevel(userData.role) >= 0
        ? userData.role
        : 'ATENDENTE';

      const sessionData = {
        uid: fbUser.uid,
        name: userData.name || 'Usuário',
        username: userData.username || fbUser.email.split('@')[0],
        email: fbUser.email,
        role: resolvedRole,
        setor: userData.setor || 'triagem',
        roleLevel: AuthHierarchy.getRoleLevel(resolvedRole),
        permissions: userData.customPermissions || []
      };

      sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
      window.location.href = 'Main.html';

    } catch (error) {
      console.error("❌ Erro no login:", error);
      
      let errorMessage = 'Erro ao fazer login. ';
      if (error.message === 'Username não encontrado.') {
        errorMessage = 'Este nome de usuário não existe.';
      } else {
        switch(error.code) {
          case 'auth/invalid-credential':
            errorMessage += 'E-mail/Usuário ou senha incorretos.';
            break;
          case 'auth/user-not-found':
            errorMessage += 'Usuário não cadastrado.';
            break;
          default:
            errorMessage += 'Verifique suas credenciais.';
        }
      }

      alert(errorMessage);
      if (loginBtn) loginBtn.disabled = false;
      if (loading) loading.classList.remove('show');
    }
  });
}
 // Utis // 

 function getRoleLevel(role) {
  return ROLE_LEVELS[role] ?? -1;
}

function isAdminSystem(user) {
  return user?.role === 'ADMIN';
}

function canManageUsers(user) {
  if (!user) return false;
  if (isAdminSystem(user)) return true;
  return ROLE_CAN_MANAGE_USERS.includes(user.role);
}

function canCreateRole(user, targetLevel) {
  if (!user) return false;
  if (isAdminSystem(user)) return true;

  const userLevel = getRoleLevel(user.role);
  return userLevel > targetLevel;
}

function canAssignRole(user, targetRole) {
  if (!user) return false;
  if (isAdminSystem(user)) return true;

  const userLevel = getRoleLevel(user.role);
  const targetLevel = getRoleLevel(targetRole);

  return userLevel > targetLevel;
}

window.AuthSystem.ensureUserLoaded = function () {
  return new Promise((resolve) => {
    const check = () => {
      const user = window.AuthSystem?.getCurrentUser();

      if (
        user &&
        user.uid &&
        Array.isArray(user.setor)
      ) {
        resolve(user);
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
};

console.log('✅ Auth.js carregado - Sistema de Permissões inicializado');
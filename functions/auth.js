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

// ===== PROCESSO DE LOGIN =====
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = usernameInput.value.trim();
    const password = passwordInput.value;

    // Validação
    if (!window.FirebaseApp?.auth || !window.FirebaseApp?.db) {
      alert('⚠️ Sistema Firebase não inicializado. Recarregue a página.');
      return;
    }

    if (!email || !password) {
      alert('⚠️ Preencha todos os campos.');
      return;
    }

    // UI Feedback
    if (loginBtn) loginBtn.disabled = true;
    if (loading) loading.classList.add('show');

    try {
      // 1. Autenticar no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        window.FirebaseApp.auth, 
        email, 
        password
      );
      
      const fbUser = userCredential.user;
      console.log('🔑 Usuário autenticado:', fbUser.email);

      // 2. Buscar dados do Firestore
      const userDocRef = doc(window.FirebaseApp.db, "users", fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error('Perfil não encontrado no sistema. Contate o administrador.');
      }

      const userData = userDoc.data();
      console.log('📄 Dados do Firestore:', userData);

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
        roleLevel: AuthHierarchy.getRoleLevel(resolvedRole),
        permissions: userData.customPermissions || []
      };

      // 4. Salvar no sessionStorage
      sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
      console.log('💾 Sessão salva:', sessionData);

      // 5. Redirecionar para dashboard
      console.log('✅ Login bem-sucedido! Redirecionando...');
      window.location.href = 'Main.html';

    } catch (error) {
      console.error("❌ Erro no login:", error.code, error.message);
      
      // Feedback de erro
      let errorMessage = 'Erro ao fazer login. ';
      
      switch(error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
          errorMessage += 'Usuário não encontrado.';
          usernameInput.classList.add('error');
          break;
        case 'auth/wrong-password':
          errorMessage += 'Senha incorreta.';
          passwordInput.classList.add('error');
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Muitas tentativas. Aguarde alguns minutos.';
          break;
        case 'auth/network-request-failed':
          errorMessage += 'Erro de conexão. Verifique sua internet.';
          break;
        default:
          errorMessage += error.message;
      }

      alert(errorMessage);

      // Resetar UI
      if (loginBtn) loginBtn.disabled = false;
      if (loading) loading.classList.remove('show');
    }
  });

  // Limpar erros ao digitar
  [usernameInput, passwordInput].forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        input.classList.remove('error');
      });
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

console.log('✅ Auth.js carregado - Sistema de Permissões inicializado');
// ==================== AUTH.JS - INTEGRADO COM FIREBASE ====================

// Aguarda o Firebase carregar ou tenta capturar o que foi exposto no window
const auth = window.FirebaseApp?.auth;
const db = window.FirebaseApp?.db;

// Se o erro persistir, use uma função para obter o auth apenas quando necessário:
function getFirebaseAuth() {
    if (!window.FirebaseApp) {
        console.error("❌ Erro: FirebaseApp não foi inicializado no window.");
        return null;
    }
    return window.FirebaseApp.auth;
}

// 1. Importações do Firebase (CDN)
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import { 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ===== ELEMENTOS DO DOM =====
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loading = document.getElementById('loading');

// ===== INICIALIZAÇÃO E MONITORAMENTO =====
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('login.html')) {
    initLoginPage();
  }

  // Observador em tempo real do Firebase
  onAuthStateChanged(window.FirebaseApp.auth, (user) => {
    if (user) {
      console.log("🔥 Firebase: Usuário conectado:", user.email);
    } else {
      console.log("❄️ Firebase: Nenhum usuário ativo");
    }
  });
});

// ===== PÁGINA DE LOGIN (CHIPS E LOGOUT) =====
function initLoginPage() {
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

// ===== LÓGICA DE LOGIN (SUBSTITUIÇÃO TOTAL) =====
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = usernameInput.value.trim();
    const password = passwordInput.value;

    // Limpar erros visuais (seu padrão atual)
    document.getElementById('usernameError')?.classList.remove('show');
    document.getElementById('passwordError')?.classList.remove('show');
    usernameInput.classList.remove('error');
    passwordInput.classList.remove('error');

    // Validar se o Firebase foi carregado
    if (!window.FirebaseApp) {
      alert('Erro: Conexão com Firebase não inicializada.');
      return;
    }

    // Iniciar Feedback de Loading
    loginBtn.disabled = true;
    if (loading) loading.classList.add('show');

    try {
      // A. Autenticar no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        window.FirebaseApp.auth, 
        email, 
        password
      );
      const fbUser = userCredential.user;

      // B. Buscar Perfil e Permissões no Firestore
      const userDocRef = doc(window.FirebaseApp.db, "users", fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('auth/profile-not-found');
      }

      const userData = userDoc.data();

      // C. Sincronizar com seu sistema atual (SessionStorage)
      const sessionData = {
        uid: fbUser.uid,
        name: userData.name || 'Usuário',
        username: fbUser.email,
        role: userData.role || 'ATENDENTE',
        permissions: userData.permissions || []
      };

      sessionStorage.setItem('currentUser', JSON.stringify(sessionData));

      // D. Redirecionar para o Painel Principal
      setTimeout(() => {
        window.location.href = 'Main.html';
      }, 500);

    } catch (error) {
      console.error("Erro no processo de login:", error.code);
      
      // Feedback visual de erro baseado no código do Firebase
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        usernameInput.classList.add('error');
        document.getElementById('usernameError')?.classList.add('show');
      } else if (error.code === 'auth/wrong-password') {
        passwordInput.classList.add('error');
        document.getElementById('passwordError')?.classList.add('show');
      } else if (error.code === 'auth/profile-not-found') {
        alert("Conta ativa, mas perfil não configurado no banco de dados.");
      } else {
        alert("Falha na conexão: " + error.message);
      }

      // Resetar UI
      loginBtn.disabled = false;
      if (loading) loading.classList.remove('show');
    }
  });
}

// ===== FUNÇÕES AUXILIARES (EXPOSTAS GLOBALMENTE) =====

window.isAuthenticated = function() {
  return sessionStorage.getItem('currentUser') !== null;
};

window.getCurrentUser = function() {
  const data = sessionStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
};

window.hasPermission = function(permission) {
  const user = window.getCurrentUser();
  if (!user) return false;
  // Se for ADMIN, tem todas as permissões
  if (user.role === 'ADMIN') return true;
  return user.permissions.includes(permission);
};

window.logout = async function() {
  try {
    // 1. Sair do Firebase
    await signOut(window.FirebaseApp.auth);
    // 2. Limpar dados locais
    sessionStorage.removeItem('currentUser');
    // 3. Voltar para o login
    window.location.href = 'login.html';
  } catch (error) {
    console.error("Erro ao deslogar:", error);
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
};

window.requireAuth = function() {
  if (!window.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

// Tornar as funções compatíveis com o que você já usa no Main.html
window.AuthSystem = {
    logout: window.logout,
    isAuthenticated: window.isAuthenticated,
    getCurrentUser: window.getCurrentUser,
    hasPermission: window.hasPermission
};

console.log("✅ Sistema de Autenticação Firebase ativado (Plug & Play)");
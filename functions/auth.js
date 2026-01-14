// ==================== AUTH.JS - INTEGRADO COM FIREBASE ====================

// 1. Importações do Firebase (CDN) - USANDO AS MESMAS VERSÕES DO CONFIG
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

// ===== INICIALIZAÇÃO E MONITORAMENTO =====
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('login.html')) {
    initLoginPage();
  }

  // Monitora o estado - Usamos um pequeno delay para garantir que o config carregou o window.FirebaseApp
  const checkAuth = setInterval(() => {
    if (window.FirebaseApp?.auth) {
      onAuthStateChanged(window.FirebaseApp.auth, (user) => {
        if (user) console.log("🔥 Firebase: Usuário conectado:", user.email);
        else console.log("❄️ Firebase: Nenhum usuário ativo");
      });
      clearInterval(checkAuth);
    }
  }, 500);
});

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

// ===== LÓGICA DE LOGIN (CORREÇÃO DO INVALID-ARGUMENT) =====
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = usernameInput.value.trim();
    const password = passwordInput.value;

    // Validação de segurança para não enviar undefined ao Firebase
    if (!window.FirebaseApp?.auth || !window.FirebaseApp?.db) {
      alert('Erro: Sistema Firebase não inicializado.');
      return;
    }

    // Feedback UI
    if (loginBtn) loginBtn.disabled = true;
    if (loading) loading.classList.add('show');

    try {
      // O ERRO ESTAVA AQUI: Passamos a instância correta (window.FirebaseApp.auth)
      // e os argumentos de string (email, password)
      const userCredential = await signInWithEmailAndPassword(
        window.FirebaseApp.auth, 
        email, 
        password
      );
      
      const fbUser = userCredential.user;

      // Buscar Perfil no Firestore
      const userDocRef = doc(window.FirebaseApp.db, "users", fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('auth/profile-not-found');
      }

      const userData = userDoc.data();

      // Sincronizar Sessão
      const sessionData = {
        uid: fbUser.uid,
        name: userData.name || 'Usuário',
        username: fbUser.email,
        role: userData.role || 'ATENDENTE',
        permissions: userData.customPermissions || userData.permissions || []
      };

      sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
      window.location.href = 'Main.html';

    } catch (error) {
      console.error("Erro no processo de login:", error.code, error.message);
      
      // Feedback visual
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        usernameInput.classList.add('error');
      } else if (error.code === 'auth/wrong-password') {
        passwordInput.classList.add('error');
      } else {
        alert("Falha: " + error.message);
      }

      if (loginBtn) loginBtn.disabled = false;
      if (loading) loading.classList.remove('show');
    }
  });
}

// ===== FUNÇÕES GLOBAIS =====
window.logout = async function() {
  if (window.FirebaseApp?.auth) {
    await signOut(window.FirebaseApp.auth);
  }
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
};

window.AuthSystem = {
    logout: window.logout,
    isAuthenticated: () => sessionStorage.getItem('currentUser') !== null,
    getCurrentUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    hasPermission: (perm) => {
      const user = JSON.parse(sessionStorage.getItem('currentUser'));
      return user?.role === 'ADMIN' || user?.permissions?.includes(perm);
    }
};
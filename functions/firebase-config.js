/**
 * CONFIGURAÇÃO CENTRAL DO FIREBASE
 * Este arquivo inicializa os serviços e os expõe globalmente.
 */

// 1. Importações dos módulos necessários via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 2. Suas credenciais (Pegue no Console do Firebase > Project Settings > Web App)
const firebaseConfig = {
  apiKey: "AIzaSyBk0quftYz1i0oxH0ZDiP7JyIlr58eTi7o",
  authDomain: "matheussistem-5282f.firebaseapp.com",
  projectId: "matheussistem-5282f",
  storageBucket: "matheussistem-5282f.firebasestorage.app",
  messagingSenderId: "454097711940",
  appId: "1:454097711940:web:7825bea96510ace7811d11"
};

// 3. Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Expor para o resto do sistema (Seguindo o seu padrão de window.Manager)
window.FirebaseApp = {
  auth,
  db
};

console.log("🔥 Firebase conectado com sucesso!");
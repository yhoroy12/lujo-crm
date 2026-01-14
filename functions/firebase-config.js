// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const db = getFirestore(app);
const auth = getAuth(app);


// 4. Expor para o resto do sistema (Seguindo o seu padrão de window.Manager)
window.FirebaseApp = {
    db,
    auth,
    fStore: { collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy },
    fAuth: { createUserWithEmailAndPassword }
};
console.log("🔥 Firebase conectado com sucesso!");
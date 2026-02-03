/* =====================================================
   CHAT CLIENTE - VERSÃO CORRIGIDA E FUNCIONAL
   Integração: Interface UI + AtendimentoServiceIntegrado
   
   CORREÇÕES APLICADAS:
   ✅ IDs dos botões corrigidos (btnSend)
   ✅ Campo timestamp unificado
   ✅ Autenticação anônima do cliente
   ✅ Estrutura de mensagem compatível com Firestore Rules
   ✅ Sincronização bidirecional operador ↔ cliente
===================================================== */

const service = window.AtendimentoServiceIntegrado;

const screens = {
  welcome: document.getElementById("screenWelcome"),
  conta: document.getElementById("screenIdentificarConta"),
  pessoa: document.getElementById("screenIdentificarPessoa"),
  fila: document.getElementById("screenFila"),
  chat: document.getElementById("screenChat"),
  finalizado: document.getElementById("screenFinalizado")
};

const headerStatus = document.getElementById("headerStatus");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const btnSend = document.getElementById("btnSend"); // ✅ CORRIGIDO: era btnEnviar
const loadingOverlay = document.getElementById("loadingOverlay");

let atendimentoTimer = null;
let segundosEspera = 0;
let segundosAtendimento = 0;
let notaSelecionada = 0;
let unsubscribeChat = null; // Para limpar listener do chat

/* =====================================================
   AUTENTICAÇÃO ANÔNIMA DO CLIENTE
===================================================== */

async function autenticarClienteAnonimo() {
  try {
    const auth = window.FirebaseApp?.auth;

    // Se já está autenticado, retorna
    if (auth.currentUser) {
      console.log("✅ Cliente já autenticado:", auth.currentUser.uid);
      return auth.currentUser;
    }

    // Autentica anonimamente
    const userCredential = await window.FirebaseApp.fAuth.signInAnonymously(
      window.FirebaseApp.auth
    );
    console.log("✅ Cliente autenticado anonimamente:", userCredential.user.uid);
    return userCredential.user;

  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    throw error;
  }
}

/* =====================================================
   FUNÇÕES DE APOIO (UI)
===================================================== */

function mostrarTela(tela) {
  if (!tela) return;
  Object.values(screens).forEach(s => s?.classList.remove("active"));
  tela.classList.add("active");
}

function toast(message, type = "success") {
  console.log(`[${type.toUpperCase()}]: ${message}`);
  if (window.NovoClienteNotificacaoManager) {
    window.NovoClienteNotificacaoManager.mostrarToast(message, type);
  } else {
    // Fallback simples
    const toastDiv = document.createElement('div');
    toastDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toastDiv.textContent = message;
    document.body.appendChild(toastDiv);

    setTimeout(() => {
      toastDiv.style.opacity = '0';
      toastDiv.style.transition = 'opacity 0.3s';
      setTimeout(() => toastDiv.remove(), 300);
    }, 3000);
  }
}

function atualizarTimerFila() {
  segundosEspera++;
  // ✅ CORREÇÃO 2: Preencher campos da tela de fila
  const posicaoEl = document.getElementById("posicaoFila");
  const tempoEstEl = document.getElementById("tempoEstimado");

  if (posicaoEl) posicaoEl.textContent = "1º na fila";

  // Estimativa: 2 min por posição na fila
  const minEstimado = Math.max(1, Math.ceil((segundosEspera) / 60));
  if (tempoEstEl) tempoEstEl.textContent = `~${minEstimado} min`;
}
function atualizarTimerChat() {
  segundosAtendimento++;
  const mins = Math.floor(segundosAtendimento / 60);
  const secs = segundosAtendimento % 60;
  const timerElement = document.getElementById("tempoAtendimento");
  if (timerElement) {
    timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}


/* =====================================================
   FLUXO DE NAVEGAÇÃO E REGRAS DE NEGÓCIO
===================================================== */

// Botão iniciar atendimento
const btnIniciar = document.getElementById("btnIniciarAtendimento");
if (btnIniciar) {
  btnIniciar.onclick = () => mostrarTela(screens.conta);
}

const btnVoltarWelcome = document.getElementById('btnVoltarWelcome');
if (btnVoltarWelcome) {
  btnVoltarWelcome.onclick = () => mostrarTela(screens.welcome);
}

const btnVoltarConta = document.getElementById('btnVoltarConta');
if (btnVoltarConta) {
  btnVoltarConta.onclick = () => mostrarTela(screens.conta);
}

// Formulário identificação conta
const formConta = document.getElementById('formIdentificarConta');
if (formConta) {
  formConta.onsubmit = (e) => {
    e.preventDefault();
    mostrarTela(screens.pessoa);
  };
}

// Formulário identificação pessoa
const formPessoa = document.getElementById('formIdentificarPessoa');
if (formPessoa) {
  formPessoa.onsubmit = async (e) => {
    e.preventDefault();

    const dados = {
      nome: document.getElementById('nomeCompleto').value,
      telefone: document.getElementById('telefone').value,
      email: document.getElementById('emailConta').value
    };

    try {
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');

      // ✅ AUTENTICAR CLIENTE ANONIMAMENTE PRIMEIRO
      const user = await autenticarClienteAnonimo();

      // Adicionar UID do cliente aos dados
      dados.uid_cliente = user.uid;

      // Inicia atendimento e obtém o ID
      const atendimentoId = await service.clienteIniciarAtendimento(dados);
      sessionStorage.setItem('atendimentoId', atendimentoId);

      segundosEspera = 0;
      atendimentoTimer = setInterval(atualizarTimerFila, 1000);

      mostrarTela(screens.fila);
      toast("Você entrou na fila de espera", "success");

      // Começa a vigiar se o operador aceita
      ligarMonitorDeStatus(atendimentoId);

    } catch (error) {
      console.error("Erro ao iniciar:", error);
      toast("Falha ao conectar. Verifique sua conexão.", "error");
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
  };
}

/* =====================================================
   SISTEMA DE EVENTOS E SINCRONIZAÇÃO FIREBASE
===================================================== */

const ligarMonitorDeStatus = (atendimentoId) => {
  const db = window.FirebaseApp.db;
  const { doc, onSnapshot } = window.FirebaseApp.fStore;

  const unsubscribe = onSnapshot(doc(db, "atend_chat_fila", atendimentoId), (docSnap) => {
    if (docSnap.exists()) {
      const dados = docSnap.data();
      const novoStatus = dados.status;

      console.log("📊 Status atual:", novoStatus);

      // Dispara evento para o listener abaixo
      const evento = new CustomEvent('statusMudou', {
        detail: {
          status: novoStatus,
          dados: dados,
          atendimentoId: atendimentoId
        }
      });
      window.dispatchEvent(evento);

      if (novoStatus === 'concluido') {
        unsubscribe();
      }
    }
  }, (error) => {
    console.error("❌ Erro ao monitorar status:", error);
  });
};

window.addEventListener('statusMudou', (e) => {
  const { status, dados, atendimentoId } = e.detail;
  

  console.log("🔔 Status mudou para:", status);

  if (status === 'em_atendimento') {
    if (atendimentoTimer) clearInterval(atendimentoTimer);

    // Mostrar tela de chat
    mostrarTela(screens.chat);

    // Iniciar timer do atendimento
    segundosAtendimento = 0;
    atendimentoTimer = setInterval(atualizarTimerChat, 1000);

    // ✅ CONECTA O CHAT EM TEMPO REAL
    conectarChatCliente(atendimentoId);

    // Atualizar header com nome do operador
    if (headerStatus) {
      const statusText = headerStatus.querySelector('.status-text');
      const statusDot = headerStatus.querySelector('.status-dot');
      if (statusText) {
        statusText.textContent = `Conversando com ${dados.operador?.nome || "Atendente"}`;
      }
      if (statusDot) {
        statusDot.classList.add('online');
      }
    }

    // Mostrar informações do operador
    const operatorInfo = document.getElementById('operatorInfo');
    const operatorName = document.getElementById('operatorName');
    if (operatorInfo && operatorName) {
      operatorInfo.style.display = 'flex';
      operatorName.textContent = dados.operador?.nome || "Atendente";
    }

    toast("Um atendente aceitou seu chamado!", "success");
  }

  if (status === 'concluido') {
    mostrarTela(screens.finalizado);
    if (atendimentoTimer) clearInterval(atendimentoTimer);

    // Limpar listener do chat
    if (unsubscribeChat) {
      unsubscribeChat();
      unsubscribeChat = null;
    }

    // Copiar mensagens para histórico (somente leitura)
    copiarMensagensParaHistorico();
  }
});

const conectarChatCliente = (atendimentoId) => {
  const db = window.FirebaseApp.db;
  const { collection, query, orderBy, onSnapshot } = window.FirebaseApp.fStore;

  // Limpar listener anterior se existir
  if (unsubscribeChat) {
    unsubscribeChat();
  }

  // ✅ CORRIGIDO: Usar 'timestamp' como campo de ordenação
  const q = query(
    collection(db, "atend_chat_fila", atendimentoId, "mensagem"),
    orderBy("timestamp", "asc")
  );

  console.log("👂 Conectando chat do cliente ao atendimento:", atendimentoId);

  unsubscribeChat = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const msgData = change.doc.data();
        renderizarMensagem(msgData);
      }
    });
  }, (error) => {
    console.error("❌ Erro ao escutar mensagens:", error);
    toast("Erro ao conectar chat", "error");
  });
};

function renderizarMensagem(msg) {
  if (!messagesContainer) return;

  const msgDiv = document.createElement("div");

  // ✅ CSS: .message.user para cliente, .message.operator para operador
  const isCliente = msg.autor === 'cliente';
  msgDiv.className = `message ${isCliente ? 'user' : 'operator'}`;

  // ✅ Converter timestamp do Firestore
  let hora = '--:--';
  if (msg.timestamp?.toDate) {
    const data = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
    hora = data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    // FALLBACK: Se o timestamp for null (processando), usa a hora atual do sistema
    console.log("⏳ Timestamp pendente no Firebase, usando hora local...");
    hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  msgDiv.innerHTML = `
    <div class="message-content">
      <p>${escapeHtml(msg.texto)}</p>
      <span class="time">${hora}</span>
    </div>
  `;

  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* =====================================================
   AÇÕES DO CHAT
===================================================== */

async function executarEnvio() {
  const texto = messageInput?.value.trim();
  if (!texto) return;

  try {
    const atendimentoId = service.atendimentoAtivo ||
      window.AtendimentoDataStructure?.state?.atendimentoId;

    if (!atendimentoId) {
      console.error("❌ Nenhum atendimento ativo");
      toast("Erro: atendimento não encontrado", "error");
      return;
    }

    const db = window.FirebaseApp.db;
    const { collection, addDoc, serverTimestamp } = window.FirebaseApp.fStore;
    const auth = window.FirebaseApp.auth;

    // Limpar input imediatamente (UX melhor)
    messageInput.value = '';

    // ✅ ESTRUTURA CORRETA: compatível com Firestore Rules
    await addDoc(
      collection(db, "atend_chat_fila", atendimentoId, "mensagem"),
      {
        autor: "cliente",
        texto: texto,
        timestamp: serverTimestamp(), // ✅ Campo unificado
        uid_autor: auth.currentUser?.uid || null
      }
    );

    console.log("✅ Mensagem enviada com sucesso");

    // Focar novamente no input
    messageInput.focus();

  } catch (error) {
    console.error("❌ Erro ao enviar:", error);
    toast("Erro ao enviar mensagem", "error");

    // Restaurar texto se houve erro
    if (texto && messageInput) {
      messageInput.value = texto;
    }
  }
}

// ✅ CORRIGIDO: Usar btnSend ao invés de btnEnviar
if (btnSend) {
  btnSend.onclick = executarEnvio;
}

if (messageInput) {
  messageInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executarEnvio();
    }
  };
}

/* =====================================================
   FINALIZAR CHAMADO (CLIENTE)
===================================================== */

const btnFinalizarChamado = document.getElementById('btnFinalizarChamado');
if (btnFinalizarChamado) {
  btnFinalizarChamado.onclick = async () => {
    if (!confirm('Deseja realmente finalizar este atendimento?')) {
      return;
    }

    try {
      const atendimentoId = service.atendimentoAtivo ||
        window.AtendimentoDataStructure?.state?.atendimentoId;

      if (!atendimentoId) return;

      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;

      await updateDoc(doc(db, "atend_chat_fila", atendimentoId), {
        status: "concluido",
        finalizadoEm: serverTimestamp(),
        finalizadoPor: "cliente"
      });

      toast("Atendimento finalizado!", "success");

    } catch (error) {
      console.error("❌ Erro ao finalizar:", error);
      toast("Erro ao finalizar atendimento", "error");
    }
  };
}

/* =====================================================
   SISTEMA DE AVALIAÇÃO
===================================================== */

const stars = document.querySelectorAll(".star");
stars.forEach((star, index) => {
  star.addEventListener("click", () => {
    notaSelecionada = index + 1;
    stars.forEach((s, i) => {
      if (i <= index) {
        s.classList.add("selected");
      } else {
        s.classList.remove("selected");
      }
    });
  });
});

const btnEnviarAvaliacao = document.getElementById('btnEnviarAvaliacao');
if (btnEnviarAvaliacao) {
  btnEnviarAvaliacao.onclick = async () => {
    if (notaSelecionada === 0) {
      toast("Por favor, selecione uma nota", "warning");
      return;
    }

    const comentario = document.getElementById("comentarioAvaliacao")?.value || "";

    try {
      const atendimentoId = service.atendimentoAtivo ||
        window.AtendimentoDataStructure?.state?.atendimentoId;

      if (!atendimentoId) return;

      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;

      await updateDoc(doc(db, "atend_chat_fila", atendimentoId), {
        avaliacao: notaSelecionada,
        comentarioAvaliacao: comentario,
        avaliadoEm: serverTimestamp()
      });

      toast("Obrigado pela sua avaliação!", "success");

      // Esconder container de avaliação
      const ratingContainer = document.getElementById('ratingContainer');
      if (ratingContainer) {
        ratingContainer.style.display = 'none';
      }

    } catch (error) {
      console.error("❌ Erro ao salvar avaliação:", error);
      toast("Erro ao enviar avaliação", "error");
    }
  };
}

const btnNovoAtendimento = document.getElementById("btnNovoAtendimento");
if (btnNovoAtendimento) {
  btnNovoAtendimento.onclick = () => {
    // Limpar dados da sessão
    sessionStorage.clear();
    localStorage.removeItem('atendimentoId');

    // Recarregar página
    location.reload();
  };
}

/* =====================================================
   COPIAR MENSAGENS PARA HISTÓRICO
===================================================== */

async function copiarMensagensParaHistorico() {
  const messagesReadonly = document.getElementById('messagesReadonly');
  if (!messagesReadonly) return;

  const atendimentoId = window.AtendimentoDataStructure?.state?.atendimentoId ||
    sessionStorage.getItem('atendimentoId');

  if (!atendimentoId) {
    // Fallback: se ainda tem mensagens no DOM, clona
    if (messagesContainer && messagesContainer.innerHTML) {
      messagesReadonly.innerHTML = messagesContainer.innerHTML;
    }
    return;
  }

  try {
    const db = window.FirebaseApp.db;
    const { collection, query, orderBy, getDocs } = window.FirebaseApp.fStore;

    const q = query(
      collection(db, "atend_chat_fila", atendimentoId, "mensagem"),
      orderBy("timestamp", "asc")
    );

    const snapshot = await getDocs(q);
    messagesReadonly.innerHTML = '';

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const isCliente = msg.autor === 'cliente';

      let hora = '--:--';
      if (msg.timestamp?.toDate) {
        hora = msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      const msgDiv = document.createElement('div');
      msgDiv.className = `message ${isCliente ? 'user' : 'operator'}`;
      msgDiv.innerHTML = `
        <div class="message-content">
          <p>${escapeHtml(msg.texto)}</p>
          <span class="time">${hora}</span>
        </div>
      `;
      messagesReadonly.appendChild(msgDiv);
    });

    console.log(`✅ Histórico carregado do Firestore (${snapshot.size} mensagens)`);
  } catch (error) {
    console.error("❌ Erro ao carregar histórico:", error);

    // Fallback: clona o DOM se ainda existe
    if (messagesContainer && messagesContainer.innerHTML) {
      messagesReadonly.innerHTML = messagesContainer.innerHTML;
    }
  }
}

/* =====================================================
   CANCELAR FILA
===================================================== */

const btnCancelarFila = document.getElementById('btnCancelarFila');
if (btnCancelarFila) {
  btnCancelarFila.onclick = async () => {
    if (!confirm('Deseja realmente sair da fila de atendimento?')) {
      return;
    }

    try {
      const atendimentoId = service.atendimentoAtivo ||
        window.AtendimentoDataStructure?.state?.atendimentoId;

      if (!atendimentoId) return;

      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;

      await updateDoc(doc(db, "atend_chat_fila", atendimentoId), {
        status: "cancelado",
        canceladoEm: serverTimestamp(),
        canceladoPor: "cliente"
      });

      // Limpar timer
      if (atendimentoTimer) clearInterval(atendimentoTimer);

      // Voltar para tela inicial
      mostrarTela(screens.welcome);

      toast("Você saiu da fila", "info");

    } catch (error) {
      console.error("❌ Erro ao cancelar:", error);
      toast("Erro ao cancelar atendimento", "error");
    }
  };
}
/* =====================================================
   PERSISTÊNCIA DE SESSÃO
   Verifica se o usuário já tem um atendimento ativo ao carregar/recarregar
===================================================== */
window.addEventListener('DOMContentLoaded', async () => {
  console.log("🔍 Verificando sessão existente...");

  // Recupera o ID salvo pelo AtendimentoDataStructureManager
  const atendimentoIdSalvo = sessionStorage.getItem('atendimentoId');

  if (atendimentoIdSalvo) {
    console.log("✅ Atendimento encontrado na sessão:", atendimentoIdSalvo);

    try {
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');

      // Garante que o cliente está autenticado para o Firebase aceitar a consulta
      await autenticarClienteAnonimo();

      // Reativa o monitor de status para decidir em qual tela o usuário deve estar
      ligarMonitorDeStatus(atendimentoIdSalvo);

      console.log("🚀 Monitor de status reativado para:", atendimentoIdSalvo);
    } catch (error) {
      console.error("❌ Erro ao recuperar sessão:", error);
      sessionStorage.removeItem('atendimentoId');
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
  } else {
    console.log("ℹ️ Nenhuma sessão ativa encontrada.");
  }
});


/* =====================================================
   LIMPEZA AO SAIR DA PÁGINA
===================================================== */

window.addEventListener('beforeunload', () => {
  if (unsubscribeChat) {
    unsubscribeChat();
  }
  if (service?.limpar) {
    service.limpar();
  }
});

/* =====================================================
   INICIALIZAÇÃO
===================================================== */
/* =====================================================
   DEBUG – MOSTRAR UID LOGADA NO NAVEGADOR
===================================================== */
const auth = window.FirebaseApp?.auth;

if (auth) {
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("🧑‍💻 UID logada no navegador:", user.uid);
      console.log("🔐 Tipo de login:", user.isAnonymous ? "ANÔNIMO" : "REGISTRADO");
    } else {
      console.log("🚫 Nenhum usuário autenticado no navegador");
    }
  });
}
console.log("✅ Chat do Cliente carregado e pronto!");
console.log("📱 Aguardando ação do usuário...");
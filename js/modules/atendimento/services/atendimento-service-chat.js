/* =====================================================
   CHAT CLIENTE - VERSÃO REFATORADA E ROBUSTA
   Correções:
   ✅ Persistência de sessão robusta
   ✅ Normalização de estados
   ✅ Listener unificado
   ✅ Reconexão automática
   ✅ Tratamento de erros completo
===================================================== */

const service = window.AtendimentoServiceIntegrado;
const stateMachine = window.StateMachineManager;

// Elementos da interface
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
const btnSend = document.getElementById("btnSend");
const loadingOverlay = document.getElementById("loadingOverlay");

// Estado gerenciado centralmente
let clienteState = {
  atendimentoId: null,
  status: null,
  uid: null,
  operador: null,
  timerInterval: null,
  segundosEspera: 0,
  segundosAtendimento: 0,
  listeners: {
    status: null,
    mensagens: null
  },
  reconexoes: 0,
  maxReconexoes: 5
};

/* =====================================================
   SISTEMA DE PERSISTÊNCIA ROBUSTO
===================================================== */

function salvarEstadoSessao() {
  const estado = {
    atendimentoId: clienteState.atendimentoId,
    uid: clienteState.uid,
    status: clienteState.status,
    timestamp: Date.now()
  };
  
  // Salvar em múltiplos locais para redundância
  sessionStorage.setItem('clienteAtendimento', JSON.stringify(estado));
  localStorage.setItem('clienteAtendimentoBackup', JSON.stringify(estado));
  
  console.log('💾 Estado salvo na sessão:', estado);
}

function carregarEstadoSessao() {
  try {
    // Tentar sessionStorage primeiro
    let estado = sessionStorage.getItem('clienteAtendimento');
    
    if (!estado) {
      // Fallback para localStorage
      estado = localStorage.getItem('clienteAtendimentoBackup');
    }
    
    if (estado) {
      const parsed = JSON.parse(estado);
      
      // Verificar se não expirou (30 minutos)
      const tempoDecorrido = Date.now() - parsed.timestamp;
      const EXPIRACAO = 30 * 60 * 1000; // 30 minutos
      
      if (tempoDecorrido < EXPIRACAO) {
        clienteState.atendimentoId = parsed.atendimentoId;
        clienteState.uid = parsed.uid;
        clienteState.status = parsed.status;
        return parsed;
      } else {
        console.log('⌛ Sessão expirada, limpando...');
        limparSessao();
      }
    }
  } catch (error) {
    console.error('❌ Erro ao carregar sessão:', error);
  }
  
  return null;
}

function limparSessao() {
  clienteState = {
    atendimentoId: null,
    status: null,
    uid: null,
    operador: null,
    timerInterval: null,
    segundosEspera: 0,
    segundosAtendimento: 0,
    listeners: { status: null, mensagens: null },
    reconexoes: 0
  };
  
  sessionStorage.removeItem('clienteAtendimento');
  localStorage.removeItem('clienteAtendimentoBackup');
  sessionStorage.removeItem('atendimentoId');
  
  console.log('🧹 Sessão limpa');
}

/* =====================================================
   NORMALIZAÇÃO DE ESTADOS (compatível com State Machine)
===================================================== */

function normalizarStatus(status) {
  if (!status) return 'FILA';
  
  const mapa = {
    'novo': 'NOVO',
    'fila': 'FILA',
    'identidade_validada': 'IDENTIDADE_VALIDADA',
    'em_atendimento': 'EM_ATENDIMENTO',
    'concluido': 'CONCLUIDO',
    'encaminhado': 'ENCAMINHADO',
    'cancelado': 'CANCELADO'
  };
  
  // Tentar mapeamento
  const statusLower = status.toLowerCase();
  const normalizado = mapa[statusLower];
  
  if (normalizado) {
    return normalizado;
  }
  
  // Se já está em maiúsculo, usar como está
  if (status === status.toUpperCase()) {
    return status;
  }
  
  // Default: converter para maiúsculo
  return status.toUpperCase();
}

/* =====================================================
   GERENCIADOR DE LISTENERS UNIFICADO
===================================================== */

class ClienteListenerManager {
  constructor() {
    this.db = window.FirebaseApp?.db;
    this.fStore = window.FirebaseApp?.fStore;
  }
  
  iniciarMonitoramento(atendimentoId) {
    this.pararMonitoramento();
    this.iniciarListenerStatus(atendimentoId);
    this.iniciarListenerMensagens(atendimentoId);
  }
  
  iniciarListenerStatus(atendimentoId) {
    if (clienteState.listeners.status) {
      clienteState.listeners.status();
    }
    
    const docRef = this.fStore.doc(this.db, "atend_chat_fila", atendimentoId);
    
    clienteState.listeners.status = this.fStore.onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          console.error('❌ Atendimento não encontrado:', atendimentoId);
          this.tratarAtendimentoNaoEncontrado();
          return;
        }
        
        const dados = docSnap.data();
        const statusNormalizado = normalizarStatus(dados.status);
        
        console.log('📊 Status atualizado:', {
          antigo: clienteState.status,
          novo: statusNormalizado,
          dados: dados.status
        });
        
        // Atualizar estado local
        clienteState.status = statusNormalizado;
        clienteState.operador = dados.operador;
        
        // Processar ações baseadas no status
        this.processarStatus(statusNormalizado, dados);
      },
      (error) => {
        console.error('❌ Erro no listener de status:', error);
        this.tratarErroListener(error, 'status');
      }
    );
    
    console.log('👂 Listener de status iniciado para:', atendimentoId);
  }
  
  iniciarListenerMensagens(atendimentoId) {
    if (clienteState.listeners.mensagens) {
      clienteState.listeners.mensagens();
    }
    
    const mensagensRef = this.fStore.collection(
      this.db,
      "atend_chat_fila",
      atendimentoId,
      "mensagem"
    );
    
    const q = this.fStore.query(
      mensagensRef,
      this.fStore.orderBy("timestamp", "asc")
    );
    
    clienteState.listeners.mensagens = this.fStore.onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msgData = change.doc.data();
            this.renderizarMensagem(msgData);
          }
        });
      },
      (error) => {
        console.error('❌ Erro no listener de mensagens:', error);
        this.tratarErroListener(error, 'mensagens');
      }
    );
    
    console.log('👂 Listener de mensagens iniciado para:', atendimentoId);
  }
  
  processarStatus(status, dados) {
    switch(status) {
      case 'NOVO':
        this.aoOperadorAceitar(dados);
        break;
        
      case 'EM_ATENDIMENTO':
        this.aoIniciarAtendimento(dados);
        break;
        
      case 'CONCLUIDO':
        this.aoConcluirAtendimento(dados);
        break;
        
      case 'CANCELADO':
        this.aoCancelarAtendimento();
        break;
    }
  }
  
  aoOperadorAceitar(dados) {
    console.log('✅ Operador aceitou o atendimento');
    
    // Parar timer da fila
    if (clienteState.timerInterval) {
      clearInterval(clienteState.timerInterval);
    }
    
    // Atualizar UI
    mostrarTela(screens.chat);
    
    // Iniciar timer do atendimento
    clienteState.segundosAtendimento = 0;
    clienteState.timerInterval = setInterval(atualizarTimerChat, 1000);
    
    // Atualizar header
    if (headerStatus) {
      const statusText = headerStatus.querySelector('.status-text');
      const statusDot = headerStatus.querySelector('.status-dot');
      if (statusText) {
        const nomeOperador = dados.operador?.nome || "Atendente";
        statusText.textContent = `Conversando com ${nomeOperador}`;
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
  
  aoIniciarAtendimento(dados) {
    console.log('🚀 Atendimento iniciado');
    // Chat já deve estar aberto pelo status NOVO
  }
  
  aoConcluirAtendimento(dados) {
    console.log('🏁 Atendimento concluído');
    
    // Parar todos os timers
    if (clienteState.timerInterval) {
      clearInterval(clienteState.timerInterval);
    }
    
    // Parar listeners
    this.pararMonitoramento();
    
    // Mostrar tela finalizada
    mostrarTela(screens.finalizado);
    
    // Copiar mensagens para histórico
    copiarMensagensParaHistorico();
    
    // Atualizar estado
    salvarEstadoSessao();
  }
  
  aoCancelarAtendimento() {
    console.log('❌ Atendimento cancelado');
    
    // Parar timers
    if (clienteState.timerInterval) {
      clearInterval(clienteState.timerInterval);
    }
    
    // Parar listeners
    this.pararMonitoramento();
    
    // Mostrar tela inicial
    mostrarTela(screens.welcome);
    
    // Limpar sessão
    limparSessao();
    
    toast("Atendimento cancelado", "info");
  }
  
  renderizarMensagem(msgData) {
  if (!messagesContainer) return;
  
  const msgDiv = document.createElement("div");
  const isCliente = msgData.autor === 'cliente';
  msgDiv.className = `message ${isCliente ? 'user' : 'operator'}`;
  
  // 🔥 CORREÇÃO: Formatar hora de forma mais robusta
  let hora = '--:--';
  try {
    let timestamp = msgData.timestamp;
    
    // Caso 1: É um objeto Timestamp do Firebase
    if (timestamp && typeof timestamp.toDate === 'function') {
      const data = timestamp.toDate();
      hora = data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Caso 2: É um objeto com propriedades seconds/nanoseconds
    else if (timestamp && timestamp.seconds) {
      const data = new Date(timestamp.seconds * 1000);
      hora = data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Caso 3: É um Date object ou string
    else if (timestamp) {
      const data = new Date(timestamp);
      if (!isNaN(data.getTime())) {
        hora = data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    // Caso 4: Usar hora atual como fallback
    else {
      hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    console.warn('⚠️ Erro ao formatar hora da mensagem:', error);
    // Fallback para hora atual
    hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Sanitizar texto para evitar XSS
  const texto = msgData.texto || '';
  const textoSanitizado = escapeHtml(texto);
  
  msgDiv.innerHTML = `
    <div class="message-content">
      <p>${textoSanitizado}</p>
      <span class="time">${hora}</span>
    </div>
  `;
  
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  // 🔥 DEBUG: Log para verificar o timestamp
  console.log('🕒 Hora renderizada:', {
    autor: msgData.autor,
    hora: hora,
    timestamp: msgData.timestamp,
    tipo: typeof msgData.timestamp
  });
}
  
  tratarErroListener(error, tipo) {
    console.error(`❌ Erro no listener de ${tipo}:`, error);
    
    // Incrementar tentativas
    clienteState.reconexoes++;
    
    if (clienteState.reconexoes <= clienteState.maxReconexoes) {
      const delay = Math.min(1000 * Math.pow(2, clienteState.reconexoes), 30000);
      console.log(`🔄 Tentando reconexão ${clienteState.reconexoes}/${clienteState.maxReconexoes} em ${delay}ms`);
      
      setTimeout(() => {
        if (clienteState.atendimentoId) {
          this.iniciarListenerStatus(clienteState.atendimentoId);
        }
      }, delay);
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      toast("Conexão perdida. Por favor, recarregue a página.", "error");
    }
  }
  
  tratarAtendimentoNaoEncontrado() {
    toast("Atendimento não encontrado. Inicie um novo.", "error");
    limparSessao();
    mostrarTela(screens.welcome);
  }
  
  pararMonitoramento() {
    if (clienteState.listeners.status) {
      clienteState.listeners.status();
      clienteState.listeners.status = null;
    }
    
    if (clienteState.listeners.mensagens) {
      clienteState.listeners.mensagens();
      clienteState.listeners.mensagens = null;
    }
    
    console.log('🛑 Monitoramento parado');
  }
}

// Instanciar gerenciador
const clienteListeners = new ClienteListenerManager();

/* =====================================================
   FUNÇÕES AUXILIARES
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
  clienteState.segundosEspera++;
  const posicaoEl = document.getElementById("posicaoFila");
  const tempoEstEl = document.getElementById("tempoEstimado");
  
  if (posicaoEl) posicaoEl.textContent = "1º na fila";
  
  const minEstimado = Math.max(1, Math.ceil(clienteState.segundosEspera / 60));
  if (tempoEstEl) tempoEstEl.textContent = `~${minEstimado} min`;
}

function atualizarTimerChat() {
  clienteState.segundosAtendimento++;
  const mins = Math.floor(clienteState.segundosAtendimento / 60);
  const secs = clienteState.segundosAtendimento % 60;
  const timerElement = document.getElementById("tempoAtendimento");
  if (timerElement) {
    timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function mostrarLoading(mostrar, texto = "Carregando...") {
  if (!loadingOverlay) return;
  
  if (mostrar) {
    loadingOverlay.classList.remove('hidden');
    const textElement = loadingOverlay.querySelector('#loadingText');
    if (textElement) textElement.textContent = texto;
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

/* =====================================================
   FUNÇÕES DO ANTERIOR (MANTIDAS)
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

async function copiarMensagensParaHistorico() {
  const messagesReadonly = document.getElementById('messagesReadonly');
  if (!messagesReadonly) return;

  const atendimentoId = clienteState.atendimentoId || sessionStorage.getItem('atendimentoId');

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

async function monitorarFinalizacaoPorOperador(atendimentoId) {
  const db = window.FirebaseApp.db;
  const fStore = window.FirebaseApp.fStore;
  const { doc, onSnapshot, updateDoc, serverTimestamp } = fStore;

  // Listener para monitorar mudanças no documento
  const unsubscribe = onSnapshot(
    doc(db, "atend_chat_fila", atendimentoId),
    async (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        const status = dados.status;
        
        // ✅ VERIFICAR SE STATUS MUDOU PARA "concluido"
        if (status === "concluido" || status === "CONCLUIDO") {
          console.log('🔔 Status mudou para CONCLUIDO');
          
          // Verificar se já tem quem finalizou
          if (!dados.finalizadoPor || dados.finalizadoPor === "cliente") {
            // Buscar UID do operador que está responsável
            const operadorUid = dados.atribuido_para_uid || 
                               dados.operador?.uid || 
                               "operador_desconhecido";
            
            const operadorNome = dados.operador?.nome || "Operador";
            
            console.log(`✅ Registrando finalização por operador: ${operadorNome} (${operadorUid})`);
            
            // Atualizar para registrar que foi o operador
            try {
              await updateDoc(doc(db, "atend_chat_fila", atendimentoId), {
                finalizadoPor: "operador",
                finalizadoPorUid: operadorUid,
                finalizadoPorNome: operadorNome,
                finalizadoEm: serverTimestamp(),
                timeline: fStore.arrayUnion({
                  evento: "finalizado_por_operador",
                  timestamp: serverTimestamp(),
                  usuario: operadorUid,
                  descricao: `Finalizado por operador ${operadorNome}`
                })
              });
              
              console.log('✅ Finalização registrada para operador');
              
              // Parar o listener
              unsubscribe();
            } catch (error) {
              console.error('❌ Erro ao registrar finalização:', error);
            }
          }
        }
      }
    },
    (error) => {
      console.error('❌ Erro no monitor de finalização:', error);
    }
  );
  
  return unsubscribe;
}

/* =====================================================
   FLUXO DE ATENDIMENTO (atualizado)
===================================================== */

async function iniciarNovoAtendimento(dados) {
  try {
    mostrarLoading(true, "Iniciando atendimento...");
    
    // 1. Autenticar cliente anonimamente
    const user = await autenticarClienteAnonimo();
    dados.uid_cliente = user.uid;
    clienteState.uid = user.uid;
    
    // 2. Criar atendimento usando o serviço integrado
    const atendimentoId = await service.clienteIniciarAtendimento(dados);
    
    // 3. Salvar estado local
    clienteState.atendimentoId = atendimentoId;
    clienteState.status = 'FILA';
    clienteState.segundosEspera = 0;
    
    // 4. Iniciar monitoramento
    clienteListeners.iniciarMonitoramento(atendimentoId);
    
    // 5. Iniciar timer da fila
    clienteState.timerInterval = setInterval(atualizarTimerFila, 1000);
    
    // 6. Salvar sessão
    salvarEstadoSessao();
    
    // 7. Mostrar tela de fila
    mostrarTela(screens.fila);
    toast("Você entrou na fila de espera", "success");
    
  } catch (error) {
    console.error('❌ Erro ao iniciar atendimento:', error);
    toast("Falha ao iniciar atendimento. Tente novamente.", "error");
    mostrarTela(screens.welcome);
  } finally {
    mostrarLoading(false);
  }
}

/* =====================================================
   ENVIO DE MENSAGENS (atualizado)
===================================================== */

async function enviarMensagem() {
  const texto = messageInput?.value.trim();
  if (!texto || !clienteState.atendimentoId) return;
  
  try {
    // Limpar input imediatamente
    const textoBackup = texto;
    messageInput.value = '';
    
    // 🔥 CORREÇÃO: Enviar diretamente pelo Firebase, não pelo service
    const db = window.FirebaseApp.db;
    const fStore = window.FirebaseApp.fStore;
    const auth = window.FirebaseApp.auth;
    
    await fStore.addDoc(
      fStore.collection(
        db,
        "atend_chat_fila",
        clienteState.atendimentoId,
        "mensagem"
      ),
      {
        autor: "cliente",
        texto: textoBackup,
        timestamp: fStore.serverTimestamp(),
        uid_autor: auth.currentUser?.uid || clienteState.uid
      }
    );
    
    console.log('✅ Mensagem enviada pelo cliente');
    
    // Focar novamente no input
    messageInput.focus();
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    toast("Erro ao enviar mensagem", "error");
    
    // Restaurar texto
    if (messageInput) {
      messageInput.value = texto;
    }
  }
}
/* =====================================================
   RESTAURAÇÃO DE SESSÃO AO CARREGAR
===================================================== */

async function restaurarSessao() {
  console.log('🔍 Verificando sessão existente...');
  
  const estado = carregarEstadoSessao();
  
  if (!estado || !estado.atendimentoId) {
    console.log('ℹ️ Nenhuma sessão ativa encontrada');
    return;
  }
  
  console.log('🔄 Restaurando sessão:', estado);
  
  try {
    mostrarLoading(true, "Restaurando atendimento...");
    
    // 1. Autenticar novamente
    await autenticarClienteAnonimo();
    
    // 2. Verificar se atendimento ainda existe
    const db = window.FirebaseApp.db;
    const fStore = window.FirebaseApp.fStore;
    const docSnap = await fStore.getDoc(fStore.doc(db, "atend_chat_fila", estado.atendimentoId));
    
    if (!docSnap.exists()) {
      console.warn('⚠️ Atendimento não encontrado no Firestore');
      limparSessao();
      return;
    }
    
    const dados = docSnap.data();
    const status = normalizarStatus(dados.status);
    
    // 3. Restaurar estado
    clienteState.atendimentoId = estado.atendimentoId;
    clienteState.status = status;
    clienteState.uid = estado.uid;
    clienteState.operador = dados.operador;
    
    // 4. Navegar para tela apropriada
    if (status === 'FILA') {
      mostrarTela(screens.fila);
      clienteListeners.iniciarMonitoramento(estado.atendimentoId);
      clienteState.timerInterval = setInterval(atualizarTimerFila, 1000);
    } else if (status === 'NOVO' || status === 'EM_ATENDIMENTO') {
      mostrarTela(screens.chat);
      clienteListeners.iniciarMonitoramento(estado.atendimentoId);
      // Simular evento de operador aceitar
      clienteListeners.aoOperadorAceitar(dados);
    } else if (status === 'CONCLUIDO' || status === 'ENCAMINHADO') {
      mostrarTela(screens.finalizado);
      copiarMensagensParaHistorico();
    } else {
      mostrarTela(screens.welcome);
    }
    
    console.log('✅ Sessão restaurada com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao restaurar sessão:', error);
    limparSessao();
    mostrarTela(screens.welcome);
  } finally {
    mostrarLoading(false);
  }
}

/* =====================================================
   EVENT LISTENERS E INICIALIZAÇÃO
===================================================== */

// Botão iniciar atendimento
const btnIniciar = document.getElementById("btnIniciarAtendimento");
if (btnIniciar) {
  btnIniciar.onclick = () => mostrarTela(screens.conta);
}

// Botões de navegação
const btnVoltarWelcome = document.getElementById('btnVoltarWelcome');
if (btnVoltarWelcome) btnVoltarWelcome.onclick = () => mostrarTela(screens.welcome);

const btnVoltarConta = document.getElementById('btnVoltarConta');
if (btnVoltarConta) btnVoltarConta.onclick = () => mostrarTela(screens.conta);

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
      nome: document.getElementById('nomeCompleto').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      email: document.getElementById('emailConta').value.trim()
    };
    
    await iniciarNovoAtendimento(dados);
  };
}

// Botão enviar mensagem
if (btnSend) {
  btnSend.onclick = enviarMensagem;
}

// Enter para enviar mensagem
if (messageInput) {
  messageInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };
}

// Botão cancelar fila
const btnCancelarFila = document.getElementById('btnCancelarFila');
if (btnCancelarFila) {
  btnCancelarFila.onclick = async () => {
    if (!confirm('Deseja realmente sair da fila de atendimento?')) {
      return;
    }

    try {
      if (!clienteState.atendimentoId) return;

      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;

      await updateDoc(doc(db, "atend_chat_fila", clienteState.atendimentoId), {
        status: "CANCELADO",
        canceladoEm: serverTimestamp(),
        canceladoPor: "cliente"
      });

      // O listener vai detectar a mudança e limpar automaticamente
      toast("Você saiu da fila", "info");

    } catch (error) {
      console.error("❌ Erro ao cancelar:", error);
      toast("Erro ao cancelar atendimento", "error");
    }
  };
}

// Sistema de avaliação
let notaSelecionada = 0;
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
      if (!clienteState.atendimentoId) return;

      const db = window.FirebaseApp.db;
      const { doc, updateDoc, serverTimestamp } = window.FirebaseApp.fStore;

      await updateDoc(doc(db, "atend_chat_fila", clienteState.atendimentoId), {
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

// Botão novo atendimento
const btnNovoAtendimento = document.getElementById("btnNovoAtendimento");
if (btnNovoAtendimento) {
  btnNovoAtendimento.onclick = () => {
    limparSessao();
    location.reload();
  };
}

/* =====================================================
   INICIALIZAÇÃO DO SISTEMA
===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Chat Cliente inicializando...');
  
  // Restaurar sessão se existir
  await restaurarSessao();
  
  // Configurar limpeza ao sair
  window.addEventListener('beforeunload', () => {
    clienteListeners.pararMonitoramento();
    if (clienteState.timerInterval) {
      clearInterval(clienteState.timerInterval);
    }
  });
  
  // Debug - mostrar UID logada
  const auth = window.FirebaseApp?.auth;
  if (auth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        console.log("🧑‍💻 UID logada no navegador:", user.uid);
        console.log("🔐 Tipo de login:", user.isAnonymous ? "ANÔNIMO" : "REGISTRADO");
      }
    });
  }
  
  console.log('✅ Chat Cliente pronto e funcional!');
  console.log('📱 Aguardando ação do usuário...');
});
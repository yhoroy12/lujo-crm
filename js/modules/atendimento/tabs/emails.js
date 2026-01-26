/**
 * EMAILS.JS - SISTEMA DE ATENDIMENTO E TRIAGEM
 * Foco: Performance Blaze, Prevenção de Race Condition e Reutilização Global
 */

import {
  collection, query, where, orderBy, limit, onSnapshot,
  doc, runTransaction, serverTimestamp, getDoc, addDoc, deleteDoc, updateDoc, getDocs, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const EmailsTab = {
  id: 'aba-emails',
  moduleId: 'atendimento',
  currentEmailId: null,
  emailTimerInterval: null,
  tempoAtualSegundos: 0,

  async init() {
    console.log('📧 Inicializando aba E-mails (Global Mode)');
    this.cacheElements();
    this.setupFilaListener();
    this.bindEvents();
    this.verificarAtendimentoEmAberto();
    // Torna o objeto acessível globalmente para os onclicks do HTML
    window.EmailsTab = this;
  },

  cacheElements() {
    this.elements = {
        btnChamarProximo: document.getElementById('btnChamarProximo'),
        filaCont: document.getElementById('emailFilaLista'),
        countBadge: document.getElementById('emailFilaCount'),
        palcoVazio: document.getElementById('palco-vazio'),
        palcoAtivo: document.getElementById('palco-ativo'),
        resposta: document.getElementById('resposta-email'),
        btnEnviar: document.getElementById('btnEnviarResposta'),
        timerAtendimento: document.getElementById('timer-atendimento'),
        
        // CORRIGIDO PARA OS NOVOS IDS DO SEU HTML:
        displayAssunto: document.getElementById('ativo-assunto'),
        displayRemetente: document.getElementById('ativo-cliente-email'),
        displayNomeCliente: document.getElementById('ativo-cliente-nome'),
        displayCorpo: document.getElementById('ativo-mensagem-conteudo')
    };
},

  /**
   * Listener em tempo real da fila lateral (Otimizado Blaze)
   * Filtra por status "novo" e pelo grupo/setor atual
   */
  setupFilaListener() {
    const q = query(
      collection(window.FirebaseApp.db, "atend_emails_fila"),
      where("status", "==", "novo"),
      where("grupo", "==", "triagem"), // Ajustável conforme o módulo
      orderBy("metadata_recebido_em", "asc"),
      limit(20)
    );

    onSnapshot(q, (snapshot) => {
      if (this.elements.countBadge) this.elements.countBadge.textContent = snapshot.size;
      this.renderListaLateral(snapshot);
    });
  },

  renderListaLateral(snapshot) {
    if (!this.elements.filaCont) return;
    this.elements.filaCont.innerHTML = '';

    snapshot.forEach(doc => {
      const data = doc.data();
      const item = document.createElement('div');
      item.className = 'email-fila-item';
      item.innerHTML = `
                <div class="info">
                    <strong>${data.remetente_nome || 'Desconhecido'}</strong>
                    <span>${data.assunto}</span>
                </div>
            `;
      this.elements.filaCont.appendChild(item);
    });
  },

  /**
   * Verifica se há um atendimento em aberto ao carregar a aba
   */
async verificarAtendimentoEmAberto() {
    const user = window.FirebaseApp.auth.currentUser;
    const db = window.FirebaseApp.db;
    if (!user) {
        console.log("⏳ Auth ainda não carregou, tentando novamente em 1s...");
        setTimeout(() => this.verificarAtendimentoEmAberto(), 1000);
        return;
    }

    console.log("🔍 Buscando atendimento para o UID:", user.uid);

    try {
        const q = query(
            collection(db, "atend_emails_fila"),
            where("status", "==", "em_atendimento"),
            where("atribuido_para_uid", "==", user.uid),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            console.log("📌 Recuperando atendimento em aberto:", docSnap.id);
            
            // Carrega os dados no palco de atendimento
            this.currentEmailId = docSnap.id;
            const dados = docSnap.data();
            
            // Aqui você chama a mesma função que usa quando clica em "Chamar Próximo"
            // para preencher a tela com os dados do e-mail recuperado
            this.carregarDadosNoPalco(dados);
        }
    } catch (error) {
        console.error("Erro ao recuperar atendimento:", error);
    }
},

  /**
   * CHAMAR PRÓXIMO ATENDIMENTO (Com Transaction contra Race Condition)
   */
  async chamarProximoAtendimento() {
    console.log('🔍 Buscando próximo e-mail...');
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    

    const q = query(
      collection(window.FirebaseApp.db, "atend_emails_fila"),
      where("status", "==", "novo"),
      where("grupo", "==", "triagem"),
      orderBy("metadata_recebido_em", "asc"),
      limit(1)
    );

    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        alert("Não há e-mails novos na fila de triagem.");
        return;
      }

      const emailDocRef = querySnapshot.docs[0].ref;

      // TRANSAÇÃO ATÔMICA
      await runTransaction(window.FirebaseApp.db, async (transaction) => {
        const sfDoc = await transaction.get(emailDocRef);
        if (sfDoc.data().status !== "novo") {
          throw "Este e-mail já foi pego por outro operador!";
        }

        transaction.update(emailDocRef, {
          status: "em_atendimento",
          atribuido_para_uid: user.uid,
          puxado_em: serverTimestamp(),
          "tracking_marcos.triagem_inicio": serverTimestamp()
        });
      });

      this.currentEmailId = emailDocRef.id;
      this.carregarDadosNoPalco(querySnapshot.docs[0].data());

    } catch (error) {
      console.error("Erro na transação:", error);
      if (typeof error === 'string') alert(error);
    }
  },

carregarDadosNoPalco(data) {
    this.cacheElements(); // Recarrega para garantir que pegou os elementos novos

    if (this.elements.palcoVazio) this.elements.palcoVazio.style.display = 'none';
    if (this.elements.palcoAtivo) this.elements.palcoAtivo.style.display = 'flex';

    // Preenchendo com os dados do Firestore
    if (this.elements.displayAssunto) 
        this.elements.displayAssunto.textContent = data.assunto || "Sem Assunto";
    
    if (this.elements.displayRemetente) 
        this.elements.displayRemetente.textContent = data.remetente_email || "E-mail não informado";
    
    if (this.elements.displayNomeCliente)
        this.elements.displayNomeCliente.textContent = data.remetente_nome || "Nome não informado";

    if (this.elements.displayCorpo) {
        // Se for HTML do Gmail, usamos innerHTML, se for texto puro, textContent
        this.elements.displayCorpo.innerHTML = data.corpo_html || data.corpo || "Sem conteúdo";
    }

    this.iniciarCronometro();
},
  /**
   * DIRECIONAR (TRIAGEM)
   */
  async direcionarEmail(setorDestino) {
    if (!this.currentEmailId) return;
    const user = JSON.parse(sessionStorage.getItem('currentUser'));

    try {
      const docRef = doc(window.FirebaseApp.db, "atend_emails_fila", this.currentEmailId);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();

      const novoHistorico = data.historico_custodia || [];
      novoHistorico.push({
        acao: "direcionamento",
        detalhes: `Triagem: Direcionado para ${setorDestino}`,
        operador: user.name,
        timestamp: new Date()
      });

      await updateDoc(docRef, {
        grupo: setorDestino.toLowerCase(),
        status: "novo", // Volta a ser novo para o outro setor ver
        atribuido_para_uid: null,
        historico_custodia: novoHistorico,
        "tracking_marcos.triagem_fim": serverTimestamp()
      });

      alert(`E-mail enviado para o setor: ${setorDestino}`);
      this.resetarPalco();
    } catch (error) {
      console.error("Erro ao direcionar:", error);
    }
  },
  /**
   * MODAL DE DEVOLUÇÃO
   */
  abrirModalDevolucao() {
    const modal = document.getElementById('modalJustificativaDevolucao');
    const txt = document.getElementById('justificativaDevolucaoTexto');
    if (modal) {
      if (txt) txt.value = ''; // Limpa anterior
      modal.style.display = 'flex';
    }
  },

  fecharModalDevolucao() {
    const modal = document.getElementById('modalJustificativaDevolucao');
    if (modal) modal.style.display = 'none';
  },

  /**
   * CONFIRMAR DEVOLUÇÃO COM JUSTIFICATIVA
   */

  async confirmarDevolucao() {
    const txtArea = document.getElementById('justificativaDevolucaoTexto');
    const justificativa = txtArea?.value.trim() || "";

    if (justificativa.length < 10) {
      alert("Por favor, insira uma justificativa com pelo menos 10 caracteres.");
      return;
    }

    if (!this.currentEmailId) return;

    try {
      console.log('🔄 Devolvendo e-mail com justificativa...');

      // Usando a lógica do seu email.service.js se disponível, 
      // ou implementando direto para garantir o funcionamento:
      const docRef = doc(window.FirebaseApp.db, "atend_emails_fila", this.currentEmailId);
      const user = JSON.parse(sessionStorage.getItem('currentUser'));

      await updateDoc(docRef, {
        status: "novo",
        atribuido_para_uid: null,
        "tracking_marcos.devolvido_em": serverTimestamp(),
        ultima_justificativa: justificativa,
        // Adicionando ao histórico de custódia para auditoria
        historico_custodia: arrayUnion({
          acao: "devolucao",
          detalhes: `Devolvido para fila. Motivo: ${justificativa}`,
          operador: user?.name || "Sistema",
          timestamp: new Date()
        })
      });

      alert("E-mail devolvido com sucesso.");
      this.fecharModalDevolucao();
      this.resetarPalco();

    } catch (error) {
      console.error("Erro ao devolver:", error);
      alert("Erro ao processar devolução.");
    }
  },

  /**
   * DEVOLVER PARA FILA
   */
  async devolverParaFila() {
    if (!this.currentEmailId) return;

    try {
      const docRef = doc(window.FirebaseApp.db, "atend_emails_fila", this.currentEmailId);
      await updateDoc(docRef, {
        status: "novo",
        atribuido_para_uid: null,
        "tracking_marcos.devolvido_em": serverTimestamp()
      });

      alert("E-mail devolvido para a fila.");
      this.resetarPalco();
    } catch (error) {
      console.error("Erro ao devolver:", error);
    }
  },

  /**
   * RESPONDER E FINALIZAR (Move para Histórico)
   */

  // Dentro do objeto EmailsTab em emails.js

validarResposta() {
    const resposta = this.elements.resposta?.value.trim() || "";
    const btn = this.elements.btnEnviar;

    if (resposta.length >= 15) { // Ativa se tiver pelo menos 15 caracteres
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.classList.add('ativo');
    } else {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    }
},

async finalizarAtendimento() {
    const resposta = this.elements.resposta?.value.trim();
    if (!resposta || !this.currentEmailId) {
        alert("Escreva uma resposta antes de enviar.");
        return;
    }

    try {
        console.log("📤 Finalizando atendimento...");
        const db = window.FirebaseApp.db;
        const docRef = doc(db, "atend_emails_fila", this.currentEmailId);
        const docSnap = await getDoc(docRef);
        const data = docSnap.data();

        // 1. Criar no Histórico
        await addDoc(collection(db, "atend_emails_historico"), {
            ...data,
            status: "concluido",
            resposta_final: resposta,
            finalizado_em: serverTimestamp(),
            duracao_atendimento: this.tempoAtualSegundos
        });

        // 2. Deletar da Fila
        await deleteDoc(docRef);

        alert("Atendimento finalizado com sucesso!");
        this.resetarPalco();
    } catch (error) {
        console.error("Erro ao finalizar:", error);
        alert("Erro ao finalizar atendimento. Verifique o console.");
    }
},

  iniciarCronometro() {
    this.tempoAtualSegundos = 0;
    if (this.emailTimerInterval) clearInterval(this.emailTimerInterval);

    this.emailTimerInterval = setInterval(() => {
      this.tempoAtualSegundos++;
      const m = Math.floor(this.tempoAtualSegundos / 60).toString().padStart(2, '0');
      const s = (this.tempoAtualSegundos % 60).toString().padStart(2, '0');
      if (this.elements.timerAtendimento) this.elements.timerAtendimento.textContent = `${m}:${s}`;
    }, 1000);
  },

  resetarPalco() {
    this.currentEmailId = null;
    clearInterval(this.emailTimerInterval);
    if (this.elements.palcoAtivo) this.elements.palcoAtivo.style.display = 'none';
    if (this.elements.palcoVazio) this.elements.palcoVazio.style.display = 'flex';
    if (this.elements.resposta) this.elements.resposta.value = '';
  },

  bindEvents() {
    // Eventos via JS para botões que não usam onclick direto
    if (this.elements.btnChamarProximo) {
      this.elements.btnChamarProximo.addEventListener('click', () => this.chamarProximoAtendimento());
    }
    if (this.elements.btnEnviar) {
      this.elements.btnEnviar.addEventListener('click', () => this.finalizarAtendimento());
    }
    window.validarResposta = () => this.validarResposta();
    window.confirmarDevolucao = () => EmailsTab.confirmarDevolucao();
    window.fecharModalDevolucao = () => EmailsTab.fecharModalDevolucao();
  }
};

export default EmailsTab;
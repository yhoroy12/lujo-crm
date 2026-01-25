/**
 * ABA: E-MAILS
 * Gerencia fila e atendimento de e-mails
 */

const EmailsTab = {
  id: 'aba-emails',
  moduleId: 'atendimento',
  emailTimerInterval: null,
  currentEmailId: null,

  async init() {
    console.log('📧 Inicializando aba E-mails');
    
    try {
      this.cacheElements();
      this.bindEvents();
      this.setupInitialState();
      console.log('✅ E-mails pronto');
    } catch (error) {
      console.error('❌ Erro em E-mails:', error);
    }
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
      timerAtendimento: document.getElementById('timer-atendimento')
    };
  },

  bindEvents() {
    if (this.elements.btnChamarProximo) {
      window.ModuleLifecycle.addListener(
        this.elements.btnChamarProximo,
        'click',
        () => this.chamarProximoEmail(),
        this.moduleId
      );
    }

    if (this.elements.btnEnviar) {
      window.ModuleLifecycle.addListener(
        this.elements.btnEnviar,
        'click',
        () => this.finalizarAtendimentoEmail(),
        this.moduleId
      );
    }

    if (this.elements.resposta) {
      window.ModuleLifecycle.addListener(
        this.elements.resposta,
        'input',
        () => this.validarResposta(),
        this.moduleId
      );
    }
  },

  setupInitialState() {
    if (this.elements.countBadge) {
      this.elements.countBadge.textContent = '0';
    }
  },

  async chamarProximoEmail() {
    console.log('📧 Chamando próximo e-mail');
    
    if (this.elements.palcoVazio) {
      this.elements.palcoVazio.style.display = 'none';
    }
    if (this.elements.palcoAtivo) {
      this.elements.palcoAtivo.style.display = 'flex';
    }
    
    this.iniciarCronometroAtendimento();
  },

  validarResposta() {
    const btn = this.elements.btnEnviar;
    const val = this.elements.resposta?.value.trim();
    
    if (val && val.length > 5) {
      btn?.classList.add('ativo');
      btn?.removeAttribute('disabled');
    } else {
      btn?.classList.remove('ativo');
      btn?.setAttribute('disabled', 'disabled');
    }
  },

  async finalizarAtendimentoEmail() {
    const resposta = this.elements.resposta?.value.trim();
    
    if (!resposta) {
      console.warn('⚠️ Resposta vazia');
      return;
    }
    
    console.log('📤 Finalizando e-mail:', resposta);
    this.resetarPalcoEmail();
  },

  iniciarCronometroAtendimento() {
    let seg = 0;
    const disp = this.elements.timerAtendimento;
    
    if (this.emailTimerInterval) clearInterval(this.emailTimerInterval);
    
    this.emailTimerInterval = setInterval(() => {
      seg++;
      const m = Math.floor(seg / 60).toString().padStart(2, '0');
      const s = (seg % 60).toString().padStart(2, '0');
      if (disp) disp.textContent = `${m}:${s}`;
    }, 1000);
  },

  resetarPalcoEmail() {
    if (this.emailTimerInterval) {
      clearInterval(this.emailTimerInterval);
      this.emailTimerInterval = null;
    }

    if (this.elements.palcoAtivo) {
      this.elements.palcoAtivo.style.display = 'none';
    }
    if (this.elements.palcoVazio) {
      this.elements.palcoVazio.style.display = 'flex';
    }

    if (this.elements.resposta) {
      this.elements.resposta.value = '';
    }
    
    this.validarResposta();
  }
};

export default EmailsTab;
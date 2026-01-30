/**
 * NOVO CLIENTE NOTIFICAÇÃO MANAGER
 * Gerencia pop-up e notificações quando novo cliente entra na fila
 * 
 * Soluciona:
 * - PROBLEMA 1: Falta de pop-up/notificação para o operador
 */

class NovoClienteNotificacaoManager {
  constructor() {
    this.modalAtual = null;
    this.audioAlerta = null;
    this.toastContainer = null;
    
    // Configurações
    this.config = {
      volumeAlerta: 0.5,
      duracao_toast: 5000,
      permitir_som: true,
      permitir_vibracoes: 'vibrate' in navigator
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.inicializar());
    } else {
        this.inicializar();
    }
}

  /**
   * Criar elementos DOM necessários (se não existirem)
   */
  inicializar() {
    // Criar container de toast se não existir
    if (!document.getElementById('toast-container-operador')) {
      const container = document.createElement('div');
      container.id = 'toast-container-operador';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9998;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(container);
      this.toastContainer = container;
    }

    // Criar elemento de áudio para alerta (se não existir)
    if (!document.getElementById('audio-alerta')) {
      const audio = document.createElement('audio');
      audio.id = 'audio-alerta';
      audio.preload = 'auto';
      // Som de notificação simples (pode ser customizado com URL)
      audio.innerHTML = `
        <source src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" type="audio/wav">
      `;
      document.body.appendChild(audio);
      this.audioAlerta = audio;
    }

    // Criar container do modal (se não existir)
    if (!document.getElementById('modal-novo-cliente')) {
      this.criarModalHTML();
    }
  }

  /**
   * Criar HTML do modal (pop-up de novo cliente)
   * IMPORTANTE: O modal começa HIDDEN
   * Será mostrado pelo método mostrarNotificacao()
   */
  criarModalHTML() {
    const modal = document.createElement('div');
    modal.id = 'modal-novo-cliente';
    modal.className = 'modal-novo-cliente hidden';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    modal.innerHTML = `
      <div class="modal-content" style="
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <!-- Header -->
        <div style="
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f0f0f0;
        ">
          <div style="
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            flex-shrink: 0;
          ">
            🔔
          </div>
          <div>
            <h2 style="
              margin: 0;
              font-size: 24px;
              font-weight: 700;
              color: #1a1a1a;
              letter-spacing: -0.5px;
            ">
              Novo Cliente na Fila!
            </h2>
            <p style="
              margin: 4px 0 0 0;
              color: #666;
              font-size: 14px;
            ">
              Um novo atendimento aguarda sua ação
            </p>
          </div>
        </div>

        <!-- Informações do Cliente -->
        <div class="cliente-info" style="
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        ">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <!-- Nome -->
            <div>
              <label style="
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #999;
                text-transform: uppercase;
                margin-bottom: 6px;
                letter-spacing: 0.5px;
              ">
                Nome
              </label>
              <p id="info-nome" style="
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
              ">
                --
              </p>
            </div>

            <!-- Telefone -->
            <div>
              <label style="
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #999;
                text-transform: uppercase;
                margin-bottom: 6px;
                letter-spacing: 0.5px;
              ">
                Telefone
              </label>
              <p id="info-telefone" style="
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
              ">
                --
              </p>
            </div>

            <!-- Email -->
            <div style="grid-column: 1 / -1;">
              <label style="
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: #999;
                text-transform: uppercase;
                margin-bottom: 6px;
                letter-spacing: 0.5px;
              ">
                E-mail
              </label>
              <p id="info-email" style="
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                word-break: break-all;
              ">
                --
              </p>
            </div>
          </div>
        </div>

        <!-- Ticket ID -->
        <div style="
          padding: 12px;
          background: #f0f4ff;
          border-left: 4px solid #667eea;
          border-radius: 4px;
          margin-bottom: 24px;
        ">
          <p style="
            margin: 0;
            font-size: 13px;
            color: #667eea;
            font-weight: 600;
          ">
            ID do Atendimento: <span id="info-ticket-id">--</span>
          </p>
        </div>

        <!-- Botões de Ação -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        ">
          <button id="btn-rejeitar" style="
            padding: 12px 24px;
            background: #f3f4f6;
            color: #1a1a1a;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
            ❌ Rejeitar
          </button>
          <button id="btn-aceitar" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            ✅ Aceitar
          </button>
        </div>
      </div>

      <style>
        .modal-novo-cliente.hidden {
          display: none !important;
        }

        .modal-novo-cliente.visible {
          opacity: 1;
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        #btn-aceitar:active {
          transform: scale(0.98);
        }

        #btn-rejeitar:active {
          transform: scale(0.98);
        }
      </style>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Mostrar notificação de novo cliente
   * 
   * @param {Object} dadosCliente - Dados do cliente
   * @param {Function} onAceitar - Callback quando aceitar
   * @param {Function} onRejeitar - Callback quando rejeitar
   */
  mostrarNotificacao(dadosCliente, onAceitar, onRejeitar) {
    const modal = document.getElementById('modal-novo-cliente');
    
    // Preencher informações do cliente
    document.getElementById('info-nome').textContent = dadosCliente.cliente?.nome || '--';
    document.getElementById('info-telefone').textContent = dadosCliente.cliente?.telefone || '--';
    document.getElementById('info-email').textContent = dadosCliente.cliente?.email || '--';
    document.getElementById('info-ticket-id').textContent = dadosCliente.atendimentoId || '--';

    // Configurar botões
    const btnAceitar = document.getElementById('btn-aceitar');
    const btnRejeitar = document.getElementById('btn-rejeitar');

    // Limpar listeners anteriores
    btnAceitar.onclick = null;
    btnRejeitar.onclick = null;

    // Configurar novos listeners
    btnAceitar.onclick = async () => {
      this.fecharNotificacao();
      if (onAceitar) await onAceitar(dadosCliente);
    };

    btnRejeitar.onclick = async () => {
      this.fecharNotificacao();
      if (onRejeitar) await onRejeitar(dadosCliente);
    };

    // Mostrar modal
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.add('visible');
    }, 10);

    // Tocar som de alerta
    this.tocarAlerta();

    // Vibrar (se suportado)
    this.vibrar();

    // Toast de confirmação
    this.mostrarToast(`📞 ${dadosCliente.cliente?.nome || 'Cliente'} aguardando!`, 'info');

    console.log("🔔 Notificação mostrada para:", dadosCliente.atendimentoId);
  }

  /**
   * Fechar notificação (modal)
   */
  fecharNotificacao() {
    const modal = document.getElementById('modal-novo-cliente');
    modal.classList.remove('visible');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }

  /**
   * Tocar som de alerta
   */
  tocarAlerta() {
    if (!this.config.permitir_som || !this.audioAlerta) return;

    try {
      this.audioAlerta.volume = this.config.volumeAlerta;
      
      // Criar oscilador para som customizado
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscilador = audioContext.createOscillator();
      const ganho = audioContext.createGain();

      oscilador.connect(ganho);
      ganho.connect(audioContext.destination);

      oscilador.frequency.value = 900;
      oscilador.type = 'sine';

      ganho.gain.setValueAtTime(0.3, audioContext.currentTime);
      ganho.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscilador.start(audioContext.currentTime);
      oscilador.stop(audioContext.currentTime + 0.5);

      console.log("🔊 Som de alerta tocado");
    } catch (error) {
      console.warn("⚠️ Erro ao tocar som:", error);
    }
  }

  /**
   * Vibrar dispositivo (celular)
   */
  vibrar() {
    if (!this.config.permitir_vibracoes) return;

    try {
      navigator.vibrate([200, 100, 200]);
      console.log("📳 Dispositivo vibrou");
    } catch (error) {
      console.warn("⚠️ Erro ao vibrar:", error);
    }
  }

  /**
   * Mostrar toast (notificação flutuante)
   */
  mostrarToast(mensagem, tipo = 'info') {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideInRight 0.3s ease;
      font-weight: 600;
      font-size: 14px;
    `;

    toast.textContent = mensagem;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, this.config.duracao_toast);
  }

  /**
   * Configurar preferências
   */
  configurar(opcoes) {
    this.config = { ...this.config, ...opcoes };
    console.log("✓ Configurações atualizadas:", this.config);
  }
}

// Adicionar estilos globais
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Exportar como global
window.NovoClienteNotificacaoManager = new NovoClienteNotificacaoManager();

console.log("✅ NovoClienteNotificacaoManager carregado");
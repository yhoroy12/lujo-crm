// ==================== ATENDIMENTO.JS ====================

// Função de inicialização do módulo
window.initAtendimentoModule = function() {
  console.log("🔧 Inicializando módulo Atendimento");
  
  initAtendimentoTabs();
  initChat();
  initListaAtendimentos();
  initPopup();
};

// ===== SISTEMA DE ABAS =====
function initAtendimentoTabs() {
  const botoesAba = document.querySelectorAll('.aba-btn');
  const conteudosAba = document.querySelectorAll('.aba-conteudo');
  
  botoesAba.forEach(btn => {
    btn.addEventListener('click', () => {
      botoesAba.forEach(b => b.classList.remove('ativa'));
      conteudosAba.forEach(c => c.classList.remove('ativa'));
      btn.classList.add('ativa');
      document.querySelector('.' + btn.dataset.aba).classList.add('ativa');
    });
  });
}

// ===== CHAT =====
function initChat() {
  const btnEnviar = document.getElementById('btnEnviarMensagem');
  if (btnEnviar) {
    btnEnviar.addEventListener('click', enviarMensagem);
  }
}

function enviarMensagem() {
  const input = document.getElementById('chatInput');
  const chatbox = document.getElementById('chatbox');
  if (input.value.trim() !== "") {
    const msg = document.createElement('div');
    msg.classList.add('msg', 'atendente');
    msg.textContent = input.value;
    chatbox.appendChild(msg);
    input.value = '';
    chatbox.scrollTop = chatbox.scrollHeight;
  }
}

// ===== LISTA DE ATENDIMENTOS =====
function initListaAtendimentos() {
  const lista = document.getElementById('listaAtendimentos');
  if (!lista) return;
  
  const itens = lista.querySelectorAll('.item');
  itens.forEach(item => {
    item.addEventListener('click', function() {
      selecionarAtendimento(this);
    });
  });
}

function selecionarAtendimento(el) {
  document.querySelectorAll('.lista-atendimentos .item').forEach(i => i.classList.remove('ativo'));
  el.classList.add('ativo');
}

// ===== BOTÃO ALTERAR EMAIL =====
const btnAlterarEmail = document.getElementById('btnAlterarEmail');
if (btnAlterarEmail) {
  btnAlterarEmail.addEventListener('click', abrirSelecaoContaCliente);
}

function abrirSelecaoContaCliente() {
  // Função original mantida
  alert('Funcionalidade de alteração de email');
}

// ===== POP-UP DE NOVO ATENDIMENTO =====
function initPopup() {
  const popup = document.getElementById('popupAtendimento');
  const nomeCliente = document.getElementById('popupCliente');
  const canalCliente = document.getElementById('popupCanal');
  const btnIniciar = document.getElementById('btnIniciarAtendimento');

  if (btnIniciar) {
    btnIniciar.addEventListener('click', function() {
      iniciarAtendimento(popup, nomeCliente);
    });
  }

  setTimeout(() => {
    mostrarNovoAtendimento({ nome: 'João Ferreira', canal: 'WhatsApp' }, popup, nomeCliente, canalCliente);
  }, 5000);
}

function mostrarNovoAtendimento(dados, popup, nomeCliente, canalCliente) {
  nomeCliente.textContent = dados.nome;
  canalCliente.textContent = dados.canal;
  popup.style.display = 'flex';
}

function iniciarAtendimento(popup, nomeCliente) {
  popup.style.display = 'none';
  document.querySelector('.aba-btn[data-aba="aba-atendimento"]').click();

  const nomeInput = document.querySelector('.col-atual input[type="text"]');
  const telefoneInput = document.querySelector('.col-atual input[type="text"]:nth-of-type(2)');
  if (nomeInput) nomeInput.value = nomeCliente.textContent;
  if (telefoneInput) telefoneInput.value = '(11) 90000-0000';
}
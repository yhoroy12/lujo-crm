/* ===============================
   COPYRIGHT MODULE - REFATORADO
================================ */

const MODULE_ID = 'copyright';

window.initCopyrightModule = function() {
  console.log("📦 Inicializando módulo Copyright");

  // Inicializar estado
  window.StateManager.init(MODULE_ID, {
    demandas: [...MOCK_DEMANDAS],
    artistas: [...MOCK_ARTISTAS],
    templates: [...MOCK_TEMPLATES],
    selectedArtista: null,
    selectedTemplate: null,
    currentEditingId: null
  });

  initTabs();
  initDashboard();
};

/* ===============================
   DADOS MOCK
================================ */
const MOCK_DEMANDAS = [
  {
    id: 'TKT-001',
    cliente: 'Anitta',
    tipo: 'YouTube Claim',
    descricao: '3 claims recebidos necessitam resposta imediata',
    plataforma: 'YouTube',
    status: 'urgente',
    prazo: '24h',
    area: 'Jurídico',
    criado: 'Hoje, 09:30',
    responsavel: 'Juan Copyright',
    prioridade: 'alta'
  },
  {
    id: 'TKT-002',
    cliente: 'Projota',
    tipo: 'Documentação',
    descricao: 'Financeiro aguarda documentação para liberar pagamento',
    plataforma: 'Spotify',
    status: 'pendente',
    prazo: '2 dias',
    area: 'Financeiro',
    criado: 'Ontem, 14:20',
    responsavel: 'Maria Financeiro',
    prioridade: 'media'
  },
  {
    id: 'TKT-003',
    cliente: 'Ludmilla',
    tipo: 'Verificação de Conta',
    descricao: 'Conta Spotify pendente de verificação',
    plataforma: 'Spotify',
    status: 'andamento',
    prazo: '3 dias',
    area: 'Técnico',
    criado: '2 dias atrás',
    responsavel: 'Carlos Técnico',
    prioridade: 'baixa'
  },
  {
    id: 'TKT-004',
    cliente: 'MC Kevin',
    tipo: 'Contrato',
    descricao: 'Revisão de contrato de renovação',
    plataforma: 'Todas',
    status: 'resolvido',
    prazo: 'Concluído',
    area: 'Jurídico',
    criado: '3 dias atrás',
    responsavel: 'Juan Copyright',
    prioridade: 'media'
  },
  {
    id: 'TKT-005',
    cliente: 'Jão',
    tipo: 'Takedown Request',
    descricao: 'Solicitação de remoção de conteúdo não autorizado',
    plataforma: 'YouTube',
    status: 'urgente',
    prazo: '12h',
    area: 'Jurídico',
    criado: 'Hoje, 11:00',
    responsavel: 'Juan Copyright',
    prioridade: 'alta'
  }
];

const MOCK_ARTISTAS = [
  {
    id: 'ART-001',
    nome: 'Anitta',
    contrato: 'Ativo',
    plataformas: ['YouTube', 'Spotify', 'Deezer', 'Apple Music', 'TikTok'],
    ultimoContato: 'Hoje',
    documentos: 'Completo',
    pendentes: 3,
    email: 'anitta@email.com',
    telefone: '(11) 99999-9999'
  },
  {
    id: 'ART-002',
    nome: 'Projota',
    contrato: 'Ativo',
    plataformas: ['YouTube', 'Spotify', 'Deezer'],
    ultimoContato: '2 dias',
    documentos: 'Pendente',
    pendentes: 1,
    email: 'projota@email.com',
    telefone: '(11) 98888-8888'
  },
  {
    id: 'ART-003',
    nome: 'Ludmilla',
    contrato: 'Ativo',
    plataformas: ['YouTube', 'Spotify', 'Apple Music'],
    ultimoContato: '3 dias',
    documentos: 'Completo',
    pendentes: 1,
    email: 'ludmilla@email.com',
    telefone: '(11) 97777-7777'
  },
  {
    id: 'ART-004',
    nome: 'MC Kevin',
    contrato: 'Ativo',
    plataformas: ['YouTube', 'Spotify'],
    ultimoContato: '1 semana',
    documentos: 'Completo',
    pendentes: 0,
    email: 'mckeivin@email.com',
    telefone: '(11) 96666-6666'
  }
];

const MOCK_TEMPLATES = [
  {
    id: 'TPL-001',
    nome: 'Solicitação de Documentação',
    conteudo: `Prezado(a) {artista},

Solicitamos o envio dos seguintes documentos para dar continuidade ao processo:

1. Documento de identificação (RG/CPF ou CNPJ)
2. Comprovante de residência
3. Contrato assinado digitalmente
4. Dados bancários atualizados

Prazo para envio: {prazo}

Atenciosamente,
Equipe Copyright - Lujo Network`
  },
  {
    id: 'TPL-002',
    nome: 'Notificação de Claim',
    conteudo: `Olá {artista},

Identificamos {quantidade} claims de direitos autorais em suas músicas na plataforma {plataforma}. 

Por favor, revise em até {prazo} horas.

Detalhes:
- Plataforma: {plataforma}
- Quantidade: {quantidade} claims
- Prazo de resposta: {prazo} horas
- Status: Pendente de análise

Equipe Copyright - Lujo Network`
  },
  {
    id: 'TPL-003',
    nome: 'Aviso de Prazo',
    conteudo: `Prezado(a) {artista},

Lembramos que o prazo para {assunto} vence em {prazo}.

Por favor, dê atenção urgente a este assunto.

Atenciosamente,
Equipe Copyright - Lujo Network`
  },
  {
    id: 'TPL-004',
    nome: 'Confirmação de Recebimento',
    conteudo: `Olá {artista},

Confirmamos o recebimento de seus {documentos}.

Agora daremos andamento ao processo. Em breve entraremos em contato com novidades.

Agradecemos sua colaboração.

Equipe Copyright - Lujo Network`
  },
  {
    id: 'TPL-005',
    nome: 'Resposta Padrão FAQ',
    conteudo: `Olá {artista},

Obrigado pelo seu contato.

Em relação à sua dúvida sobre {assunto}, informamos que {resposta}.

Se precisar de mais informações, estamos à disposição.

Atenciosamente,
Equipe Copyright - Lujo Network`
  },
  {
    id: 'TPL-006',
    nome: 'Solicitação de Assinatura',
    conteudo: `Prezado(a) {artista},

Solicitamos sua assinatura no contrato {contrato}.

Clique no link abaixo para acessar o documento:
{link_contrato}

Prazo para assinatura: {prazo}

Atenciosamente,
Equipe Copyright - Lujo Network`
  }
];

/* ===============================
   TABS
================================ */
function initTabs() {
  // Usar .modulo-painel-copyright ou .painel-copyright dependendo do HTML
  const container = document.querySelector('.modulo-painel-copyright') || document.querySelector('.painel-copyright');
  if (!container) {
    console.warn('Copyright: container não encontrado');
    return;
  }

  // TabManager espera container com .aba-btn e .aba-conteudo
  const tabContainer = container.querySelector('.aba-nav') ? container : container.parentElement;
  const selector = tabContainer.classList.contains('modulo-painel-copyright') 
    ? '.modulo-painel-copyright' 
    : '.painel-copyright';

  // Se o TabManager não funcionar diretamente, usar implementação customizada
  const botoes = container.querySelectorAll('.aba-btn');
  if (botoes.length > 0) {
    botoes.forEach(btn => {
      window.ModuleLifecycle.addListener(btn, 'click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const alvo = this.dataset.aba;
        if (!alvo) return;
        
        // Atualizar botões ativos
        botoes.forEach(b => b.classList.remove('ativa'));
        this.classList.add('ativa');
        
        // Mostrar conteúdo
        mostrarAbaConteudo(alvo);
      }, MODULE_ID);
    });
    
    // Ativar primeira aba
    if (botoes.length > 0) {
      const primeiraAba = botoes[0];
      const alvoInicial = primeiraAba.dataset.aba || 'aba-dashboard';
      primeiraAba.classList.add('ativa');
      mostrarAbaConteudo(alvoInicial);
    }
  }
}

function mostrarAbaConteudo(abaId) {
  const container = document.querySelector('.modulo-painel-copyright') || document.querySelector('.painel-copyright');
  if (!container) return;
  
  // Esconder todos os conteúdos
  container.querySelectorAll('.aba-conteudo').forEach(c => {
    c.classList.remove('ativa');
  });
  
  // Mostrar o conteúdo da aba selecionada
  const conteudoAlvo = container.querySelector(`.${abaId}`);
  if (conteudoAlvo) {
    conteudoAlvo.classList.add('ativa');
    inicializarConteudoAba(abaId);
  }
}

function inicializarConteudoAba(abaId) {
  switch(abaId) {
    case 'aba-dashboard':
      initDashboardTab();
      break;
    case 'aba-demandas':
      initDemandasTab();
      break;
    case 'aba-artistas':
      initArtistasTab();
      break;
    case 'aba-comunicacao':
      initComunicacaoTab();
      break;
    case 'aba-relatorios':
      initRelatoriosTab();
      break;
  }
}

/* ===============================
   DASHBOARD
================================ */
function initDashboard() {
  // Dashboard será inicializado quando a aba for ativada
}

function initDashboardTab() {
  atualizarMetricasDashboard();
  
  // Botão Ver Todos
  const btnVerTodos = document.querySelector('.aba-dashboard .btn-secondary');
  if (btnVerTodos) {
    window.ModuleLifecycle.addListener(btnVerTodos, 'click', () => {
      const btnDemandas = document.querySelector('[data-aba="aba-demandas"]');
      if (btnDemandas) btnDemandas.click();
    }, MODULE_ID);
  }
}

function atualizarMetricasDashboard() {
  const state = window.StateManager.get(MODULE_ID);
  const demandas = state.demandas;
  
  const metricas = {
    ticketsAbertos: demandas.filter(d => d.status !== 'resolvido').length,
    claimsPendentes: demandas.filter(d => d.tipo.includes('Claim') && d.status !== 'resolvido').length,
    emailsHoje: 24, // Mock
    slaCumprido: 94 // Mock
  };
  
  setText('.aba-dashboard .metrica-card:nth-child(1) .metrica-valor', metricas.ticketsAbertos);
  setText('.aba-dashboard .metrica-card:nth-child(2) .metrica-valor', metricas.claimsPendentes);
  setText('.aba-dashboard .metrica-card:nth-child(3) .metrica-valor', metricas.emailsHoje);
  setText('.aba-dashboard .metrica-card:nth-child(4) .metrica-valor', metricas.slaCumprido);
}

/* ===============================
   DEMANDAS
================================ */
function initDemandasTab() {
  renderListaDemandas();
  
  // Botão nova demanda
  const btnNovaDemanda = document.getElementById('btnNovaDemanda');
  if (btnNovaDemanda) {
    window.ModuleLifecycle.addListener(btnNovaDemanda, 'click', abrirModalNovaDemanda, MODULE_ID);
  }
  
  // Filtros
  initFiltrosDemandas();
}

function initFiltrosDemandas() {
  const selects = document.querySelectorAll('.aba-demandas select');
  selects.forEach(select => {
    window.ModuleLifecycle.addListener(select, 'change', filtrarDemandas, MODULE_ID);
  });
}

function renderListaDemandas() {
  const state = window.StateManager.get(MODULE_ID);
  const container = document.getElementById('listaDemandas');
  if (!container) return;
  
  const demandas = state.demandas;
  
  if (demandas.length === 0) {
    container.innerHTML = '<p class="text-center" style="padding: 30px; color: #999;">Nenhuma demanda encontrada</p>';
    return;
  }
  
  container.innerHTML = demandas.map(demanda => `
    <div class="ticket-item status-${demanda.status}" data-ticket-id="${demanda.id}">
      <div class="ticket-info">
        <div class="ticket-cliente">${window.Utils.escapeHtml(demanda.cliente)} - ${window.Utils.escapeHtml(demanda.tipo)}</div>
        <div class="ticket-desc">${window.Utils.escapeHtml(demanda.descricao)}</div>
        <div class="ticket-meta">
          <span>ID: ${demanda.id}</span> • 
          <span>Plataforma: ${window.Utils.escapeHtml(demanda.plataforma)}</span> • 
          <span>Área: ${window.Utils.escapeHtml(demanda.area)}</span> • 
          <span>Criado: ${window.Utils.escapeHtml(demanda.criado)}</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: flex-end;">
        <span class="status-badge status-${demanda.status}">
          ${demanda.status === 'urgente' ? '🚨 Urgente' : 
            demanda.status === 'pendente' ? '📋 Pendente' :
            demanda.status === 'andamento' ? '🔄 Em Andamento' : '✅ Resolvido'}
        </span>
        <span style="font-size: 11px; color: #666;">${window.Utils.escapeHtml(demanda.prazo)}</span>
        <div style="display: flex; gap: 5px; margin-top: 5px;">
          <button class="btn btn-sm btn-secondary btn-detalhes" data-ticket="${demanda.id}">
            Detalhes
          </button>
          <button class="btn btn-sm btn-primary btn-atender" data-ticket="${demanda.id}">
            Atender
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Adicionar event listeners
  container.querySelectorAll('.btn-detalhes').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      verDetalhes(this.getAttribute('data-ticket'));
    }, MODULE_ID);
  });
  
  container.querySelectorAll('.btn-atender').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      atenderDemanda(this.getAttribute('data-ticket'));
    }, MODULE_ID);
  });
}

function filtrarDemandas() {
  const statusFilter = document.querySelector('.aba-demandas select:nth-of-type(1)')?.value;
  const areaFilter = document.querySelector('.aba-demandas select:nth-of-type(2)')?.value;
  const plataformaFilter = document.querySelector('.aba-demandas select:nth-of-type(3)')?.value;
  
  const state = window.StateManager.get(MODULE_ID);
  let filtered = [...state.demandas];
  
  if (statusFilter && statusFilter !== 'Todos os Status') {
    const statusMap = {
      'Abertos': (d) => d.status !== 'resolvido',
      'Em Andamento': (d) => d.status === 'andamento',
      'Resolvidos': (d) => d.status === 'resolvido',
      'Urgentes': (d) => d.status === 'urgente'
    };
    if (statusMap[statusFilter]) {
      filtered = filtered.filter(statusMap[statusFilter]);
    }
  }
  
  if (areaFilter && areaFilter !== 'Todas as Áreas') {
    filtered = filtered.filter(d => d.area === areaFilter);
  }
  
  if (plataformaFilter && plataformaFilter !== 'Todas as Plataformas') {
    filtered = filtered.filter(d => d.plataforma === plataformaFilter || d.plataforma === 'Todas');
  }
  
  // Atualizar estado com filtro temporário
  const originalDemandas = state.demandas;
  window.StateManager.set(MODULE_ID, { demandas: filtered });
  renderListaDemandas();
  // Restaurar estado original (mantém dados originais)
  window.StateManager.set(MODULE_ID, { demandas: originalDemandas });
}

/* ===============================
   ARTISTAS
================================ */
function initArtistasTab() {
  renderListaArtistas();
  
  // Botão buscar
  const inputBusca = document.querySelector('.aba-artistas input[type="text"]');
  if (inputBusca) {
    window.ModuleLifecycle.addListener(inputBusca, 'input', (e) => {
      filtrarArtistas(e.target.value);
    }, MODULE_ID);
  }
  
  // Botão novo artista
  const btnNovoArtista = document.querySelector('.aba-artistas .btn-success');
  if (btnNovoArtista) {
    window.ModuleLifecycle.addListener(btnNovoArtista, 'click', abrirModalNovoArtista, MODULE_ID);
  }
}

function renderListaArtistas() {
  const state = window.StateManager.get(MODULE_ID);
  const container = document.getElementById('listaArtistas');
  if (!container) return;
  
  const artistas = state.artistas;
  
  container.innerHTML = artistas.map(artista => `
    <div class="artista-item" data-artista-id="${artista.id}">
      <div class="artista-avatar">${window.Utils.escapeHtml(artista.nome.charAt(0))}</div>
      <div class="artista-info">
        <div class="artista-nome">${window.Utils.escapeHtml(artista.nome)}</div>
        <div class="artista-detalhes">
          <span>Contrato: ${window.Utils.escapeHtml(artista.contrato)}</span> • 
          <span>Plataformas: ${artista.plataformas.length}</span> • 
          <span>Último contato: ${window.Utils.escapeHtml(artista.ultimoContato)}</span>
          ${artista.documentos === 'Pendente' ? ' • <span style="color: #d62828;">📄 Doc. Pendente</span>' : ''}
          ${artista.pendentes > 0 ? ` • <span style="color: #ff9800;">⚠️ ${artista.pendentes} pendência(s)</span>` : ''}
        </div>
      </div>
      <div style="display: flex; gap: 5px;">
        <button class="btn btn-sm btn-secondary btn-ver-artista" data-artista="${artista.id}">
          Detalhes
        </button>
        <button class="btn btn-sm btn-primary btn-contatar-artista" data-artista="${artista.id}">
          Contatar
        </button>
      </div>
    </div>
  `).join('');
  
  // Adicionar event listeners
  container.querySelectorAll('.btn-ver-artista').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      verArtista(this.getAttribute('data-artista'));
    }, MODULE_ID);
  });
  
  container.querySelectorAll('.btn-contatar-artista').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      contatarArtista(this.getAttribute('data-artista'));
    }, MODULE_ID);
  });
}

function filtrarArtistas(termo) {
  const state = window.StateManager.get(MODULE_ID);
  let artistas = [...state.artistas];
  
  if (termo.trim()) {
    artistas = artistas.filter(artista =>
      artista.nome.toLowerCase().includes(termo.toLowerCase())
    );
  }
  
  // Renderizar com filtro (mantém dados originais no estado)
  const container = document.getElementById('listaArtistas');
  if (!container) return;
  
  container.innerHTML = artistas.map(artista => `
    <div class="artista-item" data-artista-id="${artista.id}">
      <div class="artista-avatar">${window.Utils.escapeHtml(artista.nome.charAt(0))}</div>
      <div class="artista-info">
        <div class="artista-nome">${window.Utils.escapeHtml(artista.nome)}</div>
        <div class="artista-detalhes">
          <span>Contrato: ${window.Utils.escapeHtml(artista.contrato)}</span> • 
          <span>Plataformas: ${artista.plataformas.length}</span> • 
          <span>Último contato: ${window.Utils.escapeHtml(artista.ultimoContato)}</span>
          ${artista.documentos === 'Pendente' ? ' • <span style="color: #d62828;">📄 Doc. Pendente</span>' : ''}
          ${artista.pendentes > 0 ? ` • <span style="color: #ff9800;">⚠️ ${artista.pendentes} pendência(s)</span>` : ''}
        </div>
      </div>
      <div style="display: flex; gap: 5px;">
        <button class="btn btn-sm btn-secondary btn-ver-artista" data-artista="${artista.id}">
          Detalhes
        </button>
        <button class="btn btn-sm btn-primary btn-contatar-artista" data-artista="${artista.id}">
          Contatar
        </button>
      </div>
    </div>
  `).join('');
  
  // Adicionar listeners novamente
  container.querySelectorAll('.btn-ver-artista').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      verArtista(this.getAttribute('data-artista'));
    }, MODULE_ID);
  });
  
  container.querySelectorAll('.btn-contatar-artista').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      contatarArtista(this.getAttribute('data-artista'));
    }, MODULE_ID);
  });
}

/* ===============================
   COMUNICAÇÃO
================================ */
function initComunicacaoTab() {
  const selectArtista = document.querySelector('.aba-comunicacao .select-atendente');
  if (selectArtista) {
    const state = window.StateManager.get(MODULE_ID);
    selectArtista.innerHTML = `
      <option value="">Selecionar Artista</option>
      ${state.artistas.map(a => `<option value="${a.id}">${window.Utils.escapeHtml(a.nome)}</option>`).join('')}
    `;
    
    window.ModuleLifecycle.addListener(selectArtista, 'change', (e) => {
      const artistaId = e.target.value;
      if (artistaId) {
        carregarHistoricoComunicacao(artistaId);
      } else {
        limparHistoricoComunicacao();
      }
    }, MODULE_ID);
  }
  
  // Templates rápidos
  document.querySelectorAll('.aba-comunicacao .template-btn').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', (e) => {
      usarTemplate(e.target.textContent);
    }, MODULE_ID);
  });
  
  // Botão enviar mensagem
  const btnEnviar = document.querySelector('.aba-comunicacao .btn-primary');
  const textarea = document.querySelector('.aba-comunicacao textarea');
  
  if (btnEnviar) {
    window.ModuleLifecycle.addListener(btnEnviar, 'click', () => {
      if (textarea) enviarMensagem(textarea.value);
    }, MODULE_ID);
  }
  
  if (textarea) {
    window.ModuleLifecycle.addListener(textarea, 'keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        enviarMensagem(e.target.value);
      }
    }, MODULE_ID);
  }
  
  // Carregar primeiro artista por padrão
  const state = window.StateManager.get(MODULE_ID);
  if (selectArtista && state.artistas.length > 0) {
    selectArtista.value = state.artistas[0].id;
    carregarHistoricoComunicacao(state.artistas[0].id);
  }
}

function carregarHistoricoComunicacao(artistaId) {
  const container = document.getElementById('historicoComunicacao');
  if (!container) return;
  
  const state = window.StateManager.get(MODULE_ID);
  const artista = state.artistas.find(a => a.id === artistaId);
  if (!artista) return;
  
  // Mock de histórico
  const historico = artistaId === 'ART-001' ? [
    { id: 'MSG-001', tipo: 'enviado', texto: 'Solicitamos os documentos pendentes para liberação do pagamento.', data: 'Hoje, 09:30', remetente: 'Juan Copyright' },
    { id: 'MSG-002', tipo: 'recebido', texto: 'Enviarei os documentos até amanhã.', data: 'Hoje, 09:45', remetente: 'Anitta' },
    { id: 'MSG-003', tipo: 'enviado', texto: 'Recebemos 3 claims no YouTube que precisam de sua atenção.', data: 'Ontem, 14:20', remetente: 'Juan Copyright' },
    { id: 'MSG-004', tipo: 'recebido', texto: 'Vou revisar ainda hoje e retorno.', data: 'Ontem, 14:35', remetente: 'Anitta' }
  ] : artistaId === 'ART-002' ? [
    { id: 'MSG-005', tipo: 'enviado', texto: 'Documentação pendente para liberação financeira.', data: '2 dias atrás', remetente: 'Maria Financeiro' },
    { id: 'MSG-006', tipo: 'enviado', texto: 'Lembrete: prazo para envio vence amanhã.', data: 'Hoje, 08:15', remetente: 'Juan Copyright' }
  ] : [
    { id: 'MSG-007', tipo: 'enviado', texto: 'Bem-vindo(a) à Lujo Network! Como podemos ajudar?', data: 'Última semana', remetente: 'Equipe Copyright' }
  ];
  
  container.innerHTML = historico.map(msg => `
    <div class="${msg.tipo === 'enviado' ? 'msg-right' : 'msg-left'}" 
         style="margin-bottom: 15px; padding: 10px 14px; border-radius: 10px; max-width: 85%; align-self: ${msg.tipo === 'enviado' ? 'flex-end' : 'flex-start'}; background: ${msg.tipo === 'enviado' ? '#d2f8c6' : '#ffffff'}; border: 1px solid ${msg.tipo === 'enviado' ? '#b3e0a1' : '#e0e0e0'};">
      <div style="font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 600;">
        ${window.Utils.escapeHtml(msg.remetente)}
      </div>
      <p style="margin: 0; font-size: 14px; line-height: 1.4;">${window.Utils.escapeHtml(msg.texto)}</p>
      <span style="font-size: 10px; color: #888; text-align: right; display: block; margin-top: 6px;">${window.Utils.escapeHtml(msg.data)}</span>
    </div>
  `).join('');
  
  container.scrollTop = container.scrollHeight;
}

function limparHistoricoComunicacao() {
  const container = document.getElementById('historicoComunicacao');
  if (container) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Selecione um artista para ver o histórico</p>';
  }
}

function usarTemplate(templateNome) {
  const textarea = document.querySelector('.aba-comunicacao textarea');
  if (!textarea) return;
  
  const state = window.StateManager.get(MODULE_ID);
  const template = state.templates.find(t => t.nome === templateNome);
  if (template) {
    let conteudo = template.conteudo;
    const artistaSelect = document.querySelector('.aba-comunicacao .select-atendente');
    const artistaId = artistaSelect ? artistaSelect.value : null;
    const artista = artistaId ? state.artistas.find(a => a.id === artistaId) : null;
    
    if (artista) {
      conteudo = conteudo.replace(/{artista}/g, artista.nome);
    }
    
    textarea.value = conteudo;
    textarea.focus();
    textarea.scrollTop = 0;
  } else {
    textarea.value = `Template: ${templateNome}\n\n[Digite sua mensagem aqui]`;
  }
}

function enviarMensagem(texto) {
  if (!texto.trim()) {
    alert('Digite uma mensagem antes de enviar.');
    return;
  }
  
  const selectArtista = document.querySelector('.aba-comunicacao .select-atendente');
  if (!selectArtista || !selectArtista.value) {
    alert('Selecione um artista primeiro.');
    return;
  }
  
  const container = document.getElementById('historicoComunicacao');
  if (container) {
    const msgElement = document.createElement('div');
    msgElement.className = 'msg-right';
    msgElement.style.cssText = 'margin-bottom: 15px; padding: 10px 14px; border-radius: 10px; max-width: 85%; align-self: flex-end; background: #d2f8c6; border: 1px solid #b3e0a1;';
    msgElement.innerHTML = `
      <div style="font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 600;">Você</div>
      <p style="margin: 0; font-size: 14px; line-height: 1.4;">${window.Utils.escapeHtml(texto)}</p>
      <span style="font-size: 10px; color: #888; text-align: right; display: block; margin-top: 6px;">Agora</span>
    `;
    
    container.appendChild(msgElement);
    const textarea = document.querySelector('.aba-comunicacao textarea');
    if (textarea) textarea.value = '';
    container.scrollTop = container.scrollHeight;
  }
}

/* ===============================
   RELATÓRIOS
================================ */
function initRelatoriosTab() {
  document.querySelectorAll('.aba-relatorios .template-btn').forEach(btn => {
    window.ModuleLifecycle.addListener(btn, 'click', function() {
      const relatorioNome = this.textContent.replace('📄 ', '');
      gerarRelatorio(relatorioNome);
    }, MODULE_ID);
  });
  
  atualizarMetricasRelatorios();
}

function atualizarMetricasRelatorios() {
  const state = window.StateManager.get(MODULE_ID);
  const demandas = state.demandas;
  
  const ticketsMes = demandas.filter(d => d.criado.includes('Hoje') || d.criado.includes('Ontem') || d.criado.includes('dias')).length;
  const claimsPlataforma = demandas.filter(d => d.tipo.includes('Claim')).length;
  
  setText('.aba-relatorios .metrica-card:nth-child(1) .metrica-valor', ticketsMes);
  setText('.aba-relatorios .metrica-card:nth-child(3) .metrica-valor', claimsPlataforma);
}

function gerarRelatorio(nome) {
  alert(`Relatório "${nome}" está sendo gerado...\n\nEm produção, isso abriria um modal com opções de exportação.`);
}

/* ===============================
   MODAIS
================================ */
function abrirModalNovaDemanda() {
  const state = window.StateManager.get(MODULE_ID);
  
  const modalHTML = `
    <div class="modal-overlay active" id="modalNovaDemanda">
      <div class="modal-content">
        <div class="modal-header">
          <h3>➕ Nova Demanda</h3>
          <button class="close-btn" id="btnCloseNovaDemanda">&times;</button>
        </div>
        <form id="formNovaDemanda" style="padding: 25px;">
          <div class="form-row">
            <div class="form-group">
              <label for="demandaArtista">Artista</label>
              <select id="demandaArtista" required>
                <option value="">Selecione</option>
                ${state.artistas.map(a => `<option value="${a.id}">${window.Utils.escapeHtml(a.nome)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="demandaTipo">Tipo de Demanda</label>
              <select id="demandaTipo" required>
                <option value="">Selecione</option>
                <option value="Claim">Claim</option>
                <option value="Documentação">Documentação</option>
                <option value="Contrato">Contrato</option>
                <option value="Verificação">Verificação</option>
                <option value="Takedown">Takedown</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="demandaDescricao">Descrição</label>
            <textarea id="demandaDescricao" rows="4" required placeholder="Descreva a demanda..."></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="demandaPlataforma">Plataforma</label>
              <select id="demandaPlataforma">
                <option value="Todas">Todas</option>
                <option value="YouTube">YouTube</option>
                <option value="Spotify">Spotify</option>
                <option value="Deezer">Deezer</option>
                <option value="Apple Music">Apple Music</option>
              </select>
            </div>
            <div class="form-group">
              <label for="demandaPrioridade">Prioridade</label>
              <select id="demandaPrioridade" required>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="btnCancelarNovaDemanda">Cancelar</button>
            <button type="submit" class="btn btn-primary">Criar Demanda</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Adicionar listeners
  const btnClose = document.getElementById('btnCloseNovaDemanda');
  const btnCancelar = document.getElementById('btnCancelarNovaDemanda');
  const form = document.getElementById('formNovaDemanda');
  
  if (btnClose) {
    window.ModuleLifecycle.addListener(btnClose, 'click', fecharModal, MODULE_ID);
  }
  if (btnCancelar) {
    window.ModuleLifecycle.addListener(btnCancelar, 'click', fecharModal, MODULE_ID);
  }
  if (form) {
    window.ModuleLifecycle.addListener(form, 'submit', (e) => {
      e.preventDefault();
      criarNovaDemanda();
    }, MODULE_ID);
  }
}

function abrirModalNovoArtista() {
  alert('Modal de novo artista será implementado aqui.\n\nEm produção, isso abriria um formulário completo.');
}

function criarNovaDemanda() {
  const artistaSelect = document.getElementById('demandaArtista');
  const tipoSelect = document.getElementById('demandaTipo');
  const descricaoTextarea = document.getElementById('demandaDescricao');
  const plataformaSelect = document.getElementById('demandaPlataforma');
  const prioridadeSelect = document.getElementById('demandaPrioridade');
  
  if (!artistaSelect?.value || !tipoSelect?.value || !descricaoTextarea?.value) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }
  
  const state = window.StateManager.get(MODULE_ID);
  const artista = state.artistas.find(a => a.id === artistaSelect.value);
  if (!artista) {
    alert('Artista não encontrado.');
    return;
  }
  
  const novaDemanda = {
    id: 'TKT-' + (state.demandas.length + 1).toString().padStart(3, '0'),
    cliente: artista.nome,
    tipo: tipoSelect.value,
    descricao: descricaoTextarea.value,
    plataforma: plataformaSelect.value,
    status: 'pendente',
    prazo: prioridadeSelect.value === 'urgente' ? '24h' : '3 dias',
    area: tipoSelect.value === 'Documentação' ? 'Financeiro' : 'Jurídico',
    criado: 'Agora',
    responsavel: 'Juan Copyright',
    prioridade: prioridadeSelect.value
  };
  
  // Atualizar estado
  const newDemandas = [novaDemanda, ...state.demandas];
  window.StateManager.set(MODULE_ID, { demandas: newDemandas });
  
  fecharModal();
  renderListaDemandas();
  alert(`✅ Demanda ${novaDemanda.id} criada com sucesso para ${artista.nome}!`);
  
  // Navegar para aba de demandas
  const btnDemandas = document.querySelector('[data-aba="aba-demandas"]');
  if (btnDemandas) btnDemandas.click();
}

function fecharModal() {
  const modal = document.getElementById('modalNovaDemanda');
  if (modal) {
    modal.remove();
  }
}

/* ===============================
   FUNÇÕES PÚBLICAS
================================ */
function verDetalhes(ticketId) {
  const state = window.StateManager.get(MODULE_ID);
  const demanda = state.demandas.find(d => d.id === ticketId);
  if (!demanda) {
    alert(`Ticket ${ticketId} não encontrado.`);
    return;
  }
  
  const detalhes = `
📄 **DETALHES DO TICKET**

**ID:** ${demanda.id}
**Cliente:** ${demanda.cliente}
**Tipo:** ${demanda.tipo}
**Status:** ${demanda.status.toUpperCase()}
**Prioridade:** ${demanda.prioridade.toUpperCase()}

**Descrição:**
${demanda.descricao}

**Informações Adicionais:**
• Plataforma: ${demanda.plataforma}
• Área Responsável: ${demanda.area}
• Prazo: ${demanda.prazo}
• Criado: ${demanda.criado}
• Responsável: ${demanda.responsavel}

**Ações Disponíveis:**
1. Atender demanda
2. Alterar prioridade
3. Reatribuir responsável
4. Marcar como resolvido
  `;
  
  alert(detalhes);
}

function atenderDemanda(ticketId) {
  const state = window.StateManager.get(MODULE_ID);
  const demanda = state.demandas.find(d => d.id === ticketId);
  if (!demanda) {
    alert(`Ticket ${ticketId} não encontrado.`);
    return;
  }
  
  if (confirm(`Iniciar atendimento do ticket ${ticketId} (${demanda.cliente} - ${demanda.tipo})?`)) {
    const updatedDemanda = { ...demanda, status: 'andamento', responsavel: 'Você' };
    const newDemandas = state.demandas.map(d => d.id === ticketId ? updatedDemanda : d);
    window.StateManager.set(MODULE_ID, { demandas: newDemandas });
    
    renderListaDemandas();
    alert(`✅ Ticket ${ticketId} marcado como "Em Andamento".\nVocê agora é o responsável.`);
  }
}

function verArtista(artistaId) {
  const state = window.StateManager.get(MODULE_ID);
  const artista = state.artistas.find(a => a.id === artistaId);
  if (!artista) {
    alert(`Artista ${artistaId} não encontrado.`);
    return;
  }
  
  const demandas = state.demandas.filter(d => d.cliente === artista.nome && d.status !== 'resolvido');
  
  const detalhes = `
🎤 **DETALHES DO ARTISTA**

**Nome:** ${artista.nome}
**Contrato:** ${artista.contrato}
**Email:** ${artista.email}
**Telefone:** ${artista.telefone}

**Plataformas:** ${artista.plataformas.join(', ')}
**Documentação:** ${artista.documentos}
**Último Contato:** ${artista.ultimoContato}
**Pendências Ativas:** ${artista.pendentes}

**Demandas Ativas:**
${demandas.map(d => `• ${d.id} - ${d.tipo} (${d.status})`).join('\n') || 'Nenhuma demanda ativa'}

**Ações Disponíveis:**
1. Enviar mensagem
2. Solicitar documentos
3. Ver histórico completo
4. Editar informações
  `;
  
  alert(detalhes);
}

function contatarArtista(artistaId) {
  const btnComunicacao = document.querySelector('[data-aba="aba-comunicacao"]');
  if (btnComunicacao) {
    btnComunicacao.click();
    
    setTimeout(() => {
      const select = document.querySelector('.aba-comunicacao .select-atendente');
      if (select) {
        select.value = artistaId;
        select.dispatchEvent(new Event('change'));
      }
    }, 300);
  }
}

/* ===============================
   UTILS
================================ */
function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

// Manter window.copyrightModule para compatibilidade
window.copyrightModule = {
  verDetalhes,
  atenderDemanda,
  verArtista,
  contatarArtista,
  fecharModal,
  mostrarAba: mostrarAbaConteudo
};

console.log("✅ Módulo Copyright refatorado carregado");

/**
 * ==================================================================================
 * DEMANDAS.JS — Orquestrador da Aba de Demandas Externas
 * ==================================================================================
 *
 * ARQUITETURA:
 *   EstadoManager  — controla visibilidade dos estados via classList (NUNCA inline)
 *   DemandasTab    — objeto principal: init, eventos, lógica por sub-aba
 *
 * FLUXO DE INICIALIZAÇÃO:
 *   1. carregarSubAbas()    → fetch dos 4 fragmentos HTML → injeta em .demandas-container
 *   2. _injetarCSSSubAbas() → injeta <link> dos 4 CSS específicos no <head>
 *   3. cacheElements()      → guarda referências dos elementos DOM
 *   4. bindEvents()         → vincula listeners via ModuleLifecycle
 *   5. EstadoManager.inicializar() → estados iniciais de cada sub-aba
 *   6. activateSubTab('consulta')  → exibe a primeira sub-aba
 * ==================================================================================
 */

// ==================================================================================
// ESTADO MANAGER
// ==================================================================================

const EstadoManager = (function () {

  const CONFIG = {
    consulta: {
      estadoVazio:         'estadoAguardandoConsulta',
      estadoCarregando:    'estadoCarregandoConsulta',
      estadoNaoEncontrado: 'estadoNaoEncontradoConsulta',
      listaResultados:     'listaResultadosConsulta',
      contador:            'contadorResultados',
      estadoInicial:       'vazio'
    },
    recebidas: {
      estadoVazio:         null,
      estadoCarregando:    'estadoCarregandoRecebidas',
      estadoNaoEncontrado: 'estadoNaoEncontradoRecebidas',
      listaResultados:     'listaDemandasRecebidas',
      contador:            'contadorRecebidas',
      estadoInicial:       'carregando'
    },
    encaminhadas: {
      estadoVazio:         'estadoVazioEncaminhadas',
      estadoCarregando:    'estadoCarregandoEncaminhadas',
      estadoNaoEncontrado: 'estadoNaoEncontradoEncaminhadas',
      listaResultados:     'listaDemandasEncaminhadas',
      contador:            'contadorEncaminhadas',
      estadoInicial:       'vazio'
    },
    minhas: {
      estadoVazio:         null,
      estadoCarregando:    'estadoCarregandoMinhas',
      estadoNaoEncontrado: null,
      listaResultados:     'listaDemandasMinhas',
      contador:            'contadorMinhas',
      estadoInicial:       'carregando'
    }
  };

  function setEstado(subAba, novoEstado, dados = []) {
    if (!CONFIG[subAba]) { console.error(`❌ EstadoManager: sub-aba inválida — ${subAba}`); return false; }

    const c = CONFIG[subAba];
    console.log(`🔄 EstadoManager: ${subAba} → ${novoEstado}`, novoEstado === 'dados' ? `(${dados.length})` : '');

    _limpar(c);

    switch (novoEstado) {
      case 'vazio':         if (c.estadoVazio) _ativar(c.estadoVazio); _ocultarLista(c); _contador(c, 0); break;
      case 'carregando':    _ativar(c.estadoCarregando); _ocultarLista(c); _contador(c, 0); break;
      case 'nao-encontrado': if (c.estadoNaoEncontrado) _ativar(c.estadoNaoEncontrado); _ocultarLista(c); _contador(c, 0); break;
      case 'dados':         _mostrarLista(c); _contador(c, dados.length); break;
      default: console.error(`❌ Estado inválido: ${novoEstado}`); return false;
    }
    return true;
  }

  function _limpar(c) {
    [c.estadoVazio, c.estadoCarregando, c.estadoNaoEncontrado].filter(Boolean).forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('ativa'); el.style.display = ''; }
    });
  }

  function _ativar(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = ''; el.classList.add('ativa'); }
  }

  function _ocultarLista(c) {
    const el = document.getElementById(c.listaResultados);
    if (el) el.classList.add('hidden');
  }

  function _mostrarLista(c) {
    const el = document.getElementById(c.listaResultados);
    if (el) el.classList.remove('hidden');
  }

  function _contador(c, n) {
    const el = document.getElementById(c.contador);
    if (!el) return;
    if (n === 0) { el.textContent = '0 encontrados'; el.style.color = ''; el.style.fontWeight = ''; }
    else { el.textContent = `${n} ${n === 1 ? 'demanda' : 'demandas'}`; el.style.color = 'var(--color-primary)'; el.style.fontWeight = '600'; }
  }

  function inicializar() {
    console.log('🚀 EstadoManager: inicializando...');
    Object.entries(CONFIG).forEach(([sub, c]) => setEstado(sub, c.estadoInicial));
    console.log('✅ EstadoManager: pronto');
  }

  function resetar(subAba) {
    if (!CONFIG[subAba]) return false;
    setEstado(subAba, CONFIG[subAba].estadoInicial);
    return true;
  }

  function getEstadoAtual(subAba) {
    if (!CONFIG[subAba]) return null;
    const c = CONFIG[subAba];
    if (c.estadoVazio && document.getElementById(c.estadoVazio)?.classList.contains('ativa')) return 'vazio';
    if (c.estadoCarregando && document.getElementById(c.estadoCarregando)?.classList.contains('ativa')) return 'carregando';
    if (c.estadoNaoEncontrado && document.getElementById(c.estadoNaoEncontrado)?.classList.contains('ativa')) return 'nao-encontrado';
    const lista = document.getElementById(c.listaResultados);
    if (lista && !lista.classList.contains('hidden')) return 'dados';
    return null;
  }

  function debug() {
    console.group('🔍 EstadoManager DEBUG');
    Object.keys(CONFIG).forEach(sub => console.log(`  ${sub}: ${getEstadoAtual(sub) || '?'}`));
    console.groupEnd();
  }

  return { setEstado, inicializar, resetar, getEstadoAtual, debug };
})();


// ==================================================================================
// DEMANDAS TAB
// ==================================================================================

const DemandasTab = {

  id: 'aba-demandas', moduleId: 'demandas',
  elements: {}, _initialized: false, _eventsBound: false, _activeSubTab: 'consulta',
  _ultimoDocConsulta: null,
  _cacheConsulta: [], _cacheRecebidas: [], _cacheEncaminhadas: [], _cacheMinhas: [],
  _unsubscribeRecebidas: null, _unsubscribeMinhas: null,

  // ------------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------------

  async init() {
    if (this._initialized) { console.warn('⚠️ DemandasTab já inicializado.'); return; }
    console.log('📋 Inicializando DemandasTab...');
    try {
      await this.carregarSubAbas();
      this.cacheElements();
      this.bindEvents();
      EstadoManager.inicializar();
      this.activateSubTab('consulta');
      this._initialized = true;
      console.log('✅ DemandasTab pronto');
    } catch (err) {
      console.error('❌ DemandasTab.init():', err);
      this._initialized = false;
    }
  },

  // ------------------------------------------------------------------
  // CARREGAR HTML DAS SUB-ABAS
  // ------------------------------------------------------------------

  async carregarSubAbas() {
    const container = document.querySelector('.demandas-container');
    if (!container) throw new Error('.demandas-container não encontrado');

    const BASE = '/templates/modules/atendimento/tabs/aba-demandas/abas-demandas';

    for (const sub of ['consulta', 'recebidas', 'minhas', 'encaminhadas']) {
      const resp = await fetch(`${BASE}/subaba-${sub}.html`);
      if (!resp.ok) throw new Error(`Falha HTTP ${resp.status} em subaba-${sub}.html`);
      container.insertAdjacentHTML('beforeend', await resp.text());
      console.log(`  ✅ subaba-${sub}.html`);
    }

    //this._injetarCSSSubAbas(BASE);
    console.log('✅ Sub-abas carregadas');
  },
  // ------------------------------------------------------------------
  // CACHE DE ELEMENTOS
  // ------------------------------------------------------------------

  cacheElements() {
    this.elements = {
      subAbasContainer: document.querySelector('.sub-abas-demandas'),
      subAbaButtons:    document.querySelectorAll('.sub-aba-btn'),
      conteudoConsulta:     document.querySelector('.demandas-consulta'),
      conteudoRecebidas:    document.querySelector('.demandas-recebidas'),
      conteudoEncaminhadas: document.querySelector('.demandas-encaminhadas'),
      conteudoMinhas:       document.querySelector('.demandas-minhas'),
      // consulta
      formBuscaDemanda: document.getElementById('formBuscaDemanda'),
      btnExecutarBusca: document.getElementById('btnExecutarBusca'),
      btnLimparBusca:   document.getElementById('btnLimparBusca'),
      buscaTicket:  document.getElementById('buscaTicket'),
      buscaCliente: document.getElementById('buscaCliente'),
      buscaSetor:   document.getElementById('buscaSetor'),
      buscaStatus:  document.getElementById('buscaStatus'),
      buscaPeriodo: document.getElementById('buscaPeriodo'),
      detalhesConteudoConsulta: document.getElementById('detalhesConteudoConsulta'),
      detalhesVazioConsulta:    document.getElementById('detalhesVazioConsulta'),
      btnFecharDetalhesConsulta: document.getElementById('btnFecharDetalhesConsulta'),
      // recebidas
      filtroStatusRecebidas:    document.getElementById('filtroStatusRecebidas'),
      filtroOrigemRecebidas:    document.getElementById('filtroOrigemRecebidas'),
      filtroPrioridadeRecebidas:document.getElementById('filtroPrioridadeRecebidas'),
      filtroPeriodoRecebidas:   document.getElementById('filtroPeriodoRecebidas'),
      btnAplicarFiltrosRecebidas: document.getElementById('btnAplicarFiltrosRecebidas'),
      btnLimparFiltrosRecebidas:  document.getElementById('btnLimparFiltrosRecebidas'),
      detalhesConteudoRecebidas:  document.getElementById('detalhesConteudoRecebidas'),
      detalhesVazioRecebidas:     document.getElementById('detalhesVazioRecebidas'),
      btnFecharDetalhesRecebidas: document.getElementById('btnFecharDetalhesRecebidas'),
      btnAceitarDemanda:          document.getElementById('btnAceitarDemanda'),
      // encaminhadas
      filtroStatusEncaminhadas:    document.getElementById('filtroStatusEncaminhadas'),
      filtroSetorEncaminhadas:     document.getElementById('filtroSetorEncaminhadas'),
      filtroPeriodoEncaminhadas:   document.getElementById('filtroPeriodoEncaminhadas'),
      btnAplicarFiltrosEncaminhadas: document.getElementById('btnAplicarFiltrosEncaminhadas'),
      btnLimparFiltrosEncaminhadas:  document.getElementById('btnLimparFiltrosEncaminhadas'),
      detalhesConteudoEncaminhadas:  document.getElementById('detalhesConteudoEncaminhadas'),
      detalhesVazioEncaminhadas:     document.getElementById('detalhesVazioEncaminhadas'),
      btnFecharDetalhesEncaminhadas: document.getElementById('btnFecharDetalhesEncaminhadas'),
      // minhas
      listaDemandasMinhas:    document.getElementById('listaDemandasMinhas'),
      inputResolucao:         document.getElementById('inputResolucao'),
      btnConcluirTrabalho:    document.getElementById('btnConcluirTrabalho'),
      btnDevolverDemanda:     document.getElementById('btnDevolverDemanda'),
      detalhesConteudoMinhas: document.getElementById('detalhesConteudoMinhas'),
      detalhesVazioMinhas:    document.getElementById('detalhesVazioMinhas'),
    };
    console.log(`✅ ${Object.keys(this.elements).length} elementos cacheados`);
  },

  // ------------------------------------------------------------------
  // EVENTOS
  // ------------------------------------------------------------------

  bindEvents() {
    if (this._eventsBound) { console.log('⚠️ Eventos já vinculados.'); return; }
    const ML = window.ModuleLifecycle;
    const id = this.moduleId;

    // Navegação sub-abas (delegação)
    if (this.elements.subAbasContainer) {
      ML.addListener(this.elements.subAbasContainer, 'click', (e) => {
        const btn = e.target.closest('.sub-aba-btn');
        if (btn?.dataset.subaba) { e.preventDefault(); e.stopPropagation(); this.activateSubTab(btn.dataset.subaba); }
      }, id);
    }

    // Consulta
    ML.addListener(this.elements.btnExecutarBusca, 'click', (e) => { e.preventDefault(); this.aplicarFiltrosConsulta(); }, id);
    ML.addListener(this.elements.btnLimparBusca, 'click', (e) => { e.preventDefault(); this.limparBuscaConsulta(); }, id);
    ML.addListener(this.elements.btnFecharDetalhesConsulta, 'click', () => this.fecharDetalhes('consulta'), id);

    // Recebidas
    ML.addListener(this.elements.btnAplicarFiltrosRecebidas, 'click', (e) => { e.preventDefault(); this.aplicarFiltrosRecebidas(); }, id);
    ML.addListener(this.elements.btnLimparFiltrosRecebidas, 'click', (e) => { e.preventDefault(); this.limparFiltrosRecebidas(); }, id);
    ML.addListener(this.elements.btnFecharDetalhesRecebidas, 'click', () => this.fecharDetalhes('recebidas'), id);

    // Encaminhadas
    ML.addListener(this.elements.btnAplicarFiltrosEncaminhadas, 'click', (e) => { e.preventDefault(); this.aplicarFiltrosEncaminhadas(); }, id);
    ML.addListener(this.elements.btnLimparFiltrosEncaminhadas, 'click', (e) => { e.preventDefault(); this.limparFiltrosEncaminhadas(); }, id);
    ML.addListener(this.elements.btnFecharDetalhesEncaminhadas, 'click', () => this.fecharDetalhes('encaminhadas'), id);

    // Minhas
    if (this.elements.btnConcluirTrabalho) {
      ML.addListener(this.elements.btnConcluirTrabalho, 'click', () => {
        const did = this.elements.detalhesConteudoMinhas?.dataset.id;
        if (did) this.handleConcluirDemanda(did);
      }, id);
    }
    if (this.elements.btnDevolverDemanda) {
      ML.addListener(this.elements.btnDevolverDemanda, 'click', () => {
        const did = this.elements.detalhesConteudoMinhas?.dataset.id;
        if (did) this.handleRecusarDemanda(did);
      }, id);
    }

    this._eventsBound = true;
    console.log('✅ Eventos vinculados');
  },

  // ------------------------------------------------------------------
  // GERENCIAMENTO DE SUB-ABAS
  // ------------------------------------------------------------------

  activateSubTab(subTabId) {
    if (!['consulta','recebidas','encaminhadas','minhas'].includes(subTabId)) {
      console.error(`❌ Sub-aba inválida: ${subTabId}`); return;
    }
    console.log(`📑 Ativando: ${subTabId}`);
    this._activeSubTab = subTabId;

    this.elements.subAbaButtons?.forEach(btn =>
      btn.classList.toggle('ativa', btn.dataset.subaba === subTabId)
    );

    const mapa = { consulta: this.elements.conteudoConsulta, recebidas: this.elements.conteudoRecebidas,
                   encaminhadas: this.elements.conteudoEncaminhadas, minhas: this.elements.conteudoMinhas };
    Object.entries(mapa).forEach(([k, el]) => el?.classList.toggle('ativa', k === subTabId));

    if (subTabId !== 'recebidas' && this._unsubscribeRecebidas) {
      this._unsubscribeRecebidas(); this._unsubscribeRecebidas = null;
    }

    ['consulta','recebidas','encaminhadas'].forEach(s => this.fecharDetalhes(s));

    switch (subTabId) {
      case 'consulta':     EstadoManager.resetar('consulta'); break;
      case 'recebidas':    this.carregarDemandasRecebidas(); break;
      case 'encaminhadas': this.aplicarFiltrosEncaminhadas(); break;
      case 'minhas':       this.carregarMinhasDemandas(); break;
    }
    console.log(`✅ Sub-aba ${subTabId} ativa`);
  },

  // ------------------------------------------------------------------
  // CONSULTA
  // ------------------------------------------------------------------

  async aplicarFiltrosConsulta(continuar = false) {
    if (!continuar) { this._ultimoDocConsulta = null; EstadoManager.setEstado('consulta', 'carregando'); }

    const filtros = {
      ticket:  this.elements.buscaTicket?.value?.trim(),
      cliente: this.elements.buscaCliente?.value?.trim(),
      setor:   this.elements.buscaSetor?.value,
      status:  this.elements.buscaStatus?.value,
      periodo: this.elements.buscaPeriodo?.value
    };

    try {
      const res   = await window.DemandasService.consultarAndamento(filtros, this._ultimoDocConsulta);
      const lista = res.dados ?? res;
      this._ultimoDocConsulta = res.ultimoVisivel ?? null;

      if (lista.length === 0 && !continuar) { EstadoManager.setEstado('consulta', 'nao-encontrado'); return; }

      this._cacheConsulta = continuar ? [...this._cacheConsulta, ...lista] : lista;
      this._renderizarListaConsulta(lista, continuar);
      this._gerenciarBotaoPaginacao(this._ultimoDocConsulta !== null);
    } catch (err) {
      console.error('❌ Consulta:', err);
      EstadoManager.setEstado('consulta', 'nao-encontrado');
    }
  },

  limparBuscaConsulta() {
    this.elements.formBuscaDemanda?.reset();
    this._cacheConsulta = []; this._ultimoDocConsulta = null;
    EstadoManager.resetar('consulta'); this.fecharDetalhes('consulta');
  },

  _gerenciarBotaoPaginacao(mostrar) {
    const container = document.getElementById('listaResultadosConsulta');
    let btn = document.getElementById('btnCarregarMaisConsulta');
    if (!mostrar) { btn?.remove(); return; }
    if (!btn && container) {
      btn = document.createElement('button');
      btn.id = 'btnCarregarMaisConsulta';
      btn.className = 'btn btn-secondary btn-carregar-mais';
      btn.innerHTML = '<i class="fi fi-rr-angle-small-down"></i> Carregar mais 10';
      btn.onclick = () => this.aplicarFiltrosConsulta(true);
      container.after(btn);
    }
  },

 _renderizarListaConsulta(demandas, adicionar = false) {
    const lista = document.getElementById('listaResultadosConsulta');
    if (!lista) return;
    
    if (!adicionar) { 
        lista.innerHTML = ''; 
        EstadoManager.setEstado('consulta', 'dados', demandas); 
    }

    const html = demandas.map(d => `
      <div class="demanda-card" onclick="DemandasTab.selecionarDemanda('consulta','${d.id}')">
        <div class="demanda-card-header">
          <span class="demanda-card-titulo">${d.resumo || 'Sem título'}</span>
          <span class="demanda-card-badge ${d.status_label?.classe || 'status-pendente'}">
            ${d.status_label?.label || d.status || 'Pendente'}
          </span>
        </div>
        
        <div class="demanda-card-info">
          <span><i class="fi fi-rr-calendar"></i> ${d.criado_em_formatado || '-'}</span>
          <span><i class="fi fi-rr-envelope"></i> ${d.cliente_email || 'E-mail não informado'}</span>
        </div>

        <div class="demanda-card-footer">
          <span class="demanda-id-tag">#${d.demandaId || d.id.substring(0, 8)}</span>
          <i class="fi fi-rr-angle-small-right"></i>
        </div>
      </div>`).join('');

    if (adicionar) lista.insertAdjacentHTML('beforeend', html); 
    else lista.innerHTML = html;
},

  // ------------------------------------------------------------------
  // RECEBIDAS
  // ------------------------------------------------------------------

  async carregarDemandasRecebidas() {
    if (this._unsubscribeRecebidas) return;
    const setor = window.AtendimentoModule?.id || 'atendimento';
    EstadoManager.setEstado('recebidas', 'carregando');
    this._unsubscribeRecebidas = window.DemandasService.escutarDemandasRecebidas(setor, (demandas) => {
      this._cacheRecebidas = demandas;
      if (demandas.length === 0) EstadoManager.setEstado('recebidas', 'nao-encontrado');
      else { this._renderizarListaRecebidas(demandas); EstadoManager.setEstado('recebidas', 'dados', demandas); }
    });
  },

  aplicarFiltrosRecebidas() {
    if (this._unsubscribeRecebidas) { this._unsubscribeRecebidas(); this._unsubscribeRecebidas = null; }
    this.carregarDemandasRecebidas();
  },

  limparFiltrosRecebidas() {
    ['filtroStatusRecebidas','filtroOrigemRecebidas','filtroPrioridadeRecebidas'].forEach(k => {
      if (this.elements[k]) this.elements[k].value = '';
    });
    if (this.elements.filtroPeriodoRecebidas) this.elements.filtroPeriodoRecebidas.value = 'hoje';
    if (this._unsubscribeRecebidas) { this._unsubscribeRecebidas(); this._unsubscribeRecebidas = null; }
    this.carregarDemandasRecebidas();
  },

_renderizarListaRecebidas(demandas) {
    const lista = document.getElementById('listaDemandasRecebidas');
    if (!lista) return;

    const getPrio = (s) => {
        if (s >= 150) return { label: 'URGENTE', classe: 'urgente' };
        if (s >= 100) return { label: 'ALTA', classe: 'alta' };
        if (s >= 50)  return { label: 'MÉDIA', classe: 'media' };
        return { label: 'BAIXA', classe: 'baixa' };
    };

    lista.innerHTML = demandas.map(d => {
        const p = getPrio(d.prioridade || 0);
       
        return `
        <div class="demanda-card ${p.classe}" onclick="DemandasTab.selecionarDemanda('recebidas','${d.id}')">
          <div class="demanda-card-header">
            <span class="demanda-card-titulo">${d.resumo || 'Nova Demanda'}</span>
            <span class="demanda-card-badge">${p.label}</span>
          </div>

          <div class="demanda-card-info">
            <span><i class="fi fi-rr-building"></i> ${d.setor_origem || '-'}</span>
            <span><i class="fi fi-rr-calendar"></i> ${d.criado_em_formatado || 'Hoje'}</span>
          </div>

          <div class="demanda-card-footer">
            <span class="demanda-id-tag">#${d.id.substring(0, 8)}</span>
            <button class="btn-mini btn-aceitar" 
                    onclick="event.stopPropagation();DemandasTab.handleAceitarDemanda('${d.id}')">
              Aceitar
            </button>
          </div>
        </div>`;
    }).join('');
},

  async handleAceitarDemanda(id) {
    const user = window.FirebaseApp?.auth?.currentUser;
    if (!user) { alert('❌ Usuário não autenticado.'); return; }
    if ((this._cacheMinhas?.length || 0) >= 15) { alert('⚠️ Limite de 15 demandas atingido.'); return; }
    if (!confirm('Deseja assumir esta demanda?')) return;
    try {
      const result = await window.DemandasService.aceitarDemanda(id, { uid: user.uid, nome: user.displayName || user.email.split('@')[0] });
      if (result.success) this.activateSubTab('minhas');
      else alert('Erro ao aceitar: ' + result.error);
    } catch (err) { console.error('❌', err); alert('Erro interno.'); }
  },

  // ------------------------------------------------------------------
  // ENCAMINHADAS
  // ------------------------------------------------------------------

  async aplicarFiltrosEncaminhadas() {
    const filtros = {
      status:        this.elements.filtroStatusEncaminhadas?.value  || '',
      setor_destino: this.elements.filtroSetorEncaminhadas?.value   || '',
      periodo:       this.elements.filtroPeriodoEncaminhadas?.value || ''
    };
    EstadoManager.setEstado('encaminhadas', 'carregando');
    try {
      const demandas = await window.DemandasService.buscarMinhasDemandas(filtros);
      this._cacheEncaminhadas = demandas;
      if (demandas.length === 0) EstadoManager.setEstado('encaminhadas', 'nao-encontrado');
      else { this._renderizarListaEncaminhadas(demandas); EstadoManager.setEstado('encaminhadas', 'dados', demandas); }
    } catch (err) { console.error('❌ Encaminhadas:', err); EstadoManager.setEstado('encaminhadas', 'nao-encontrado'); }
  },

  limparFiltrosEncaminhadas() {
    if (this.elements.filtroStatusEncaminhadas)  this.elements.filtroStatusEncaminhadas.value  = '';
    if (this.elements.filtroSetorEncaminhadas)    this.elements.filtroSetorEncaminhadas.value   = '';
    if (this.elements.filtroPeriodoEncaminhadas)  this.elements.filtroPeriodoEncaminhadas.value = 'todos';
    this.aplicarFiltrosEncaminhadas();
  },

  _renderizarListaEncaminhadas(demandas) {
    const lista = document.getElementById('listaDemandasEncaminhadas');
    if (!lista) return;
    lista.innerHTML = demandas.map(d => `
      <div class="demanda-card" onclick="DemandasTab.selecionarDemanda('encaminhadas','${d.id}')">
        <div class="demanda-card-header">
          <span class="demanda-status status-${(d.status||'pendente').toLowerCase()}">${d.status||'PENDENTE'}</span>
          <span class="demanda-data">${d.criado_em_formatado||'-'}</span>
        </div>
        <div class="demanda-card-body">
          <h4 class="demanda-titulo">${d.resumo||'Sem título'}</h4>
          <div class="demanda-info">
            <div class="info-item"><i class="fi fi-rr-arrow-right"></i><span>Para: ${d.setor_destino||'-'}</span></div>
            <div class="info-item"><i class="fi fi-rr-flag"></i><span>Prioridade: ${d.prioridade||'-'}</span></div>
            ${d.justificativa?`<div class="info-item"><i class="fi fi-rr-comment"></i><span>${d.justificativa}</span></div>`:''}
          </div>
        </div>
        <div class="demanda-card-footer">
          <span class="demanda-id">#${d.demandaId||d.id.substring(0,8)}</span>
          <button class="btn-outline" onclick="event.stopPropagation();DemandasTab.selecionarDemanda('encaminhadas','${d.id}')">
            <i class="fi fi-rr-eye"></i> Detalhes
          </button>
        </div>
      </div>`).join('');
  },

  // ------------------------------------------------------------------
  // MINHAS DEMANDAS
  // ------------------------------------------------------------------

  async carregarMinhasDemandas() {
    if (this._unsubscribeMinhas) return;
    const user = window.FirebaseApp?.auth?.currentUser;
    if (!user) { console.error('❌ Usuário não autenticado.'); return; }
    EstadoManager.setEstado('minhas', 'carregando');
    this._unsubscribeMinhas = window.DemandasService.escutarMinhasDemandas(user.uid, (demandas) => {
      this._cacheMinhas = demandas;
      if (demandas.length === 0) {
        EstadoManager.setEstado('minhas', 'nao-encontrado');
        this.elements.detalhesVazioMinhas?.classList.remove('hidden');
        this.elements.detalhesConteudoMinhas?.classList.add('hidden');
      } else {
        this._renderizarListaMinhas(demandas);
        EstadoManager.setEstado('minhas', 'dados', demandas);
      }
    });
  },

_renderizarListaMinhas(demandas) {
    const lista = this.elements.listaDemandasMinhas;
    if (!lista) return;

    // Função auxiliar para pegar a classe de prioridade
    const getPrioClass = (s) => {
        if (s >= 150) return 'urgente';
        if (s >= 100) return 'alta';
        if (s >= 50)  return 'media';
        return 'baixa';
    };

    lista.innerHTML = demandas.map(d => {
        const prioClass = getPrioClass(d.prioridade || 0);
        return `
      <div class="demanda-card ${prioClass}" onclick="DemandasTab.selecionarDemanda('minhas','${d.id}')">
        <div class="demanda-card-header">
          <span class="demanda-card-titulo">${d.resumo || 'Sem título'}</span>
          <span class="demanda-card-badge status-andamento">${d.status?.toUpperCase() || 'PENDENTE'}</span>
        </div>

        <div class="demanda-card-info">
          <span><i class="fi fi-rr-user"></i> ${d.cliente?.nome || 'Cliente'}</span>
          <span><i class="fi fi-rr-clock"></i> ${d.criado_em_formatado || 'Hoje'}</span>
        </div>

        <div class="demanda-card-footer">
          <span class="demanda-id-tag">#${d.demandaId || d.id.substring(0, 8)}</span>
          <i class="fi fi-rr-angle-small-right"></i>
        </div>
      </div>`;
    }).join('');
},

  _preencherDetalhesMinhas(demanda) {
    const container = this.elements.detalhesConteudoMinhas;
    if (!container) return;
    const isVip = demanda.cliente?.vip === true;
    container.classList.toggle('vip-detail-border', isVip);
    container.dataset.id = demanda.id;

    const _s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '-'; };
    _s('detalhesHorarioMinhas', demanda.timestamps?.criada_em?.toDate?.()?.toLocaleString());
    _s('detalhesStatusMinhas',  demanda.status);
    _s('detalhesIdMinhas',      `#${demanda.demandaId || demanda.id}`);
    _s('detalhesOrigemMinhas',  demanda.setor_origem?.toUpperCase());
    _s('detalhesNomeClienteMinhas', demanda.cliente?.nome);

    const dadosEl = document.getElementById('detalhesDadosClienteMinhas');
    if (dadosEl) dadosEl.innerHTML = `
      <p><strong>Nome:</strong> ${demanda.cliente?.nome||'-'}</p>
      <p><strong>Email:</strong> ${demanda.cliente?.email||'-'}</p>
      <p><strong>Telefone:</strong> ${demanda.cliente?.telefone||'-'}</p>
    `;
    const descEl = document.getElementById('detalhesDescricaoMinhas');
    if (descEl) descEl.innerHTML = `<p>${demanda.justificativa_encaminhamento||'Sem descrição.'}</p>`;

    container.classList.remove('hidden');
    this.elements.detalhesVazioMinhas?.classList.add('hidden');
  },

  async handleConcluirDemanda(id) {
    const resolucao = this.elements.inputResolucao?.value?.trim();
    if (!resolucao || resolucao.length < 10) { alert('Descreva a solução (mín. 10 caracteres).'); return; }
    if (!confirm('Confirmar conclusão desta demanda?')) return;
    const res = await window.DemandasService.concluirDemanda(id, resolucao);
    if (res.success) { this.fecharDetalhes('minhas'); if (this.elements.inputResolucao) this.elements.inputResolucao.value = ''; }
  },

  async handleRecusarDemanda(id) {
    const motivo = prompt('Motivo da recusa:');
    if (!motivo) return;
    const res = await window.DemandasService.recusarDemanda(id, motivo);
    if (res.success) this.fecharDetalhes('minhas');
  },

  // ------------------------------------------------------------------
  // DETALHES
  // ------------------------------------------------------------------

  selecionarDemanda(subAba, demandaId) {
    console.log(`📄 Selecionando: ${demandaId} (${subAba})`);
    if (subAba === 'minhas') {
      const d = this._cacheMinhas.find(d => d.id === demandaId);
      if (d) this._preencherDetalhesMinhas(d);
      return;
    }
    const cache = { consulta: this._cacheConsulta, recebidas: this._cacheRecebidas, encaminhadas: this._cacheEncaminhadas };
    const d = cache[subAba]?.find(d => d.id === demandaId);
    if (!d) { console.error(`❌ Demanda ${demandaId} não encontrada no cache de ${subAba}`); return; }
    this._preencherDetalhes(subAba, d);
    this.mostrarDetalhes(subAba);
  },

  _preencherDetalhes(subAba, d) {
    const suf = subAba.charAt(0).toUpperCase() + subAba.slice(1);
    const _s = (campo, val) => { const el = document.getElementById(`detalhes${campo}${suf}`); if (el) el.textContent = val || '-'; };

    _s('Titulo',  d.resumo);
    _s('Status',  d.status);
    _s('Ticket',  d.demandaId || d.id);
    _s('Cliente', d.cliente?.nome || d.cliente?.email || 'Não identificado');

    const data = d.timestamps?.criada_em?.toDate?.()?.toLocaleString() || d.criado_em_formatado || '-';
    if (subAba === 'consulta')     _s('DataCriacao',    data);
    if (subAba === 'recebidas')    _s('DataRecebido',   data);
    if (subAba === 'encaminhadas') _s('DataEncaminhado', data);

    const dadosEl = document.getElementById(`detalhesDadosCliente${suf}`);
    if (dadosEl) {
      const c = d.cliente || {};
      dadosEl.innerHTML = c.email||c.nome||c.telefone
        ? `<p><strong>Email:</strong> ${c.email||'-'}</p><p><strong>Nome:</strong> ${c.nome||'-'}</p><p><strong>Telefone:</strong> ${c.telefone||'-'}</p>`
        : `<p style="color:var(--color-text-light)">Sem dados de contato.</p>`;
    }

    const descEl = document.getElementById(`detalhesDescricao${suf}`);
    if (descEl) descEl.innerHTML = `<p>${d.justificativa_encaminhamento || d.resumo || 'Sem detalhes.'}</p>`;

    const tlEl = document.getElementById(`detalhesTimeline${suf}`);
    if (tlEl) this._renderizarTimeline(tlEl, d.historico_status || []);

    if (subAba === 'recebidas')    { _s('Origem', d.setor_origem?.toUpperCase()); _s('Prioridade', `${d.prioridade||0} pts`); }
    if (subAba === 'encaminhadas') { _s('TempoDecorrido', d.tempo_decorrido); }
  },

  _renderizarTimeline(container, historico) {
    if (!historico.length) { container.innerHTML = '<p style="font-size:0.85rem;color:#64748b;">Sem histórico.</p>'; return; }
    container.innerHTML = historico.map(item => `
      <div class="timeline-item">
        <span class="timeline-data">${item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</span>
        <div class="timeline-conteudo"><strong>${item.usuario||'-'}</strong> · ${item.setor_destino||'-'}</div>
      </div>`).join('');
  },

  mostrarDetalhes(subAba) {
    const map = {
      consulta:     { c: this.elements.detalhesConteudoConsulta,    v: this.elements.detalhesVazioConsulta },
      recebidas:    { c: this.elements.detalhesConteudoRecebidas,    v: this.elements.detalhesVazioRecebidas },
      encaminhadas: { c: this.elements.detalhesConteudoEncaminhadas, v: this.elements.detalhesVazioEncaminhadas },
    };
    const d = map[subAba]; if (!d) return;
    d.v?.classList.add('hidden'); d.c?.classList.remove('hidden');
    if (window.innerWidth < 1024) d.c?.scrollIntoView({ behavior: 'smooth' });
  },

  fecharDetalhes(subAba) {
    const map = {
      consulta:     { c: this.elements.detalhesConteudoConsulta,    v: this.elements.detalhesVazioConsulta },
      recebidas:    { c: this.elements.detalhesConteudoRecebidas,    v: this.elements.detalhesVazioRecebidas },
      encaminhadas: { c: this.elements.detalhesConteudoEncaminhadas, v: this.elements.detalhesVazioEncaminhadas },
      minhas:       { c: this.elements.detalhesConteudoMinhas,       v: this.elements.detalhesVazioMinhas },
    };
    const d = map[subAba]; if (!d) return;
    d.c?.classList.add('hidden'); d.v?.classList.remove('hidden');
  },

  // ------------------------------------------------------------------
  // CICLO DE VIDA
  // ------------------------------------------------------------------

  async refresh() {
    if (!this._initialized) window.ModuleLifecycle.init(this.moduleId, () => this.init());
    else this.activateSubTab(this._activeSubTab);
  },

  cleanup() {
    console.log('🧹 Limpando DemandasTab...');
    this._unsubscribeRecebidas?.(); this._unsubscribeRecebidas = null;
    this._unsubscribeMinhas?.();    this._unsubscribeMinhas    = null;
    window.ModuleLifecycle?.cleanup?.(this.moduleId);
    this._initialized = false; this._eventsBound = false; this.elements = {};
    this._cacheConsulta = this._cacheRecebidas = this._cacheEncaminhadas = this._cacheMinhas = [];
    console.log('✅ DemandasTab limpo');
  },

  debug() {
    console.group('🔍 DemandasTab DEBUG');
    console.log({ initialized: this._initialized, eventsBound: this._eventsBound, activeSubTab: this._activeSubTab,
      caches: { consulta: this._cacheConsulta.length, recebidas: this._cacheRecebidas.length, encaminhadas: this._cacheEncaminhadas.length, minhas: this._cacheMinhas.length } });
    EstadoManager.debug();
    console.groupEnd();
  }
};

// ==================================================================================
// EXPORTAR
// ==================================================================================

window.DemandasTab = DemandasTab;
export default DemandasTab;

console.log('✅ demandas.js carregado');
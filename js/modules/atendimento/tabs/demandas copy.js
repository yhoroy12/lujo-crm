/**
 * ==================================================================================
 * ABA: DEMANDAS EXTERNAS
 * Gerencia as 3 sub-abas: Consulta, Recebidas, Encaminhadas
 * ==================================================================================
 * 
 * FEATURES:
 * - Proteção contra re-inicialização
 * - Sistema de sub-abas com transições
 * - Gerenciamento de estados (vazio, carregando, não encontrado, dados)
 * - Listeners via ModuleLifecycle
 * - Estrutura preparada para lógica de negócio
 */

// ==================================================================================
// ESTADO MANAGER (INTEGRADO)
// ==================================================================================

const EstadoManager = (function () {


  const CONFIG = {
    consulta: {
      estadoVazio: 'estadoAguardandoConsulta',
      estadoCarregando: 'estadoCarregandoConsulta',
      estadoNaoEncontrado: 'estadoNaoEncontradoConsulta',
      listaResultados: 'listaResultadosConsulta',
      contador: 'contadorResultados',
      estadoInicial: 'vazio'
    },
    recebidas: {
      estadoVazio: 'estadoVazioRecebidas', // Adicione este ID no seu HTML
      estadoCarregando: 'estadoCarregandoRecebidas',
      estadoNaoEncontrado: 'estadoNaoEncontradoRecebidas',
      listaResultados: 'listaDemandasRecebidas',
      contador: 'contadorRecebidas',
      estadoInicial: 'dados' // Começa exibindo a lista (fixo)
    },
    encaminhadas: {
      estadoVazio: 'estadoVazioEncaminhadas',
      estadoCarregando: 'estadoCarregandoEncaminhadas',
      estadoNaoEncontrado: 'estadoNaoEncontradoEncaminhadas',
      listaResultados: 'listaDemandasEncaminhadas',
      contador: 'contadorEncaminhadas',
      estadoInicial: 'vazio'
    },
    minhas: {
      estadoVazio: 'detalhesVazioMinhas', // O estado inicial de "selecione uma demanda"
      estadoCarregando: 'estadoCarregandoMinhas',
      estadoNaoEncontrado: 'estadoNaoEncontradoMinhas',
      listaResultados: 'listaDemandasMinhas',
      contador: 'contadorMinhas',
      estadoInicial: 'carregando'
    }

  };

  function setEstado(subAba, novoEstado, dados = []) {
    if (!CONFIG[subAba]) {
      console.error(`❌ EstadoManager: sub-aba inválida - ${subAba}`);
      return false;
    }

    const config = CONFIG[subAba];
    console.log(`🔄 EstadoManager: ${subAba} → ${novoEstado}`,
      novoEstado === 'dados' ? `(${dados.length} itens)` : '');

    limparEstados(config);

    switch (novoEstado) {
      case 'vazio':
        if (config.estadoVazio) ativarEstado(config.estadoVazio);
        ocultarLista(config.listaResultados);
        atualizarContador(config.contador, 0);
        break;

      case 'carregando':
        ativarEstado(config.estadoCarregando);
        ocultarLista(config.listaResultados);
        atualizarContador(config.contador, 0);
        break;

      case 'nao-encontrado':
        ativarEstado(config.estadoNaoEncontrado);
        ocultarLista(config.listaResultados);
        atualizarContador(config.contador, 0);
        break;

      case 'dados':
        mostrarLista(config.listaResultados);
        atualizarContador(config.contador, dados.length);
        break;

      default:
        console.error(`❌ EstadoManager: estado inválido - ${novoEstado}`);
        return false;
    }

    return true;
  }

  function limparEstados(config) {
    // Coleta todos os IDs de estados possíveis
    const estados = [
      config.estadoVazio,
      config.estadoCarregando,
      config.estadoNaoEncontrado
    ];

    estados.forEach(elementId => {
      if (elementId) {
        const elemento = document.getElementById(elementId);
        if (elemento) {
          elemento.classList.remove('ativa');
          // ✅ CORRIGIDO: limpa inline style para não brigar com o CSS de grid
          elemento.style.display = '';
        }
      }
    });
  }

  function ativarEstado(elementId) {
    const elemento = document.getElementById(elementId);
    if (elemento) {
      // ✅ CORRIGIDO: remove inline style antes de adicionar a classe.
      // O display:block inline tinha especificidade maior que qualquer CSS de classe/grid,
      // fazendo o elemento sair do fluxo do grid e quebrar o layout de 3 colunas.
      elemento.style.display = '';
      elemento.classList.add('ativa');
      console.log(` ✅ Estado ativado: ${elementId}`);
    }
  }

  function ocultarLista(listaId) {
    const lista = document.getElementById(listaId);
    if (lista) {
      lista.classList.add('hidden');
      console.log(`  📋 Lista ocultada: ${listaId}`);
    }
  }

  function mostrarLista(listaId) {
    const lista = document.getElementById(listaId);
    if (lista) {
      lista.classList.remove('hidden');
      console.log(`  📋 Lista exibida: ${listaId}`);
    }
  }

  function atualizarContador(contadorId, quantidade) {
    const contador = document.getElementById(contadorId);
    if (!contador) return;

    if (quantidade === 0) {
      contador.textContent = '0 encontrados';
      contador.style.color = 'var(--color-text-light)';
    } else {
      const texto = quantidade === 1 ? 'demanda' : 'demandas';
      contador.textContent = `${quantidade} ${texto}`;
      contador.style.color = 'var(--color-primary)';
      contador.style.fontWeight = '600';
    }
  }

  function inicializar() {
    console.log('🚀 EstadoManager: Inicializando estados padrão...');
    Object.entries(CONFIG).forEach(([subAba, config]) => {
      setEstado(subAba, config.estadoInicial);
    });
    console.log('✅ EstadoManager: Estados inicializados');
  }

  function resetar(subAba) {
    if (!CONFIG[subAba]) {
      console.error(`❌ EstadoManager: sub-aba inválida - ${subAba}`);
      return false;
    }
    const estadoInicial = CONFIG[subAba].estadoInicial;
    setEstado(subAba, estadoInicial);
    console.log(`🔄 EstadoManager: ${subAba} resetada para estado inicial`);
    return true;
  }

  function getEstadoAtual(subAba) {
    if (!CONFIG[subAba]) return null;
    const config = CONFIG[subAba];

    if (config.estadoVazio) {
      const estadoVazio = document.getElementById(config.estadoVazio);
      if (estadoVazio?.classList.contains('ativa')) return 'vazio';
    }

    const estadoCarregando = document.getElementById(config.estadoCarregando);
    if (estadoCarregando?.classList.contains('ativa')) return 'carregando';

    const estadoNaoEncontrado = document.getElementById(config.estadoNaoEncontrado);
    if (estadoNaoEncontrado?.classList.contains('ativa')) return 'nao-encontrado';

    const lista = document.getElementById(config.listaResultados);
    if (lista && !lista.classList.contains('hidden')) return 'dados';

    return null;
  }

  function debug() {
    console.group('🔍 EstadoManager - DEBUG');
    Object.keys(CONFIG).forEach(subAba => {
      const estadoAtual = getEstadoAtual(subAba);
      console.log(`  ${subAba}: ${estadoAtual || 'desconhecido'}`);
    });
    console.groupEnd();
  }

  return { setEstado, inicializar, resetar, getEstadoAtual, debug };
})();

// ==================================================================================
// DEMANDAS TAB
// ==================================================================================

const DemandasTab = {
  id: 'aba-demandas',
  moduleId: 'demandas',
  elements: {},
  _initialized: false,
  _eventsBound: false,
  _activeSubTab: 'consulta',
  _ultimoDocConsulta: null,
  _cacheRecebidas: [],
  _cacheEncaminhadas: [],
  _cacheConsulta: [],
  _cacheMinhas: [], // Novo cache
  _unsubscribeMinhas: null,
  _unsubscribeRecebidas: null,
  // ==================================================================================
  // INICIALIZAÇÃO
  // ==================================================================================

  async init() {
    if (this._initialized) {
      console.warn('⚠️ DemandasTab já inicializado. Abortando duplicata.');
      return;
    }

    console.log('📋 Inicializando aba Demandas Externas');

    try {
      await this.carregarSubAbas();
      this.cacheElements();
      this.bindEvents();

      // Inicializar estados
      EstadoManager.inicializar();

      this.activateSubTab('consulta');

      this._initialized = true;
      this._eventsBound = false; // Garante que os eventos serão vinculados apenas uma vez
      console.log('✅ DemandasTab inicializado com sucesso');

    } catch (error) {
      console.error('❌ Erro em DemandasTab:', error);
      this._initialized = false;
    }
  },
  // ==================================================================================
  // CARREGAMENTO DE SUB-ABAS (HTML)
  // ==================================================================================
  async carregarSubAbas() {
  console.log('📄 Carregando sub-abas HTML...');
  
  const container = document.querySelector('.demandas-container');
  if (!container) {
    throw new Error('Container .demandas-container não encontrado');
  }

  const subAbas = ['consulta', 'recebidas', 'minhas', 'encaminhadas'];
  
  for (const subAba of subAbas) {
    const path = `/templates/modules/atendimento/tabs/aba-demandas/abas-demandas/subaba-${subAba}.html`;
    console.log(`  📥 Carregando: ${path}`);
    
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Erro ao carregar ${path}: ${response.status}`);
    }
    
    const html = await response.text();
    container.insertAdjacentHTML('beforeend', html);
  }
  
  console.log('✅ Todas as sub-abas carregadas!');
},


  // ==================================================================================
  // CACHE DE ELEMENTOS
  // ==================================================================================

  cacheElements() {
    console.log('🔍 Cacheando elementos da aba Demandas...');

    this.elements = {
      // Sub-abas
      subAbasContainer: document.querySelector('.sub-abas-demandas'),
      subAbaButtons: document.querySelectorAll('.sub-aba-btn'),

      // Conteúdos
      conteudoConsulta: document.querySelector('.demandas-consulta'),
      conteudoRecebidas: document.querySelector('.demandas-recebidas'),
      conteudoEncaminhadas: document.querySelector('.demandas-encaminhadas'),

      // ============ CONSULTA ============
      btnExecutarBusca: document.getElementById('btnExecutarBusca'),
      btnLimparBusca: document.getElementById('btnLimparBusca'),
      buscaTicket: document.getElementById('buscaTicket'),
      buscaCliente: document.getElementById('buscaCliente'),
      buscaSetor: document.getElementById('buscaSetor'),
      buscaStatus: document.getElementById('buscaStatus'),
      buscaPeriodo: document.getElementById('buscaPeriodo'),


      // Detalhes Consulta
      detalhesConteudoConsulta: document.getElementById('detalhesConteudoConsulta'),
      detalhesVazioConsulta: document.getElementById('detalhesVazioConsulta'),
      btnFecharDetalhesConsulta: document.getElementById('btnFecharDetalhesConsulta'),

      // ============ RECEBIDAS ============
      formFiltrosRecebidas: document.getElementById('formFiltrosRecebidas'),
      btnAplicarFiltrosRecebidas: document.getElementById('btnAplicarFiltrosRecebidas'),
      btnLimparFiltrosRecebidas: document.getElementById('btnLimparFiltrosRecebidas'),
      filtroStatusRecebidas: document.getElementById('filtroStatusRecebidas'),
      filtroOrigemRecebidas: document.getElementById('filtroOrigemRecebidas'),
      filtroPrioridadeRecebidas: document.getElementById('filtroPrioridadeRecebidas'),
      filtroPeriodoRecebidas: document.getElementById('filtroPeriodoRecebidas'),

      // Detalhes Recebidas
      detalhesConteudoRecebidas: document.getElementById('detalhesConteudoRecebidas'),
      detalhesVazioRecebidas: document.getElementById('detalhesVazioRecebidas'),
      btnFecharDetalhesRecebidas: document.getElementById('btnFecharDetalhesRecebidas'),
      btnAceitarDemanda: document.getElementById('btnAceitarDemanda'),
      btnConcluirDemanda: document.getElementById('btnConcluirDemanda'),
      btnAdicionarObservacao: document.getElementById('btnAdicionarObservacao'),

      // ============ ENCAMINHADAS ============
      formFiltrosEncaminhadas: document.getElementById('formFiltrosEncaminhadas'),
      btnAplicarFiltrosEncaminhadas: document.getElementById('btnAplicarFiltrosEncaminhadas'),
      btnLimparFiltrosEncaminhadas: document.getElementById('btnLimparFiltrosEncaminhadas'),
      filtroStatusEncaminhadas: document.getElementById('filtroStatusEncaminhadas'),
      filtroSetorEncaminhadas: document.getElementById('filtroSetorEncaminhadas'),
      filtroPeriodoEncaminhadas: document.getElementById('filtroPeriodoEncaminhadas'),

      // Detalhes Encaminhadas
      detalhesConteudoEncaminhadas: document.getElementById('detalhesConteudoEncaminhadas'),
      detalhesVazioEncaminhadas: document.getElementById('detalhesVazioEncaminhadas'),
      btnFecharDetalhesEncaminhadas: document.getElementById('btnFecharDetalhesEncaminhadas'),
      // ============ MINHAS DEMANDAS ============
      conteudoMinhas: document.querySelector('.demandas-minhas'),
      listaDemandasMinhas: document.getElementById('listaDemandasMinhas'),
      inputResolucao: document.getElementById('inputResolucao'),
      btnConcluirTrabalho: document.getElementById('btnConcluirTrabalho'),
      btnDevolverDemanda: document.getElementById('btnDevolverDemanda'),
      detalhesConteudoMinhas: document.getElementById('detalhesConteudoMinhas'),
      detalhesVazioMinhas: document.getElementById('detalhesVazioMinhas'),
    }


    console.log(`✅ ${Object.keys(this.elements).length} elementos cacheados`);
  },

  // ==================================================================================
  // EVENTOS
  // ==================================================================================

  bindEvents() {
    if (this._eventsBound) {
      console.log('⚠️ Eventos já vinculados. Pulando...');
      return;
    }

    console.log('🔗 Vinculando eventos (corrigido)...');

    // ============ SUB-ABAS ============
    const subAbasContainer = document.querySelector('.sub-abas-demandas');
    if (subAbasContainer) {
      window.ModuleLifecycle.addListener(subAbasContainer, 'click', (e) => {
        const btn = e.target.closest('.sub-aba-btn');
        if (btn && btn.dataset.subaba) {
          e.preventDefault();
          e.stopPropagation();
          this.activateSubTab(btn.dataset.subaba);
        }
      }, this.moduleId);
    }

    // ============ FORMULÁRIOS ============
    // Formulário de ENCAMINHADAS
    if (this.elements.formFiltrosEncaminhadas) {
      window.ModuleLifecycle.addListener(this.elements.formFiltrosEncaminhadas, 'submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.aplicarFiltrosEncaminhadas();
      }, this.moduleId);
    }

    // Formulário de RECEBIDAS
    if (this.elements.formFiltrosRecebidas) {
      window.ModuleLifecycle.addListener(this.elements.formFiltrosRecebidas, 'submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.aplicarFiltrosRecebidas();
      }, this.moduleId);
    }

    // ============ BOTÕES INDIVIDUAIS ============
    // Botão de Buscar (CONSULTA)
    const btnBusca = document.getElementById('btnExecutarBusca');
    if (btnBusca) {
      window.ModuleLifecycle.addListener(btnBusca, 'click', (e) => {
        e.preventDefault();
        this.aplicarFiltrosConsulta();
      }, this.moduleId);
    }
    // Botão Limpar Busca (CONSULTA)
    if (this.elements.btnLimparBusca) {
      window.ModuleLifecycle.addListener(this.elements.btnLimparBusca, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.limparBuscaConsulta();
      }, this.moduleId);
    }

    // Botão Limpar Filtros (ENCAMINHADAS)
    if (this.elements.btnLimparFiltrosEncaminhadas) {
      window.ModuleLifecycle.addListener(this.elements.btnLimparFiltrosEncaminhadas, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.limparFiltrosEncaminhadas();
      }, this.moduleId);
    }

    // Botão Aplicar Filtros (ENCAMINHADAS) - se for button type="submit", já está no form
    if (this.elements.btnAplicarFiltrosEncaminhadas &&
      this.elements.btnAplicarFiltrosEncaminhadas.type !== 'submit') {
      window.ModuleLifecycle.addListener(this.elements.btnAplicarFiltrosEncaminhadas, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.aplicarFiltrosEncaminhadas();
      }, this.moduleId);
    }

    // Botão Limpar Filtros (RECEBIDAS)
    if (this.elements.btnLimparFiltrosRecebidas) {
      window.ModuleLifecycle.addListener(this.elements.btnLimparFiltrosRecebidas, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.limparFiltrosRecebidas();
      }, this.moduleId);
    }

    // Botão Aplicar Filtros (RECEBIDAS)
    if (this.elements.btnAplicarFiltrosRecebidas &&
      this.elements.btnAplicarFiltrosRecebidas.type !== 'submit') {
      window.ModuleLifecycle.addListener(this.elements.btnAplicarFiltrosRecebidas, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.aplicarFiltrosRecebidas();
      }, this.moduleId);
    }

    // ============ BOTÕES FECHAR DETALHES ============
    if (this.elements.btnFecharDetalhesConsulta) {
      window.ModuleLifecycle.addListener(this.elements.btnFecharDetalhesConsulta, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.fecharDetalhes('consulta');
      }, this.moduleId);
    }

    if (this.elements.btnFecharDetalhesRecebidas) {
      window.ModuleLifecycle.addListener(this.elements.btnFecharDetalhesRecebidas, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.fecharDetalhes('recebidas');
      }, this.moduleId);
    }

    if (this.elements.btnFecharDetalhesEncaminhadas) {
      window.ModuleLifecycle.addListener(this.elements.btnFecharDetalhesEncaminhadas, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.fecharDetalhes('encaminhadas');
      }, this.moduleId);
    }
    // Botão Concluir Trabalho
    if (this.elements.btnConcluirTrabalho) {
      window.ModuleLifecycle.addListener(this.elements.btnConcluirTrabalho, 'click', (e) => {
        // Pegar o ID da demanda selecionada no cache ou via data-attribute
        const id = this.elements.detalhesConteudoMinhas.dataset.id;
        if (id) this.handleConcluirDemanda(id);
      }, this.moduleId);
    }

    // Botão Devolver (Recusar)
    if (this.elements.btnDevolverDemanda) {
      window.ModuleLifecycle.addListener(this.elements.btnDevolverDemanda, 'click', (e) => {
        const id = this.elements.detalhesConteudoMinhas.dataset.id;
        if (id) this.handleRecusarDemanda(id);
      }, this.moduleId);
    }

    console.log('✅ Eventos vinculados (sem refresh)');
    this._eventsBound = true;
  },
  // ==================================================================================
  // GERENCIAMENTO DE SUB-ABAS
  // ==================================================================================

  activateSubTab(subTabId) {
    console.log(`📑 Ativando sub-aba: ${subTabId}`);

    const validSubTabs = ['consulta', 'recebidas', 'encaminhadas', 'minhas'];
    if (!validSubTabs.includes(subTabId)) {
      console.error(`❌ Sub-aba inválida: ${subTabId}`);
      return;
    }

    this._activeSubTab = subTabId;

    // Atualizar botões
    if (this.elements.subAbaButtons) {
      this.elements.subAbaButtons.forEach(btn => {
        btn.classList.toggle('ativa', btn.dataset.subaba === subTabId);
      });
    }

    // Atualizar conteúdos
    if (this.elements.conteudoConsulta) {
      this.elements.conteudoConsulta.classList.toggle('ativa', subTabId === 'consulta');
    }
    if (this.elements.conteudoRecebidas) {
      this.elements.conteudoRecebidas.classList.toggle('ativa', subTabId === 'recebidas');
    }
    if (this.elements.conteudoEncaminhadas) {
      this.elements.conteudoEncaminhadas.classList.toggle('ativa', subTabId === 'encaminhadas');
    }
    if (this.elements.conteudoMinhas) {
      this.elements.conteudoMinhas.classList.toggle('ativa', subTabId === 'minhas');
    }
    // Se saiu da aba de recebidas, opcionalmente encerra a escuta
    if (subTabId !== 'recebidas' && this._unsubscribeRecebidas) {
      this._unsubscribeRecebidas();
      this._unsubscribeRecebidas = null;
      console.log('📡 Escuta pausada (mudança de sub-aba)');
    }

    // Executar ações da sub-aba
    this.onSubTabActivated(subTabId);

    console.log(`✅ Sub-aba ${subTabId} ativada`);
  },

  onSubTabActivated(subTabId) {
    console.log(`🔄 Executando ações da sub-aba: ${subTabId}`);

    // Fechar detalhes de todas as abas
    this.fecharDetalhes('consulta');
    this.fecharDetalhes('recebidas');
    this.fecharDetalhes('encaminhadas');

    switch (subTabId) {
      case 'consulta':
        EstadoManager.resetar('consulta');
        break;

      case 'recebidas':
        this.carregarDemandasRecebidas();
        break;

      case 'encaminhadas':
        // 🔥 Carregar automaticamente ao entrar na aba
        this.aplicarFiltrosEncaminhadas();
        break;
      case 'minhas':
        this.carregarMinhasDemandas();
        break;
    }
  },

  // ==================================================================================
  // LÓGICA DE NEGÓCIO - CONSULTA
  // ==================================================================================


  async buscarDemandas(continuar = false) {
    if (!continuar) {
      this._ultimoDocConsulta = null; // Reset se for busca nova
      EstadoManager.setEstado('consulta', 'carregando');
    }

    const filtros = {
      ticket: this.elements.buscaTicket?.value,
      cliente: this.elements.buscaCliente?.value,
      setor: this.elements.buscaSetor?.value,
      status: this.elements.buscaStatus?.value
    };

    try {
      const resultado = await window.DemandasService.consultarAndamento(filtros, this._ultimoDocConsulta);

      // Se for busca direta por Ticket, o retorno é um array simples
      const lista = Array.isArray(resultado) ? resultado : resultado.dados;
      this._ultimoDocConsulta = Array.isArray(resultado) ? null : resultado.ultimoVisivel;

      if (lista.length === 0 && !continuar) {
        EstadoManager.setEstado('consulta', 'nao-encontrado');
        return;
      }

      this.renderizarResultados(lista, continuar);

      // Gerencia o botão "Carregar Mais"
      this.gerenciarBotaoPaginacao(this._ultimoDocConsulta !== null);

    } catch (error) {
      EstadoManager.setEstado('consulta', 'vazio');
    }
  },
  async aplicarFiltrosConsulta(continuar = false) {
    if (!continuar) {
      this._ultimoDocConsulta = null;
      EstadoManager.setEstado('consulta', 'carregando');
    }

    const filtros = {
      ticket: document.getElementById('buscaTicket')?.value,
      cliente: document.getElementById('buscaCliente')?.value,
      setor: document.getElementById('buscaSetor')?.value,
      status: document.getElementById('buscaStatus')?.value,
      periodo: document.getElementById('buscaPeriodo')?.value
    };

    try {
      const resultado = await window.DemandasService.consultarAndamento(filtros, this._ultimoDocConsulta);

      const lista = resultado.dados;
      this._ultimoDocConsulta = resultado.ultimoVisivel;

      if (lista.length === 0 && !continuar) {
        EstadoManager.setEstado('consulta', 'nao-encontrado');
        return;
      }

      // Chama a renderização passando se deve acumular os itens ou não
      this.renderizarListaConsulta(lista, continuar);

      // Atualiza o contador e o botão "Carregar Mais"
      this.gerenciarBotaoPaginacao(this._ultimoDocConsulta !== null);

    } catch (error) {
      console.error('Erro na busca:', error);
      EstadoManager.setEstado('consulta', 'nao-encontrado');
    }
  },

  gerenciarBotaoPaginacao(mostrar) {
    let btn = document.getElementById('btnCarregarMaisConsulta');
    const container = document.getElementById('listaResultadosConsulta');

    if (!mostrar) {
      if (btn) btn.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btnCarregarMaisConsulta';
      btn.className = 'btn btn-secondary btn-block mt-3 mb-3';
      btn.innerHTML = '<i class="fi fi-rr-angle-small-down"></i> Carregar mais 10';
      // Importante: usar arrow function para manter o contexto do 'this'
      btn.onclick = () => this.aplicarFiltrosConsulta(true);
      container.after(btn);
    }
  },

  limparBuscaConsulta() {
    console.log('🧹 Limpando busca...');

    this.elements.formBuscaDemanda?.reset();
    EstadoManager.resetar('consulta');
    this.fecharDetalhes('consulta');
  },

  renderizarListaConsulta(demandas, adicionar = false) {
    const listaContainer = document.getElementById('listaResultadosConsulta');
    if (!listaContainer) return;

    if (!adicionar) {
      listaContainer.innerHTML = '';
      EstadoManager.setEstado('consulta', 'dados', demandas);
    }

    const htmlCards = demandas.map(demanda => `
      <div class="demanda-card" onclick="DemandasTab.selecionarDemanda('consulta', '${demanda.id}')">
        <div class="demanda-card-header">
           <span class="demanda-status ${demanda.status_label?.classe || 'status-pendente'}">
             ${demanda.status_label?.label || demanda.status}
           </span>
           <span class="demanda-data">${demanda.criado_em_formatado}</span>
        </div>
        <div class="demanda-card-body">
           <h4>${demanda.resumo || 'Sem título'}</h4>
           <p><i class="fi fi-rr-envelope"></i> ${demanda.cliente_email || 'E-mail não informado'}</p>
        </div>
      </div>
    `).join('');

    if (adicionar) {
      listaContainer.insertAdjacentHTML('beforeend', htmlCards);
    } else {
      listaContainer.innerHTML = htmlCards;
    }
  },

  // ==================================================================================
  // LÓGICA DE NEGÓCIO - RECEBIDAS
  // ==================================================================================

  // Localize o método carregarDemandasRecebidas e substitua:
  async carregarDemandasRecebidas(filtrosExtras = {}) {
    if (this._unsubscribeRecebidas) return;

    const setorAlvo = window.AtendimentoModule?.id || 'atendimento';
    console.log(`📥 Carregando recebidas para o setor: ${setorAlvo}`);

    EstadoManager.setEstado('recebidas', 'carregando');

    this._unsubscribeRecebidas = window.DemandasService.escutarDemandasRecebidas(
      setorAlvo,
      (demandas) => {
        this._cacheRecebidas = demandas;
        if (demandas.length === 0) {
          EstadoManager.setEstado('recebidas', 'vazio');
        } else {
          this.renderizarListaRecebidas(demandas);
          EstadoManager.setEstado('recebidas', 'dados');
        }
        const contador = document.getElementById('contadorRecebidas');
        if (contador) contador.textContent = `${demandas.length} demandas`;
      }
    );
  },

  aplicarFiltrosRecebidas() {
    const filtros = {
      status: this.elements.filtroStatusRecebidas?.value || '',
      origem: this.elements.filtroOrigemRecebidas?.value || '',
      prioridade: this.elements.filtroPrioridadeRecebidas?.value || '',
      periodo: this.elements.filtroPeriodoRecebidas?.value || ''
    };

    console.log('🎯 Aplicando filtros recebidas:', filtros);
    this.carregarDemandasRecebidas(filtros);
  },

  limparFiltrosRecebidas() {
    console.log('🧹 Limpando filtros recebidas...');

    if (this.elements.filtroStatusRecebidas) this.elements.filtroStatusRecebidas.value = '';
    if (this.elements.filtroOrigemRecebidas) this.elements.filtroOrigemRecebidas.value = '';
    if (this.elements.filtroPrioridadeRecebidas) this.elements.filtroPrioridadeRecebidas.value = '';
    if (this.elements.filtroPeriodoRecebidas) this.elements.filtroPeriodoRecebidas.value = 'hoje';

    this.carregarDemandasRecebidas();
  },

  renderizarListaRecebidas(demandas) {
    const lista = document.getElementById('listaDemandasRecebidas');
    if (!lista) return;

    if (demandas.length === 0) {
      lista.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Nenhuma demanda pendente.</div>';
      return;
    }

    const styleTag = `
    <style>
      .recebidas-container { display: flex; flex-direction: column; gap: 15px; }
      .demanda-card { 
        background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; 
        padding: 15px; cursor: pointer; transition: all 0.2s; position: relative;
      }
      .demanda-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
      
      /* Linha de Contexto (Topo) */
      .card-contexto { 
        display: flex; align-items: center; gap: 12px; 
        font-size: 0.75rem; color: #64748b; margin-bottom: 10px;
        border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;
      }
      .ctx-item { display: flex; align-items: center; gap: 4px; }
      .ctx-setor { color: #1e293b; font-weight: 600; text-transform: uppercase; }

      /* Prioridades e VIP */
      .prio-tag { font-weight: 700; }
      .prio-critica { color: #e11d48; }
      .prio-alta { color: #f59e0b; }
      .prio-media { color: #0ea5e9; }
      .prio-baixa { color: #10b981; }
      
      .badge-vip-sm { 
        padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;
        background: #f1f5f9; border: 1px solid #e2e8f0;
      }
      .vip-diamante { background: #0c4a6e; color: #fff; }
      .vip-ouro { background: #fbbf24; color: #78350f; }
      .vip-prata { background: #cbd5e1; color: #1e293b; }

      /* Descrição (Meio) */
      .demanda-descricao { 
        font-size: 0.95rem; color: #1e293b; font-weight: 500; 
        line-height: 1.4; margin-bottom: 12px;
      }

      /* Footer */
      .card-footer-clean { 
        display: flex; justify-content: space-between; align-items: center; 
      }
      .btn-group { display: flex; gap: 8px; }
      .btn-mini { 
        padding: 5px 12px; border-radius: 5px; border: none; 
        font-size: 0.8rem; font-weight: 600; cursor: pointer;
      }
      .btn-aceitar { background: #10b981; color: #fff; }
      .btn-devolver { background: #f1f5f9; color: #a34739; }
    </style>
  `;

    const getPrioridadePeloScore = (score) => {
      if (score >= 150) return { label: 'URGENTE', classe: 'prio-critica', icon: 'fi-sr-flame' };
      if (score >= 100) return { label: 'ALTA', classe: 'prio-alta', icon: 'fi-sr-angle-double-up' };
      if (score >= 50) return { label: 'MÉDIA', classe: 'prio-media', icon: 'fi-sr-angle-up' };
      return { label: 'BAIXA', classe: 'prio-baixa', icon: 'fi-sr-minus' };
    };

    const htmlCards = demandas.map(demanda => {
      const score = demanda.prioridade_score || 0;
      const p = getPrioridadePeloScore(score);
      const vip = (demanda.detalhes_prioridade?.vip || 'comum').toLowerCase();

      return `
    <div class="demanda-card" onclick="DemandasTab.selecionarDemanda('recebidas', '${demanda.id}')">
      
      <div class="card-contexto">
        <div class="ctx-item">
          <i class="fi fi-rr-calendar"></i>
          <span>${demanda.criado_em_formatado || 'Hoje'}</span>
        </div>
        <div class="ctx-item">
          <i class="fi fi-rr-arrow-right"></i>
          <span class="ctx-setor">${demanda.setor_origem}</span>
        </div>
        <div class="ctx-item prio-tag ${p.classe}">
          <i class="fi fi-sr-bolt"></i>
          <span>${p.label}</span>
        </div>
        ${vip !== 'comum' ? `<span class="badge-vip-sm vip-${vip}">${vip.toUpperCase()}</span>` : ''}
      </div>
      
      <div class="demanda-descricao">
        ${demanda.resumo || 'Sem descrição detalhada disponível.'}
      </div>
      
      <div class="card-footer-clean">
        <span style="font-size: 0.7rem; color: #cbd5e1; font-family: monospace;">#${demanda.id.substring(0, 8)}</span>
        <div class="btn-group">
          <button class="btn-mini btn-aceitar" onclick="event.stopPropagation(); DemandasTab.handleAceitarDemanda('${demanda.id}')">
            Aceitar
          </button>
        </div>
      </div>
    </div>
    `;
    }).join('');

    lista.innerHTML = styleTag + `<div class="recebidas-container">${htmlCards}</div>`;
  },

 async handleAceitarDemanda(id) {
    // 1. Pega o usuário do seu objeto global FirebaseApp
    const user = window.FirebaseApp?.auth?.currentUser;

    if (!user) {
        alert('❌ Erro: Usuário não autenticado no sistema.');
        console.error('Usuário não encontrado em window.FirebaseApp.auth');
        return;
    }

    // 2. Verificar limite de 15 demandas no cache local
    if (this._cacheMinhas && this._cacheMinhas.length >= 15) {
        alert('⚠️ Limite atingido! Você já possui 15 demandas em aberto. Conclua algumas antes de aceitar novas.');
        return;
    }

    if (!confirm('Deseja assumir esta demanda?')) return;

    try {
        // 3. Chama o service passando os dados do operador
        const result = await window.DemandasService.aceitarDemanda(id, {
            uid: user.uid,
            nome: user.displayName || user.email.split('@')[0]
        });

        if (result.success) {
            // Se funcionou, troca para a aba "Minhas"
            this.activateSubTab('minhas');
        } else {
            alert('Erro ao aceitar demanda: ' + result.error);
        }
    } catch (error) {
        console.error("Erro no processo de aceitação:", error);
        alert('Erro interno ao processar aceitação.');
    }
},
  // ==================================================================================
  // LÓGICA DE NEGÓCIO - ENCAMINHADAS
  // ==================================================================================

  async carregarDemandasEncaminhadas() {
    const demandas = await window.DemandasService.listarDemandasEncaminhadas(setorId);
    this._cacheEncaminhadas = demandas; // <--- ADICIONE ESTA LINHA AQUI
    this.renderizarListaEncaminhadas(demandas);
  },
  async aplicarFiltrosEncaminhadas() {
    console.log('🎯 Aplicando filtros encaminhadas...');

    const filtros = {
      status: this.elements.filtroStatusEncaminhadas?.value || '',
      setor_destino: this.elements.filtroSetorEncaminhadas?.value || '',
      periodo: this.elements.filtroPeriodoEncaminhadas?.value || ''
    };

    EstadoManager.setEstado('encaminhadas', 'carregando');

    try {
      // 🔥 AQUI CHAMA O SERVIÇO REAL
      const demandas = await window.DemandasService.buscarMinhasDemandas(filtros);

      this._cacheEncaminhadas = demandas;

      if (demandas.length === 0) {
        EstadoManager.setEstado('encaminhadas', 'nao-encontrado');
      } else {
        this.renderizarListaEncaminhadas(demandas);
        EstadoManager.setEstado('encaminhadas', 'dados', demandas);
      }

      console.log(`✅ ${demandas.length} demandas encaminhadas encontradas`);

    } catch (error) {
      console.error('❌ Erro ao buscar encaminhadas:', error);
      EstadoManager.setEstado('encaminhadas', 'nao-encontrado');
      // TODO: Mostrar toast de erro
    }
  },


  limparFiltrosEncaminhadas() {
    console.log('🧹 Limpando filtros encaminhadas...');

    if (this.elements.filtroStatusEncaminhadas) this.elements.filtroStatusEncaminhadas.value = '';
    if (this.elements.filtroSetorEncaminhadas) this.elements.filtroSetorEncaminhadas.value = '';
    if (this.elements.filtroPeriodoEncaminhadas) this.elements.filtroPeriodoEncaminhadas.value = 'todos';

    // 🔥 Carregar sem filtros (só não concluídas)
    this.aplicarFiltrosEncaminhadas();
  },

  renderizarListaEncaminhadas(demandas) {
    const lista = document.getElementById('listaDemandasEncaminhadas');
    if (!lista) return;

    if (demandas.length === 0) {
      lista.innerHTML = '';
      return;
    }

    lista.innerHTML = demandas.map(demanda => `
    <div class="demanda-card" onclick="DemandasTab.selecionarDemanda('encaminhadas', '${demanda.id}')">
      <div class="demanda-card-header">
        <span class="demanda-status status-${demanda.status?.toLowerCase() || 'pendente'}">
          ${demanda.status || 'PENDENTE'}
        </span>
        <span class="demanda-data">
          ${demanda.criado_em_formatado || 'Data não disponível'}
        </span>
      </div>
      
      <div class="demanda-card-body">
        <h4 class="demanda-titulo">
          ${demanda.resumo || 'Sem título'}
        </h4>
        
        <div class="demanda-info">
          <div class="info-item">
            <i class="fi fi-rr-arrow-right"></i>
            <span>Para: ${demanda.setor_destino || 'Não definido'}</span>
          </div>
          
          <div class="info-item">
            <i class="fi fi-rr-flag"></i>
            <span>Prioridade: ${demanda.prioridade || 'média'}</span>
          </div>
          
          ${demanda.justificativa ? `
            <div class="info-item">
              <i class="fi fi-rr-comment"></i>
              <span>${demanda.justificativa}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="demanda-card-footer">
        <span class="demanda-id">
          #${demanda.demandaId || demanda.id.substring(0, 8)}
        </span>
        <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); DemandasTab.verDetalhesDemanda('${demanda.id}')">
          <i class="fi fi-rr-eye"></i> Detalhes
        </button>
      </div>
    </div>
  `).join('');
  },
  // Adicionar após a função renderizarListaEncaminhadas
  verDetalhesDemanda(demandaId) {
    console.log(`🔍 Ver detalhes da demanda: ${demandaId}`);
    // TODO: Implementar modal de detalhes
    // Por enquanto, mostra nos detalhes do painel
    this.mostrarDetalhes('encaminhadas');

    // Aqui você pode buscar os dados completos da demanda
    // e preencher o painel de detalhes
  },

  // ==================================================================================
  // LÓGICA DE NEGÓCIO - MINHAS DEMANDAS
  // ==================================================================================
  async carregarMinhasDemandas() {
    if (this._unsubscribeMinhas) return;

    // Use o caminho modular que você configurou no firebase-config.js
    const user = window.FirebaseApp?.auth?.currentUser;
    
    if (!user) {
        console.error("Usuário não localizado para carregar fila individual.");
        return;
    }

    EstadoManager.setEstado('minhas', 'carregando');

    this._unsubscribeMinhas = window.DemandasService.escutarMinhasDemandas(
        user.uid, 
        (demandas) => {
            this._cacheMinhas = demandas;
            if (demandas.length === 0) {
                EstadoManager.setEstado('minhas', 'nao-encontrado');
            } else {
                this.renderizarListaMinhas(demandas);
                EstadoManager.setEstado('minhas', 'dados', demandas);
            }
        }
    );
},
preencherDetalhesMinhas(demanda) {
    const container = document.getElementById('detalhesConteudoMinhas');
    const isVip = demanda.cliente?.vip === true;

    // Aplicar estilo VIP no container de detalhes
    container.classList.toggle('vip-detail-border', isVip);
    
    // IDs das informações principais
    document.getElementById('detalhesDataMinhas').textContent = demanda.timestamps?.criada_em?.toDate().toLocaleString() || '-';
    document.getElementById('detalhesStatusMinhas').textContent = demanda.status;
    document.getElementById('detalhesTicketMinhas').textContent = demanda.demandaId || demanda.id;
    document.getElementById('detalhesOrigemMinhas').textContent = demanda.setor_origem?.toUpperCase();
    document.getElementById('detalhesNomeClienteTopoMinhas').textContent = demanda.cliente?.nome || 'Não informado';

    // Coluna Dados do Cliente
    document.getElementById('detalhesDadosClienteMinhas').innerHTML = `
        <p><strong>Nome:</strong> ${demanda.cliente?.nome || '-'}</p>
        <p><strong>Email:</strong> ${demanda.cliente?.email || '-'}</p>
        <p><strong>Telefone:</strong> ${demanda.cliente?.telefone || '-'}</p>
        ${isVip ? '<span class="badge-vip">CLIENTE VIP</span>' : ''}
    `;

    // Coluna Detalhes da Demanda (Descrição do operador de origem)
    document.getElementById('detalhesDescricaoMinhas').innerHTML = `
        <p>${demanda.justificativa_encaminhamento || 'Nenhuma descrição detalhada fornecida.'}</p>
    `;
    
    container.classList.remove('hidden');
    document.getElementById('detalhesVazioMinhas').classList.add('hidden');
},
  renderizarListaMinhas(demandas) {
    const lista = document.getElementById('listaDemandasMinhas');
    if (!lista) return;

    lista.innerHTML = demandas.map(demanda => `
      <div class="demanda-card" onclick="DemandasTab.selecionarDemanda('minhas', '${demanda.id}')">
        <div class="demanda-card-header">
           <span class="demanda-status status-andamento">EM ANDAMENTO</span>
           <span class="demanda-data">${demanda.criado_em_formatado || 'Hoje'}</span>
        </div>
        <div class="demanda-card-body">
           <h4>${demanda.resumo}</h4>
           <p><i class="fi fi-rr-user"></i> ${demanda.cliente?.nome || 'Cliente'}</p>
        </div>
      </div>
    `).join('');
  },
  async handleConcluirDemanda(id) {
    const resolucao = this.elements.inputResolucao.value;
    if (!resolucao || resolucao.length < 10) {
      alert('Por favor, descreva a solução técnica (mínimo 10 caracteres).');
      return;
    }

    const ok = confirm("Confirmar conclusão desta demanda?");
    if (!ok) return;

    const result = await window.DemandasService.concluirDemanda(id, resolucao);
    if (result.success) {
      this.fecharDetalhes('minhas');
      this.elements.inputResolucao.value = '';
    }
  },

  async handleRecusarDemanda(id) {
    const motivo = prompt("Informe o motivo da recusa (informação insuficiente):");
    if (!motivo) return;

    const result = await window.DemandasService.recusarDemanda(id, motivo);
    if (result.success) {
      this.fecharDetalhes('minhas');
    }
  },

  // ==================================================================================
  // DETALHES
  // ==================================================================================

  selecionarDemanda(subAba, demandaId) {
    console.log(`📄 Selecionando demanda: ${demandaId} (${subAba})`);

    // Busca no cache correspondente
    const cacheMap = {
      'consulta': this._cacheConsulta,
      'recebidas': this._cacheRecebidas,
      'encaminhadas': this._cacheEncaminhadas
    };

    const demanda = cacheMap[subAba]?.find(d => d.id === demandaId);

    if (!demanda) {
      console.error(`❌ Demanda ${demandaId} não encontrada no cache de ${subAba}.`);
      return;
    }

    this.preencherDetalhes(subAba, demanda);
    this.mostrarDetalhes(subAba);
  },

  preencherDetalhes(subAba, demanda) {
    const sufixo = subAba.charAt(0).toUpperCase() + subAba.slice(1);

    const preencher = (id, valor) => {
      const el = document.getElementById(`detalhes${id}${sufixo}`);
      if (el) el.textContent = valor || "-";
    };

    // --- 1. IDENTIFICAÇÃO DO CLIENTE (Topo) ---
    const cliente = demanda.cliente || {};
    preencher('Cliente', cliente.nome || cliente.email || 'Não identificado');

    // --- 2. CAMPOS GERAIS ---
    preencher('Titulo', demanda.resumo);
    preencher('Status', demanda.status);
    preencher('Ticket', demanda.demandaId || demanda.id);

    // Datas
    const dataCriacao = demanda.timestamps?.criada_em;
    const dataFormatada = dataCriacao?.toDate ? dataCriacao.toDate().toLocaleString() : (demanda.criado_em_formatado || "-");

    if (subAba === 'consulta') preencher('DataCriacao', dataFormatada);
    if (subAba === 'recebidas') preencher('DataRecebido', dataFormatada);
    if (subAba === 'encaminhadas') preencher('DataEncaminhado', dataFormatada);

    // --- 3. DADOS DO CLIENTE (Formatado amigável) ---
    const dadosEl = document.getElementById(`detalhesDadosCliente${sufixo}`);
    if (dadosEl) {
      if (cliente.email || cliente.nome || cliente.telefone) {
        dadosEl.innerHTML = `
                <div style="font-size: 0.9rem; line-height: 1.6;">
                    <p><strong>Email:</strong> ${cliente.email || '-'}</p>
                    <p><strong>Nome:</strong> ${cliente.nome || '-'}</p>
                    <p><strong>Telefone:</strong> ${cliente.telefone || '-'}</p>
                </div>
            `;
      } else {
        dadosEl.innerHTML = `<p class="text-muted">Sem dados de contato.</p>`;
      }
    }

    // --- 4. DESCRIÇÃO / SOLICITAÇÃO (justificativa_encaminhamento) ---
    const descEl = document.getElementById(`detalhesDescricao${sufixo}`);
    if (descEl) {
      descEl.innerHTML = `<p>${demanda.justificativa_encaminhamento || demanda.resumo || 'Sem detalhes informados.'}</p>`;
    }

    // --- 5. HISTÓRICO (Data, Status e Setor apenas) ---
    const timelineEl = document.getElementById(`detalhesTimeline${sufixo}`);
    if (timelineEl) {
      this.renderizarTimelineSimples(timelineEl, demanda.historico_status || []);
    }

    // --- 6. ESPECÍFICOS ---
    if (subAba === 'recebidas') {
      preencher('Origem', demanda.setor_origem?.toUpperCase());
      preencher('Prioridade', `${demanda.prioridade || 0} pts`);
    }
  },

  mostrarDetalhes(subAba) {
    const detalhesMap = {
      'consulta': { conteudo: this.elements.detalhesConteudoConsulta, vazio: this.elements.detalhesVazioConsulta },
      'recebidas': { conteudo: this.elements.detalhesConteudoRecebidas, vazio: this.elements.detalhesVazioRecebidas },
      'encaminhadas': { conteudo: this.elements.detalhesConteudoEncaminhadas, vazio: this.elements.detalhesVazioEncaminhadas }
    };

    const detalhes = detalhesMap[subAba];
    if (detalhes) {
      // Esconde o estado vazio com animação/classe se necessário
      if (detalhes.vazio) detalhes.vazio.classList.add('hidden');
      // Mostra o conteúdo
      if (detalhes.conteudo) detalhes.conteudo.classList.remove('hidden');

      // Scroll suave para o topo do painel de detalhes em mobile
      if (window.innerWidth < 1024) {
        detalhes.conteudo.scrollIntoView({ behavior: 'smooth' });
      }
    }
  },

  renderizarTimelineSimples(container, historico) {
    if (!historico || historico.length === 0) {
      container.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">Sem histórico.</p>`;
      return;
    }

    container.innerHTML = historico.map(item => {
      const data = item.timestamp ? new Date(item.timestamp).toLocaleString() : "-";
      return `
            <div class="timeline-item" style="border-left: 2px solid #3b82f6; padding-left: 12px; margin-bottom: 12px; position: relative; margin-left: 5px;">
                <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; position: absolute; left: -5px; top: 6px;"></div>
                <small style="display: block; color: #64748b;">${data}</small>
                <div style="font-size: 0.85rem; color: #1e293b;">
                    <strong>Nome:</strong> ${item.usuario || '-'} | <strong>Setor:</strong> ${item.setor_destino || '-'}
                </div>
            </div>
        `;
    }).join('');
  },

  fecharDetalhes(subAba) {
    const detalhesMap = {
      'consulta': {
        conteudo: this.elements.detalhesConteudoConsulta,
        vazio: this.elements.detalhesVazioConsulta
      },
      'recebidas': {
        conteudo: this.elements.detalhesConteudoRecebidas,
        vazio: this.elements.detalhesVazioRecebidas
      },
      'encaminhadas': {
        conteudo: this.elements.detalhesConteudoEncaminhadas,
        vazio: this.elements.detalhesVazioEncaminhadas
      }
    };

    const detalhes = detalhesMap[subAba];
    if (detalhes) {
      if (detalhes.conteudo) detalhes.conteudo.classList.add('hidden');
      if (detalhes.vazio) detalhes.vazio.classList.remove('hidden');
    }
  },

  // ==================================================================================
  // MÉTODOS DO CICLO DE VIDA
  // ==================================================================================

  async refresh() {
    console.log('🔄 Refrescando DemandasTab...');

    // Se o cleanup rodou, o _initialized deve estar false
    if (!this._initialized) {
      // Registra novamente no ModuleLifecycle e roda o seu init
      window.ModuleLifecycle.init(this.moduleId, () => {
        this.init();
      });
    } else {
      // Se ainda estiver inicializado, apenas troca a aba
      this.activateSubTab(this._activeSubTab);
    }
  },

  cleanup() {
    console.log('🧹 Limpando DemandasTab...');

    if (this._unsubscribeRecebidas) {
      this._unsubscribeRecebidas(); // Para de ouvir o Firebase
      this._unsubscribeRecebidas = null;
      console.log('✅ Escuta de demandas encerrada.');
    }
    // Apenas o ESSENCIAL
    if (window.ModuleLifecycle?.cleanup) {
      window.ModuleLifecycle.cleanup(this.moduleId);
    }

    this._initialized = false;
    this._eventsBound = false;

    console.log('✅ DemandasTab limpo (apenas listeners)');
  },
  debug() {
    console.group('🔍 DEMANDAS TAB DEBUG');
    console.log('Estado:', {
      initialized: this._initialized,
      eventsBound: this._eventsBound, // 🔥 NOVO
      activeSubTab: this._activeSubTab,
      moduleId: this.moduleId
    });
    console.log('Elements:', Object.keys(this.elements).length);
    EstadoManager.debug();
    console.groupEnd();
  }
};
// ==================================================================================
// EXPORTAR
// ==================================================================================

window.DemandasTab = DemandasTab;
export default DemandasTab;

console.log('✅ DemandasTab carregado (refatorado e otimizado)');
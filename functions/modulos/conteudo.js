(function() {

function getOperadorAtual() {
  const user =
    JSON.parse(sessionStorage.getItem('authUser')) ||
    JSON.parse(sessionStorage.getItem('user'));

  return {
    nome: user?.name || user?.username || 'Operador não identificado',
    role: user?.role || 'operador'
  };
}

const MOCK_CONTEUDOS = [
  {
    id: 'CNT-001',
    artista: 'Anitta',
    featuring: 'Maluma',
    titulo: 'Downtown',
    label: 'Warner Music',
    email: 'upload@warnermusic.com',
    etapa: 1,
    status: 'aguardando',
    responsavel: '-',
    data: '2025-01-10',
    avaliacao1: null,
    avaliacao2: null,
    historico: [
      { acao: 'Upload realizado', operador: 'Sistema', data: '2025-01-10 14:30', tipo: 'sistema' }
    ]
  },
  {
    id: 'CNT-002',
    artista: 'Projota',
    featuring: '',
    titulo: 'Muleque de Vila',
    label: 'Independent',
    email: 'projota@music.com',
    etapa: 1,
    status: 'aguardando',
    responsavel: '-',
    data: '2025-01-10',
    avaliacao1: null,
    avaliacao2: null,
    historico: [
      { acao: 'Upload realizado', operador: 'Sistema', data: '2025-01-10 15:20', tipo: 'sistema' }
    ]
  },
  {
    id: 'CNT-003',
    artista: 'Ludmilla',
    featuring: '',
    titulo: 'Cheguei',
    label: 'Warner Music',
    email: 'ludmilla@warnermusic.com',
    etapa: 2,
    status: 'aprovado_1',
    responsavel: getOperadorAtual().nome,
    data: '2025-01-09',
    avaliacao1: {
      decisao: 'AP',
      observacoes: 'Conteúdo aprovado para distribuição',
      operador: getOperadorAtual().nome,
      data: '2025-01-09 16:45'
    },
    avaliacao2: null,
    historico: [
      { acao: 'Upload realizado', operador: 'Sistema', data: '2025-01-09 10:30', tipo: 'sistema' },
      { acao: 'Aprovado na Etapa 1', operador: getOperadorAtual().nome, data: '2025-01-09 16:45', tipo: 'ap', detalhes: 'Conteúdo aprovado para distribuição' }
    ]
  }
];

let conteudos = [...MOCK_CONTEUDOS];
let conteudoAtual = null;
let currentEncaminhamentoArea = null;

window.initConteudoModule = function() {
  console.log("🎵 Inicializando módulo Conteúdos & Aprovações");
  
  initAbas();
  initFiltros();
  initModais();
  renderFila();
  atualizarEstatisticas();
};

function initAbas() {
  const botoes = document.querySelectorAll('.modulo-painel-conteudo .aba-btn');
  const conteudosAba = document.querySelectorAll('.modulo-painel-conteudo .aba-conteudo');
  
  botoes.forEach(btn => {
    btn.addEventListener('click', () => {
      const alvo = btn.dataset.aba;
      
      botoes.forEach(b => b.classList.remove('ativa'));
      conteudosAba.forEach(c => c.classList.remove('ativa'));
      
      btn.classList.add('ativa');
      const target = document.querySelector(`.modulo-painel-conteudo .${alvo}`);
      if (target) target.classList.add('ativa');
      
      if (alvo === 'aba-fila') renderFila();
      if (alvo === 'aba-aprovados') renderAprovados();
      if (alvo === 'aba-recusados') renderRecusados();
    });
  });
}

function initFiltros() {
  const filtroStatus = document.getElementById('filtroStatus');
  const filtroEtapa = document.getElementById('filtroEtapa');
  const searchInput = document.getElementById('searchConteudo');
  const btnLimpar = document.getElementById('btnLimparFiltros');
  
  if (filtroStatus) filtroStatus.addEventListener('change', renderFila);
  if (filtroEtapa) filtroEtapa.addEventListener('change', renderFila);
  if (searchInput) searchInput.addEventListener('input', renderFila);
  
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      if (filtroStatus) filtroStatus.value = '';
      if (filtroEtapa) filtroEtapa.value = '';
      if (searchInput) searchInput.value = '';
      renderFila();
    });
  }
}

function initModais() {
  const btnCloseAvaliacao = document.getElementById('btnCloseAvaliacao');
  const btnFecharAvaliacao = document.getElementById('btnFecharAvaliacao');
  const btnCloseEncaminhamento = document.getElementById('btnCloseEncaminhamento');
  const btnCancelarEncaminhamento = document.getElementById('btnCancelarEncaminhamento');
  
  if (btnCloseAvaliacao) btnCloseAvaliacao.addEventListener('click', fecharModalAvaliacao);
  if (btnFecharAvaliacao) btnFecharAvaliacao.addEventListener('click', fecharModalAvaliacao);
  if (btnCloseEncaminhamento) btnCloseEncaminhamento.addEventListener('click', fecharModalEncaminhamento);
  if (btnCancelarEncaminhamento) btnCancelarEncaminhamento.addEventListener('click', fecharModalEncaminhamento);
  
  const btnAprovar1 = document.getElementById('btnAprovar1');
  const btnRecusar1 = document.getElementById('btnRecusar1');
  const btnRascunho = document.getElementById('btnRascunho');
  const btnDistribuir = document.getElementById('btnDistribuir');
  const btnRecusar2 = document.getElementById('btnRecusar2');
  
  if (btnAprovar1) btnAprovar1.addEventListener('click', () => avaliar1('AP'));
  if (btnRecusar1) btnRecusar1.addEventListener('click', () => avaliar1('RE'));
  if (btnRascunho) btnRascunho.addEventListener('click', () => avaliar1('RA'));
  if (btnDistribuir) btnDistribuir.addEventListener('click', () => avaliar2('DI'));
  if (btnRecusar2) btnRecusar2.addEventListener('click', () => avaliar2('RE'));
  
  const btnEncaminharMarketing = document.getElementById('btnEncaminharMarketing');
  const btnEncaminharAtendimento = document.getElementById('btnEncaminharAtendimento');
  
  if (btnEncaminharMarketing) btnEncaminharMarketing.addEventListener('click', () => abrirModalEncaminhamento('Marketing'));
  if (btnEncaminharAtendimento) btnEncaminharAtendimento.addEventListener('click', () => abrirModalEncaminhamento('Atendimento'));
  
  const formEncaminhamento = document.getElementById('formEncaminhamento');
  if (formEncaminhamento) {
    formEncaminhamento.addEventListener('submit', (e) => {
      e.preventDefault();
      enviarEncaminhamento();
    });
  }
}

function renderFila() {
  const tbody = document.getElementById('tabelaConteudos');
  if (!tbody) return;
  
  let filtered = [...conteudos];
  
  const statusFiltro = document.getElementById('filtroStatus')?.value;
  const etapaFiltro = document.getElementById('filtroEtapa')?.value;
  const searchTerm = document.getElementById('searchConteudo')?.value.toLowerCase();
  
  if (statusFiltro) filtered = filtered.filter(c => c.status === statusFiltro);
  if (etapaFiltro) filtered = filtered.filter(c => c.etapa === parseInt(etapaFiltro));
  if (searchTerm) {
    filtered = filtered.filter(c => 
      c.artista.toLowerCase().includes(searchTerm) ||
      c.titulo.toLowerCase().includes(searchTerm)
    );
  }
  
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><strong>${c.id}</strong></td>
      <td>${c.artista}${c.featuring ? ' ft. ' + c.featuring : ''}</td>
      <td>${c.titulo}</td>
      <td>Etapa ${c.etapa}</td>
      <td><span class="status-badge status-${c.status}">${getStatusLabel(c.status)}</span></td>
      <td>${c.responsavel}</td>
      <td>${formatDate(c.data)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-primary" onclick="conteudoModule.avaliarConteudo('${c.id}')">
          Avaliar Conteúdo
        </button>
      </td>
    </tr>
  `).join('');
  
  atualizarEstatisticas();
}

function renderAprovados() {
  const tbody = document.getElementById('tabelaAprovados');
  if (!tbody) return;
  
  const aprovados = conteudos.filter(c => c.status === 'distribuido');
  
  tbody.innerHTML = aprovados.length > 0 ? aprovados.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.artista}${c.featuring ? ' ft. ' + c.featuring : ''}</td>
      <td>${c.titulo}</td>
      <td>${c.avaliacao2?.upc || '-'}</td>
      <td>${c.avaliacao2?.data || '-'}</td>
      <td>${c.avaliacao2?.operador || '-'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">Nenhum conteúdo distribuído ainda</td></tr>';
}

function renderRecusados() {
  const tbody = document.getElementById('tabelaRecusados');
  if (!tbody) return;
  
  const recusados = conteudos.filter(c => c.status === 'recusado');
  
  tbody.innerHTML = recusados.length > 0 ? recusados.map(c => {
    const motivo = c.avaliacao1?.decisao === 'RE' ? c.avaliacao1.observacoes : c.avaliacao2?.observacoes || '-';
    const data = c.avaliacao1?.decisao === 'RE' ? c.avaliacao1.data : c.avaliacao2?.data || '-';
    const operador = c.avaliacao1?.decisao === 'RE' ? c.avaliacao1.operador : c.avaliacao2?.operador || '-';
    
    return `
      <tr>
        <td>${c.id}</td>
        <td>${c.artista}${c.featuring ? ' ft. ' + c.featuring : ''}</td>
        <td>${c.titulo}</td>
        <td>${motivo}</td>
        <td>${data}</td>
        <td>${operador}</td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">Nenhum conteúdo recusado</td></tr>';
}

function atualizarEstatisticas() {
  const totalFila = document.getElementById('totalFila');
  const totalAguardando = document.getElementById('totalAguardando');
  const totalAnalise = document.getElementById('totalAnalise');
  const totalDistribuidos = document.getElementById('totalDistribuidos');
  
  if (totalFila) totalFila.textContent = conteudos.length;
  if (totalAguardando) totalAguardando.textContent = conteudos.filter(c => c.status === 'aguardando').length;
  if (totalAnalise) totalAnalise.textContent = conteudos.filter(c => c.status === 'aprovado_1').length;
  if (totalDistribuidos) totalDistribuidos.textContent = conteudos.filter(c => c.status === 'distribuido').length;
}

function avaliarConteudo(id) {
  resetAvaliacaoUI
  const conteudo = conteudos.find(c => c.id === id);
  if (!conteudo) return;
  
  conteudoAtual = conteudo;
  
  document.getElementById('conteudoId').value = conteudo.id;
  document.getElementById('conteudoData').value = formatDate(conteudo.data);
  document.getElementById('conteudoArtista').value = conteudo.artista;
  document.getElementById('conteudoFeat').value = conteudo.featuring;
  document.getElementById('conteudoTitulo').value = conteudo.titulo;
  document.getElementById('conteudoLabel').value = conteudo.label;
  document.getElementById('conteudoEmail').value = conteudo.email;
  
  const editavel = !conteudo.avaliacao1;
  document.getElementById('conteudoArtista').readOnly = !editavel;
  document.getElementById('conteudoFeat').readOnly = !editavel;
  document.getElementById('conteudoTitulo').readOnly = !editavel;
  document.getElementById('conteudoLabel').readOnly = !editavel;
  document.getElementById('conteudoEmail').readOnly = !editavel;
  
  if (conteudo.avaliacao1) {
    document.getElementById('avaliacao1Pendente').classList.add('hidden');
    document.getElementById('avaliacao1Concluida').classList.remove('hidden');
    
    document.getElementById('decisao1').innerHTML = `<span class="action-badge ${conteudo.avaliacao1.decisao.toLowerCase()}">${conteudo.avaliacao1.decisao}</span>`;
    document.getElementById('operador1').textContent = conteudo.avaliacao1.operador;
    document.getElementById('dataAvaliacao1').textContent = conteudo.avaliacao1.data;
    document.getElementById('obsTexto1').textContent = conteudo.avaliacao1.observacoes;
    
    if (conteudo.avaliacao1.decisao === 'AP') {
      document.getElementById('blocoAvaliacao2').classList.remove('hidden');
      
      if (conteudo.avaliacao2) {
        document.getElementById('avaliacao2Pendente').classList.add('hidden');
        document.getElementById('avaliacao2Concluida').classList.remove('hidden');
        
        document.getElementById('decisao2').innerHTML = `<span class="action-badge ${conteudo.avaliacao2.decisao.toLowerCase()}">${conteudo.avaliacao2.decisao}</span>`;
        document.getElementById('upcFinal').textContent = conteudo.avaliacao2.upc || '-';
        document.getElementById('operador2').textContent = conteudo.avaliacao2.operador;
        document.getElementById('dataAvaliacao2').textContent = conteudo.avaliacao2.data;
      } else {
        document.getElementById('avaliacao2Pendente').classList.remove('hidden');
        document.getElementById('avaliacao2Concluida').classList.add('hidden');
      }
    } else {
      document.getElementById('blocoAvaliacao2').classList.add('hidden');
    }
  } else {
    document.getElementById('avaliacao1Pendente').classList.remove('hidden');
    document.getElementById('avaliacao1Concluida').classList.add('hidden');
    document.getElementById('blocoAvaliacao2').classList.add('hidden');
  }
  
  renderTimeline(conteudo);
  
  document.getElementById('modalAvaliacao').classList.add('active');
}

function avaliar1(decisao) {
  if (!conteudoAtual) return;
  
  const obs = document.getElementById('obs1').value;
  
  if (!obs && decisao !== 'AP') {
    alert('Por favor, adicione observações antes de ' + (decisao === 'RE' ? 'recusar' : 'retornar para rascunho'));
    return;
  }
  
  const confirmMsg = decisao === 'AP' ? 'Aprovar este conteúdo?' : 
                     decisao === 'RE' ? 'Recusar este conteúdo?' :
                     'Retornar para rascunho?';
  
  if (!confirm(confirmMsg)) return;
  
  conteudoAtual.artista = document.getElementById('conteudoArtista').value;
  conteudoAtual.featuring = document.getElementById('conteudoFeat').value;
  conteudoAtual.titulo = document.getElementById('conteudoTitulo').value;
  conteudoAtual.label = document.getElementById('conteudoLabel').value;
  conteudoAtual.email = document.getElementById('conteudoEmail').value;
  
  conteudoAtual.avaliacao1 = {
    decisao: decisao,
    observacoes: obs || 'Aprovado',
    operador: getOperadorAtual().nome,
    data: new Date().toLocaleString('pt-BR')
  };
  
  if (decisao === 'AP') {
    conteudoAtual.status = 'aprovado_1';
    conteudoAtual.etapa = 2;
    conteudoAtual.responsavel = getOperadorAtual().nome;
    conteudoAtual.historico.push({
      acao: 'Aprovado na Etapa 1',
      operador: getOperadorAtual().nome,
      data: new Date().toLocaleString('pt-BR'),
      tipo: 'ap',
      detalhes: obs || 'Aprovado'
    });
  } else if (decisao === 'RE') {
    conteudoAtual.status = 'recusado';
    conteudoAtual.historico.push({
      acao: 'Recusado na Etapa 1',
      operador: getOperadorAtual().nome,
      data: new Date().toLocaleString('pt-BR'),
      tipo: 're',
      detalhes: obs
    });
  } else {
    conteudoAtual.historico.push({
      acao: 'Retornado para Rascunho',
      operador: getOperadorAtual().nome,
      data: new Date().toLocaleString('pt-BR'),
      tipo: 'ra',
      detalhes: obs
    });
  }
  
  document.getElementById('obs1').value = '';
  
  fecharModalAvaliacao();
  renderFila();
  
  alert('Avaliação registrada com sucesso!');
}

function avaliar2(decisao) {
  if (!conteudoAtual) return;
  
  const upc = document.getElementById('upcCode').value;
  const obs = document.getElementById('obs2').value;
  
  if (decisao === 'DI' && !upc) {
    alert('UPC é obrigatório para distribuir o conteúdo');
    return;
  }
  
  const confirmMsg = decisao === 'DI' ? 'Distribuir este conteúdo?' : 'Recusar este conteúdo?';
  
  if (!confirm(confirmMsg)) return;
  
  conteudoAtual.avaliacao2 = {
    decisao: decisao,
    upc: upc,
    observacoes: obs || (decisao === 'DI' ? 'Distribuído' : 'Recusado'),
    operador: 'Carlos Distribuição',
    data: new Date().toLocaleString('pt-BR')
  };
  
  if (decisao === 'DI') {
    conteudoAtual.status = 'distribuido';
    conteudoAtual.historico.push({
      acao: 'Distribuído',
      operador: 'Carlos Distribuição',
      data: new Date().toLocaleString('pt-BR'),
      tipo: 'di',
      detalhes: `UPC: ${upc}`
    });
  } else {
    conteudoAtual.status = 'recusado';
    conteudoAtual.historico.push({
      acao: 'Recusado na Etapa 2',
      operador: 'Carlos Distribuição',
      data: new Date().toLocaleString('pt-BR'),
      tipo: 're',
      detalhes: obs || 'Recusado'
    });
  }
  
  document.getElementById('upcCode').value = '';
  document.getElementById('obs2').value = '';
  
  fecharModalAvaliacao();
  renderFila();
  
  alert('Avaliação registrada com sucesso!');
}

function renderTimeline(conteudo) {
  const container = document.getElementById('timelineConteudo');
  if (!container) return;
  
  container.innerHTML = conteudo.historico.map(h => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-action">
            ${h.acao}
            ${h.tipo !== 'sistema' ? `<span class="action-badge ${h.tipo}">${h.tipo.toUpperCase()}</span>` : ''}
          </span>
          <span class="timeline-date">${h.data}</span>
        </div>
        <div class="timeline-details">
          <strong>Operador:</strong> ${h.operador}
          ${h.detalhes ? `<br><strong>Detalhes:</strong> ${h.detalhes}` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function abrirModalEncaminhamento(area) {
  currentEncaminhamentoArea = area;
  document.getElementById('encaminhamentoTitulo').textContent = `Encaminhar para ${area}`;
  document.getElementById('mensagemEncaminhamento').value = '';
  document.getElementById('modalEncaminhamento').classList.add('active');
}

function enviarEncaminhamento() {
  const mensagem = document.getElementById('mensagemEncaminhamento').value;
  
  if (!mensagem.trim()) {
    alert('Digite uma mensagem antes de enviar');
    return;
  }
  
  if (!conteudoAtual) return;
  
  conteudoAtual.historico.push({
    acao: `Encaminhado para ${currentEncaminhamentoArea}`,
    operador: 'Sistema',
    data: new Date().toLocaleString('pt-BR'),
    tipo: 'enc',
    detalhes: mensagem
  });
  
  renderTimeline(conteudoAtual);
  
  fecharModalEncaminhamento();
  
  alert(`Conteúdo encaminhado para ${currentEncaminhamentoArea} com sucesso!`);
}

function fecharModalAvaliacao() {
  document.getElementById('modalAvaliacao').classList.remove('active');
  conteudoAtual = null;
}

function fecharModalEncaminhamento() {
  document.getElementById('modalEncaminhamento').classList.remove('active');
  currentEncaminhamentoArea = null;
}

function getStatusLabel(status) {
  const labels = {
    'aguardando': 'Aguardando',
    'aprovado_1': 'Aprovado - Etapa 1',
    'distribuido': 'Distribuído',
    'recusado': 'Recusado'
  };
  return labels[status] || status;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

window.conteudoModule = {
  avaliarConteudo
};

function resetAvaliacaoUI() {
  // Esconde blocos condicionais
  const etapa2 = document.querySelector('.avaliacao-etapa-2');
  if (etapa2) etapa2.style.display = 'none';

  // Limpa campos de texto
  document.querySelectorAll(
    'textarea, input[type="text"], input[type="number"]'
  ).forEach(input => {
    input.value = '';
  });

  // Remove status visuais ativos
  document.querySelectorAll('.status-badge').forEach(badge => {
    badge.className = 'status-badge';
    badge.textContent = '';
  });

  // Limpa histórico visual
  const timeline = document.querySelector('.timeline');
  if (timeline) timeline.innerHTML = '';

  // Remove estados ativos de botões
  document.querySelectorAll('.btn-acao').forEach(btn => {
    btn.classList.remove('ativa');
  });
}


console.log("✅ Módulo Conteúdos & Aprovações carregado");

})();
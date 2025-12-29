/**
 * Módulo Financeiro - Lujo Network CRM
 * Arquitetura de Controle de Acesso Baseada em Cargos (RBAC)
 */

const financeiroModule = (function() {
  
  // 1. Simulação de Banco de Dados e Usuário
  const MOCK_ADVANCES = [
    { id: "ADV-101", data: "2025-10-25", cliente: "Hospital Santa Maria", valor: 2500.00, status: "solicitado", solicitante: "Carlos (Sup)", historico: ["25/10: Criado por Carlos"] },
    { id: "ADV-102", data: "2025-10-26", cliente: "Construtora Delta", valor: 5400.00, status: "aprovado", solicitante: "Ana (Aux)", historico: ["26/10: Criado por Ana", "26/10: Aprovado por Marina"] },
    { id: "ADV-103", data: "2025-10-27", cliente: "Tech Solutions", valor: 1200.00, status: "pago", solicitante: "Carlos (Sup)", historico: ["27/10: Pago via Pix"] }
  ];

  // Definição de Permissões por Cargo
  const ROLES_PERMISSIONS = {
    "auxiliar": ["FIN_VIEW", "FIN_ADV_VIEW"],
    "supervisor": ["FIN_VIEW", "FIN_ADV_VIEW", "FIN_ADV_CREATE", "FIN_ADV_EDIT"],
    "gerente": ["FIN_VIEW", "FIN_ADV_VIEW", "FIN_ADV_CREATE", "FIN_ADV_EDIT", "FIN_APPROVE", "FIN_REPORTS"]
  };

  // Simulação de usuário logado (Troque aqui para testar: auxiliar, supervisor, gerente)
  let currentUser = {
    nome: "Carlos Souza",
    role: "supervisor" 
  };

  // 2. Inicialização do Módulo
  function init() {
    console.log("💰 Módulo Financeiro Carregado");
    applyPermissions();
    renderAdvances();
    setupEventListeners();
    updateDashboard();
    document.getElementById('currentRoleDisplay').textContent = currentUser.role.toUpperCase();
  }

  // 3. Controle de Segurança (RBAC)
  function hasPermission(perm) {
    return ROLES_PERMISSIONS[currentUser.role].includes(perm);
  }

  function applyPermissions() {
    // Esconde elementos baseado na tag data-perm
    document.querySelectorAll('[data-perm]').forEach(el => {
      const neededPerm = el.getAttribute('data-perm');
      if (!hasPermission(neededPerm)) {
        el.classList.add('perm-denied');
      }
    });

    // Bloqueia a aba de relatórios se não for gerente
    if (!hasPermission('FIN_REPORTS')) {
      const tabRel = document.getElementById('tabRelatorios');
      tabRel.style.opacity = '0.5';
      tabRel.title = "Acesso restrito à gerência";
    }
  }

  // 4. Lógica de Interface
  function renderAdvances() {
    const tbody = document.getElementById('tableAdvancesBody');
    tbody.innerHTML = "";

    MOCK_ADVANCES.forEach(adv => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>#${adv.id}</strong></td>
        <td>${adv.data}</td>
        <td>${adv.cliente}</td>
        <td>R$ ${adv.valor.toFixed(2)}</td>
        <td><span class="status-badge status-${adv.status}">${adv.status}</span></td>
        <td>${adv.solicitante}</td>
        <td class="txt-center">
          <button class="btn btn-sm btn-secondary" onclick="financeiroModule.openModal('${adv.id}')">
            <i class="fi fi-rr-eye"></i> ${hasPermission('FIN_ADV_EDIT') ? 'Editar' : 'Ver'}
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function openModal(id) {
    const adv = MOCK_ADVANCES.find(a => a.id === id);
    if (!adv) return;

    // Preenche formulário
    document.getElementById('advCliente').value = adv.cliente;
    document.getElementById('advValor').value = adv.valor;
    document.getElementById('modalTitle').textContent = `Advance #${adv.id}`;
    
    // Bloqueia campos se for Auxiliar
    const isReadOnly = !hasPermission('FIN_ADV_EDIT');
    document.getElementById('advCliente').disabled = isReadOnly;
    document.getElementById('advValor').disabled = isReadOnly;

    // Renderiza Histórico
    const histList = document.getElementById('historyList');
    histList.innerHTML = adv.historico.map(h => `<li>${h}</li>`).join('');

    document.getElementById('advanceModal').classList.add('active');
  }

  function setupEventListeners() {
    // Troca de Abas
    document.querySelectorAll('.aba-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Validação extra de segurança na troca de abas
        if (targetTab === 'relatorios' && !hasPermission('FIN_REPORTS')) {
          alert("Erro: Seu cargo não possui permissão para acessar Relatórios.");
          return;
        }

        document.querySelectorAll('.aba-btn, .aba-conteudo').forEach(el => el.classList.remove('ativa'));
        btn.classList.add('ativa');
        document.getElementById(`tab-${targetTab}`).classList.add('ativa');
      });
    });

    // Ações de Aprovação
    document.getElementById('btnAprovar').onclick = () => handleAction('aprovado');
    document.getElementById('btnRejeitar').onclick = () => handleAction('rejeitado');
  }

  function handleAction(newStatus) {
    if (!hasPermission('FIN_APPROVE')) {
      alert("Acesso Negado: Apenas o Gerente Financeiro pode realizar esta ação.");
      return;
    }
    alert(`Sucesso: O registro foi marcado como ${newStatus.toUpperCase()}`);
    closeModal();
  }

  function updateDashboard() {
    const pendentes = MOCK_ADVANCES.filter(a => a.status === 'solicitado').length;
    document.getElementById('totalAprovacao').textContent = pendentes;
    document.getElementById('totalPendentes').textContent = "R$ 7.900,00";
    document.getElementById('totalPago').textContent = "R$ 12.450,00";
  }

  return {
    init: init,
    openModal: openModal,
    closeModal: () => document.getElementById('advanceModal').classList.remove('active')
  };

})();

// Inicializa quando o conteúdo for injetado no Main.html
financeiroModule.init();
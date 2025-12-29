/**
 * Módulo Financeiro - Lujo Network CRM
 * Arquitetura de Controle de Acesso Baseada em Cargos (RBAC)
 */

const financeiroModule = (function() {
  
  // 1. Simulação de Banco de Dados
  const MOCK_ADVANCES = [
    { id: "ADV-101", data: "2025-10-25", cliente: "Hospital Santa Maria", valor: 2500.00, status: "solicitado", solicitante: "Carlos (Sup)", historico: ["25/10: Criado por Carlos"] },
    { id: "ADV-102", data: "2025-10-26", cliente: "Construtora Delta", valor: 5400.00, status: "aprovado", solicitante: "Ana (Aux)", historico: ["26/10: Criado por Ana", "26/10: Aprovado por Marina"] },
    { id: "ADV-103", data: "2025-10-27", cliente: "Tech Solutions", valor: 1200.00, status: "pago", solicitante: "Carlos (Sup)", historico: ["27/10: Pago via Pix"] }
  ];

  let currentUser = null;

  // 2. Inicialização do Módulo
  function init() {
    console.log("💰 Módulo Financeiro Carregado");
    
    // Obter usuário do sistema de permissões
    if (window.PermissionsSystem) {
      currentUser = window.PermissionsSystem.getCurrentUser();
      console.log("👤 Usuário:", currentUser);
    }

    if (!currentUser) {
      console.error("❌ Usuário não encontrado");
      return;
    }

    applyPermissions();
    renderAdvances();
    setupEventListeners();
    updateDashboard();
    
    document.getElementById('currentRoleDisplay').textContent = currentUser.role;
  }

  // 3. Controle de Segurança (RBAC)
  function hasPermission(perm) {
    if (!window.PermissionsSystem || !currentUser) return false;
    return window.PermissionsSystem.hasPermission(perm);
  }

  function applyPermissions() {
    // Esconde elementos baseado na tag data-perm
    document.querySelectorAll('[data-perm]').forEach(el => {
      const neededPerm = el.getAttribute('data-perm');
      
      if (!hasPermission(neededPerm)) {
        el.style.display = 'none';
        el.classList.add('perm-denied');
      } else {
        el.style.display = '';
        el.classList.remove('perm-denied');
      }
    });

    // Bloqueia a aba de relatórios se não tiver permissão
    const FIN_REPORTS = window.PermissionsSystem?.PERMISSIONS?.FIN_REPORTS;
    if (FIN_REPORTS && !hasPermission(FIN_REPORTS)) {
      const tabRel = document.getElementById('tabRelatorios');
      if (tabRel) {
        tabRel.style.opacity = '0.5';
        tabRel.style.cursor = 'not-allowed';
        tabRel.title = "Acesso restrito à gerência";
      }
    }

    console.log("🔒 Permissões aplicadas:", {
      FIN_VIEW: hasPermission('financeiro.view'),
      FIN_ADV_VIEW: hasPermission('financeiro.advance.view'),
      FIN_ADV_CREATE: hasPermission('financeiro.advance.create'),
      FIN_ADV_EDIT: hasPermission('financeiro.advance.edit'),
      FIN_APPROVE: hasPermission('financeiro.approve'),
      FIN_REPORTS: hasPermission('financeiro.reports')
    });
  }

  // 4. Lógica de Interface
  function renderAdvances() {
    const tbody = document.getElementById('tableAdvancesBody');
    if (!tbody) return;
    
    tbody.innerHTML = "";

    const canEdit = hasPermission('financeiro.advance.edit');
    const canView = hasPermission('financeiro.advance.view');

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
            <i class="fi fi-rr-eye"></i> ${canEdit ? 'Editar' : 'Ver'}
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
    
    // Controle de permissões no modal
    const canEdit = hasPermission('financeiro.advance.edit');
    const canApprove = hasPermission('financeiro.approve');

    document.getElementById('advCliente').disabled = !canEdit;
    document.getElementById('advValor').disabled = !canEdit;

    // Mostrar/ocultar botões baseado em permissões
    const btnSalvar = document.getElementById('btnSalvar');
    const btnAprovar = document.getElementById('btnAprovar');
    const btnRejeitar = document.getElementById('btnRejeitar');

    if (btnSalvar) {
      btnSalvar.style.display = canEdit ? '' : 'none';
    }

    if (btnAprovar && btnRejeitar) {
      btnAprovar.style.display = canApprove ? '' : 'none';
      btnRejeitar.style.display = canApprove ? '' : 'none';
    }

    // Renderiza Histórico
    const histList = document.getElementById('historyList');
    if (histList) {
      histList.innerHTML = adv.historico.map(h => `<li>${h}</li>`).join('');
    }

    document.getElementById('advanceModal').classList.add('active');
  }

  function setupEventListeners() {
    // Troca de Abas
    document.querySelectorAll('.aba-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Validação de segurança
        if (targetTab === 'relatorios' && !hasPermission('financeiro.reports')) {
          alert("❌ Erro: Seu cargo não possui permissão para acessar Relatórios.");
          return;
        }

        document.querySelectorAll('.aba-btn, .aba-conteudo').forEach(el => el.classList.remove('ativa'));
        btn.classList.add('ativa');
        const tabContent = document.getElementById(`tab-${targetTab}`);
        if (tabContent) {
          tabContent.classList.add('ativa');
        }
      });
    });

    // Botão Novo Advance
    const btnNovo = document.getElementById('btnNovoAdvance');
    if (btnNovo) {
      btnNovo.addEventListener('click', () => {
        if (!hasPermission('financeiro.advance.create')) {
          alert("❌ Você não tem permissão para criar advances.");
          return;
        }
        // Lógica de criar novo advance
        alert("✅ Funcionalidade de criar advance em desenvolvimento");
      });
    }

    // Ações de Aprovação
    const btnAprovar = document.getElementById('btnAprovar');
    const btnRejeitar = document.getElementById('btnRejeitar');
    
    if (btnAprovar) {
      btnAprovar.onclick = () => handleAction('aprovado');
    }
    
    if (btnRejeitar) {
      btnRejeitar.onclick = () => handleAction('rejeitado');
    }

    // Salvar alterações
    const btnSalvar = document.getElementById('btnSalvar');
    if (btnSalvar) {
      btnSalvar.onclick = (e) => {
        e.preventDefault();
        if (!hasPermission('financeiro.advance.edit')) {
          alert("❌ Você não tem permissão para editar advances.");
          return;
        }
        alert("✅ Alterações salvas com sucesso!");
        closeModal();
      };
    }
  }

  function handleAction(newStatus) {
    if (!hasPermission('financeiro.approve')) {
      alert("❌ Acesso Negado: Apenas usuários com permissão de aprovação podem realizar esta ação.");
      return;
    }
    alert(`✅ Sucesso: O registro foi marcado como ${newStatus.toUpperCase()}`);
    closeModal();
  }

  function updateDashboard() {
    const pendentes = MOCK_ADVANCES.filter(a => a.status === 'solicitado').length;
    const elemTotal = document.getElementById('totalAprovacao');
    const elemPendentes = document.getElementById('totalPendentes');
    const elemPago = document.getElementById('totalPago');

    if (elemTotal) elemTotal.textContent = pendentes;
    if (elemPendentes) elemPendentes.textContent = "R$ 7.900,00";
    if (elemPago) elemPago.textContent = "R$ 12.450,00";
  }

  function closeModal() {
    const modal = document.getElementById('advanceModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  return {
    init: init,
    openModal: openModal,
    closeModal: closeModal
  };

})();

// Inicializa quando o conteúdo for injetado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => financeiroModule.init());
} else {
  financeiroModule.init();
}
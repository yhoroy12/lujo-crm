/**
 * =====================================================
 * FINANCEIRO.JS — VERSÃO SPA ESTÁVEL (LUJO CRM)
 * Compatível com main.js e financeiro.html
 * =====================================================
 */

(function () {

  let currentUser = null;
  let initialized = false;

  /* =====================================================
     UTILITÁRIOS SEGUROS (ANTI-NULL)
  ===================================================== */
  function $(id) {
    return document.getElementById(id);
  }

  function safeText(id, value) {
    const el = $(id);
    if (el !== null && value !== undefined) {
      el.textContent = value;
    }
  }

  function safeHTML(id, value) {
    const el = $(id);
    if (el !== null) {
      el.innerHTML = value;
    }
  }

  function hasPermission(perm) {
    if (!window.PermissionsSystem || !currentUser) return false;
    return window.PermissionsSystem.hasPermission(perm);
  }

  /* =====================================================
     DADOS MOCK (TEMPORÁRIO)
  ===================================================== */
  const LANCAMENTOS = [];

  /* =====================================================
     INIT — OBRIGATÓRIO PARA SPA
  ===================================================== */
  function init() {
    if (initialized) return;
    initialized = true;

    console.log("💰 Financeiro inicializado com sucesso (SPA)");

    currentUser = window.PermissionsSystem?.getCurrentUser?.() || null;

    bindAbas();
    bindBotoes();
    applyPermissions();
    atualizarDashboard();
  }

  /* =====================================================
     ABAS
  ===================================================== */
  function bindAbas() {
    document.querySelectorAll(".aba-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const alvo = btn.dataset.aba;
        if (!alvo) return;

        document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
        document.querySelectorAll(".aba-conteudo").forEach(a => a.classList.remove("ativa"));

        btn.classList.add("ativa");
        document.querySelector(`.${alvo}`)?.classList.add("ativa");
      });
    });
  }

  /* =====================================================
     BOTÕES E AÇÕES
  ===================================================== */
  function bindBotoes() {

    // Novo Lançamento
    $("btnNovoLancamento")?.addEventListener("click", () => {
      if (!hasPermission("financeiro.create")) {
        alert("Você não tem permissão para criar lançamentos.");
        return;
      }
      abrirModal("modalLancamento");
    });

    // Cancelar lançamento
    $("btnCancelarLancamento")?.addEventListener("click", fecharModais);
    $("btnCloseModalLancamento")?.addEventListener("click", fecharModais);

    // Salvar lançamento (mock)
    $("formLancamento")?.addEventListener("submit", e => {
      e.preventDefault();
      alert("Lançamento salvo (mock).");
      fecharModais();
    });

    // Aprovação
    $("btnAprovar")?.addEventListener("click", () => {
      alert("Lançamento aprovado (mock).");
      fecharModais();
    });

    $("btnRejeitar")?.addEventListener("click", () => {
      alert("Lançamento rejeitado (mock).");
      fecharModais();
    });

    $("btnSolicitarAjuste")?.addEventListener("click", () => {
      alert("Ajuste solicitado (mock).");
      fecharModais();
    });

    $("btnCloseModalAprovacao")?.addEventListener("click", fecharModais);

    // Pagamento
    $("btnCancelarPagamento")?.addEventListener("click", fecharModais);
    $("btnCloseModalPagamento")?.addEventListener("click", fecharModais);

    $("formPagamento")?.addEventListener("submit", e => {
      e.preventDefault();
      alert("Pagamento registrado (mock).");
      fecharModais();
    });

    // Botão "Ver Todos" → Lançamentos
    document
      .querySelector('[data-action="ir-lancamentos"]')
      ?.addEventListener("click", () => {
        document.querySelector('.aba-btn[data-aba="aba-lancamentos"]')?.click();
      });
  }

  /* =====================================================
     PERMISSÕES VISUAIS
  ===================================================== */
  function applyPermissions() {
    document.querySelectorAll("[data-perm]").forEach(el => {
      const perm = el.dataset.perm;
      if (!hasPermission(perm)) {
        el.style.display = "none";
      }
    });

    document.querySelectorAll("[data-perm-inverse]").forEach(el => {
      const perm = el.dataset.permInverse;
      if (!hasPermission(perm)) {
        el.style.display = "block";
      } else {
        el.style.display = "none";
      }
    });
  }

  /* =====================================================
     DASHBOARD (MOCK)
  ===================================================== */
  function atualizarDashboard() {
    safeText("saldoAtual", "R$ 0,00");
    safeText("aReceber", "R$ 0,00");
    safeText("aPagar", "R$ 0,00");
    safeText("despesasMes", "R$ 0,00");
    safeText("resultadoMes", "R$ 0,00");

    safeText("totalReceitas", "R$ 0,00");
    safeText("totalDespesas", "R$ 0,00");
    safeText("totalAdiantamentos", "R$ 0,00");
    safeText("totalReembolsos", "R$ 0,00");

    safeText("statPendentes", "0");
    safeText("statAprovadosHoje", "0");
    safeText("statRejeitadosHoje", "0");
    safeText("statValorPendente", "R$ 0,00");

    safeText("statAguardandoPagamento", "R$ 0,00");
    safeText("statPagosEsteMes", "R$ 0,00");
    safeText("statTotalTransacoes", "0");
  }

  /* =====================================================
     MODAIS
  ===================================================== */
  function abrirModal(id) {
    $(id)?.classList.add("active");
  }

  function fecharModais() {
    document.querySelectorAll(".modal-overlay").forEach(m => {
      m.classList.remove("active");
    });
  }

  /* =====================================================
     EXPOSIÇÃO GLOBAL (OBRIGATÓRIA)
  ===================================================== */
  window.initFinanceiroModule = init;

})();

// ==================== MAIN.JS – SPA MODULAR LIMPO ====================

/* =========================
   ESTADO GLOBAL
========================= */
const AppState = {
  user: {
    isAuthenticated: false,
    data: null
  },
  navigation: {
    currentModule: "main",
    breadcrumb: ["Início"]
  },
  ui: {
    sidebarOpen: false,
    theme: "light",
    loading: false
  },
  listeners: []
};

/* =========================
   OBSERVADORES
========================= */
function subscribe(fn) {
  AppState.listeners.push(fn);
}
function notify() {
  AppState.listeners.forEach(fn => fn(AppState));
}

/* =========================
   UI
========================= */
function renderUI(state) {
  renderBreadcrumb(state.navigation.breadcrumb);
  renderLoading(state.ui.loading);
}

function renderBreadcrumb(items) {
  const el = document.getElementById("breadcrumb");
  if (!el) return;
  el.innerHTML = items.map(i => `<span>${i}</span>`).join("");
}

function renderLoading(show) {
  const loader = document.getElementById("globalLoading");
  if (!loader) return;
  loader.classList.toggle("hidden", !show);
}

subscribe(renderUI);

/* =========================
   CONTROLE DE ESTADO
========================= */
function setModule(module) {
  AppState.navigation.currentModule = module;
  updateBreadcrumb(module);
  notify();
}

function setLoading(v) {
  AppState.ui.loading = v;
  notify();
}

function toggleSidebar(open) {
  AppState.ui.sidebarOpen = open;
  notify();
}

/* =========================
   BREADCRUMB
========================= */
function updateBreadcrumb(module) {
  const map = {
    main: ["Início"],
    atendimento: ["Início", "Atendimento"],
    conteudo: ["Início", "Conteúdo"],
    financeiro: ["Início", "Financeiro"],
    marketing: ["Início", "Marketing"],
    tecnico: ["Início", "Técnico"],
    gerencia: ["Início", "Gerência"],
    relatorios: ["Início", "Relatórios"],
    admin: ["Início", "Administração"]
  };
  AppState.navigation.breadcrumb = map[module] || ["Início"];
}

/* =========================
   AUTENTICAÇÃO / PERMISSÃO
========================= */
function isAuthenticated() {
  return sessionStorage.getItem("currentUser") !== null;
}

function getCurrentUser() {
  const u = sessionStorage.getItem("currentUser");
  return u ? JSON.parse(u) : null;
}

function hasPermission(module) {
  if (!window.PermissionsSystem) return false;
  const user = getCurrentUser();
  if (!user) return false;

  const permissions = {
    atendimento: "atendimento.view",
    conteudo: "conteudo.view",
    financeiro: "financeiro.view",
    marketing: "marketing.view",
    tecnico: "tecnico.view",
    gerencia: "gerencia.view",
    relatorios: "relatorios.view",
    admin: "system.super_admin"
  };

  return window.PermissionsSystem.hasPermission(permissions[module]);
}

/* =========================
   ELEMENTOS BASE
========================= */
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const noticiasHTML = document.getElementById("news-section")?.outerHTML || "";

/* =========================
   HOME
========================= */
function voltarMain() {
  setModule("main");
  content.innerHTML = noticiasHTML;
  sidebar.classList.remove("active");
  toggleSidebar(false);
  content.scrollTo(0, 0);
}

/* =========================
   MAPA DE MÓDULOS (CHAVE!)
========================= */
const ModuleRegistry = {
  atendimento: () => window.initAtendimentoModule?.(),
  gerencia: () => window.initGerenciaModule?.(),
  admin: () => window.initAdminModule?.()
};

/* =========================
   SPA – LOAD CONTENT
========================= */
async function loadContent(section) {
  console.log(`📂 Carregando módulo: ${section}`);

  if (!hasPermission(section)) {
    content.innerHTML = `
      <div class="card" style="text-align:center;padding:40px">
        <h3>🔒 Acesso Negado</h3>
        <button class="btn btn-primary" id="btnVoltar">Voltar</button>
      </div>
    `;
    document.getElementById("btnVoltar")?.addEventListener("click", voltarMain);
    return;
  }

  setLoading(true);
  setModule(section);
  sidebar.classList.remove("active");
  toggleSidebar(false);

  try {
    // HTML - CAMINHO CORRIGIDO
    const res = await fetch(`../html/${section}.html`);
    if (!res.ok) throw new Error("HTML não encontrado");
    content.innerHTML = await res.text();

    // CSS - CAMINHO CORRIGIDO
    loadModuleCSS(section);

    // JS - CAMINHO CORRIGIDO
    await loadModuleJS(section);

    // INIT
    ModuleRegistry[section]?.();
    console.log(`✅ Módulo ${section} inicializado`);
  } catch (e) {
    console.error(e);
    content.innerHTML = `<div class="card"><p>${e.message}</p></div>`;
  } finally {
    setLoading(false);
    content.scrollTo(0, 0);
  }
}

/* =========================
   CSS POR MÓDULO
========================= */
function loadModuleCSS(section) {
  // Remove CSS antigo
  document.querySelectorAll("link[data-module]").forEach(l => l.remove());

  // Carrega CSS específico do módulo - CAMINHO CORRIGIDO
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `../css/${section}.css`;
  link.dataset.module = section;
  document.head.appendChild(link);  
}

/* =========================
   JS POR MÓDULO
========================= */
function loadModuleJS(section) {
  return new Promise((resolve, reject) => {
    document.querySelectorAll("script[data-module]").forEach(s => s.remove());

    const script = document.createElement("script");
    // CAMINHO CORRIGIDO - adiciona /modulos/ para os arquivos JS dos módulos
    script.src = `../../functions/modulos/${section}.js`;
    script.dataset.module = section;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/* =========================
   MENU LATERAL
========================= */
function initSidebarMenu() {
  document.querySelectorAll(".sidebar a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const module = link.dataset.module;
      const action = link.dataset.action;
      if (action === "voltarMain") voltarMain();
      if (module) loadContent(module);
    });
  });
}

/* =========================
   START
========================= */
window.addEventListener("DOMContentLoaded", () => {
  if (!isAuthenticated()) {
    location.href = "login.html";
    return;
  }

  initSidebarMenu();
  setModule("main");
});

/* =========================
   SIDEBAR – CONTROLE COMPLETO
========================= */

function atualizarPointerEvents() {
  sidebar.style.pointerEvents =
    sidebar.classList.contains("active") ? "auto" : "none";
}

const sidebarObserver = new MutationObserver(atualizarPointerEvents);
sidebarObserver.observe(sidebar, {
  attributes: true,
  attributeFilter: ["class"]
});

atualizarPointerEvents();

let hideTimeout = null;

sidebar.addEventListener("mouseenter", () => {
  if (hideTimeout) clearTimeout(hideTimeout);
  sidebar.classList.add("active");
  toggleSidebar(true);
});

sidebar.addEventListener("mouseleave", () => {
  hideTimeout = setTimeout(() => {
    sidebar.classList.remove("active");
    toggleSidebar(false);
  }, 500);
});

const menuTrigger = document.getElementById("menuTrigger");

menuTrigger?.addEventListener("mouseenter", () => {
  sidebar.classList.add("active");
  toggleSidebar(true);
});

// Adicionar botão de sair
const btnSair = document.getElementById("btnSair");
if (btnSair) {
  btnSair.addEventListener("click", () => {
    sessionStorage.removeItem("currentUser");
    window.location.href = "../html/login.html";
  });
}
// ==================== MAIN.JS - COM ESTADO GLOBAL (FASE B) ====================

/* =========================
   ESTADO GLOBAL DO SISTEMA
========================= */
const AppState = {
  user: {
    isAuthenticated: false,
    data: null,
  },

  navigation: {
    currentModule: 'main',
    breadcrumb: ['Início'],
  },

  ui: {
    sidebarOpen: false,
    sidebarMode: 'compact',
    theme: 'light',
    loading: false,
  },

  system: {
    notifications: [],
    errors: [],
  },

  listeners: []
};
/* =========================
   MAPEAMENTO DOS MODULOS
========================= */
const globalModules = [
  { name: "Início", action: voltarMain },
  { name: "Atendimento", section: "atendimento" },
  { name: "Conteúdo", section: "conteudo" },
  { name: "Financeiro", section: "financeiro" },
  { name: "Marketing", section: "marketing" },
  { name: "Técnico", section: "tecnico" },
  { name: "Gerência", section: "gerencia" },
  { name: "Relatórios", section: "relatorios" }
];


/* =========================
   RENDERIZAÇÃO DE UI
========================= */
function renderUI(state) {
  renderBreadcrumb(state.navigation.breadcrumb);
  renderLoading(state.ui.loading);
}

function renderBreadcrumb(items) {
  const el = document.getElementById('breadcrumb');
  if (!el) return;

  el.innerHTML = items.map(i => `<span>${i}</span>`).join('');
}

function renderLoading(show) {
  const loader = document.getElementById('globalLoading');
  if (!loader) return;

  loader.classList.toggle('hidden', !show);
}

/* Registrar observador */
subscribe(renderUI);

/* =========================
   OBSERVADORES DE ESTADO
========================= */
function subscribe(listener) {
  AppState.listeners.push(listener);
}

function notify() {
  AppState.listeners.forEach(fn => fn(AppState));
}

/* =========================
   CONTROLADORES DE ESTADO
========================= */
function setUser(userData) {
  AppState.user.isAuthenticated = !!userData;
  AppState.user.data = userData;
  notify();
}

function setModule(moduleName) {
  AppState.navigation.currentModule = moduleName;
  updateBreadcrumb(moduleName);
  notify();
}

function setLoading(value) {
  AppState.ui.loading = value;
  notify();
}

function toggleSidebar(open) {
  AppState.ui.sidebarOpen = open;
  notify();
}

function setTheme(theme) {
  AppState.ui.theme = theme;
  localStorage.setItem('theme', theme);
  notify();
}

/* =========================
   BREADCRUMB (ESTADO)
========================= */
function updateBreadcrumb(module) {
  const map = {
    main: ['Início'],
    atendimento: ['Início', 'Atendimento'],
    conteudo: ['Início', 'Conteúdo'],
    financeiro: ['Início', 'Financeiro'],
    marketing: ['Início', 'Marketing'],
    tecnico: ['Início', 'Técnico'],
    gerencia: ['Início', 'Gerência'],
    relatorios: ['Início', 'Relatórios'],
  };

  AppState.navigation.breadcrumb = map[module] || ['Início'];
}

/* =========================
   AUTENTICAÇÃO
========================= */
function isAuthenticated() {
  return sessionStorage.getItem('currentUser') !== null;
}

function getCurrentUser() {
  const user = sessionStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

function hasPermission(module) {
  const user = getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(module);
}

function getRoleLabel(role) {
  const labels = {
    atendente: 'Atendente',
    supervisor: 'Supervisor',
    gerente: 'Gerente',
    admin: 'Administrador'
  };
  return labels[role] || role;
}

/* =========================
   HEADER (INFO DO USUÁRIO)
========================= */
function loadUserInfo() {
  const user = getCurrentUser();
  if (!user) return;

  const headerTitle = document.querySelector('header h1');
  if (headerTitle) {
    headerTitle.innerHTML = `
      Lujo Network
      <small style="font-size: 14px; font-weight: 400; margin-left: 10px; color: rgba(255,255,255,0.8);">
        | ${user.name} - ${getRoleLabel(user.role)}
      </small>
    `;
  }

  const btnSair = document.querySelector('header .btn-primary');
  if (btnSair) btnSair.onclick = handleLogout;
}

/* =========================
   LOGOUT
========================= */
function handleLogout() {
  if (confirm('Deseja realmente sair do sistema?')) {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
}

/* =========================
   SIDEBAR
========================= */
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const noticiasHTML = document.getElementById("news-section").outerHTML;

function atualizarPointerEvents() {
  sidebar.style.pointerEvents = sidebar.classList.contains("active") ? "auto" : "none";
}

const observer = new MutationObserver(atualizarPointerEvents);
observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
atualizarPointerEvents();

let hideTimeout;

sidebar.addEventListener("mouseleave", () => {
  hideTimeout = setTimeout(() => {
    sidebar.classList.remove("active");
    toggleSidebar(false);
  }, 500);
});

sidebar.addEventListener("mouseenter", () => {
  clearTimeout(hideTimeout);
});

/* =========================
   VOLTAR PARA HOME
========================= */
function voltarMain() {
  setModule('main');
  content.innerHTML = noticiasHTML;
  sidebar.classList.remove("active");
  toggleSidebar(false);
  content.scrollTo(0, 0);
}

/* =========================
   SPA - LOAD CONTENT
========================= */
async function loadContent(section) {
  if (!hasPermission(section)) {
    content.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <i class="fi fi-rr-lock" style="font-size: 48px; color: #ccc;"></i>
        <h3 style="color:#f44336;">Acesso Negado</h3>
        <p>Você não tem permissão para acessar <strong>${section}</strong>.</p>
        <button class="btn btn-primary" onclick="voltarMain()">Voltar</button>
      </div>
    `;
    return;
  }

  setLoading(true);
  setModule(section);
  sidebar.classList.remove("active");
  toggleSidebar(false);
  cleanPreviousDynamicScripts();

  try {
    const response = await fetch(`${section}.html`);
    if (!response.ok) throw new Error("Arquivo não encontrado");

    const html = await response.text();
    content.innerHTML = html;

    const temp = document.createElement("div");
    temp.innerHTML = html;
    const scripts = temp.querySelectorAll("script");

    for (const s of scripts) {
      if (s.src) await injectExternalScript(s.src, section);
      else injectInlineScript(s.textContent, section);
    }
  } catch (e) {
    content.innerHTML = `<div class="card"><h3>Erro</h3><p>${e.message}</p></div>`;
  }

  setLoading(false);
  content.scrollTo(0, 0);
}

/* =========================
   SCRIPTS DINÂMICOS
========================= */
function cleanPreviousDynamicScripts() {
  document.querySelectorAll('script[data-dyn-script="true"]').forEach(s => s.remove());
}

function injectInlineScript(text, section) {
  const script = document.createElement("script");
  script.textContent = text;
  script.dataset.dynScript = "true";
  script.dataset.section = section;
  document.body.appendChild(script);
}

function injectExternalScript(src, section) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.dataset.dynScript = "true";
    script.dataset.section = section;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/* =========================
   MENU HOVER
========================= */
const menuTrigger = document.getElementById("menuTrigger");
menuTrigger.addEventListener("mouseenter", () => {
  sidebar.classList.add("active");
  toggleSidebar(true);
});

/* =========================
   BLOQUEIO VISUAL DE MÓDULOS
========================= */
window.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getCurrentUser();
  setUser(user);
  loadUserInfo();

  const menuLinks = document.querySelectorAll('.sidebar ul li a');

  menuLinks.forEach(link => {
    const match = link.getAttribute('onclick')?.match(/loadContent\('(.+?)'\)/);
    if (match && !hasPermission(match[1])) {
      link.style.opacity = '0.4';
      link.style.cursor = 'not-allowed';
      link.setAttribute('title', link.getAttribute('title') + ' 🔒');
    }
  });

  setModule('main');
});
/* =========================
   ABRI/FECHAR PESQUISA COM TECLADO
========================= */
const globalSearch = document.getElementById("globalSearch");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openSearch();
  }

  if (e.key === "Escape") {
    closeSearch();
  }
});

function openSearch() {
  globalSearch.classList.remove("hidden");
  searchInput.value = "";
  searchResults.innerHTML = "";
  searchInput.focus();
}

function closeSearch() {
  globalSearch.classList.add("hidden");
}


/* =========================
   FILTRAR RESULTADOS DA PESQUISA
========================= */

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  searchResults.innerHTML = "";

  if (!query) return;

  globalModules
    .filter(m => m.name.toLowerCase().includes(query))
    .forEach(module => {
      const li = document.createElement("li");
      li.textContent = module.name;

      if (module.section && !hasPermission(module.section)) {
        li.classList.add("disabled");
      } else {
        li.onclick = () => {
          closeSearch();
          module.section ? loadContent(module.section) : module.action();
        };
      }

      searchResults.appendChild(li);
    });
});

/* ===============================
   MENU EXPANDIDO / COMPACTO
================================ */

const SIDEBAR_STATE_KEY = 'lujo_sidebar_state';

function setSidebarState(state) {
  if (state === 'expanded') {
    sidebar.classList.add('expanded');
  } else {
    sidebar.classList.remove('expanded');
  }
  localStorage.setItem(SIDEBAR_STATE_KEY, state);
}

function toggleSidebarState() {
  const isExpanded = sidebar.classList.contains('expanded');
  setSidebarState(isExpanded ? 'compact' : 'expanded');
}

// Restaurar estado ao carregar
window.addEventListener('DOMContentLoaded', () => {
  const savedState = localStorage.getItem(SIDEBAR_STATE_KEY) || 'compact';
  setSidebarState(savedState);
});

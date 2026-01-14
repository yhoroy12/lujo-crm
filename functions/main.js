// ==================== MAIN.JS – SPA INTEGRADA AO FIREBASE ====================

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
   OBSERVADORES DE ESTADO INTERNO
========================= */
function subscribe(fn) {
  AppState.listeners.push(fn);
}
function notify() {
  AppState.listeners.forEach(fn => fn(AppState));
}

/* =========================
   UI CORE
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
   CONTROLE DE NAVEGAÇÃO
========================= */
function setModule(module) {
  AppState.navigation.currentModule = module;
  updateBreadcrumb(module);
  notify();
}

window.setLoading = function(v) {
  AppState.ui.loading = v;
  notify();
}

function toggleSidebar(open) {
  AppState.ui.sidebarOpen = open;
  notify();
}

function updateBreadcrumb(module) {
  const map = {
    main: ["Início"],
    atendimento: ["Início", "Atendimento"],
    conteudo: ["Início", "Conteúdo"],
    copyright: ["Início", "Copyright"],
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
   SEGURANÇA (FIREBASE READY)
========================= */

// Usamos as funções globais definidas no auth.js
function checkAuth() {
  return window.isAuthenticated && window.isAuthenticated();
}

function hasModulePermission(module) {
  // Mapeamento de Módulo para String de Permissão no Firestore
  const permissionsMap = {
    atendimento: "atendimento.view",
    conteudo: "conteudo.view",
    copyright: "copyright.view",
    financeiro: "financeiro.view",
    marketing: "marketing.view",
    tecnico: "tecnico.view",
    gerencia: "gerencia.view",
    relatorios: "relatorios.view",
    admin: "admin.view" // Ajustado para bater com o padrão
  };

  if (module === 'main') return true;

  // Usa a função global window.hasPermission do auth.js
  return window.hasPermission && window.hasPermission(permissionsMap[module]);
}

/* =========================
   FILTRAR SIDEBAR
========================= */
function filterSidebarByPermissions() {
  const menuItems = document.querySelectorAll('.sidebar li[data-permission]');
  
  menuItems.forEach(item => {
    const requiredPermission = item.dataset.permission;
    
    // Se a função global existir e der o OK, mostramos
    if (window.hasPermission && window.hasPermission(requiredPermission)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
  
  console.log("🎯 Sidebar filtrada via Firebase Permissions");
}

/* =========================
   SPA – CARREGAMENTO DE CONTEÚDO
========================= */
const content = document.getElementById("content");
const sidebar = document.getElementById("sidebar");
const noticiasHTML = document.getElementById("news-section")?.outerHTML || "";

async function loadContent(section) {
  console.log(`📂 Carregando módulo: ${section}`);

  if (!hasModulePermission(section)) {
    content.innerHTML = `
      <div class="card" style="text-align:center;padding:40px">
        <h3>🔒 Acesso Negado</h3>
        <p>Seu perfil não tem permissão para o módulo: <strong>${section}</strong></p>
        <button class="btn btn-primary" id="btnVoltar">Voltar para o Início</button>
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
    // 1. Carregar HTML
    const res = await fetch(`../html/${section}.html`);
    if (!res.ok) throw new Error("Falha ao carregar estrutura do módulo.");
    content.innerHTML = await res.text();

    // 2. Carregar CSS
    loadModuleCSS(section);

    // 3. Carregar JS
    await loadModuleJS(section);

    // 4. Inicializar Módulo via Lifecycle
    if (window.ModuleLifecycle) {
        window.ModuleLifecycle.init(section, () => {
            const initFnName = `init${section.charAt(0).toUpperCase() + section.slice(1)}Module`;
            if (window[initFnName]) {
                window[initFnName]();
            } else {
                console.warn(`Função de inicialização ${initFnName} não encontrada.`);
            }
        });
    }
    
  } catch (e) {
    console.error("Erro SPA:", e);
    content.innerHTML = `<div class="card"><p>Erro ao carregar módulo: ${e.message}</p></div>`;
  } finally {
    setLoading(false);
    content.scrollTo(0, 0);
  }
}

function loadModuleCSS(section) {
  document.querySelectorAll("link[data-module]").forEach(l => l.remove());
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `../css/${section}.css`;
  link.dataset.module = section;
  document.head.appendChild(link);  
}

function loadModuleJS(section) {
  return new Promise((resolve, reject) => {
    document.querySelectorAll("script[data-module]").forEach(s => s.remove());
    const script = document.createElement("script");
    script.src = `../../functions/modulos/${section}.js`;
    script.dataset.module = section;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function voltarMain() {
  setModule("main");
  content.innerHTML = noticiasHTML;
  sidebar.classList.remove("active");
  toggleSidebar(false);
  content.scrollTo(0, 0);
}

/* =========================
   INICIALIZAÇÃO DO APP
========================= */
window.addEventListener("DOMContentLoaded", () => {
  // 1. Verificação rápida (apenas para não piscar conteúdo logado)
  if (!checkAuth()) {
    window.location.href = "login.html";
    return;
  }

  // 2. O Firebase decide quando a UI deve aparecer
  if (window.FirebaseApp) {
    window.FirebaseApp.auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("✅ Usuário confirmado pelo Firebase. Inicializando UI...");
        
        // SÓ chamamos aqui dentro para garantir que temos as permissões do usuário
        filterSidebarByPermissions();
        initSidebarMenu();
        
        // Define o módulo inicial (Dashboard)
        setModule("main");
      } else {
        // Se o Firebase disser que não há usuário, expulsamos para o login
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
      }
    });
  } else {
    console.error("❌ Erro crítico: Firebase não carregado.");
  }
});

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
   CONTROLE VISUAL SIDEBAR (VERSÃO ESTÁVEL)
========================= */

// Inicializamos os eventos de Hover
function initSidebarHover() {
    const sidebarEl = document.getElementById("sidebar");
    const triggerEl = document.getElementById("sidebar-trigger"); 
    let hideTimeout = null;

  if (!sidebarEl || !triggerEl) return;


    triggerEl.addEventListener("mouseenter", () => {
        if (hideTimeout) clearTimeout(hideTimeout);
        sidebarEl.classList.add("active");
        toggleSidebar(true);
    });

    sidebarEl.addEventListener("mouseleave", () => {
        hideTimeout = setTimeout(() => {
            sidebarEl.classList.remove("active");
            toggleSidebar(false);
        }, 300);
    });

    sidebarEl.addEventListener("mouseenter", () => {
        if (hideTimeout) clearTimeout(hideTimeout);
    });
}

// Botão Sair
function initLogoutButton() {
    const btnSair = document.getElementById("btnSair");
    if (btnSair) {
        btnSair.onclick = () => {
            if (window.logout) window.logout();
        };
    }
}

// AJUSTE NA INICIALIZAÇÃO PARA CHAMAR TUDO NA ORDEM CERTA
window.addEventListener("DOMContentLoaded", () => {
    if (!checkAuth()) {
        window.location.href = "login.html";
        return;
    }

    if (window.FirebaseApp) {
        window.FirebaseApp.auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("✅ Usuário confirmado pelo Firebase.");
                
                filterSidebarByPermissions();
                initSidebarMenu();
                
                // CHAMAR AS NOVAS FUNÇÕES AQUI DENTRO:
                initSidebarHover(); 
                initLogoutButton();
                
                setModule("main");
            } else {
                sessionStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        });
    }
});
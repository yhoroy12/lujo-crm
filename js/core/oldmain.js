// ==================== MAIN.JS – SPA INTEGRADA AO FIREBASE (CORRIGIDA) ====================

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
   GERENCIADOR DE CARREGAMENTO DE MÓDULOS (NOVO)
========================= */
const ModuleLoader = (() => {
  let loadingModule = null;
  let loadedScripts = new Set();
  let scriptPromises = new Map();

  return {
    /**
     * Carrega um script de módulo com segurança contra duplicatas
     * @param {string} section - Nome do módulo (copyright, atendimento, etc)
     * @returns {Promise}
     */
    async loadScript(section) {
      // 1. TRAVA: Se já está carregando este módulo, retorna a promise existente
      if (scriptPromises.has(section)) {
        console.log(`⏳ Módulo ${section} já está sendo carregado. Aguardando...`);
        return scriptPromises.get(section);
      }

      // 2. TRAVA: Se já foi carregado, retorna imediatamente
      if (loadedScripts.has(section)) {
        console.log(`✅ Módulo ${section} já está em memória. Reutilizando...`);
        return Promise.resolve();
      }

      // 3. Criar promise para este carregamento
      const promise = new Promise((resolve, reject) => {
        try {
          // 4. Limpar qualquer script anterior do mesmo módulo
          const oldScripts = document.querySelectorAll(`script[data-module="${section}"]`);
          oldScripts.forEach(s => {
            try {
              s.remove();
              console.log(`🗑️ Removido script antigo: ${section}`);
            } catch (e) {
              console.warn(`⚠️ Erro ao remover script: ${e.message}`);
            }
          });

          // 5. Pequeno delay para garantir que o DOM foi atualizado
          setTimeout(() => {
            const script = document.createElement("script");
            
            // SEM ?v=timestamp (mais abaixo usamos versão inteligente)
            script.src = `../../functions/modulos/${section}.js`;
            script.dataset.module = section;
            script.defer = false; // Executar imediatamente
            script.type = "text/javascript";

            script.onload = () => {
              loadedScripts.add(section);
              loadingModule = null;
              scriptPromises.delete(section);
              console.log(`✅ Script ${section}.js carregado e pronto.`);
              resolve();
            };

            script.onerror = (error) => {
              loadingModule = null;
              scriptPromises.delete(section);
              console.error(`❌ Erro ao carregar ${section}.js:`, error);
              reject(new Error(`Falha ao carregar módulo: ${section}`));
            };

            // 6. Adicionar ao DOM
            document.body.appendChild(script);
            loadingModule = section;
          }, 50);

        } catch (e) {
          loadingModule = null;
          scriptPromises.delete(section);
          reject(e);
        }
      });

      // 7. Armazenar promise para evitar carregamentos simultâneos
      scriptPromises.set(section, promise);
      return promise;
    },

    /**
     * Limpa os dados de um módulo (chamado no cleanup)
     * @param {string} section - Nome do módulo
     */
    cleanup(section) {
      // Não remover do loadedScripts (reutiliza em memória)
      // Apenas notify que saiu da tela
      console.log(`🧹 Módulo ${section} saiu do palco (mantido em cache)`);
    },

    /**
     * Limpa TUDO quando fazer logout (opcional)
     */
    clearAll() {
      loadedScripts.clear();
      scriptPromises.clear();
      loadingModule = null;
      console.log(`🧹 Todos os módulos foram limpos do cache`);
    },

    /**
     * Retorna estado atual
     */
    getStats() {
      return {
        loadingModule,
        loadedScripts: Array.from(loadedScripts),
        pendingPromises: Array.from(scriptPromises.keys())
      };
    }
  };
})();

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

function checkAuth() {
  return window.isAuthenticated && window.isAuthenticated();
}

function hasModulePermission(module) {
  const permissionsMap = {
    atendimento: "atendimento.view",
    conteudo: "conteudo.view",
    copyright: "copyright.view",
    financeiro: "financeiro.view",
    marketing: "marketing.view",
    tecnico: "tecnico.view",
    gerencia: "gerencia.view",
    relatorios: "relatorios.view",
    admin: "system.super_admin"
  };

  if (module === 'main') return true;
  return window.hasPermission && window.hasPermission(permissionsMap[module]);
}

/* =========================
   FILTRAR SIDEBAR
========================= */
function filterSidebarByPermissions() {
  const menuItems = document.querySelectorAll('.sidebar li[data-permission]');
  menuItems.forEach(item => {
    const requiredPermission = item.dataset.permission;
    if (window.hasPermission && window.hasPermission(requiredPermission)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
  console.log("🎯 Sidebar filtrada via Firebase Permissions");
}

/* =========================
   SPA – CARREGAMENTO DE CONTEÚDO (REFATORADO)
========================= */
const content = document.getElementById("content");
const sidebar = document.getElementById("sidebar");
const noticiasHTML = document.getElementById("news-section")?.outerHTML || "";

async function loadContent(section) {
  // TRAVA 1: Se for o mesmo módulo, não faz nada
  if (AppState.navigation.currentModule === section && content.innerHTML !== "") {
    console.log(`ℹ️ Módulo ${section} já está ativo. Ignorando click duplicado.`);
    return;
  }

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

    // 3. Carregar JS com segurança contra duplicatas
    await ModuleLoader.loadScript(section);

    // 4. Inicializar Módulo via Lifecycle
    if (window.ModuleLifecycle) {
      window.ModuleLifecycle.init(section, () => {
        const initFnName = `init${section.charAt(0).toUpperCase() + section.slice(1)}Module`;
        if (window[initFnName]) {
          console.log(`🚀 Executando: ${initFnName}()`);
          window[initFnName]();
        } else {
          console.warn(`⚠️ Função ${initFnName} não encontrada`);
        }
      });
    }
    
  } catch (e) {
    console.error("Erro SPA:", e);
    content.innerHTML = `
      <div class="card" style="text-align:center;padding:40px">
        <h3>❌ Erro ao Carregar Módulo</h3>
        <p>${e.message}</p>
        <button class="btn btn-secondary" id="btnVoltarErro">Voltar para o Início</button>
      </div>
    `;
    document.getElementById("btnVoltarErro")?.addEventListener("click", voltarMain);
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

function voltarMain() {
  // Cleanup do módulo anterior
  if (window.ModuleLifecycle && AppState.navigation.currentModule !== 'main') {
    window.ModuleLifecycle.cleanup(AppState.navigation.currentModule);
  }

  setModule("main");
  content.innerHTML = noticiasHTML;
  sidebar.classList.remove("active");
  toggleSidebar(false);
  content.scrollTo(0, 0);
}

/* =========================
   CONTROLE VISUAL SIDEBAR
========================= */
function initSidebarMenu() {
  // Remover listeners antigos para evitar execução múltipla
  document.querySelectorAll(".sidebar a").forEach(link => {
    const newLink = link.cloneNode(true);
    link.parentNode.replaceChild(newLink, link);
    
    newLink.addEventListener("click", e => {
      e.preventDefault();
      const module = newLink.dataset.module;
      const action = newLink.dataset.action;
      if (action === "voltarMain") voltarMain();
      if (module) loadContent(module);
    });
  });
}

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

function initLogoutButton() {
    const btnSair = document.getElementById("btnSair");
    if (btnSair) {
        btnSair.onclick = () => {
            // Limpar cache de módulos ao deslogar
            ModuleLoader.clearAll();
            if (window.logout) window.logout();
        };
    }
}

/* =========================
   INICIALIZAÇÃO ÚNICA DO APP
========================= */
window.addEventListener("DOMContentLoaded", () => {
    // 1. Verificação básica
    if (!checkAuth()) {
        window.location.href = "login.html";
        return;
    }

    // 2. Observer do Firebase (Única instância para evitar carga dupla)
    if (window.FirebaseApp) {
        window.FirebaseApp.auth.onAuthStateChanged((user) => {
            if (user) {
                // Se já estivermos carregando, ignora chamadas redundantes
                if (AppState.ui.loading) return;

                console.log("✅ Usuário confirmado. Inicializando Interface...");
                
                filterSidebarByPermissions();
                initSidebarMenu();
                initSidebarHover(); 
                initLogoutButton();
                
                // Se o módulo atual ainda for o padrão, carrega a dashboard inicial
                if (AppState.navigation.currentModule === "main") {
                    voltarMain();
                }
            } else {
                ModuleLoader.clearAll();
                sessionStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
        });
    } else {
        console.error("❌ Erro: FirebaseApp não detectado.");
    }
});

console.log("✅ Main.js carregado com ModuleLoader seguro");
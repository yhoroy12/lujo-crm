
// ==================== MAIN.JS - SISTEMA INTEGRADO COM AUTENTICAÇÃO ====================

// ===== VERIFICAR AUTENTICAÇÃO AO CARREGAR =====
window.addEventListener('DOMContentLoaded', () => {
  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  // Carregar informações do usuário no header
  loadUserInfo();
});

// ===== FUNÇÕES DE AUTENTICAÇÃO (importadas do auth.js) =====
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

// ===== CARREGAR INFORMAÇÕES DO USUÁRIO NO HEADER =====
function loadUserInfo() {
  const user = getCurrentUser();
  if (!user) return;

  // Atualizar o título do header com nome e perfil do usuário
  const headerTitle = document.querySelector('header h1');
  if (headerTitle) {
    headerTitle.innerHTML = `
      Lujo Network 
      <small style="font-size: 14px; font-weight: 400; margin-left: 10px; color: rgba(255,255,255,0.8);">
        | ${user.name} - ${getRoleLabel(user.role)}
      </small>
    `;
  }

  // Modificar botão "Sair" para fazer logout
  const btnSair = document.querySelector('header .btn-primary');
  if (btnSair && btnSair.textContent.includes('Sair')) {
    btnSair.onclick = handleLogout;
  }
}

// ===== LOGOUT =====
function handleLogout() {
  if (confirm('Deseja realmente sair do sistema?')) {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  }
}

// ===== SIDEBAR E MENU =====
const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const noticiasHTML = document.getElementById("news-section").outerHTML;

// Configuração crítica – impedir cliques na sidebar recolhida
function atualizarPointerEvents() {
  if (sidebar.classList.contains("active")) {
    sidebar.style.pointerEvents = "auto";
  } else {
    sidebar.style.pointerEvents = "none";
  }
}

// Observa mudanças na classe da sidebar
const observer = new MutationObserver(atualizarPointerEvents);
observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });

// Rodar no início
atualizarPointerEvents();

// ===== AUTO-HIDE MENU =====
let hideTimeout;

sidebar.addEventListener("mouseleave", () => {
  hideTimeout = setTimeout(() => {
    sidebar.classList.remove("active");
    atualizarPointerEvents();
  }, 500);
});

sidebar.addEventListener("mouseenter", () => {
  clearTimeout(hideTimeout);
});

// ===== VOLTAR PARA O MAIN =====
function voltarMain() {
  content.innerHTML = noticiasHTML;
  sidebar.classList.remove("active");
  atualizarPointerEvents();
  content.scrollTo(0, 0);
}

// ===== CARREGAR MÓDULOS DINÂMICOS COM VERIFICAÇÃO DE PERMISSÃO =====
async function loadContent(section) {
  // ⭐ VERIFICAR PERMISSÃO ANTES DE CARREGAR ⭐
  if (!hasPermission(section)) {
    content.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <i class="fi fi-rr-lock" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
        <h3 style="color: #f44336; margin-bottom: 10px;">⛔ Acesso Negado</h3>
        <p style="color: #666;">Você não tem permissão para acessar o módulo <strong>${section}</strong>.</p>
        <p style="margin-top: 15px; font-size: 13px; color: #999;">
          Entre em contato com o administrador para solicitar acesso.
        </p>
        <button class="btn btn-primary" onclick="voltarMain()" style="margin-top: 20px; max-width: 200px;">
          Voltar ao Início
        </button>
      </div>
    `;
    sidebar.classList.remove("active");
    atualizarPointerEvents();
    content.scrollTo(0, 0);
    return;
  }

  // Continuar com carregamento normal se tiver permissão
  sidebar.classList.remove("active");
  atualizarPointerEvents();

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
      if (s.src) {
        await injectExternalScript(s.src, section);
      } else {
        injectInlineScript(s.textContent, section);
      }
    }
  } catch (e) {
    content.innerHTML = `
      <div class="card">
        <h3>❌ Erro</h3>
        <p>Não foi possível carregar o módulo <strong>${section}</strong>.</p>
        <p style="margin-top: 10px; color: #999; font-size: 13px;">
          Erro: ${e.message}
        </p>
      </div>
    `;
  }

  content.scrollTo(0, 0);
}

/* ========== GERENCIAMENTO DE SCRIPTS DINÂMICOS ========== */

function cleanPreviousDynamicScripts() {
  document
    .querySelectorAll('script[data-dyn-script="true"]')
    .forEach((s) => s.remove());
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

// ===== ABRIR SIDEBAR AO PASSAR O MOUSE PELO BOTÃO =====
const menuTrigger = document.getElementById("menuTrigger");

menuTrigger.addEventListener("mouseenter", () => {
  sidebar.classList.add("active");
  atualizarPointerEvents();
});

// ===== MAPEAMENTO DE MÓDULOS PARA PERMISSÕES =====
// Este objeto mapeia os nomes dos links do menu para as permissões
const modulePermissions = {
  'atendimento': 'atendimento',
  'conteudo': 'conteudo',
  'financeiro': 'financeiro',
  'marketing': 'marketing',
  'tecnico': 'tecnico',
  'gerencia': 'gerencia',
  'relatorios': 'relatorios'
};

// ===== APLICAR ESTILOS VISUAIS AOS MÓDULOS BLOQUEADOS =====
window.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user) return;

  // Adicionar indicador visual nos links do menu para módulos sem permissão
  const menuLinks = document.querySelectorAll('.sidebar ul li a');
  
  menuLinks.forEach(link => {
    const onclick = link.getAttribute('onclick');
    if (onclick && onclick.includes('loadContent')) {
      // Extrair nome do módulo
      const match = onclick.match(/loadContent\('(.+?)'\)/);
      if (match) {
        const moduleName = match[1];
        
        // Verificar permissão
        if (!hasPermission(moduleName)) {
          // Adicionar estilo de bloqueado
          link.style.opacity = '0.4';
          link.style.cursor = 'not-allowed';
          
          // Modificar tooltip
          const currentTitle = link.getAttribute('title');
          link.setAttribute('title', `${currentTitle} 🔒 (Sem permissão)`);
        }
      }
    }
  });
});
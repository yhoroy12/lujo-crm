const sidebar = document.getElementById("sidebar");
const content = document.getElementById("content");
const noticiasHTML = document.getElementById("news-section").outerHTML;

// =====================================================
// CONFIGURAÇÃO CRÍTICA — impedir cliques na sidebar recolhida
// =====================================================
function atualizarPointerEvents() {
  if (sidebar.classList.contains("active")) {
    sidebar.style.pointerEvents = "auto"; // sidebar aberta → pode clicar
  } else {
    sidebar.style.pointerEvents = "none"; // sidebar fechada → não deixa clicar
  }
}

// Observa mudanças na classe da sidebar
const observer = new MutationObserver(atualizarPointerEvents);
observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });

// Rodar no início
atualizarPointerEvents();

// =====================================================
// ABRIR/MINIMIZAR MENU — (mantido, mesmo sem usar)
// =====================================================
function toggleMenu() {
  sidebar.classList.toggle("active");
  atualizarPointerEvents();
}

// =====================================================
// AUTO-HIDE MENU
// =====================================================
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

// =====================================================
// VOLTAR PARA O MAIN
// =====================================================
function voltarMain() {
  content.innerHTML = noticiasHTML;
  sidebar.classList.remove("active");
  atualizarPointerEvents();
  content.scrollTo(0, 0);
}

// =====================================================
// CARREGAR MÓDULOS DINÂMICOS
// =====================================================
async function loadContent(section) {
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
    content.innerHTML =
      `<div class="card"><h3>Erro</h3><p>Não foi possível carregar ${section}.</p></div>`;
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

// =====================================================
// ABRIR SIDEBAR AO PASSAR O MOUSE PELO BOTÃO
// =====================================================
const menuTrigger = document.getElementById("menuTrigger");

menuTrigger.addEventListener("mouseenter", () => {
  sidebar.classList.add("active");
  atualizarPointerEvents();
});

// =====================================================

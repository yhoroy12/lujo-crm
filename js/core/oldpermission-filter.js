// ==================== PERMISSION-FILTER.JS ====================
// Sistema de filtragem automática do menu lateral baseado em permissões

/**
 * Filtra itens do menu lateral baseado nas permissões do usuário
 * Deve ser chamado após o login e após o carregamento do permissions.js
 */
window.filterMenuByPermissions = function() {
  console.log('🔍 Iniciando filtragem do menu...');

  // Verificar se usuário está logado
  if (!window.AuthSystem?.isAuthenticated()) {
    console.warn('⚠️ Usuário não autenticado. Redirecionando...');
    window.location.href = 'login.html';
    return;
  }

  const user = window.AuthSystem.getCurrentUser();
  console.log('👤 Usuário atual:', {
    name: user.name,
    role: user.role,
    permissions: user.permissions
  });

  // Buscar todos os itens do menu com permissões
  const menuItems = document.querySelectorAll('.sidebar li[data-permission]');
  
  if (menuItems.length === 0) {
    console.warn('⚠️ Nenhum item de menu encontrado com data-permission');
    return;
  }

  let visibleCount = 0;
  let hiddenCount = 0;

  menuItems.forEach(item => {
    const requiredPermission = item.dataset.permission;
    const moduleName = item.dataset.module || 'desconhecido';

    // Verificar se tem permissão
    const hasAccess = window.AuthSystem.hasPermission(requiredPermission);

    if (hasAccess) {
      item.style.display = '';
      visibleCount++;
      console.log(`✅ ${moduleName}: VISÍVEL (${requiredPermission})`);
    } else {
      item.style.display = 'none';
      hiddenCount++;
      console.log(`❌ ${moduleName}: OCULTO (${requiredPermission})`);
    }
  });

  console.log(`📊 Resultado da filtragem:
    ✅ Visíveis: ${visibleCount}
    ❌ Ocultos: ${hiddenCount}
    📌 Total: ${menuItems.length}`);

  // Adicionar badge visual no header para ADMIN
  addAdminBadge(user);
};

/**
 * Adiciona badge visual para usuários ADMIN
 */
function addAdminBadge(user) {
  if (user.role !== 'ADMIN') return;

  const header = document.querySelector('header .header-center');
  if (!header) return;

  // Verificar se já existe
  if (header.querySelector('.admin-badge')) return;

  const badge = document.createElement('span');
  badge.className = 'admin-badge';
  badge.textContent = '👑 ADMIN';
  badge.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-left: 10px;
    box-shadow: 0 2px 8px rgba(118, 75, 162, 0.3);
  `;

  header.appendChild(badge);
}

/**
 * Monitora mudanças no sessionStorage e refiltra se necessário
 */
function watchSessionChanges() {
  let lastUser = sessionStorage.getItem('currentUser');

  setInterval(() => {
    const currentUser = sessionStorage.getItem('currentUser');
    
    if (currentUser !== lastUser) {
      console.log('🔄 Mudança detectada no sessionStorage. Reaplicando filtros...');
      lastUser = currentUser;
      
      if (currentUser) {
        window.filterMenuByPermissions();
      } else {
        window.location.href = 'login.html';
      }
    }
  }, 1000);
}

/**
 * Inicialização automática quando DOM estiver pronto
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // 1. Criamos a variável para o timeout para podermos cancelá-lo
  const segurancaTimeout = setTimeout(() => {
    clearInterval(checkAuth); // Para a verificação se der timeout
    if (!window.location.pathname.includes('login.html')) {
      console.error('⏱️ Timeout: Sistemas de permissão não carregados em 5s');
    }
  }, 5000);

  // Aguardar AuthSystem estar disponível
  const checkAuth = setInterval(() => {
    if (window.AuthSystem && window.PermissionsSystem) {
      // 2. SUCESSO! Limpamos tanto o Intervalo quanto o Timeout de erro
      clearInterval(checkAuth);
      clearTimeout(segurancaTimeout); // <--- Adicione esta linha (CRÍTICO)
      
      console.log('✅ Sistemas de permissão detectados. Aplicando filtros...');

      // Só executar se não estiver na página de login
      if (!window.location.pathname.includes('login.html')) {
        window.filterMenuByPermissions();
        watchSessionChanges();
      }
    }
  }, 100);
}

console.log('✅ Permission Filter carregado');
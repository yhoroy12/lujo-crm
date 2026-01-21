/**
 * =====================================================
 * MODULE LIFECYCLE MANAGER
 * Gerencia ciclo de vida dos módulos SPA
 * Previne vazamento de memória e duplicação de eventos
 * =====================================================
 */

window.ModuleLifecycle = (function () {

  const state = {
    activeModule: null,
    listeners: new Map(),
    initialized: new Set()
  };

  /**
   * Adiciona event listener com tracking automático
   * @param {HTMLElement} element - Elemento DOM
   * @param {string} event - Tipo de evento ('click', 'change', etc)
   * @param {Function} handler - Função callback
   * @param {string} moduleId - ID do módulo (ex: 'atendimento')
   */
  function addListener(element, event, handler, moduleId) {
    if (!element || !event || !handler || !moduleId) {
      console.warn('ModuleLifecycle: parâmetros inválidos', { element, event, moduleId });
      return;
    }

    const key = `${moduleId}_${event}_${Date.now()}_${Math.random()}`;
    element.addEventListener(event, handler);

    state.listeners.set(key, {
      element,
      event,
      handler,
      moduleId,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Listener registrado: ${moduleId} (${event}) - Total: ${state.listeners.size}`);
  }

  /**
   * Remove todos os listeners de um módulo específico
   * @param {string} moduleId - ID do módulo para limpar
   */
  function cleanup(moduleId) {
    let removed = 0;

    for (const [key, data] of state.listeners.entries()) {
      if (data.moduleId === moduleId) {
        try {
          data.element?.removeEventListener(data.event, data.handler);
          state.listeners.delete(key);
          removed++;
        } catch (e) {
          console.warn(`Erro ao remover listener: ${key}`, e);
        }
      }
    }

    // --- AS LINHAS QUE FALTAVAM ---
    state.initialized.delete(moduleId); // PERMITE RECARREGAR
    if (state.activeModule === moduleId) {
      state.activeModule = null;
    }
    // ------------------------------

    console.log(`🧹 Cleanup ${moduleId}: ${removed} listeners removidos e estado resetado.`);
    return removed;
  }

  /**
   * Inicializa um módulo com cleanup automático do anterior
   * @param {string} moduleId - ID do novo módulo
   * @param {Function} initFunction - Função de inicialização do módulo
   */
  /**
     * Inicializa um módulo com cleanup automático do anterior
     * @param {string} moduleId - ID do novo módulo
     * @param {Function} initFunction - Função de inicialização do módulo
     */
  function init(moduleId, initFunction) {
    // TRAVA 1: Se o módulo já é o ativo, ignora completamente a nova chamada
    if (state.activeModule === moduleId) {
      console.warn(`⚠️ Módulo ${moduleId} já está ativo. Abortando duplicata.`);
      return;
    }

    console.log(`🚀 Preparando inicialização do módulo: ${moduleId}`);

    // Limpar listeners do módulo anterior antes de entrar no novo
    if (state.activeModule && state.activeModule !== moduleId) {
      cleanup(state.activeModule);
    }

    // TRAVA 2: Marca como ativo ANTES de executar a função para evitar condições de corrida
    state.activeModule = moduleId;
    state.initialized.add(moduleId);

    // Executar inicialização com tratamento de erro
    try {
      if (typeof initFunction === 'function') {
        initFunction();
        console.log(`✅ Módulo ${moduleId} carregado no palco com sucesso`);
      } else {
        console.error(`❌ Erro: initFunction para ${moduleId} não é uma função válida`);
      }
    } catch (e) {
      console.error(`❌ Erro crítico ao processar script de ${moduleId}:`, e);
      // Se deu erro, limpamos o estado para permitir tentar carregar de novo
      state.activeModule = null;
      state.initialized.delete(moduleId);
    }
  }

  /**
   * Retorna estatísticas de uso
   */
  function getStats() {
    const byModule = {};

    for (const data of state.listeners.values()) {
      byModule[data.moduleId] = (byModule[data.moduleId] || 0) + 1;
    }

    return {
      activeModule: state.activeModule,
      totalListeners: state.listeners.size,
      byModule,
      initialized: Array.from(state.initialized)
    };
  }

  /**
   * Limpa TODOS os listeners (usar apenas em logout/refresh completo)
   */
  function cleanupAll() {
    const modules = new Set(
      Array.from(state.listeners.values()).map(l => l.moduleId)
    );

    modules.forEach(cleanup);
    state.initialized.clear();

    console.log('🧹 Cleanup completo executado');
  }

  // API Pública
  return {
    addListener,
    cleanup,
    init,
    getStats,
    cleanupAll
  };

})();

console.log('✅ ModuleLifecycle carregado');
/**
 * =====================================================
 * STATE MANAGER
 * Gerenciador de estado por módulo
 * =====================================================
 */

window.StateManager = (function() {

  const states = new Map();

  /**
   * Inicializa estado de um módulo
   * @param {string} moduleId - ID do módulo
   * @param {Object} initialState - Estado inicial
   */
  function init(moduleId, initialState = {}) {
    if (states.has(moduleId)) {
      console.warn(`StateManager: módulo ${moduleId} já tem estado inicializado`);
      return;
    }

    states.set(moduleId, {
      data: { ...initialState },
      listeners: new Set()
    });

    console.log(`✅ Estado inicializado: ${moduleId}`);
  }

  /**
   * Retorna estado de um módulo
   * @param {string} moduleId
   * @returns {Object}
   */
  function get(moduleId) {
    const state = states.get(moduleId);
    return state ? { ...state.data } : null;
  }

  /**
   * Atualiza estado de um módulo
   * @param {string} moduleId
   * @param {Object} updates - Atualizações parciais
   * @param {boolean} merge - Fazer merge ou substituir
   */
  function set(moduleId, updates, merge = true) {
    const state = states.get(moduleId);
    
    if (!state) {
      console.error(`StateManager: módulo ${moduleId} não inicializado`);
      return;
    }

    const oldData = { ...state.data };
    
    if (merge) {
      state.data = { ...state.data, ...updates };
    } else {
      state.data = { ...updates };
    }

    // Notificar listeners
    state.listeners.forEach(listener => {
      try {
        listener(state.data, oldData);
      } catch (e) {
        console.error('Erro em listener de estado:', e);
      }
    });

    console.log(`📝 Estado atualizado: ${moduleId}`, updates);
  }

  /**
   * Registra listener para mudanças de estado
   * @param {string} moduleId
   * @param {Function} callback - (newState, oldState) => void
   */
  function subscribe(moduleId, callback) {
    const state = states.get(moduleId);
    
    if (!state) {
      console.error(`StateManager: módulo ${moduleId} não inicializado`);
      return;
    }

    state.listeners.add(callback);

    // Retorna função para cancelar inscrição
    return () => {
      state.listeners.delete(callback);
    };
  }

  /**
   * Reseta estado de um módulo
   * @param {string} moduleId
   */
  function reset(moduleId) {
    states.delete(moduleId);
    console.log(`🔄 Estado resetado: ${moduleId}`);
  }

  /**
   * Retorna estatísticas
   */
  function getStats() {
    const stats = {};
    
    for (const [moduleId, state] of states.entries()) {
      stats[moduleId] = {
        keys: Object.keys(state.data),
        listeners: state.listeners.size
      };
    }

    return stats;
  }

  return {
    init,
    get,
    set,
    subscribe,
    reset,
    getStats
  };

})();

console.log('✅ StateManager carregado');
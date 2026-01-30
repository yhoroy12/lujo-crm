/**
 * STATE MACHINE MANAGER - Integração com Ticket State Machine
 * Gerencia transições de estado validadas e auditadas
 * 
 * Soluciona:
 * - PROBLEMA 5: Fluxo de estado incompatível
 * - PROBLEMA 2: Sincronização com State Machine
 */

class StateMachineManager {
  constructor() {
    this.db = window.FirebaseApp?.db;
    this.fStore = window.FirebaseApp?.fStore;
    this.currentUser = window.FirebaseApp?.auth?.currentUser;
  }

  /**
   * Mapear estados do cliente para State Machine
   * Cliente: "fila", "em_atendimento", "concluido"
   * State Machine: NOVO, IDENTIDADE_VALIDADA, EM_ATENDIMENTO, CONCLUIDO, etc
   */
  mapearEstadoCliente(statusCliente) {
    const mapa = {
      "novo": "NOVO",
      "fila": "NOVO", // Cliente em fila também é NOVO
      "identidade_validada": "IDENTIDADE_VALIDADA",
      "em_atendimento": "EM_ATENDIMENTO",
      "concluido": "CONCLUIDO",
      "encaminhado": "ENCAMINHADO"
    };
    return mapa[statusCliente] || "NOVO";
  }

  /**
   * Validar transição de estado ANTES de fazer a mudança
   * Usa a função do ticketstatemachine.js
   */
  validarTransicao(estadoAtual, estadoNovo, userRole, justificativa = null) {
    if (!window.TicketStateMachine) {
      console.warn("⚠️ TicketStateMachine não carregado");
      return { valido: false, erro: "State Machine não disponível" };
    }

    // Validar se a transição é permitida
    const validacao = window.TicketStateMachine.validateTransition(
      estadoAtual,
      estadoNovo,
      userRole,
      justificativa
    );

    if (!validacao.valid) {
      console.error("❌ Transição não permitida:", validacao.error);
      return { valido: false, erro: validacao.error };
    }

    console.log(`✓ Transição validada: ${estadoAtual} → ${estadoNovo}`);
    return { valido: true };
  }

  /**
   * Obter transições disponíveis para o usuário atual
   * Mostra apenas botões que são válidos para o estado atual
   */
  obterTransicoesDisponiveis(estadoAtual, userRole) {
    if (!window.TicketStateMachine) {
      return [];
    }

    const transicoes = window.TicketStateMachine.getAvailableTransitions(
      estadoAtual,
      userRole
    );

    console.log(`Transições disponíveis de ${estadoAtual}:`, transicoes);
    return transicoes;
  }

  /**
   * Criar log de transição (auditoria)
   * Salva em subcoleção "state_logs" para rastreabilidade
   */
  async criarLogTransicao(atendimentoId, estadoAnterior, estadoNovo, justificativa = null) {
    if (!this.currentUser) {
      console.warn("⚠️ Usuário não autenticado");
      return;
    }

    try {
      const logData = window.TicketStateMachine.createStateLog(
        atendimentoId,
        estadoAnterior,
        estadoNovo,
        {
          username: this.currentUser.email,
          name: this.currentUser.displayName || "Usuário",
          uid: this.currentUser.uid,
          role: this.obterRoleUsuario() // Deve ser implementado em seu sistema
        },
        justificativa
      );

      // Salvar em subcoleção
      await this.fStore.addDoc(
        this.fStore.collection(
          this.db,
          "atend_chat_fila",
          atendimentoId,
          "state_logs"
        ),
        logData
      );

      console.log("✓ Log de transição criado");
      return logData;
    } catch (error) {
      console.error("❌ Erro ao criar log:", error);
    }
  }

  /**
   * Executar transição de estado (com validação e auditoria)
   */
  async executarTransicao(atendimentoId, estadoAnterior, estadoNovo, justificativa = null) {
    // 1. Validar permissão
    const userRole = this.obterRoleUsuario();
    const validacao = this.validarTransicao(
      estadoAnterior,
      estadoNovo,
      userRole,
      justificativa
    );

    if (!validacao.valido) {
      throw new Error(validacao.erro);
    }

    // 2. Criar log (auditoria)
    await this.criarLogTransicao(
      atendimentoId,
      estadoAnterior,
      estadoNovo,
      justificativa
    );

    // 3. Atualizar status no Firestore
    const agora = this.fStore.serverTimestamp();
    
    await this.fStore.updateDoc(
      this.fStore.doc(this.db, "atend_chat_fila", atendimentoId),
      {
        status: estadoNovo,
        ultimaTransicaoEm: agora,
        timeline: this.fStore.arrayUnion({
          evento: `status_${estadoNovo}`,
          timestamp: agora,
          usuario: this.currentUser?.uid,
          estadoAnterior: estadoAnterior,
          estadoNovo: estadoNovo,
          descricao: justificativa || `Transição para ${estadoNovo}`
        })
      }
    );

    console.log(`✓ Transição executada: ${estadoAnterior} → ${estadoNovo}`);
  }

  /**
   * Verificar se estado é final (não pode mais transicionar)
   */
  ehEstadoFinal(estado) {
    if (!window.TicketStateMachine) {
      return false;
    }
    return window.TicketStateMachine.isFinalState(estado);
  }

  /**
   * Obter role/permissão do usuário atual
   * Deve ser implementado de acordo com seu sistema de Auth
   */
  obterRoleUsuario() {
    // TODO: Implementar de acordo com seu sistema
    // Exemplo: return localStorage.getItem('userRole') || "ATENDENTE"
    
    // Por enquanto, retorna um padrão
    return localStorage.getItem('userRole') || "ATENDENTE";
  }

  /**
   * Validar se pode fazer ação específica
   * Retorna true/false
   */
  podeExecutarAcao(estadoAtual, acao, userRole) {
    const transicoes = this.obterTransicoesDisponiveis(estadoAtual, userRole);
    
    // Mapear ações para estados
    const acaoParaEstado = {
      "iniciar_atendimento": "EM_ATENDIMENTO",
      "concluir": "CONCLUIDO",
      "encaminhar": "ENCAMINHADO",
      "aguardar_cliente": "AGUARDANDO_CLIENTE"
    };

    const estadoDestino = acaoParaEstado[acao];
    return estadoDestino && transicoes.includes(estadoDestino);
  }
}

// Exportar como global
window.StateMachineManager = new StateMachineManager();

console.log("✅ StateMachineManager carregado");
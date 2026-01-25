// ==================== TICKETSTATEMACHINE.JS - MÁQUINA DE ESTADOS DE TICKET ====================

/**
 * LUJO NETWORK CRM - TICKET STATE MACHINE
 * Controle centralizado e rígido de transições de estado de tickets
 * Arquitetura: Finite State Machine (FSM)
 */

const TICKET_STATES = {
  NOVO: "NOVO",
  IDENTIDADE_VALIDADA: "IDENTIDADE_VALIDADA",
  EM_ATENDIMENTO: "EM_ATENDIMENTO",
  ENCAMINHADO: "ENCAMINHADO",
  AGUARDANDO_SETOR: "AGUARDANDO_SETOR",
  AGUARDANDO_CLIENTE: "AGUARDANDO_CLIENTE",
  CONCLUIDO: "CONCLUIDO",
  ACAO_ADMINISTRATIVA_APLICADA: "ACAO_ADMINISTRATIVA_APLICADA"
};

const FINAL_STATES = [
  TICKET_STATES.ACAO_ADMINISTRATIVA_APLICADA
];

const TRANSITION_MATRIX = {
  [TICKET_STATES.NOVO]: {
    [TICKET_STATES.IDENTIDADE_VALIDADA]: {
      roles: ["ATENDENTE", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    }
  },
  [TICKET_STATES.IDENTIDADE_VALIDADA]: {
    [TICKET_STATES.EM_ATENDIMENTO]: {
      roles: ["ATENDENTE", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    }
  },
  [TICKET_STATES.EM_ATENDIMENTO]: {
    [TICKET_STATES.CONCLUIDO]: {
      roles: ["ATENDENTE", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    },
    [TICKET_STATES.ENCAMINHADO]: {
      roles: ["ATENDENTE", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    }
  },
  [TICKET_STATES.ENCAMINHADO]: {
    [TICKET_STATES.AGUARDANDO_SETOR]: {
      roles: ["SYSTEM", "ATENDENTE", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    }
  },
  [TICKET_STATES.AGUARDANDO_SETOR]: {
    [TICKET_STATES.AGUARDANDO_CLIENTE]: {
      roles: ["COPYRIGHT", "CONTEUDO", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    },
    [TICKET_STATES.CONCLUIDO]: {
      roles: ["COPYRIGHT", "CONTEUDO", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    }
  },
  [TICKET_STATES.AGUARDANDO_CLIENTE]: {
    [TICKET_STATES.CONCLUIDO]: {
      roles: ["ATENDENTE", "SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: false
    },
    [TICKET_STATES.ACAO_ADMINISTRATIVA_APLICADA]: {
      roles: ["COPYRIGHT", "GERENTE", "ADMIN"],
      requiresJustification: true
    }
  },
  [TICKET_STATES.CONCLUIDO]: {
    [TICKET_STATES.EM_ATENDIMENTO]: {
      roles: ["SUPERVISOR", "GERENTE", "ADMIN"],
      requiresJustification: true
    }
  }
};

const BLOCKED_BEFORE_VALIDATION = [
  TICKET_STATES.EM_ATENDIMENTO,
  TICKET_STATES.ENCAMINHADO,
  TICKET_STATES.AGUARDANDO_SETOR,
  TICKET_STATES.AGUARDANDO_CLIENTE,
  TICKET_STATES.CONCLUIDO,
  TICKET_STATES.ACAO_ADMINISTRATIVA_APLICADA
];

function isValidState(state) {
  return Object.values(TICKET_STATES).includes(state);
}

function isFinalState(state) {
  return FINAL_STATES.includes(state);
}

function canTransition(currentState, nextState, userRole) {
  if (!isValidState(currentState) || !isValidState(nextState)) {
    return { allowed: false, reason: "Estado inválido" };
  }

  if (isFinalState(currentState)) {
    return { allowed: false, reason: "Estado final não pode ser alterado" };
  }

  if (currentState !== TICKET_STATES.IDENTIDADE_VALIDADA && 
      currentState !== TICKET_STATES.NOVO &&
      BLOCKED_BEFORE_VALIDATION.includes(nextState)) {
    if (currentState === TICKET_STATES.NOVO && nextState !== TICKET_STATES.IDENTIDADE_VALIDADA) {
      return { allowed: false, reason: "Identidade deve ser validada primeiro" };
    }
  }

  const possibleTransitions = TRANSITION_MATRIX[currentState];
  if (!possibleTransitions || !possibleTransitions[nextState]) {
    return { allowed: false, reason: "Transição não permitida" };
  }

  const transition = possibleTransitions[nextState];
  if (!transition.roles.includes(userRole) && !transition.roles.includes("SYSTEM")) {
    return { allowed: false, reason: "Usuário não autorizado para esta transição" };
  }

  return { allowed: true, requiresJustification: transition.requiresJustification };
}

function requiresJustification(currentState, nextState) {
  const possibleTransitions = TRANSITION_MATRIX[currentState];
  if (!possibleTransitions || !possibleTransitions[nextState]) {
    return false;
  }
  return possibleTransitions[nextState].requiresJustification;
}

function getAvailableTransitions(currentState, userRole) {
  if (isFinalState(currentState)) {
    return [];
  }

  const possibleTransitions = TRANSITION_MATRIX[currentState];
  if (!possibleTransitions) {
    return [];
  }

  return Object.keys(possibleTransitions).filter(nextState => {
    const transition = possibleTransitions[nextState];
    return transition.roles.includes(userRole) || transition.roles.includes("SYSTEM");
  });
}

function validateTransition(currentState, nextState, userRole, justification = null) {
  const check = canTransition(currentState, nextState, userRole);
  
  if (!check.allowed) {
    return { valid: false, error: check.reason };
  }

  if (check.requiresJustification && (!justification || justification.trim().length < 10)) {
    return { valid: false, error: "Justificativa obrigatória (mínimo 10 caracteres)" };
  }

  return { valid: true };
}

function createStateLog(ticketId, previousState, newState, user, justification = null) {
  return {
    ticketId,
    previousState,
    newState,
    user: {
      username: user.username,
      name: user.name,
      role: user.role
    },
    timestamp: new Date().toISOString(),
    justification: justification || null
  };
}

window.TicketStateMachine = {
  STATES: TICKET_STATES,
  isValidState,
  isFinalState,
  canTransition,
  requiresJustification,
  getAvailableTransitions,
  validateTransition,
  createStateLog
};

console.log("✅ Ticket State Machine carregado");
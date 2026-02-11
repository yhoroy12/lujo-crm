/**
 * SERVIÇO DE DEMANDAS EXTERNAS
 * Permite que outros módulos criem demandas para o atendimento
 * 
 * Uso:
 * await window.DemandasService.criarDemanda({
 *   titulo: 'Atualizar dados do cliente',
 *   descricao: 'Cliente solicitou atualização de email',
 *   prioridade: 'alta',
 *   tipo_solicitacao: 'atualizacao_cadastral',
 *   dados_relacionados: { cliente_id: '123', novo_email: 'email@example.com' }
 * });
 */

class DemandasExternasService {
  constructor() {
    this.db = window.FirebaseApp?.db;
    this.fStore = window.FirebaseApp?.fStore;
  }

  /**
   * Criar nova demanda externa para o atendimento
   * 
   * @param {Object} dados - Dados da demanda
   * @param {string} dados.titulo - Título da demanda (obrigatório)
   * @param {string} dados.descricao - Descrição detalhada (obrigatório)
   * @param {string} dados.prioridade - Prioridade: 'baixa', 'media', 'alta', 'urgente' (padrão: 'media')
   * @param {string} dados.tipo_solicitacao - Tipo da solicitação
   * @param {Object} dados.dados_relacionados - Dados adicionais (opcional)
   * @param {string} dados.destinatario_uid - UID específico do atendente (opcional)
   * @returns {Promise<string>} ID da demanda criada
   */
  async criarDemanda(dados) {
    try {
      // Validações
      if (!dados.titulo || !dados.descricao) {
        throw new Error('Título e descrição são obrigatórios');
      }

      // Obter usuário atual (solicitante)
      const user = window.AuthSystem?.getCurrentUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter setor do usuário
      const setor = await this.obterSetorUsuario(user.uid);

      // Preparar documento
      const demandaData = {
        // Identificação
        titulo: dados.titulo,
        descricao: dados.descricao,
        
        // Prioridade
        prioridade: dados.prioridade || 'media',
        
        // Tipo
        tipo_solicitacao: dados.tipo_solicitacao || 'geral',
        
        // Solicitante
        solicitante: {
          uid: user.uid,
          nome: user.name || 'Usuário',
          email: user.email
        },
        
        // Origem e Destino
        setor_origem: setor || user.role || 'desconhecido',
        setor_destino: 'atendimento',
        destinatario_uid: dados.destinatario_uid || null,
        
        // Status
        status: 'pendente',
        
        // Dados adicionais
        dados_relacionados: dados.dados_relacionados || null,
        
        // Timestamps
        created_at: this.fStore.serverTimestamp(),
        updated_at: this.fStore.serverTimestamp(),
        
        // Metadata
        created_by_uid: user.uid,
        atendente_responsavel: null,
        concluido_em: null,
        concluido_por: null
      };

      // Salvar no Firestore
      const docRef = await this.fStore.addDoc(
        this.fStore.collection(this.db, 'demandas_externas'),
        demandaData
      );

      console.log('✅ Demanda criada:', docRef.id);
      
      // Notificar (se tiver sistema de notificações)
      this.notificarNovaDemanda(docRef.id, demandaData);
      
      return docRef.id;

    } catch (error) {
      console.error('❌ Erro ao criar demanda:', error);
      throw error;
    }
  }

  /**
   * Atualizar status de uma demanda
   */
  async atualizarStatus(demandaId, novoStatus, observacao = null) {
    try {
      const updateData = {
        status: novoStatus,
        updated_at: this.fStore.serverTimestamp()
      };

      if (observacao) {
        updateData.observacao_status = observacao;
      }

      await this.fStore.updateDoc(
        this.fStore.doc(this.db, 'demandas_externas', demandaId),
        updateData
      );

      console.log('✅ Status da demanda atualizado:', demandaId);
      
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  }
// Regra de negócio: O atendente busca as demandas gerais (aba consulta)
async consultarAndamento(filtros = {}, ultimoDoc = null) {
  try {
    const { collection, query, where, orderBy, getDocs, limit, startAfter, doc, getDoc } = this.fStore;

    // 1. TRAVA DE STATUS/FILTRO:
    // Só prossegue se houver Ticket OU pelo menos um dos filtros principais
    const temFiltro = filtros.ticket || filtros.cliente || filtros.status || filtros.setor;

    if (!temFiltro) {
      console.warn("⚠️ Operação cancelada: Selecione ao menos um Status, Setor ou digite um E-mail/Ticket.");
      // Retorna vazio para o frontend não ficar "carregando" infinitamente
      return { dados: [], ultimoVisivel: null };
    }

    // 2. BUSCA DIRETA POR TICKET (Prioridade máxima)
    if (filtros.ticket) {
      const id = filtros.ticket.trim();
      if (id.startsWith('DEM-')) {
        const docSnap = await getDoc(doc(this.db, 'geral_demandas', id));
        return { dados: docSnap.exists() ? [this.formatarDemanda(docSnap)] : [], ultimoVisivel: null };
      }
      // Busca por Protocolo (atendimentoId)
      const qProtocolo = query(collection(this.db, 'geral_demandas'), where('atendimentoId', '==', id), limit(1));
      const snap = await getDocs(qProtocolo);
      return { dados: snap.docs.map(d => this.formatarDemanda(d)), ultimoVisivel: null };
    }

    // 3. BUSCA COM FILTROS DINÂMICOS
    let constraints = [];

    if (filtros.cliente) {
      constraints.push(where('cliente_email', '==', filtros.cliente.trim().toLowerCase()));
    }
    if (filtros.status) {
      constraints.push(where('status', '==', filtros.status.toUpperCase()));
    }
    if (filtros.setor) {
      constraints.push(where('setor_destino', '==', filtros.setor.toLowerCase()));
    }

    // Ordenação e Paginação
    constraints.push(orderBy('criado_em_chat', 'desc'));
    if (ultimoDoc) constraints.push(startAfter(ultimoDoc));
    constraints.push(limit(10));

    const q = query(collection(this.db, 'geral_demandas'), ...constraints);
    const snapshot = await getDocs(q);
    
    return {
      dados: snapshot.docs.map(d => this.formatarDemanda(d)),
      ultimoVisivel: snapshot.docs[snapshot.docs.length - 1] || null
    };

  } catch (error) {
    console.error('❌ Erro na consulta:', error);
    throw error;
  }
}
// Regra de negócio: O atendente vê as demandas que foram destinadas ao setor dele (aba recebidas).
/**
 * Escuta em tempo real as demandas PENDENTES para o setor atual
 */
escutarDemandasRecebidas(setorId, callback) {
  try {
    const { collection, query, where, orderBy, onSnapshot } = this.fStore;
    const setorAlvo = String(setorId).toLowerCase();

    const q = query(
      collection(this.db, 'geral_demandas'),
      where('setor_destino', '==', setorAlvo),
      where('status', '==', 'PENDENTE'),
      orderBy('criado_em_chat', 'desc'),
      orderBy('prioridade', 'desc') // Ordena por prioridade também
    );

    // Retorna a função de cancelamento da escuta
    return onSnapshot(q, (snapshot) => {
      const demandas = snapshot.docs.map(doc => this.formatarDemanda(doc));
      console.log(`📡 [Realtime] ${demandas.length} demandas para ${setorAlvo}`);
      callback(demandas);
    }, (error) => {
      console.error('❌ Erro no Snapshot de recebidas:', error);
    });

  } catch (error) {
    console.error('❌ Erro ao configurar escuta de demandas:', error);
    throw error;
  }
}

async listarDemandasRecebidas(setorId) {
    const { collection, query, where, getDocs } = this.fStore;
    
    const q = query(
        collection(this.db, 'geral_demandas'),
        where('setor_destino', '==', setorId.toLowerCase()), // Garante minúsculo
        where('status', '==', 'PENDENTE')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.formatarDemanda(doc));
}

/**
 * Ação de Aceitar a Demanda (Transição PENDENTE -> EM_PROCESSO)
 */
async aceitarDemanda(demandaId, usuario) {
  try {
    const { doc, updateDoc, serverTimestamp } = this.fStore;
    const demandaRef = doc(this.db, 'geral_demandas', demandaId);

    const dadosUpdate = {
      status: 'EM_PROCESSO',
      operador_destino_uid: usuario.uid,
      operador_destino_nome: usuario.nome || usuario.displayName,
      data_aceite: serverTimestamp(),
      atualizado_em: serverTimestamp()
    };

    await updateDoc(demandaRef, dadosUpdate);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao aceitar demanda:', error);
    return { success: false, error };
  }
}
// Regra de negócio: O atendente só vê as demandas que ele mesmo criou (aba minhas demandas)  
  /**
   * Buscar demandas do usuário atual
   */
  async buscarMinhasDemandas(filtros = {}) {
  try {
    const user = window.AuthSystem?.getCurrentUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { collection, limit, query, where, orderBy, getDocs, Timestamp } = this.fStore;
    
    // FILTRO FIXO: Apenas encaminhamentos feitos por este operador
    const queryConstraints = [
      where('operador_origem_uid', '==', user.uid),
      orderBy('criado_em_chat', 'desc'),
      limit(20) // Limite para evitar sobrecarga, pode ser ajustado conforme necessidade
    ];
    
    // FILTRO 1: Status (do HTML)
    if (filtros.status && filtros.status !== '') {
      queryConstraints.push(where('status', '==', filtros.status));
    } else {
      // Padrão: excluir concluídos automaticamente
      queryConstraints.push(where('status', 'in', ['PENDENTE', 'EM_ANDAMENTO', 'AGUARDANDO_SETOR']));
    }
    
    // FILTRO 2: Setor de Destino (do HTML)
    if (filtros.setor_destino && filtros.setor_destino !== '') {
      queryConstraints.push(where('setor_destino', '==', filtros.setor_destino));
    }
    
    // FILTRO 3: Período (do HTML)
    if (filtros.periodo && filtros.periodo !== 'todos') {
      const hoje = new Date();
      let dataInicio;
      
      switch(filtros.periodo) {
        case 'hoje':
          dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
          break;
        case 'semana':
          dataInicio = new Date(hoje.setDate(hoje.getDate() - 7));
          break;
        case 'mes':
          dataInicio = new Date(hoje.setMonth(hoje.getMonth() - 1));
          break;
        default:
          dataInicio = null;
      }
      
      if (dataInicio) {
        queryConstraints.push(where('criado_em_chat', '>=', Timestamp.fromDate(dataInicio)));
      }
    }
    
    // Buscar da coleção geral_demandas
    const q = query(
      collection(this.db, 'geral_demandas'),
      ...queryConstraints,
    );

    const snapshot = await getDocs(q);
    const demandas = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      demandas.push({
        id: doc.id,
        // Dados principais
        atendimentoId: data.atendimentoId,
        demandaId: data.demandaId || doc.id,
        resumo: data.resumo || 'Sem resumo',
        status: data.status || 'PENDENTE',
        prioridade: data.prioridade || 'media',
        
        // Origem e destino
        setor_destino: data.setor_destino,
        setor_origem: data.setor_origem,
        operador_origem: {
          nome: data.operador_origem_nome,
          uid: data.operador_origem_uid
        },
        operador_destino: {
          nome: data.operador_destino_nome,
          uid: data.operador_destino_uid
        },
        
        // Detalhes
        canal: data.canal,
        tipo: data.tipo,
        tipo_demanda: data.tipo_demanda,
        justificativa: data.justificativa_encaminhamento,
        
        // Datas
        criado_em: data.criado_em_chat,
        
        // Formatações para exibição
        criado_em_formatado: this.formatarData(data.criado_em_chat),
        prioridade_label: this.formatarPrioridade(data.prioridade),
        status_label: this.formatarStatus(data.status)
      });
    });
    console.log(`💰 Cobrança desta operação: ${snapshot.size} leituras.`);
    return demandas;
    
  } catch (error) {
    console.error('❌ Erro ao buscar demandas:', error);
    throw error;
  }
}

// Funções auxiliares para formatação
formatarData(timestamp) {
  if (!timestamp) return 'Data não disponível';
  
  if (timestamp.toDate) {
    const data = timestamp.toDate();
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
  }
  
  return timestamp;
}

formatarPrioridade(prioridade) {
  const prioridades = {
    'urgente': { label: 'Urgente', classe: 'prioridade-urgente' },
    'alta': { label: 'Alta', classe: 'prioridade-alta' },
    'media': { label: 'Média', classe: 'prioridade-media' },
    'baixa': { label: 'Baixa', classe: 'prioridade-baixa' }
  };
  
  return prioridades[prioridade] || { label: 'Média', classe: 'prioridade-media' };
}

formatarStatus(status) {
  const statusMap = {
    'PENDENTE': { label: 'Pendente', classe: 'status-pendente' },
    'ENCAMINHADO': { label: 'Encaminhado', classe: 'status-encaminhado' },
    'AGUARDANDO_SETOR': { label: 'Aguardando Setor', classe: 'status-aguardando' },
    'EM_ANDAMENTO': { label: 'Em Andamento', classe: 'status-andamento' },
    'CONCLUIDO': { label: 'Concluído', classe: 'status-concluido' }
  };
  
  return statusMap[status] || { label: status, classe: 'status-desconhecido' };
}
// Função auxiliar para padronizar o retorno
formatarDemanda(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    criado_em_formatado: this.formatarData(data.criado_em_chat),
    status_label: this.formatarStatus(data.status)
  };
}
  /**
   * Obter setor do usuário do Firestore
   */
  async obterSetorUsuario(uid) {
    try {
      const { doc, getDoc } = this.fStore;
      const userDoc = await getDoc(doc(this.db, 'users', uid));
      
      if (userDoc.exists()) {
        return userDoc.data().setor || null;
      }
      
      return null;
      
    } catch (error) {
      console.warn('⚠️ Erro ao buscar setor do usuário:', error);
      return null;
    }
  }

  /**
   * Notificar sobre nova demanda (placeholder)
   */
  notificarNovaDemanda(demandaId, demandaData) {
    // TODO: Implementar sistema de notificações
    console.log('📢 Nova demanda criada:', demandaId, demandaData);
    
    // Aqui você pode adicionar:
    // - Notificações push
    // - Emails
    // - Webhooks
    // etc.
  }
}

// Exportar como global
window.DemandasService = new DemandasExternasService();

console.log('✅ DemandasExternasService carregado');

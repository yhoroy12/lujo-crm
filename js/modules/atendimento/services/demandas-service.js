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

  /**
   * Buscar demandas do usuário atual
   */
  async buscarMinhasDemandas() {
    try {
      const user = window.AuthSystem?.getCurrentUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { collection, query, where, orderBy, getDocs } = this.fStore;
      
      const q = query(
        collection(this.db, 'demandas_externas'),
        where('solicitante.uid', '==', user.uid),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const demandas = [];

      snapshot.forEach(doc => {
        demandas.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return demandas;
      
    } catch (error) {
      console.error('❌ Erro ao buscar demandas:', error);
      throw error;
    }
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

// ==================== COPYRIGHT.JS - MÓDULO COMPLETO E CORRIGIDO ====================
(function() {

    console.log("📦 Módulo Copyright carregando...");

    // =========================
    // DADOS SIMULADOS
    // =========================
    const MOCK_DEMANDAS = [
        {
            id: 'TKT-001',
            cliente: 'Anitta',
            tipo: 'YouTube Claim',
            descricao: '3 claims recebidos necessitam resposta imediata',
            plataforma: 'YouTube',
            status: 'urgente',
            prazo: '24h',
            area: 'Jurídico',
            criado: 'Hoje, 09:30',
            responsavel: 'Juan Copyright',
            prioridade: 'alta'
        },
        {
            id: 'TKT-002',
            cliente: 'Projota',
            tipo: 'Documentação',
            descricao: 'Financeiro aguarda documentação para liberar pagamento',
            plataforma: 'Spotify',
            status: 'pendente',
            prazo: '2 dias',
            area: 'Financeiro',
            criado: 'Ontem, 14:20',
            responsavel: 'Maria Financeiro',
            prioridade: 'media'
        },
        {
            id: 'TKT-003',
            cliente: 'Ludmilla',
            tipo: 'Verificação de Conta',
            descricao: 'Conta Spotify pendente de verificação',
            plataforma: 'Spotify',
            status: 'andamento',
            prazo: '3 dias',
            area: 'Técnico',
            criado: '2 dias atrás',
            responsavel: 'Carlos Técnico',
            prioridade: 'baixa'
        },
        {
            id: 'TKT-004',
            cliente: 'MC Kevin',
            tipo: 'Contrato',
            descricao: 'Revisão de contrato de renovação',
            plataforma: 'Todas',
            status: 'resolvido',
            prazo: 'Concluído',
            area: 'Jurídico',
            criado: '3 dias atrás',
            responsavel: 'Juan Copyright',
            prioridade: 'media'
        },
        {
            id: 'TKT-005',
            cliente: 'Jão',
            tipo: 'Takedown Request',
            descricao: 'Solicitação de remoção de conteúdo não autorizado',
            plataforma: 'YouTube',
            status: 'urgente',
            prazo: '12h',
            area: 'Jurídico',
            criado: 'Hoje, 11:00',
            responsavel: 'Juan Copyright',
            prioridade: 'alta'
        }
    ];

    const MOCK_ARTISTAS = [
        {
            id: 'ART-001',
            nome: 'Anitta',
            contrato: 'Ativo',
            plataformas: ['YouTube', 'Spotify', 'Deezer', 'Apple Music', 'TikTok'],
            ultimoContato: 'Hoje',
            documentos: 'Completo',
            pendentes: 3,
            email: 'anitta@email.com',
            telefone: '(11) 99999-9999'
        },
        {
            id: 'ART-002',
            nome: 'Projota',
            contrato: 'Ativo',
            plataformas: ['YouTube', 'Spotify', 'Deezer'],
            ultimoContato: '2 dias',
            documentos: 'Pendente',
            pendentes: 1,
            email: 'projota@email.com',
            telefone: '(11) 98888-8888'
        },
        {
            id: 'ART-003',
            nome: 'Ludmilla',
            contrato: 'Ativo',
            plataformas: ['YouTube', 'Spotify', 'Apple Music'],
            ultimoContato: '3 dias',
            documentos: 'Completo',
            pendentes: 1,
            email: 'ludmilla@email.com',
            telefone: '(11) 97777-7777'
        },
        {
            id: 'ART-004',
            nome: 'MC Kevin',
            contrato: 'Ativo',
            plataformas: ['YouTube', 'Spotify'],
            ultimoContato: '1 semana',
            documentos: 'Completo',
            pendentes: 0,
            email: 'mckeivin@email.com',
            telefone: '(11) 96666-6666'
        }
    ];

    const MOCK_TEMPLATES = [
        {
            id: 'TPL-001',
            nome: 'Solicitação de Documentação',
            conteudo: `Prezado(a) {artista},

Solicitamos o envio dos seguintes documentos para dar continuidade ao processo:

1. Documento de identificação (RG/CPF ou CNPJ)
2. Comprovante de residência
3. Contrato assinado digitalmente
4. Dados bancários atualizados

Prazo para envio: {prazo}

Atenciosamente,
Equipe Copyright - Lujo Network`
        },
        {
            id: 'TPL-002',
            nome: 'Notificação de Claim',
            conteudo: `Olá {artista},

Identificamos {quantidade} claims de direitos autorais em suas músicas na plataforma {plataforma}. 

Por favor, revise em até {prazo} horas.

Detalhes:
- Plataforma: {plataforma}
- Quantidade: {quantidade} claims
- Prazo de resposta: {prazo} horas
- Status: Pendente de análise

Equipe Copyright - Lujo Network`
        },
        {
            id: 'TPL-003',
            nome: 'Aviso de Prazo',
            conteudo: `Prezado(a) {artista},

Lembramos que o prazo para {assunto} vence em {prazo}.

Por favor, dê atenção urgente a este assunto.

Atenciosamente,
Equipe Copyright - Lujo Network`
        },
        {
            id: 'TPL-004',
            nome: 'Confirmação de Recebimento',
            conteudo: `Olá {artista},

Confirmamos o recebimento de seus {documentos}.

Agora daremos andamento ao processo. Em breve entraremos em contato com novidades.

Agradecemos sua colaboração.

Equipe Copyright - Lujo Network`
        },
        {
            id: 'TPL-005',
            nome: 'Resposta Padrão FAQ',
            conteudo: `Olá {artista},

Obrigado pelo seu contato.

Em relação à sua dúvida sobre {assunto}, informamos que {resposta}.

Se precisar de mais informações, estamos à disposição.

Atenciosamente,
Equipe Copyright - Lujo Network`
        },
        {
            id: 'TPL-006',
            nome: 'Solicitação de Assinatura',
            conteudo: `Prezado(a) {artista},

Solicitamos sua assinatura no contrato {contrato}.

Clique no link abaixo para acessar o documento:
{link_contrato}

Prazo para assinatura: {prazo}

Atenciosamente,
Equipe Copyright - Lujo Network`
        }
    ];

    // =========================
    // ESTADO GLOBAL DO MÓDULO
    // =========================
    let currentDemandas = [...MOCK_DEMANDAS];
    let currentArtistas = [...MOCK_ARTISTAS];
    let selectedArtista = null;
    let selectedTemplate = null;

    // =========================
    // ABAS PRINCIPAIS - FUNÇÃO CORRIGIDA
    // =========================
    function initAbas() {
        console.log("🔧 Inicializando abas do Copyright...");
        
        // Usar seletores mais específicos
        const painelCopyright = document.querySelector('.painel-copyright');
        if (!painelCopyright) {
            console.error("❌ Container .painel-copyright não encontrado!");
            return;
        }
        
        const botoes = painelCopyright.querySelectorAll(".aba-btn");
        const conteudos = painelCopyright.querySelectorAll(".aba-conteudo");
        
        console.log(`📊 Botões encontrados: ${botoes.length}, Conteúdos: ${conteudos.length}`);

        if (!botoes.length || !conteudos.length) {
            console.error("❌ Não encontrou elementos das abas!");
            return;
        }

        // Remover todos os listeners existentes (prevenir duplicação)
        botoes.forEach(btn => {
            const btnClone = btn.cloneNode(true);
            btn.parentNode.replaceChild(btnClone, btn);
        });

        // Re-selecionar os botões após o clone
        const botoesAtualizados = painelCopyright.querySelectorAll(".aba-btn");
        
        botoesAtualizados.forEach(btn => {
            btn.addEventListener("click", function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                const alvo = this.dataset.aba;
                console.log(`🎯 Clicou na aba: ${alvo} - ${this.textContent}`);
                
                if (!alvo) {
                    console.error("❌ Botão não tem data-aba definido!");
                    return;
                }
                
                // Atualizar botões ativos
                botoesAtualizados.forEach(b => {
                    b.classList.remove("ativa");
                });
                this.classList.add("ativa");
                
                // Mostrar conteúdo correspondente
                mostrarAbaConteudo(alvo);
            });
        });

        // Garantir que a primeira aba esteja ativa
        if (botoesAtualizados.length > 0) {
            const primeiraAba = botoesAtualizados[0];
            const alvoInicial = primeiraAba.dataset.aba || 'aba-dashboard';
            
            primeiraAba.classList.add("ativa");
            mostrarAbaConteudo(alvoInicial);
        }
        
        console.log("✅ Abas do Copyright inicializadas com sucesso!");
    }

    // =========================
    // MOSTRAR CONTEÚDO DA ABA
    // =========================
    function mostrarAbaConteudo(abaId) {
        console.log(`📁 Mostrando aba: ${abaId}`);
        
        const painelCopyright = document.querySelector('.painel-copyright');
        if (!painelCopyright) return;
        
        // Esconder todos os conteúdos
        painelCopyright.querySelectorAll(".aba-conteudo").forEach(c => {
            c.classList.remove("ativa");
        });
        
        // Mostrar o conteúdo da aba selecionada
        const conteudoAlvo = painelCopyright.querySelector(`.${abaId}`);
        if (conteudoAlvo) {
            conteudoAlvo.classList.add("ativa");
            
            // Inicializar conteúdo específico da aba
            inicializarConteudoAba(abaId);
        } else {
            console.error(`❌ Não encontrou conteúdo para aba: ${abaId}`);
        }
    }

    // =========================
    // INICIALIZAR CONTEÚDO DA ABA
    // =========================
    function inicializarConteudoAba(abaId) {
        console.log(`🔄 Inicializando conteúdo da aba: ${abaId}`);
        
        switch(abaId) {
            case 'aba-dashboard':
                initDashboardTab();
                break;
            case 'aba-demandas':
                initDemandasTab();
                break;
            case 'aba-artistas':
                initArtistasTab();
                break;
            case 'aba-comunicacao':
                initComunicacaoTab();
                break;
            case 'aba-relatorios':
                initRelatoriosTab();
                break;
            default:
                console.log(`ℹ️  Nenhuma inicialização específica para: ${abaId}`);
        }
    }

    // =========================
    // ABA DASHBOARD
    // =========================
    function initDashboardTab() {
        console.log("📊 Inicializando Dashboard...");
        
        // Atualizar métricas
        atualizarMetricasDashboard();
        
        // Adicionar listeners aos botões
        const btnVerTodos = document.querySelector('.aba-dashboard .btn-secondary');
        if (btnVerTodos) {
            btnVerTodos.addEventListener('click', function() {
                // Navegar para aba de demandas
                const btnDemandas = document.querySelector('#btnDemandas');
                if (btnDemandas) {
                    btnDemandas.click();
                }
            });
        }
    }

    function atualizarMetricasDashboard() {
        const metricas = {
            ticketsAbertos: currentDemandas.filter(d => d.status !== 'resolvido').length,
            claimsPendentes: currentDemandas.filter(d => d.tipo.includes('Claim') && d.status !== 'resolvido').length,
            emailsHoje: 24, // Mock
            slaCumprido: 94 // Mock
        };
        
        // Atualizar valores na tela
        const elementos = {
            'ticketsAbertos': document.querySelector('.aba-dashboard .metrica-card:nth-child(1) .metrica-valor'),
            'claimsPendentes': document.querySelector('.aba-dashboard .metrica-card:nth-child(2) .metrica-valor'),
            'emailsHoje': document.querySelector('.aba-dashboard .metrica-card:nth-child(3) .metrica-valor'),
            'slaCumprido': document.querySelector('.aba-dashboard .metrica-card:nth-child(4) .metrica-valor')
        };
        
        for (const [key, element] of Object.entries(elementos)) {
            if (element && metricas[key] !== undefined) {
                element.textContent = metricas[key];
            }
        }
    }

    // =========================
    // ABA DEMANDAS
    // =========================
    function initDemandasTab() {
        console.log("📋 Inicializando Central de Demandas...");
        
        renderListaDemandas();
        
        // Botão nova demanda
        const btnNovaDemanda = document.getElementById('btnNovaDemanda');
        if (btnNovaDemanda) {
            btnNovaDemanda.addEventListener('click', abrirModalNovaDemanda);
        }
        
        // Filtros
        const selects = document.querySelectorAll('.aba-demandas select');
        selects.forEach(select => {
            select.addEventListener('change', filtrarDemandas);
        });
        
        // Adicionar botões de ação às demandas existentes
        setTimeout(() => {
            document.querySelectorAll('.ticket-item .btn').forEach(btn => {
                if (btn.textContent.includes('Detalhes')) {
                    const ticketId = btn.closest('.ticket-item').querySelector('.ticket-meta span')?.textContent?.replace('ID: ', '') || '';
                    if (ticketId) {
                        btn.onclick = () => copyrightModule.verDetalhes(ticketId.trim());
                    }
                } else if (btn.textContent.includes('Atender')) {
                    const ticketId = btn.closest('.ticket-item').querySelector('.ticket-meta span')?.textContent?.replace('ID: ', '') || '';
                    if (ticketId) {
                        btn.onclick = () => copyrightModule.atenderDemanda(ticketId.trim());
                    }
                }
            });
        }, 100);
    }

    function renderListaDemandas() {
        const container = document.getElementById('listaDemandas');
        if (!container) {
            console.error("❌ Container #listaDemandas não encontrado!");
            return;
        }

        if (currentDemandas.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 30px; color: #999;">Nenhuma demanda encontrada</p>';
            return;
        }

        container.innerHTML = currentDemandas.map(demanda => `
            <div class="ticket-item status-${demanda.status}" data-ticket-id="${demanda.id}">
                <div class="ticket-info">
                    <div class="ticket-cliente">${demanda.cliente} - ${demanda.tipo}</div>
                    <div class="ticket-desc">${demanda.descricao}</div>
                    <div class="ticket-meta">
                        <span>ID: ${demanda.id}</span> • 
                        <span>Plataforma: ${demanda.plataforma}</span> • 
                        <span>Área: ${demanda.area}</span> • 
                        <span>Criado: ${demanda.criado}</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px; align-items: flex-end;">
                    <span class="status-badge status-${demanda.status}">
                        ${demanda.status === 'urgente' ? '🚨 Urgente' : 
                          demanda.status === 'pendente' ? '📋 Pendente' :
                          demanda.status === 'andamento' ? '🔄 Em Andamento' : '✅ Resolvido'}
                    </span>
                    <span style="font-size: 11px; color: #666;">${demanda.prazo}</span>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <button class="btn btn-sm btn-secondary btn-detalhes" data-ticket="${demanda.id}">
                            Detalhes
                        </button>
                        <button class="btn btn-sm btn-primary btn-atender" data-ticket="${demanda.id}">
                            Atender
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Adicionar event listeners após renderizar
        setTimeout(() => {
            document.querySelectorAll('.btn-detalhes').forEach(btn => {
                btn.addEventListener('click', function() {
                    const ticketId = this.getAttribute('data-ticket');
                    copyrightModule.verDetalhes(ticketId);
                });
            });
            
            document.querySelectorAll('.btn-atender').forEach(btn => {
                btn.addEventListener('click', function() {
                    const ticketId = this.getAttribute('data-ticket');
                    copyrightModule.atenderDemanda(ticketId);
                });
            });
        }, 50);
    }

    function filtrarDemandas() {
        const statusFilter = document.querySelector('.aba-demandas select:nth-child(1)').value;
        const areaFilter = document.querySelector('.aba-demandas select:nth-child(2)').value;
        const plataformaFilter = document.querySelector('.aba-demandas select:nth-child(3)').value;
        
        let filtered = [...MOCK_DEMANDAS];
        
        if (statusFilter && statusFilter !== 'Todos os Status') {
            filtered = filtered.filter(d => {
                const statusMap = {
                    'Abertos': d.status !== 'resolvido',
                    'Em Andamento': d.status === 'andamento',
                    'Resolvidos': d.status === 'resolvido',
                    'Urgentes': d.status === 'urgente'
                };
                return statusFilter === 'Todos os Status' || statusMap[statusFilter];
            });
        }
        
        if (areaFilter && areaFilter !== 'Todas as Áreas') {
            filtered = filtered.filter(d => d.area === areaFilter);
        }
        
        if (plataformaFilter && plataformaFilter !== 'Todas as Plataformas') {
            filtered = filtered.filter(d => d.plataforma === plataformaFilter || d.plataforma === 'Todas');
        }
        
        currentDemandas = filtered;
        renderListaDemandas();
        
        console.log(`🔍 Filtrado: ${filtered.length} demandas`);
    }

    // =========================
    // ABA ARTISTAS
    // =========================
    function initArtistasTab() {
        console.log("🎤 Inicializando gestão de artistas...");
        
        renderListaArtistas();
        
        // Botão buscar
        const inputBusca = document.querySelector('.aba-artistas input');
        if (inputBusca) {
            inputBusca.addEventListener('input', (e) => {
                filtrarArtistas(e.target.value);
            });
        }
        
        // Botão novo artista
        const btnNovoArtista = document.querySelector('.aba-artistas .btn-success');
        if (btnNovoArtista) {
            btnNovoArtista.addEventListener('click', abrirModalNovoArtista);
        }
    }

    function renderListaArtistas() {
        const container = document.getElementById('listaArtistas');
        if (!container) {
            console.error("❌ Container #listaArtistas não encontrado!");
            return;
        }

        container.innerHTML = currentArtistas.map(artista => `
            <div class="artista-item" data-artista-id="${artista.id}">
                <div class="artista-avatar">${artista.nome.charAt(0)}</div>
                <div class="artista-info">
                    <div class="artista-nome">${artista.nome}</div>
                    <div class="artista-detalhes">
                        <span>Contrato: ${artista.contrato}</span> • 
                        <span>Plataformas: ${artista.plataformas.length}</span> • 
                        <span>Último contato: ${artista.ultimoContato}</span>
                        ${artista.documentos === 'Pendente' ? ' • <span style="color: #d62828;">📄 Doc. Pendente</span>' : ''}
                        ${artista.pendentes > 0 ? ` • <span style="color: #ff9800;">⚠️ ${artista.pendentes} pendência(s)</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-secondary btn-ver-artista" data-artista="${artista.id}">
                        Detalhes
                    </button>
                    <button class="btn btn-sm btn-primary btn-contatar-artista" data-artista="${artista.id}">
                        Contatar
                    </button>
                </div>
            </div>
        `).join('');
        
        // Adicionar event listeners
        setTimeout(() => {
            document.querySelectorAll('.btn-ver-artista').forEach(btn => {
                btn.addEventListener('click', function() {
                    const artistaId = this.getAttribute('data-artista');
                    copyrightModule.verArtista(artistaId);
                });
            });
            
            document.querySelectorAll('.btn-contatar-artista').forEach(btn => {
                btn.addEventListener('click', function() {
                    const artistaId = this.getAttribute('data-artista');
                    copyrightModule.contatarArtista(artistaId);
                });
            });
        }, 50);
    }

    function filtrarArtistas(termo) {
        if (!termo.trim()) {
            currentArtistas = [...MOCK_ARTISTAS];
        } else {
            currentArtistas = MOCK_ARTISTAS.filter(artista =>
                artista.nome.toLowerCase().includes(termo.toLowerCase())
            );
        }
        renderListaArtistas();
        console.log(`🔍 Filtrado: ${currentArtistas.length} artistas`);
    }

    // =========================
    // ABA COMUNICAÇÃO
    // =========================
    function initComunicacaoTab() {
        console.log("📧 Inicializando comunicação...");
        
        const selectArtista = document.querySelector('.aba-comunicacao .select-atendente');
        if (selectArtista) {
            // Popular select com artistas
            selectArtista.innerHTML = `
                <option value="">Selecionar Artista</option>
                ${MOCK_ARTISTAS.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
            `;
            
            selectArtista.addEventListener('change', (e) => {
                const artistaId = e.target.value;
                if (artistaId) {
                    carregarHistoricoComunicacao(artistaId);
                } else {
                    limparHistoricoComunicacao();
                }
            });
        }
        
        // Templates rápidos
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateNome = e.target.textContent;
                usarTemplate(templateNome);
            });
        });
        
        // Botão enviar mensagem
        const btnEnviar = document.querySelector('.aba-comunicacao .btn-primary');
        const textarea = document.querySelector('.aba-comunicacao textarea');
        
        if (btnEnviar && textarea) {
            btnEnviar.addEventListener('click', function() {
                enviarMensagem(textarea.value);
            });
            
            // Permitir Ctrl+Enter para enviar
            textarea.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'Enter') {
                    enviarMensagem(this.value);
                }
            });
        }
        
        // Carregar primeiro artista por padrão
        if (selectArtista && MOCK_ARTISTAS.length > 0) {
            selectArtista.value = MOCK_ARTISTAS[0].id;
            carregarHistoricoComunicacao(MOCK_ARTISTAS[0].id);
        }
    }

    function carregarHistoricoComunicacao(artistaId) {
        const container = document.getElementById('historicoComunicacao');
        if (!container) return;

        const artista = MOCK_ARTISTAS.find(a => a.id === artistaId);
        if (!artista) return;

        // Mock de histórico baseado no artista
        const historico = artistaId === 'ART-001' ? [
            { id: 'MSG-001', tipo: 'enviado', texto: 'Solicitamos os documentos pendentes para liberação do pagamento.', data: 'Hoje, 09:30', remetente: 'Juan Copyright' },
            { id: 'MSG-002', tipo: 'recebido', texto: 'Enviarei os documentos até amanhã.', data: 'Hoje, 09:45', remetente: 'Anitta' },
            { id: 'MSG-003', tipo: 'enviado', texto: 'Recebemos 3 claims no YouTube que precisam de sua atenção.', data: 'Ontem, 14:20', remetente: 'Juan Copyright' },
            { id: 'MSG-004', tipo: 'recebido', texto: 'Vou revisar ainda hoje e retorno.', data: 'Ontem, 14:35', remetente: 'Anitta' }
        ] : artistaId === 'ART-002' ? [
            { id: 'MSG-005', tipo: 'enviado', texto: 'Documentação pendente para liberação financeira.', data: '2 dias atrás', remetente: 'Maria Financeiro' },
            { id: 'MSG-006', tipo: 'enviado', texto: 'Lembrete: prazo para envio vence amanhã.', data: 'Hoje, 08:15', remetente: 'Juan Copyright' }
        ] : [
            { id: 'MSG-007', tipo: 'enviado', texto: 'Bem-vindo(a) à Lujo Network! Como podemos ajudar?', data: 'Última semana', remetente: 'Equipe Copyright' }
        ];

        container.innerHTML = historico.map(msg => `
            <div class="${msg.tipo === 'enviado' ? 'msg-right' : 'msg-left'}" 
                 style="margin-bottom: 15px; padding: 10px 14px; border-radius: 10px; max-width: 85%; align-self: ${msg.tipo === 'enviado' ? 'flex-end' : 'flex-start'}; background: ${msg.tipo === 'enviado' ? '#d2f8c6' : '#ffffff'}; border: 1px solid ${msg.tipo === 'enviado' ? '#b3e0a1' : '#e0e0e0'};">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 600;">
                    ${msg.remetente}
                </div>
                <p style="margin: 0; font-size: 14px; line-height: 1.4;">${msg.texto}</p>
                <span style="font-size: 10px; color: #888; text-align: right; display: block; margin-top: 6px;">${msg.data}</span>
            </div>
        `).join('');
        
        // Scroll para o final
        container.scrollTop = container.scrollHeight;
    }

    function limparHistoricoComunicacao() {
        const container = document.getElementById('historicoComunicacao');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Selecione um artista para ver o histórico</p>';
        }
    }

    function usarTemplate(templateNome) {
        const textarea = document.querySelector('.aba-comunicacao textarea');
        if (!textarea) return;

        const template = MOCK_TEMPLATES.find(t => t.nome === templateNome);
        if (template) {
            // Substituir variáveis básicas
            let conteudo = template.conteudo;
            const artistaSelect = document.querySelector('.aba-comunicacao .select-atendente');
            const artistaId = artistaSelect ? artistaSelect.value : null;
            const artista = artistaId ? MOCK_ARTISTAS.find(a => a.id === artistaId) : null;
            
            if (artista) {
                conteudo = conteudo.replace(/{artista}/g, artista.nome);
            }
            
            textarea.value = conteudo;
            textarea.focus();
            
            // Scroll para mostrar o template
            textarea.scrollTop = 0;
        } else {
            textarea.value = `Template: ${templateNome}\n\n[Digite sua mensagem aqui]`;
        }
    }

    function enviarMensagem(texto) {
        if (!texto.trim()) {
            alert('Digite uma mensagem antes de enviar.');
            return;
        }
        
        const selectArtista = document.querySelector('.aba-comunicacao .select-atendente');
        if (!selectArtista || !selectArtista.value) {
            alert('Selecione um artista primeiro.');
            return;
        }
        
        // Simular envio
        const container = document.getElementById('historicoComunicacao');
        if (container) {
            const novaMsg = {
                id: 'MSG-' + Date.now(),
                tipo: 'enviado',
                texto: texto,
                data: 'Agora',
                remetente: 'Você'
            };
            
            const msgElement = document.createElement('div');
            msgElement.className = 'msg-right';
            msgElement.style.cssText = 'margin-bottom: 15px; padding: 10px 14px; border-radius: 10px; max-width: 85%; align-self: flex-end; background: #d2f8c6; border: 1px solid #b3e0a1;';
            msgElement.innerHTML = `
                <div style="font-size: 12px; color: #666; margin-bottom: 4px; font-weight: 600;">
                    Você
                </div>
                <p style="margin: 0; font-size: 14px; line-height: 1.4;">${texto}</p>
                <span style="font-size: 10px; color: #888; text-align: right; display: block; margin-top: 6px;">Agora</span>
            `;
            
            container.appendChild(msgElement);
            
            // Limpar textarea
            document.querySelector('.aba-comunicacao textarea').value = '';
            
            // Scroll para o final
            container.scrollTop = container.scrollHeight;
            
            console.log('✅ Mensagem enviada para artista ID:', selectArtista.value);
        }
    }

    // =========================
    // ABA RELATÓRIOS
    // =========================
    function initRelatoriosTab() {
        console.log("📈 Inicializando relatórios...");
        
        // Adicionar listeners aos botões de relatório
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const relatorioNome = this.textContent.replace('📄 ', '');
                gerarRelatorio(relatorioNome);
            });
        });
        
        // Atualizar métricas
        atualizarMetricasRelatorios();
    }

    function atualizarMetricasRelatorios() {
        const ticketsMes = currentDemandas.filter(d => d.criado.includes('Hoje') || d.criado.includes('Ontem') || d.criado.includes('dias')).length;
        const claimsPlataforma = currentDemandas.filter(d => d.tipo.includes('Claim')).length;
        
        const elementos = {
            'ticketsMes': document.querySelector('.aba-relatorios .metrica-card:nth-child(1) .metrica-valor'),
            'resolucaoMedia': document.querySelector('.aba-relatorios .metrica-card:nth-child(2) .metrica-valor'),
            'claimsPlataforma': document.querySelector('.aba-relatorios .metrica-card:nth-child(3) .metrica-valor'),
            'satisfacao': document.querySelector('.aba-relatorios .metrica-card:nth-child(4) .metrica-valor')
        };
        
        if (elementos.ticketsMes) elementos.ticketsMes.textContent = ticketsMes;
        if (elementos.claimsPlataforma) elementos.claimsPlataforma.textContent = claimsPlataforma;
    }

    function gerarRelatorio(nome) {
        console.log(`📊 Gerando relatório: ${nome}`);
        
        // Simular geração de relatório
        alert(`Relatório "${nome}" está sendo gerado...\n\nEm produção, isso abriria um modal com opções de exportação.`);
        
        // Em produção, aqui abriria um modal ou faria download
    }

    // =========================
    // MODAIS
    // =========================
    function abrirModalNovaDemanda() {
        // Criar modal simples
        const modalHTML = `
            <div class="modal-overlay active" id="modalNovaDemanda">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>➕ Nova Demanda</h3>
                        <button class="close-btn" onclick="copyrightModule.fecharModal()">&times;</button>
                    </div>
                    <form id="formNovaDemanda" style="padding: 25px;">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="demandaArtista">Artista</label>
                                <select id="demandaArtista" required>
                                    <option value="">Selecione</option>
                                    ${MOCK_ARTISTAS.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="demandaTipo">Tipo de Demanda</label>
                                <select id="demandaTipo" required>
                                    <option value="">Selecione</option>
                                    <option value="Claim">Claim</option>
                                    <option value="Documentação">Documentação</option>
                                    <option value="Contrato">Contrato</option>
                                    <option value="Verificação">Verificação</option>
                                    <option value="Takedown">Takedown</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="demandaDescricao">Descrição</label>
                            <textarea id="demandaDescricao" rows="4" required placeholder="Descreva a demanda..."></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="demandaPlataforma">Plataforma</label>
                                <select id="demandaPlataforma">
                                    <option value="Todas">Todas</option>
                                    <option value="YouTube">YouTube</option>
                                    <option value="Spotify">Spotify</option>
                                    <option value="Deezer">Deezer</option>
                                    <option value="Apple Music">Apple Music</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="demandaPrioridade">Prioridade</label>
                                <select id="demandaPrioridade" required>
                                    <option value="baixa">Baixa</option>
                                    <option value="media">Média</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="copyrightModule.fecharModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Criar Demanda</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Adicionar modal ao body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Adicionar submit handler
        const form = document.getElementById('formNovaDemanda');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                criarNovaDemanda();
            });
        }
    }

    function abrirModalNovoArtista() {
        alert('Modal de novo artista será implementado aqui.\n\nEm produção, isso abriria um formulário completo.');
    }

    function criarNovaDemanda() {
        const artistaSelect = document.getElementById('demandaArtista');
        const tipoSelect = document.getElementById('demandaTipo');
        const descricaoTextarea = document.getElementById('demandaDescricao');
        const plataformaSelect = document.getElementById('demandaPlataforma');
        const prioridadeSelect = document.getElementById('demandaPrioridade');
        
        if (!artistaSelect.value || !tipoSelect.value || !descricaoTextarea.value) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        
        const artista = MOCK_ARTISTAS.find(a => a.id === artistaSelect.value);
        if (!artista) {
            alert('Artista não encontrado.');
            return;
        }
        
        // Criar nova demanda
        const novaDemanda = {
            id: 'TKT-' + (MOCK_DEMANDAS.length + 1).toString().padStart(3, '0'),
            cliente: artista.nome,
            tipo: tipoSelect.value,
            descricao: descricaoTextarea.value,
            plataforma: plataformaSelect.value,
            status: 'pendente',
            prazo: prioridadeSelect.value === 'urgente' ? '24h' : '3 dias',
            area: tipoSelect.value === 'Documentação' ? 'Financeiro' : 'Jurídico',
            criado: 'Agora',
            responsavel: 'Juan Copyright',
            prioridade: prioridadeSelect.value
        };
        
        // Adicionar à lista
        MOCK_DEMANDAS.unshift(novaDemanda);
        currentDemandas = [novaDemanda, ...currentDemandas];
        
        // Fechar modal
        fecharModal();
        
        // Atualizar lista
        renderListaDemandas();
        
        // Mostrar confirmação
        alert(`✅ Demanda ${novaDemanda.id} criada com sucesso para ${artista.nome}!`);
        
        // Navegar para aba de demandas
        const btnDemandas = document.querySelector('#btnDemandas');
        if (btnDemandas) {
            btnDemandas.click();
        }
    }

    // =========================
    // FUNÇÕES PÚBLICAS DO MÓDULO
    // =========================
    function verDetalhes(ticketId) {
        const demanda = MOCK_DEMANDAS.find(d => d.id === ticketId);
        if (!demanda) {
            alert(`Ticket ${ticketId} não encontrado.`);
            return;
        }

        const detalhes = `
📄 **DETALHES DO TICKET**

**ID:** ${demanda.id}
**Cliente:** ${demanda.cliente}
**Tipo:** ${demanda.tipo}
**Status:** ${demanda.status.toUpperCase()}
**Prioridade:** ${demanda.prioridade.toUpperCase()}

**Descrição:**
${demanda.descricao}

**Informações Adicionais:**
• Plataforma: ${demanda.plataforma}
• Área Responsável: ${demanda.area}
• Prazo: ${demanda.prazo}
• Criado: ${demanda.criado}
• Responsável: ${demanda.responsavel}

**Ações Disponíveis:**
1. Atender demanda
2. Alterar prioridade
3. Reatribuir responsável
4. Marcar como resolvido
        `;

        alert(detalhes);
    }

    function atenderDemanda(ticketId) {
        const demanda = MOCK_DEMANDAS.find(d => d.id === ticketId);
        if (!demanda) {
            alert(`Ticket ${ticketId} não encontrado.`);
            return;
        }

        if (confirm(`Iniciar atendimento do ticket ${ticketId} (${demanda.cliente} - ${demanda.tipo})?`)) {
            demanda.status = 'andamento';
            demanda.responsavel = 'Você';
            
            // Atualizar lista
            renderListaDemandas();
            
            alert(`✅ Ticket ${ticketId} marcado como "Em Andamento".\nVocê agora é o responsável.`);
        }
    }

    function verArtista(artistaId) {
        const artista = MOCK_ARTISTAS.find(a => a.id === artistaId);
        if (!artista) {
            alert(`Artista ${artistaId} não encontrado.`);
            return;
        }

        const detalhes = `
🎤 **DETALHES DO ARTISTA**

**Nome:** ${artista.nome}
**Contrato:** ${artista.contrato}
**Email:** ${artista.email}
**Telefone:** ${artista.telefone}

**Plataformas:** ${artista.plataformas.join(', ')}
**Documentação:** ${artista.documentos}
**Último Contato:** ${artista.ultimoContato}
**Pendências Ativas:** ${artista.pendentes}

**Demandas Ativas:**
${MOCK_DEMANDAS.filter(d => d.cliente === artista.nome && d.status !== 'resolvido')
    .map(d => `• ${d.id} - ${d.tipo} (${d.status})`)
    .join('\n') || 'Nenhuma demanda ativa'}

**Ações Disponíveis:**
1. Enviar mensagem
2. Solicitar documentos
3. Ver histórico completo
4. Editar informações
        `;

        alert(detalhes);
    }

    function contatarArtista(artistaId) {
        const artista = MOCK_ARTISTAS.find(a => a.id === artistaId);
        if (!artista) {
            alert(`Artista ${artistaId} não encontrado.`);
            return;
        }

        // Navegar para aba de comunicação e selecionar artista
        const btnComunicacao = document.querySelector('#btnComunicacao');
        if (btnComunicacao) {
            btnComunicacao.click();
            
            // Aguardar a aba carregar
            setTimeout(() => {
                const select = document.querySelector('.aba-comunicacao .select-atendente');
                if (select) {
                    select.value = artistaId;
                    select.dispatchEvent(new Event('change'));
                }
            }, 300);
        }
    }

    function fecharModal() {
        const modal = document.getElementById('modalNovaDemanda');
        if (modal) {
            modal.remove();
        }
    }

    // =========================
    // INICIALIZAÇÃO DO MÓDULO
    // =========================
    function initCopyright() {
        console.log("🚀 Inicializando módulo Copyright...");
        
        // Aguardar um pouco para garantir que o DOM está pronto
        setTimeout(() => {
            initAbas();
            
            // Verificar inicialização
            const abasAtivas = document.querySelectorAll('.painel-copyright .aba-btn.ativa');
            console.log(`✅ Módulo inicializado. Abas ativas: ${abasAtivas.length}`);
            
            // Forçar atualização do dashboard
            if (abasAtivas.length > 0 && abasAtivas[0].dataset.aba === 'aba-dashboard') {
                atualizarMetricasDashboard();
            }
        }, 100);
    }

    // =========================
    // EXPORT PARA O SISTEMA PRINCIPAL
    // =========================
    window.initCopyrightModule = function() {
        console.log("📦 Módulo Copyright carregado pelo sistema principal");
        
        // Pequeno delay para garantir que o HTML está carregado
        setTimeout(() => {
            initCopyright();
        }, 200);
    };

    // =========================
    // FUNÇÕES PÚBLICAS PARA DEBUG E TESTE
    // =========================
    window.copyrightModule = {
        // Funções principais
        verDetalhes,
        atenderDemanda,
        verArtista,
        contatarArtista,
        fecharModal,
        
        // Funções de navegação
        mostrarAba: function(abaId) {
            mostrarAbaConteudo(abaId);
        },
        
        // Funções de teste
        testarAbas: function() {
            console.log("🔍 Testando abas do Copyright...");
            const painel = document.querySelector('.painel-copyright');
            if (!painel) {
                console.error("❌ .painel-copyright não encontrado!");
                return 0;
            }
            
            const abas = painel.querySelectorAll('.aba-btn');
            console.log(`📊 Encontrou ${abas.length} botões de aba`);
            
            abas.forEach((aba, i) => {
                console.log(`Aba ${i}: ${aba.textContent}, data-aba: ${aba.dataset.aba}, ativa: ${aba.classList.contains('ativa')}`);
            });
            
            return abas.length;
        },
        
        testarDados: function() {
            console.log("📊 Dados do módulo:");
            console.log(`• Demandas: ${MOCK_DEMANDAS.length}`);
            console.log(`• Artistas: ${MOCK_ARTISTAS.length}`);
            console.log(`• Templates: ${MOCK_TEMPLATES.length}`);
            
            return {
                demandas: MOCK_DEMANDAS.length,
                artistas: MOCK_ARTISTAS.length,
                templates: MOCK_TEMPLATES.length
            };
        },
        
        // Função para simular nova demanda (útil para testes)
        simularNovaDemanda: function() {
            const novaDemanda = {
                id: 'TKT-TEST-' + Date.now().toString().slice(-4),
                cliente: 'Artista Teste',
                tipo: 'Teste',
                descricao: 'Esta é uma demanda de teste gerada pelo sistema',
                plataforma: 'YouTube',
                status: 'pendente',
                prazo: '24h',
                area: 'Teste',
                criado: 'Agora (Teste)',
                responsavel: 'Sistema',
                prioridade: 'media'
            };
            
            MOCK_DEMANDAS.unshift(novaDemanda);
            currentDemandas = [novaDemanda, ...currentDemandas];
            
            renderListaDemandas();
            console.log(`✅ Demanda de teste ${novaDemanda.id} criada!`);
            
            return novaDemanda.id;
        }
    };

    // =========================
    // AUTO-INICIALIZAÇÃO PARA DESENVOLVIMENTO
    // =========================
    // Este bloco é útil durante o desenvolvimento, pode ser removido em produção
    if (window.location.href.includes('copyright') || document.querySelector('.modulo-painel-copyright')) {
        console.log("🔄 Copyright detectado no DOM, aguardando inicialização...");
        
        // Esperar o sistema principal carregar
        const checkInit = setInterval(() => {
            if (typeof window.initCopyrightModule === 'function') {
                clearInterval(checkInit);
                window.initCopyrightModule();
            }
        }, 500);
        
        // Timeout de segurança
        setTimeout(() => {
            if (typeof window.initCopyrightModule !== 'function') {
                console.log("⚠️  Sistema principal não carregou, inicializando diretamente...");
                initCopyright();
            }
        }, 3000);
    }

})();

console.log("🎵 Módulo Copyright carregado com sucesso!");
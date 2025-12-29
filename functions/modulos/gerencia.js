// ==================== GERENCIA.JS COMPLETO ====================
(function () {

    // =========================
    // ABAS PRINCIPAIS
    // =========================
    function initAbas() {
        const botoes = document.querySelectorAll(".aba-btn");
        const conteudos = document.querySelectorAll(".aba-conteudo");

        if (!botoes.length || !conteudos.length) return;

        botoes.forEach(btn => {
            btn.addEventListener("click", () => {
                const alvo = btn.dataset.aba;

                botoes.forEach(b => b.classList.remove("ativa"));
                conteudos.forEach(c => c.classList.remove("ativa"));

                btn.classList.add("ativa");

                const conteudoAtivo = document.querySelector("." + alvo);
                if (conteudoAtivo) {
                    conteudoAtivo.classList.add("ativa");
                }
            });
        });
    }

    // =========================
    // SUB-ABAS DO MÓDULO GERÊNCIA
    // =========================
    function initSubAbas() {
        const botoes = document.querySelectorAll(".sub-aba-btn");
        const conteudos = document.querySelectorAll(".sub-aba-conteudo");

        if (!botoes.length || !conteudos.length) return;

        botoes.forEach(btn => {
            btn.addEventListener("click", () => {
                const alvo = btn.dataset.subAba;

                botoes.forEach(b => b.classList.remove("ativa"));
                conteudos.forEach(c => c.classList.remove("ativa"));

                btn.classList.add("ativa");

                const conteudoAtivo = document.querySelector("." + alvo);
                if (conteudoAtivo) {
                    conteudoAtivo.classList.add("ativa");
                }
            });
        });
    }

    // =========================
    // PAINEL DE DETALHES DOS PEDIDOS
    // =========================
    function initPainelPedidos() {
        const btnDetalhes = document.querySelectorAll(".btn-detalhes");
        const painel = document.getElementById("painelDetalhes");
        const btnFechar = document.getElementById("fecharDetalhes");

        const dadosFicticios = {
            "0001": {
                cliente: "Ana Silva",
                email: "ana.silva@email.com",
                tipo: "Advanced",
                dataHora: "25/12/2025 14:30",
                status: "Pendente",
                responsavel: "Carlos Souza",
                descricao: "Solicitação de alteração de faixa para lançamento adiantado."
            },
            "0002": {
                cliente: "Marcos Lima",
                email: "marcos.lima@email.com",
                tipo: "Takedown",
                dataHora: "24/12/2025 09:15",
                status: "Pendente",
                responsavel: "Marina Lopes",
                descricao: "Pedido de remoção de conteúdo da plataforma devido a direitos autorais."
            }
        };

        btnDetalhes.forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.pedidoId;
                const info = dadosFicticios[id] || {
                    cliente: "-",
                    email: "-",
                    tipo: "-",
                    dataHora: "-",
                    status: "-",
                    responsavel: "-",
                    descricao: "-"
                };

                // Preenche o painel com os dados
                document.getElementById("detalhesTitulo").textContent = `Pedido #${id}`;
                document.getElementById("detalhesCliente").textContent = info.cliente;
                document.getElementById("detalhesEmail").textContent = info.email;
                document.getElementById("detalhesTipo").textContent = info.tipo;
                document.getElementById("detalhesDataHora").textContent = info.dataHora;
                document.getElementById("detalhesStatus").textContent = info.status;
                document.getElementById("detalhesResponsavel").textContent = info.responsavel;
                document.getElementById("detalhesDescricao").textContent = info.descricao;

                // Exibe o painel
                painel.style.display = "block";
            });
        });

        btnFechar.addEventListener("click", () => {
            painel.style.display = "none";
        });

        // Inicialmente esconde o painel
        painel.style.display = "none";
    }

    // =========================
    // FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO DO MÓDULO
    // =========================
    function initGerencia() {
        initAbas();
        initSubAbas();
        initPainelPedidos();

        // espaço para futuras inicializações: gráficos, fetch, filtros, sockets
    }

    // =========================
    // FUNÇÃO DE ENTRADA DO MÓDULO
    // =========================
    window.initGerenciaModule = function () {
        initGerencia();
    };

})();

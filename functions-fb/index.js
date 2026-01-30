/*
// Funcionalidade: Sincroniza as custom claims do Firebase Authentication
// com os dados armazenados no Firestore na coleção 'users'.
// Sempre que um documento é criado ou atualizado, as claims são atualizadas.
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

// Esta função roda toda vez que um documento na coleção 'users' é criado ou editado
exports.syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
    const data = event.data.after.exists ? event.data.after.data() : null;
    const uid = event.params.userId;

    if (!data) {
        console.log(`Usuário ${uid} deletado. Nenhuma claim para atualizar.`);
        return;
    }

    // Pegamos o role e o setor do Firestore para colocar no "crachá" (Token)
    const customClaims = {
        role: data.role || "USER",
        setor: data.setor || []
    };

    try {
        // Grava as informações no Firebase Authentication
        await admin.auth().setCustomUserClaims(uid, customClaims);
        console.log(`Sucesso: Claims atualizadas para ${uid} (${data.role})`);
    } catch (error) {
        console.error(`Erro ao atualizar claims para ${uid}:`, error);
    }
}); 

*/

// 1. IMPORTAÇÕES (Centralizadas no topo)
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// 2. INICIALIZAÇÃO (Apenas uma vez)
admin.initializeApp();

/**
 * FUNÇÃO 1: syncUserClaims
 * Sincroniza os custom claims (roles) do Auth com o Firestore.
 */
exports.syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
    const data = event.data.after.exists ? event.data.after.data() : null;
    const uid = event.params.userId;

    if (!data) {
        console.log(`Usuário ${uid} deletado. Nenhuma claim para atualizar.`);
        return;
    }

    const customClaims = {
        role: data.role || "USER",
        setor: data.setor || []
    };

    try {
        await admin.auth().setCustomUserClaims(uid, customClaims);
        console.log(`Sucesso: Claims atualizadas para ${uid} (${data.role})`);
    } catch (error) {
        console.error(`Erro ao atualizar claims para ${uid}:`, error);
    }
});

/**
 * FUNÇÃO 2: whatsappWebhook
 * WEBHOOK PARA WHATSAPP BUSINESS API (Oficial)
 * Recebe mensagens e cria tickets integrados ao seu fluxo.
 */
exports.whatsappWebhook = onRequest(async (req, res) => {
    // Verificação de Segurança da Meta (Handshake GET)
    if (req.method === "GET") {
        const verifyToken = "lujo_network_secret_token"; 
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode && token === verifyToken) {
            console.log("✅ Webhook Verificado com Sucesso!");
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }

    // Recebimento da Mensagem (POST)
    if (req.method === "POST") {
        const body = req.body;

        try {
            if (body.object === "whatsapp_business_account" && 
                body.entry?.[0].changes?.[0].value?.messages?.[0]) {
                
                const msg = body.entry[0].changes[0].value.messages[0];
                const contact = body.entry[0].changes[0].value.contacts[0];
                
                const telefone = msg.from;
                const nomeCliente = contact.profile.name || "Cliente WhatsApp";
                const textoMensagem = msg.text ? msg.text.body : "Mídia/Anexo recebido";

                const db = admin.firestore();

                // Busca Ticket Ativo (Status conforme sua TicketStateMachine.js)
                const ticketRef = db.collection("tickets");
                const snapshot = await ticketRef
                    .where("clienteTelefone", "==", telefone)
                    .where("status", "not-in", ["CONCLUIDO", "ACAO_ADMINISTRATIVA_APLICADA"])
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    // CRIA NOVO TICKET - Estado: NOVO
                    const novoTicket = {
                        clienteNome: nomeCliente,
                        clienteTelefone: telefone,
                        status: "NOVO", 
                        canal: "whatsapp",
                        ultimaMensagem: textoMensagem,
                        dataAbertura: admin.firestore.FieldValue.serverTimestamp(),
                        historico: [{
                            autor: "cliente",
                            texto: textoMensagem,
                            hora: new Date().toISOString()
                        }],
                        timeline: [{
                            hora: new Date().toLocaleTimeString(),
                            texto: "Ticket aberto via WhatsApp"
                        }]
                    };

                    await ticketRef.add(novoTicket);
                    console.log(`📩 Novo ticket criado para: ${nomeCliente}`);
                } else {
                    // ATUALIZA TICKET EXISTENTE
                    const doc = snapshot.docs[0];
                    await doc.ref.update({
                        ultimaMensagem: textoMensagem,
                        dataAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
                        historico: admin.firestore.FieldValue.arrayUnion({
                            autor: "cliente",
                            texto: textoMensagem,
                            hora: new Date().toISOString()
                        })
                    });
                    console.log(`💬 Mensagem adicionada ao ticket de: ${nomeCliente}`);
                }
            }
            return res.status(200).send("EVENT_RECEIVED");
        } catch (error) {
            console.error("❌ Erro ao processar Webhook:", error);
            return res.sendStatus(500);
        }
    }

    return res.sendStatus(404);
});
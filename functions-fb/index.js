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
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createManagedUser = onCall(async (request) => {
  // 1. Verifica se quem está chamando está autenticado
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado.");
  }

  const { email, password, userData } = request.data;
  const callerUid = request.auth.uid;

  try {
    // 2. Busca dados de quem está criando o usuário (o Admin ou Cliente Master)
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData) {
      throw new HttpsError("not-found", "Dados do criador não encontrados.");
    }

    // 3. SEGURANÇA: Impede a criação de perfil "ADMIN" (seu perfil master)
    if (userData.role === "ADMIN") {
      throw new HttpsError("permission-denied", "Apenas o SuperAdmin pode criar Admins.");
    }

    // 4. HIERARQUIA: O cliente só cria cargos de nível inferior ao dele
    // Níveis menores (ex: 1) são mais poderosos que níveis maiores (ex: 3)
    if (callerData.role !== "ADMIN") {
        if (userData.roleLevel <= callerData.roleLevel) {
            throw new HttpsError("permission-denied", "Você não tem nível suficiente para criar este cargo.");
        }
    }

    // 5. CRIAR NO AUTH (Isso acontece no servidor, por isso não te desloga)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: userData.name
    });

    // 6. SALVAR NO FIRESTORE COM VÍNCULO DE EMPRESA (tenantId)
    const finalUserData = {
      ...userData,
      uid: userRecord.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: callerUid,
      // Se o criador já tem empresa (tenantId), o novo herda. Se não tem, o novo vira a empresa do criador.
      tenantId: callerData.tenantId || callerUid 
    };

    await admin.firestore().collection("users").doc(userRecord.uid).set(finalUserData);

    return { success: true, message: "Usuário criado com sucesso!" };

  } catch (error) {
    console.error("Erro na Function:", error);
    throw new HttpsError("internal", error.message);
  }
});
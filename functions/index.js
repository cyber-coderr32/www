const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// 1. AUTENTICAÇÃO OAUTH2 (obter access_token com cache em memória)
let cachedAccessToken = null;
let tokenExpiryTime = 0; // timestamp ms

async function getAccessToken() {
  const now = Date.now();
  // Renova automaticamente ~60s antes de expires_in expirar (60000 ms)
  if (cachedAccessToken && now < tokenExpiryTime - 60000) {
    return cachedAccessToken;
  }

  const clientId = process.env.CAKTO_API_CLIENT_ID;
  const clientSecret = process.env.CAKTO_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[Cakto Cloud Function] Credenciais CAKTO_API_CLIENT_ID ou CAKTO_API_CLIENT_SECRET não encontradas nas variáveis de ambiente.");
    return null;
  }

  try {
    const response = await fetch("https://api.cakto.com.br/public_api/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CryptonBet/1.0"
      },
      signal: AbortSignal.timeout(5000),
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.access_token) {
        cachedAccessToken = data.access_token;
        const expiresInSeconds = data.expires_in || 36000;
        tokenExpiryTime = now + (expiresInSeconds * 1000);
        return cachedAccessToken;
      }
    } else {
      const errText = await response.text();
      console.error("[Cakto OAuth Error] Falha ao obter token:", response.status, errText);
    }
  } catch (err) {
    console.error("[Cakto OAuth Exception] Erro de rede ao buscar token:", err.message);
  }

  return null;
}

// 2. CRIAR COBRANÇA PIX
exports.gerarPix = functions.https.onRequest(async (req, res) => {
  // Configurar CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Idempotency-Key");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Método não permitido. Use POST." });
  }

  try {
    const {
      userId = null,
      amountUsdt = 10,
      amountBrl = 58.50,
      customerName = "Jogador CryptonBet",
      customerEmail = "suporte@cryptonbet.com",
      customerPhone = "5511999999999",
      customerCpf = "00000000000",
      docType = "cpf",
      docNumber = "00000000000",
      offerId,
      antifraudProfilingAttemptReference
    } = req.body || {};

    const token = await getAccessToken();
    const productId = process.env.CAKTO_PRODUCT_ID || "cryptonbet_deposito";
    const idempotencyKey = crypto.randomUUID();

    const cleanPhone = (customerPhone || "5511999999999").replace(/\D/g, "");
    const cleanDocNumber = (docNumber || customerCpf || "00000000000").replace(/\D/g, "");
    const cleanDocType = (docType || (cleanDocNumber.length > 11 ? "cnpj" : "cpf")).toLowerCase();

    // Montar corpo da requisição exatamente conforme especificado
    const payload = {
      productId: productId,
      paymentMethod: "pix",
      customer: {
        name: customerName,
        email: customerEmail,
        phone: cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`,
        docType: cleanDocType === "cnpj" ? "cnpj" : "cpf",
        docNumber: cleanDocNumber
      },
      items: [
        { offerId: offerId || process.env.CAKTO_OFFER_ID || "oferta_padrao" }
      ],
      pixExpiresIn: 3600
    };

    if (antifraudProfilingAttemptReference) {
      payload.antifraudProfilingAttemptReference = antifraudProfilingAttemptReference;
    }

    if (!token) {
      // Se não há token de API configurado em ambiente de produção/cloud functions, retornar erro ou fallback simulação
      console.warn("[Cakto PIX] Token de API não disponível. Verifique as variáveis de ambiente em functions/.env");
    } else {
      try {
        const response = await fetch("https://api.cakto.com.br/public_api/payments/", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CryptonBet/1.0"
          },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify(payload)
        });

        if (response.ok || response.status === 201) {
          const data = await response.json();
          const orderId = data.id || crypto.randomUUID();
          
          // Gravar o pedido no Firestore na coleção "orders" com id = order.id
          const orderDocData = {
            id: orderId,
            userId: userId ? String(userId) : null,
            customerName: customerName || "Jogador CryptonBet",
            status: data.status || "waiting_payment",
            refId: data.refId || orderId.substring(0, 8),
            pix: data.pix || {
              qrCode: data.pix_copy_paste || data.qr_code || "",
              qrCodeBase64: data.qr_code_base64 || "",
              expiresAt: data.expires_at || new Date(Date.now() + 3600000).toISOString()
            },
            customerEmail: customerEmail,
            amountUsdt: Number(amountUsdt),
            amountBrl: Number(amountBrl),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          };

          await db.collection("orders").doc(orderId).set(orderDocData);

          return res.status(201).json({
            status: "success",
            id: orderId,
            refId: orderDocData.refId,
            status_order: orderDocData.status,
            checkoutUrl: data.checkoutUrl || data.checkout_url || null,
            pix: orderDocData.pix,
            data: {
              txId: orderId,
              pixCopyPaste: orderDocData.pix.qrCode,
              qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderDocData.pix.qrCode)}`,
              amountBrl: Number(amountBrl),
              amountUsdt: Number(amountUsdt),
              expiresAt: Math.floor(Date.now() / 1000) + 3600,
              receiverName: "CAKTO PAY LTDA"
            }
          });
        } else {
          const errText = await response.text();
          console.error("[Cakto PIX Erro API Oficial]", response.status, errText);
        }
      } catch (err) {
        console.error("[Cakto PIX Exceção Chamada API]", err.message);
      }
    }

    // Modo de Simulação / Sandbox (quando API não responder ou credenciais não configuradas)
    const fallbackId = "CAKTO_ORD_" + crypto.randomUUID().substring(0, 12).toUpperCase();
    const pixKey = process.env.CAKTO_PIX_KEY || "pix@cryptonbet.com";
    const amountStr = Number(amountBrl).toFixed(2);
    const receiver = "CAKTO PAY LTDA";
    const city = "MARILIA";
    
    const tagValue = "54" + (amountStr.length >= 10 ? amountStr.length : "0" + amountStr.length) + amountStr;
    const tagReceiver = "59" + (receiver.length >= 10 ? receiver.length : "0" + receiver.length) + receiver;
    const tagCity = "60" + (city.length >= 10 ? city.length : "0" + city.length) + city;
    const shortTxId = fallbackId.substring(0, 15);
    const tagTxId = "62" + ((shortTxId.length + 4) >= 10 ? (shortTxId.length + 4) : "0" + (shortTxId.length + 4)) + "05" + (shortTxId.length >= 10 ? shortTxId.length : "0" + shortTxId.length) + shortTxId;
    
    const basePayload = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986${tagValue}5802BR${tagReceiver}${tagCity}${tagTxId}6304`;
    
    let crc = 0xFFFF;
    for (let i = 0; i < basePayload.length; i++) {
      crc ^= basePayload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    const crcStr = crc.toString(16).toUpperCase().padStart(4, "0");
    const pixCopyPaste = basePayload + crcStr;

    const fallbackOrderData = {
      id: fallbackId,
      userId: userId ? String(userId) : null,
      customerName: customerName || "Jogador CryptonBet",
      status: "waiting_payment",
      refId: fallbackId.substring(0, 8),
      pix: {
        qrCode: pixCopyPaste,
        qrCodeBase64: "",
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      customerEmail: customerEmail,
      amountUsdt: Number(amountUsdt),
      amountBrl: Number(amountBrl),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isSimulated: true
    };

    // Gravar no Firestore mesmo em simulação para que o front-end via onSnapshot funcione idêntico
    await db.collection("orders").doc(fallbackId).set(fallbackOrderData);

    return res.status(201).json({
      status: "success",
      id: fallbackId,
      refId: fallbackOrderData.refId,
      status_order: fallbackOrderData.status,
      pix: fallbackOrderData.pix,
      isSimulated: true,
      data: {
        txId: fallbackId,
        pixCopyPaste: pixCopyPaste,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopyPaste)}`,
        amountBrl: Number(amountBrl),
        amountUsdt: Number(amountUsdt),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        receiverName: receiver
      }
    });
  } catch (err) {
    console.error("[gerarPix Erro Geral]", err);
    return res.status(500).json({ status: "error", message: err.message || "Erro interno na Cloud Function gerarPix." });
  }
});

// 4.2. WEBHOOK — ESTE É O PONTO ONDE A INTEGRAÇÃO ESTÁ TRAVANDO, PRESTE ATENÇÃO ESPECIAL
exports.webhookCakto = functions.https.onRequest(async (req, res) => {
  // 1. Responde POST rápido / CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Cakto-Secret, X-Webhook-Secret");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // 4.3. Depurar o formato exato do payload: log todos os headers e o body na primeira rodada
  console.log("HEADERS:", JSON.stringify(req.headers));
  console.log("BODY:", JSON.stringify(req.body));

  try {
    const payload = Object.keys(req.body || {}).length > 0 ? req.body : (req.query || {});
    const configuredSecret = process.env.CAKTO_WEBHOOK_SECRET;

    // 2. Valida a autenticidade do evento
    if (configuredSecret) {
      const receivedSecret = 
        payload.secret || 
        payload?.fields?.secret || 
        req.headers["x-cakto-secret"] || 
        req.headers["x-webhook-secret"] || 
        req.headers["authorization"] || 
        req.query.secret;

      // Se o secret recebido não bater com process.env.CAKTO_WEBHOOK_SECRET, responda 401 e não processe
      if (!receivedSecret || (receivedSecret !== configuredSecret && !String(receivedSecret).includes(configuredSecret))) {
        console.warn("[Cakto Webhook] Autenticação falhou: O secret recebido não confere com CAKTO_WEBHOOK_SECRET.");
        return res.status(401).json({ status: "error", message: "Unauthorized webhook secret." });
      }
    }

    // 3. Se autenticado, leia event.type (ou campo equivalente) e o refId/id do pedido
    const eventType = payload.event || payload.type || payload.event_type || payload.status || "event_received";
    const orderId = payload.id || payload.reference_id || payload.order_id || payload.refId || payload?.data?.id || payload?.data?.reference_id;

    if (orderId) {
      let newStatus = "waiting_payment";
      const statusLower = String(eventType).toLowerCase();
      
      if (statusLower.includes("paid") || statusLower.includes("approved") || statusLower === "purchase_approved" || statusLower === "pix_gerado" && payload.status === "paid" || payload.paid === true) {
        newStatus = "paid";
      } else if (statusLower.includes("refused") || statusLower === "purchase_refused") {
        newStatus = "refused";
      } else if (statusLower.includes("refund") || statusLower === "refund") {
        newStatus = "refunded";
      } else if (statusLower.includes("chargeback")) {
        newStatus = "chargeback";
      }

      console.log(`[Cakto Webhook] Processando pedido ${orderId} para status: ${newStatus} (Evento: ${eventType})`);
      
      try {
        const orderRef = db.collection("orders").doc(String(orderId));
        const orderSnap = await orderRef.get();
        const orderData = orderSnap.exists ? orderSnap.data() : null;

        if (newStatus === "paid" && orderData && orderData.status === "paid") {
          console.log(`[Cakto Webhook] Pedido ${orderId} já consta como PAGO no Firestore. Ignorando crédito duplicado.`);
        } else {
          await orderRef.set({
            status: newStatus,
            lastEvent: eventType,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            webhookPayload: payload
          }, { merge: true });

          if (newStatus === "paid") {
            const userId = orderData?.userId || payload?.userId || payload?.client_id;
            const customerEmail = orderData?.customerEmail || payload?.customer?.email || payload?.email;
            const amountUsdt = Number(orderData?.amountUsdt || (Number(payload?.amount || 0) / 5.85) || 10);
            const amountBrl = Number(orderData?.amountBrl || payload?.amount || (amountUsdt * 5.85));

            let userRef = null;
            let userDocId = null;
            let userData = null;

            if (userId) {
              const uRef = db.collection("users").doc(String(userId));
              const uSnap = await uRef.get();
              if (uSnap.exists) {
                userRef = uRef;
                userDocId = uSnap.id;
                userData = uSnap.data();
              }
            }

            if (!userRef && customerEmail) {
              const uQuery = await db.collection("users").where("email", "==", String(customerEmail)).limit(1).get();
              if (!uQuery.empty) {
                userRef = uQuery.docs[0].ref;
                userDocId = uQuery.docs[0].id;
                userData = uQuery.docs[0].data();
              }
            }

            if (userRef && userDocId && userData) {
              const currentBalance = Number(userData.balance || 0);
              const newBalance = currentBalance + amountUsdt;
              await userRef.update({
                balance: newBalance,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log(`✅ [Cakto Webhook Cloud Function] Saldo creditado! Usuário ${userDocId}: +${amountUsdt} USDT (Novo saldo: ${newBalance.toFixed(2)} USDT)`);

              await db.collection("transactions").doc(String(orderId)).set({
                id: String(orderId),
                userId: userDocId,
                userName: userData.name || userData.displayName || "Jogador PIX",
                type: "DEPOSIT",
                amount: amountUsdt,
                amountBrl: amountBrl,
                method: `PIX Automático (R$ ${amountBrl.toFixed(2)})`,
                status: "APPROVED",
                timestamp: new Date().toLocaleString("pt-PT"),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
            } else {
              console.warn(`⚠️ [Cakto Webhook Cloud Function] Não foi possível localizar usuário no Firestore (Email: ${customerEmail}, UserID: ${userId}).`);
            }
          }
        }
      } catch (dbErr) {
        console.error("[Cakto Webhook] Erro ao atualizar documento no Firestore:", dbErr.message);
      }
    } else {
      console.warn("[Cakto Webhook] ID de pedido não encontrado no payload recebido.");
    }

    // 4. Responda 200 com corpo { "received": true } em até 5 segundos
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[Cakto Webhook Exceção]", err.message);
    return res.status(200).json({ received: true, error: err.message });
  }
});

// Script avulso / one-off para criar o webhook da Cakto uma única vez
// Execução: node createWebhook.js
// IMPORTANTE: Após a execução, copie o valor de fields.secret retornado e salve como CAKTO_WEBHOOK_SECRET no arquivo functions/.env e/ou .env root.

require("dotenv").config();

async function run() {
  const clientId = process.env.CAKTO_API_CLIENT_ID || process.env.CAKTO_CLIENT_ID;
  const clientSecret = process.env.CAKTO_API_CLIENT_SECRET || process.env.CAKTO_CLIENT_SECRET;
  const productId = process.env.CAKTO_PRODUCT_ID;
  const webhookUrl = process.env.CAKTO_WEBHOOK_URL || "https://SEU-PROJETO.cloudfunctions.net/webhookCakto";

  if (!clientId || !clientSecret) {
    console.error("❌ Erro: Defina CAKTO_API_CLIENT_ID e CAKTO_API_CLIENT_SECRET nas suas variáveis de ambiente ou arquivo .env antes de rodar este script.");
    process.exit(1);
  }

  console.log("🔐 Obtendo access_token na Cakto...");
  try {
    const tokenRes = await fetch("https://api.cakto.com.br/public_api/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("❌ Falha na autenticação OAuth2:", tokenRes.status, err);
      process.exit(1);
    }

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    console.log("✅ access_token obtido com sucesso!");

    console.log(`🌐 Criando Webhook para URL: ${webhookUrl}...`);
    const webhookPayload = {
      name: "Notificações de pagamento",
      url: webhookUrl,
      events: ["purchase_approved", "pix_gerado", "purchase_refused", "refund", "chargeback"],
      status: "active"
    };

    if (productId) {
      webhookPayload.products = [productId];
    }

    const res = await fetch("https://api.cakto.com.br/public_api/webhook/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(webhookPayload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log("\n🎉 WEBHOOK CRIADO COM SUCESSO!");
      console.log("================================================================");
      console.log("ID do Webhook:", data.id);
      console.log("Status:", data.status);
      const secret = data?.fields?.secret || data?.secret || "Verifique no painel ou resposta JSON";
      console.log("⚠️ SECRET DO WEBHOOK:", secret);
      console.log("================================================================");
      console.log("\n👉 REGRA INEGOCIÁVEL DE SEGURANÇA: Copie o secret acima e salve exclusivamente na sua variável de ambiente CAKTO_WEBHOOK_SECRET no arquivo functions/.env (fora do git). Nunca o exponha no front-end!");
    } else {
      const errText = await res.text();
      console.error("❌ Erro ao criar webhook na Cakto:", res.status, errText);
    }
  } catch (err) {
    console.error("❌ Exceção na execução de createWebhook:", err.message);
  }
}

run();

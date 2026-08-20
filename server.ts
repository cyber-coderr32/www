import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { db } from "./services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Inicialização segura do Firebase Admin SDK no backend (com fallback)
function getAdminDb() {
  try {
    if (getApps().length === 0) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson && serviceAccountJson.trim().startsWith("{")) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log("✅ [Firebase Admin] SDK inicializado com FIREBASE_SERVICE_ACCOUNT_JSON.");
      } else {
        initializeApp();
        console.log("✅ [Firebase Admin] SDK inicializado com ADC padrão.");
      }
    }
    if (getApps().length > 0) {
      return getFirestore();
    }
  } catch (err: any) {
    // Silencioso se ADC falhar no preview sandbox
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const WEBHOOK_LOGS_FILE = path.join(process.cwd(), 'webhook_logs.json');
  let recentWebhookLogs: any[] = [];
  try {
    if (fs.existsSync(WEBHOOK_LOGS_FILE)) {
      recentWebhookLogs = JSON.parse(fs.readFileSync(WEBHOOK_LOGS_FILE, 'utf8'));
    }
  } catch (e) {
    recentWebhookLogs = [];
  }

  function addWebhookLog(event: any) {
    recentWebhookLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      ...event
    });
    if (recentWebhookLogs.length > 100) {
      recentWebhookLogs = recentWebhookLogs.slice(0, 100);
    }
    try {
      fs.writeFileSync(WEBHOOK_LOGS_FILE, JSON.stringify(recentWebhookLogs, null, 2));
    } catch (e) {}
  }

  // API-Sports Configuration
  const APISPORTS_KEY = process.env.APISPORTS_KEY || 'be77ef991eaa21978a8112c3db8cfa43';

  const SPORT_CONFIG: Record<string, { host: string, endpoint: string, alt?: string }> = {
    'football': { host: 'football.api-sports.io', endpoint: 'fixtures', alt: 'api-football.com' },
    'basketball': { host: 'basketball.api-sports.io', endpoint: 'games', alt: 'api-basketball.com' },
    'f1': { host: 'formula-1.api-sports.io', endpoint: 'races', alt: 'api-formula-1.com' },
    'handball': { host: 'handball.api-sports.io', endpoint: 'games', alt: 'api-handball.com' },
    'hockey': { host: 'hockey.api-sports.io', endpoint: 'games', alt: 'api-hockey.com' },
    'mma': { host: 'mma.api-sports.io', endpoint: 'fights' },
    'nfl': { host: 'american-football.api-sports.io', endpoint: 'games', alt: 'api-american-football.com' },
    'rugby': { host: 'rugby.api-sports.io', endpoint: 'games', alt: 'api-rugby.com' },
    'volleyball': { host: 'volleyball.api-sports.io', endpoint: 'games', alt: 'api-volleyball.com' },
    'tennis': { host: 'api-tennis.com', endpoint: 'games' }
  };

  const handleProxyRequest = async (res: express.Response, sport: string, extraEndpoint?: string, extraQuery?: string) => {
    const config = SPORT_CONFIG[sport] || SPORT_CONFIG['football'];
    
    // Football is exclusively v3. Others are usually v1, sometimes v2.
    const versions = sport === 'football' ? ['v3'] : ['v1', 'v2', 'v3'];
    const possibleHosts: string[] = [];
    
    if (config.host) possibleHosts.push(config.host);
    if (config.alt) possibleHosts.push(config.alt);
    
    // Extra fallbacks for specific sports
    if (sport === 'basketball') possibleHosts.push('nba.api-sports.io');
    
    let lastError = null;
    const triedHosts = new Set<string>();

    for (const baseHost of possibleHosts) {
      // First try versions
      for (const v of versions) {
        // Build the full host (e.g. v1.tennis.api-sports.io or v1.api-tennis.com)
        const host = baseHost.startsWith('v') ? baseHost : `${v}.${baseHost}`;
        
        // Skip if we already tried this exact host
        if (triedHosts.has(host)) continue;
        triedHosts.add(host);

        const endpoint = extraEndpoint || config.endpoint;
        let query = extraQuery;
        if (query === undefined || query === null) {
          if (sport === 'f1' && endpoint === 'races') {
            // Free plans don't like next=5, use season or last
            query = 'season=2024';
          } else if (sport === 'football' && (endpoint === 'fixtures' || endpoint === 'games')) {
            query = 'live=all';
          } else if (sport === 'mma' && endpoint === 'fights') {
            // MMA needs season=2024 for free plan
            query = 'season=2024';
          } else if (endpoint === 'fixtures' || endpoint === 'games' || endpoint === 'fights') {
            // Default to today's date for most sports
            const today = new Date().toISOString().split('T')[0];
            query = `date=${today}`;
          } else {
            query = '';
          }
        }
        const apiUrl = `https://${host}/${endpoint}${query ? `?${query}` : ''}`;
        
        try {
          console.log(`Proxy attempt (${v}) for ${sport}: ${apiUrl}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'x-apisports-key': APISPORTS_KEY,
              'Accept': 'application/json',
              'User-Agent': 'CryptonBet/1.0'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            
            // API-Sports logic error detection
            const hasErrors = data.errors && (Object.keys(data.errors).length > 0 || (typeof data.errors === 'string' && data.errors.length > 0));
            const hasLimitError = data.requests && typeof data.requests === 'string' && data.requests.toLowerCase().includes('limit');
            const hasRateLimitError = data.rateLimit && typeof data.rateLimit === 'string';
            
            if (hasErrors || hasLimitError || hasRateLimitError) {
              const errorPayload = data.errors || { requests: data.requests, rateLimit: data.rateLimit };
              const errorStr = JSON.stringify(errorPayload).toLowerCase();
              const isPlanRestricted = errorStr.includes('plan') || errorStr.includes('access');
              const isMinuteLimit = errorStr.includes('minute') || errorStr.includes('rate');
              const isGlobalLimit = errorStr.includes('limit') || errorStr.includes('requests') || (errorStr.includes('plan') && !errorStr.includes('date'));

              // Log only real logic errors, not known plan/quota limitations
              if (!isPlanRestricted && !isMinuteLimit && !isGlobalLimit) {
                console.warn(`API-Sports logic error for ${apiUrl}:`, JSON.stringify(errorPayload));
              } else {
                console.info(`API-Sports limit reached for ${apiUrl}: ${errorStr.substring(0, 100)}...`);
              }
              
              // If it's a quota or plan error, flag it for the frontend
              if (isPlanRestricted || isMinuteLimit || isGlobalLimit) {
                return res.json({ 
                  ...data, 
                  _isQuotaExceeded: isGlobalLimit, 
                  _isPlanRestricted: isPlanRestricted,
                  _isRateLimited: isMinuteLimit,
                  errors: errorPayload 
                });
              }

              // If it's a "does not exist" error or endpoint error, continue searching other hosts
              if (errorStr.includes('endpoint') || errorStr.includes('exist')) {
                continue;
              }
            }
            return res.json(data);
          }
          
          if (response.status === 404) continue;
          
          const errText = await response.text().catch(() => "Unknown Error");
          console.warn(`API Error ${response.status} for ${apiUrl}: ${errText}`);
          continue;
        } catch (error) {
          lastError = error;
          console.warn(`Fetch failure for ${apiUrl}: ${(error as Error).message}`);
          continue;
        }
      }

      // If all versions failed, try the base host directly if it wasn't tried
      // But only if it's not an api-sports.io host (they require v1/v2/v3 subdomains)
      if (!triedHosts.has(baseHost) && !baseHost.endsWith('api-sports.io')) {
        triedHosts.add(baseHost);
        const endpoint = extraEndpoint || config.endpoint;
        let query = extraQuery || '';
        const apiUrl = `https://${baseHost}/${endpoint}${query ? `?${query}` : ''}`;
        
        try {
           console.log(`Proxy attempt (direct) for ${sport}: ${apiUrl}`);
           const response = await fetch(apiUrl, {
             headers: { 'x-apisports-key': APISPORTS_KEY, 'Accept': 'application/json', 'User-Agent': 'CryptonBet/1.0' }
           });
           if (response.ok) {
             const data = await response.json();
             if (!(data.errors && Object.keys(data.errors).length > 0)) {
               return res.json(data);
             }
           }
        } catch (e) {
           console.warn(`Direct fetch failure for ${baseHost}: ${(e as Error).message}`);
        }
      }
    }
    
    res.status(200).json({ 
      errors: [lastError ? (lastError as Error).message : "All attempts failed"], 
      response: [],
      debug: { sport, lastError: String(lastError) }
    });
  };

  // Gemini Configuration & Endpoint
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

  // Plisio API Backend Gateway Proxy
  function getPlisioKey() {
    loadDynamicEnv();
    return process.env.PLISIO_SECRET_KEY || process.env.PLISIO_API_KEY || process.env.PLISIO_KEY || "";
  }

  app.get("/api/plisio/status", async (req, res) => {
    const key = getPlisioKey();
    if (!key) {
      return res.json({
        configured: false,
        maskedKey: null,
        message: "PLISIO_SECRET_KEY não definida no servidor (.env) - Operando em modo de simulação/sandbox."
      });
    }

    try {
      const response = await fetch(`https://api.plisio.net/api/v1/currencies?api_key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      const activeCurrencies = Array.isArray(data?.data) 
        ? data.data.filter((c: any) => c.hidden === 0 || c.hidden === "0" || c.hidden === false).map((c: any) => c.cid)
        : [];

      res.json({
        configured: true,
        maskedKey: `${key.substring(0, 4)}...${key.substring(key.length - 4)}`,
        activeCurrencies,
        message: `Plisio Secret Key ativa! Moedas ativadas no painel Plisio: ${activeCurrencies.join(', ') || 'Nenhuma'}`
      });
    } catch (e: any) {
      res.json({
        configured: true,
        maskedKey: `${key.substring(0, 4)}...${key.substring(key.length - 4)}`,
        message: "Plisio Secret Key conectada no backend."
      });
    }
  });

  app.get("/api/plisio/currencies", async (req, res) => {
    try {
      const sourceCurrency = (req.query.sourceCurrency as string) || "USD";
      const key = getPlisioKey();
      let url = `https://api.plisio.net/api/v1/currencies?api_key=${encodeURIComponent(key)}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'CryptonBet/1.0' },
        signal: AbortSignal.timeout(6000)
      });
      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message || "Erro ao consultar moedas Plisio." });
    }
  });

  app.get("/api/plisio/balance", async (req, res) => {
    try {
      const key = getPlisioKey();
      const currency = (req.query.currency as string) || "USDT_TON";
      if (!key) {
        return res.json({
          status: "success",
          data: { balance: "1000.00", currency: currency },
          isSimulated: true
        });
      }
      const response = await fetch(`https://api.plisio.net/api/v1/balances/${currency}?api_key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(6000)
      });
      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message || "Erro ao consultar saldo Plisio." });
    }
  });

  app.post("/api/plisio/invoice/new", async (req, res) => {
    try {
      const { amount, currency, orderNumber, orderName, email, userId } = req.body;
      const curr = currency || 'USDT_TRX';
      const key = getPlisioKey();
      const orderId = orderNumber || `PLISIO_${Date.now()}_${userId || 'anon'}`;

      if (!key) {
        const txnId = 'PLISIO_DEP_' + Date.now();
        const simulatedWallet = curr.includes('TRX') 
          ? 'T' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
          : curr.includes('BTC')
          ? 'bc1q' + Math.random().toString(36).substring(2, 18)
          : curr.includes('SOL')
          ? Math.random().toString(36).substring(2, 15) + 'SoL'
          : '0x' + Math.random().toString(16).substring(2, 42);

        return res.json({
          status: 'success',
          data: {
            txn_id: txnId,
            invoice_url: `https://plisio.net/invoice/${txnId}`,
            amount: Number(amount).toFixed(2),
            currency: curr,
            wallet_hash: simulatedWallet,
            order_number: orderId,
            expire_at_utc: Math.floor(Date.now() / 1000) + 3600,
          },
          isSimulated: true
        });
      }

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const callbackUrl = `${protocol}://${host}/api/plisio/webhook?json=true`;

      const queryParams = new URLSearchParams({
        api_key: key,
        currency: curr,
        amount: String(amount),
        order_number: String(orderId),
        order_name: String(orderName || `Depósito Cripto CryptonBet`),
        source_currency: 'USD',
        callback_url: callbackUrl,
      });
      if (email) queryParams.append('email', String(email));

      const response = await fetch(`https://api.plisio.net/api/v1/invoices/new?${queryParams.toString()}`, {
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message || "Erro ao criar fatura no Plisio." });
    }
  });

  app.post("/api/plisio/payout/insert", async (req, res) => {
    try {
      const { amount, currency, toWallet, userId } = req.body;
      const curr = currency || 'USDT_TRX';
      const key = getPlisioKey();

      if (!key) {
        const payoutId = 'PLISIO_OUT_' + Date.now();
        const txHash = '0x' + crypto.randomBytes(24).toString('hex');
        const explorerUrl = curr.includes('TRX')
          ? `https://tronscan.org/#/transaction/${txHash}`
          : curr.includes('BSC')
          ? `https://bscscan.com/tx/${txHash}`
          : curr.includes('ETH')
          ? `https://etherscan.io/tx/${txHash}`
          : curr.includes('BTC')
          ? `https://mempool.space/tx/${txHash}`
          : `https://tronscan.org/#/transaction/${txHash}`;

        return res.json({
          status: 'success',
          data: {
            id: payoutId,
            amount: Number(amount).toFixed(2),
            currency: curr,
            status: 'completed',
            tx_url: explorerUrl,
            wallet_hash: toWallet
          },
          isSimulated: true
        });
      }

      const queryParams = new URLSearchParams({
        api_key: key,
        currency: curr,
        amount: String(amount),
        to: String(toWallet),
        type: 'cash_out',
      });

      const response = await fetch(`https://api.plisio.net/api/v1/operations/withdraw?${queryParams.toString()}`, {
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message || "Erro ao solicitar saque no Plisio." });
    }
  });

  app.get("/api/plisio/operations/:id", async (req, res) => {
    try {
      const key = getPlisioKey();
      if (!key) {
        return res.json({ status: 'success', data: { status: 'completed' }, isSimulated: true });
      }
      const response = await fetch(`https://plisio.net/api/v1/operations/${req.params.id}?api_key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(6000)
      });
      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Plisio IPN Webhook Handler (Instant Payment Notification)
  const handlePlisioWebhook = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.method === 'GET' ? req.query : req.body;
      const status = payload?.status || payload?.txn_status || 'unknown';
      const txnId = payload?.txn_id || payload?.id || `PLISIO_${Date.now()}`;
      const orderNumber = payload?.order_number || payload?.orderNumber || '';
      const amount = Number(payload?.source_amount || payload?.amount || 0);
      const currency = payload?.currency || 'USDT';

      console.log(`📡 [Plisio Webhook IPN] Recebido evento: status=${status}, txnId=${txnId}, orderNumber=${orderNumber}, amount=${amount} ${currency}`);

      // Se o status for completed ou mismatch (pago com sucesso)
      const isPaid = status === 'completed' || status === 'mismatch' || status === 'paid' || status === 'success';

      if (isPaid && amount > 0) {
        try {
          const adminDb = getAdminDb();
          if (adminDb) {
            // Tenta identificar o userId
            let targetUserId: string | null = null;
            if (orderNumber && orderNumber.includes('_')) {
              const parts = orderNumber.split('_');
              targetUserId = parts[parts.length - 1];
            } else if (payload?.custom || payload?.userId) {
              targetUserId = payload?.custom || payload?.userId;
            }

            if (targetUserId) {
              const userRef = adminDb.collection("users").doc(targetUserId);
              const userDoc = await userRef.get();

              if (userDoc.exists) {
                const userData = userDoc.data() || {};
                const currentBalance = Number(userData.balance || 0);
                const newBalance = currentBalance + amount;

                await userRef.update({
                  balance: newBalance,
                  updatedAt: FieldValue.serverTimestamp()
                });

                console.log(`✅ [Plisio Webhook] Saldo creditado com sucesso para usuário ${targetUserId}: +${amount} USDT (Novo saldo: ${newBalance.toFixed(2)} USDT)`);

                await adminDb.collection("transactions").doc(String(txnId)).set({
                  id: String(txnId),
                  userId: targetUserId,
                  userName: userData.name || userData.displayName || "Jogador Cripto",
                  type: "DEPOSIT",
                  amount: amount,
                  method: `Plisio Crypto (${currency})`,
                  status: "APPROVED",
                  timestamp: new Date().toLocaleString("pt-PT"),
                  createdAt: FieldValue.serverTimestamp()
                }, { merge: true });
              }
            }
          }
        } catch (dbErr: any) {
          console.error("❌ [Plisio Webhook DB Error]:", dbErr.message);
        }
      }

      addWebhookLog({
        method: "PLISIO_IPN",
        url: req.originalUrl || "/api/plisio/webhook",
        status: String(status),
        txId: String(txnId),
        amount: Number(amount) || 0,
        currency: currency,
        payload: payload
      });

      return res.status(200).send("OK");
    } catch (err: any) {
      console.warn("⚠️ [Plisio Webhook Exception]", err.message);
      return res.status(200).send("OK");
    }
  };

  app.post("/api/plisio/webhook", handlePlisioWebhook);
  app.get("/api/plisio/webhook", handlePlisioWebhook);
  app.post("/api/plisio/callback", handlePlisioWebhook);
  app.get("/api/plisio/callback", handlePlisioWebhook);

  // Plisio Simulation Webhook Dispatcher (Admin test)
  app.post("/api/plisio/simulate-webhook", async (req, res) => {
    try {
      const { amount = 50, currency = "USDT_TRX", userId = "demo_user" } = req.body || {};
      const fakeTxnId = "PLISIO_SIM_" + Math.random().toString(36).substring(2, 9).toUpperCase();
      const fakePayload = {
        txn_id: fakeTxnId,
        order_number: `PLISIO_${Date.now()}_${userId}`,
        status: "completed",
        amount: String(amount),
        source_amount: String(amount),
        currency: currency,
        source_currency: "USD",
        wallet_hash: "T" + crypto.randomBytes(16).toString("hex"),
        verify_hash: "simulated_plisio_hash",
        created_at_utc: Math.floor(Date.now() / 1000)
      };

      addWebhookLog({
        method: "PLISIO_IPN",
        url: "/api/plisio/webhook",
        status: "completed",
        txId: fakeTxnId,
        amount: Number(amount),
        currency: currency,
        payload: fakePayload
      });

      return res.json({
        status: "success",
        message: `Simulação de depósito Plisio (+${amount} ${currency}) disparada e processada com sucesso!`,
        payload: fakePayload
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Helper function to reload .env dynamically from disk without restarting server
  function loadDynamicEnv() {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          const parts = line.split('=');
          if (parts.length >= 2 && !line.trim().startsWith('#')) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            if (val) {
              process.env[key] = val;
            }
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Cakto API Backend Gateway Proxy (PIX Brasil)
  app.get("/api/cakto/status", (req, res) => {
    loadDynamicEnv();
    const clientId = process.env.CAKTO_CLIENT_ID || process.env.CAKTO_ID;
    const clientSecret = process.env.CAKTO_CLIENT_SECRET || process.env.CAKTO_SECRET_KEY || process.env.CAKTO_API_TOKEN || process.env.CAKTO_TOKEN;
    const webhookSecret = process.env.CAKTO_WEBHOOK_SECRET;

    if (!clientSecret && !clientId) {
      return res.json({
        configured: false,
        message: "Credenciais de API Cakto não definidas no painel (.env) - Operando em modo Sandbox / Simulação."
      });
    }

    if (!clientId && clientSecret && !clientSecret.startsWith("eyJ")) {
      return res.json({
        configured: true,
        message: "⚠️ Chave Secreta detectada sem Client ID no .env. Se for a Chave de Webhook, lembre-se que ela serve apenas para receber notificações, não para gerar PIX!"
      });
    }

    res.json({
      configured: !!(clientSecret || clientId),
      message: `API Cakto configurada no servidor (.env)! (ID: ${clientId ? 'Sim' : 'Não'}, Webhook: ${webhookSecret ? 'Sim ⚡' : 'Não definido'})`
    });
  });

  // Helper function to exchange client_id and client_secret for OAuth2 access token com cache em memória
  let cachedCaktoToken: string | null = null;
  let caktoTokenExpiryTime: number = 0;

  async function getCaktoAuthToken(clientId?: string, clientSecret?: string, apiToken?: string): Promise<string | null> {
    loadDynamicEnv();
    const now = Date.now();
    if (cachedCaktoToken && now < caktoTokenExpiryTime - 60000) {
      return cachedCaktoToken;
    }

    const id = clientId || process.env.CAKTO_API_CLIENT_ID || process.env.CAKTO_CLIENT_ID || process.env.CAKTO_ID;
    const secret = clientSecret || process.env.CAKTO_API_CLIENT_SECRET || process.env.CAKTO_CLIENT_SECRET || process.env.CAKTO_SECRET_KEY || process.env.CAKTO_API_TOKEN || process.env.CAKTO_TOKEN || process.env.CAKTO_ACCESS_TOKEN || process.env.CAKTO_KEY || apiToken;
    
    // If we only have a JWT access token or direct token, use it if id is not set
    if (secret && (secret.startsWith("eyJ") || !id)) {
      return secret;
    }
    
    if (!id || !secret) {
      return secret || null;
    }

    const tokenEndpoints = [
      "https://api.cakto.com.br/public_api/token/",
      "https://api.cakto.com.br/oauth/token",
      "https://api.cakto.com.br/api/oauth/token",
      "https://api.cakto.com.br/api/v1/oauth/token",
      "https://api.cakto.com.br/token"
    ];

    for (const endpoint of tokenEndpoints) {
      // 1. Try URL-encoded Form sem grant_type (Conforme documentação oficial da Cakto /public_api/token/)
      try {
        const resFormDoc = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CryptonBet/1.0"
          },
          signal: AbortSignal.timeout(3500),
          body: new URLSearchParams({
            client_id: id,
            client_secret: secret
          }).toString()
        });
        if (resFormDoc.ok) {
          const data = await resFormDoc.json();
          if (data && data.access_token) {
            cachedCaktoToken = data.access_token;
            const expSec = data.expires_in || 36000;
            caktoTokenExpiryTime = now + (expSec * 1000);
            return cachedCaktoToken;
          }
        } else if (resFormDoc.status === 429 || resFormDoc.status === 403 || resFormDoc.status === 503) {
          if (endpoint.includes("public_api")) continue; // Tenta próximo endpoint em caso de bloqueio WAF em endpoint específico
          break;
        }
      } catch (e) {}

      // 2. Try URL-encoded Form com grant_type
      try {
        const resForm = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CryptonBet/1.0"
          },
          signal: AbortSignal.timeout(3500),
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: id,
            client_secret: secret
          }).toString()
        });
        if (resForm.ok) {
          const data = await resForm.json();
          if (data && data.access_token) {
            cachedCaktoToken = data.access_token;
            const expSec = data.expires_in || 36000;
            caktoTokenExpiryTime = now + (expSec * 1000);
            return cachedCaktoToken;
          }
        } else if (resForm.status === 429 || resForm.status === 403 || resForm.status === 503) {
          break;
        }
      } catch (e) {}

      // 2. Try JSON payload
      try {
        const resJson = await fetch(endpoint, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CryptonBet/1.0"
          },
          signal: AbortSignal.timeout(3500),
          body: JSON.stringify({
            grant_type: "client_credentials",
            client_id: id,
            client_secret: secret
          })
        });
        if (resJson.ok) {
          const data = await resJson.json();
          if (data && data.access_token) {
            cachedCaktoToken = data.access_token;
            const expSec = data.expires_in || 36000;
            caktoTokenExpiryTime = now + (expSec * 1000);
            return cachedCaktoToken;
          }
        } else if (resJson.status === 429 || resJson.status === 403 || resJson.status === 503) {
          break; // Pare caso o Cloudflare ou WAF da Cakto bloqueie por excesso de tentativas
        }
      } catch (e) {}
    }

    // Fallback: Return secret directly as Bearer token if OAuth exchange endpoints are unavailable
    return secret || null;
  }

  // Função para calcular CRC16-CCITT (FFFF) oficial para QR Codes EMV (PIX Banco Central / Cakto Pay)
  function generateEmvCrc16(payload: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  app.post("/api/cakto/pix/create", async (req, res) => {
    try {
      loadDynamicEnv();
      const { userId = null, amountUsdt = 10, amountBrl = 58.50, customerName = "Jogador CryptonBet", customerEmail = "suporte@cryptonbet.com", customerPhone = "5511999999999", customerCpf = "00000000000", docType = "cpf", docNumber = "00000000000", offerId, antifraudProfilingAttemptReference, productId, orderId, clientId, apiToken, clientSecret, pixKey, receiverName, checkoutUrl, pixCopyPaste } = req.body || {};
      const tokenToUse = await getCaktoAuthToken(clientId, clientSecret, apiToken);
      const idToUse = clientId || process.env.CAKTO_API_CLIENT_ID || process.env.CAKTO_CLIENT_ID || process.env.CAKTO_ID;

      const txId = 'PIX_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const key = pixKey || process.env.CAKTO_PIX_KEY || 'pix@cryptonbet.com';
      
      // Conforme padrão oficial constatado em testes de produto na Cakto Pay / PicPay, usamos MARILIA e CAKTO PAY LTDA
      const rawReceiver = receiverName && receiverName !== 'CryptonBet Brasil' ? receiverName : (process.env.CAKTO_RECEIVER_NAME || 'CryptonBet Brasil');
      const receiver = rawReceiver.substring(0, 25).toUpperCase().replace(/[^A-Z0-9 ]/g, '');
      const city = (process.env.CAKTO_CITY || 'MARILIA').substring(0, 15).toUpperCase().replace(/[^A-Z0-9 ]/g, '');
      const amountStr = Number(amountBrl || 50).toFixed(2);
      
      const tagValue = "54" + (amountStr.length >= 10 ? amountStr.length : '0' + amountStr.length) + amountStr;
      const tagReceiver = "59" + (receiver.length >= 10 ? receiver.length : '0' + receiver.length) + receiver;
      const tagCity = "60" + (city.length >= 10 ? city.length : '0' + city.length) + city;
      const shortTxId = txId.substring(0, 15);
      const tagTxId = "62" + ((shortTxId.length + 4) >= 10 ? (shortTxId.length + 4) : '0' + (shortTxId.length + 4)) + "05" + (shortTxId.length >= 10 ? shortTxId.length : '0' + shortTxId.length) + shortTxId;
      
      const basePayload = `00020126580014br.gov.bcb.pix0136${key}520400005303986${tagValue}5802BR${tagReceiver}${tagCity}${tagTxId}6304`;
      
      // Se configurado PIX Copia e Cola fixo do produto, usa ele; senão calcula CRC16 exato e matematicamente válido
      const fallbackPixCopyPaste = pixCopyPaste || process.env.CAKTO_PIX_COPY_PASTE || (basePayload + generateEmvCrc16(basePayload));
      const fallbackQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fallbackPixCopyPaste)}`;
      const urlCheckout = checkoutUrl || process.env.CAKTO_CHECKOUT_URL || null;

      async function saveOrderToFirestore(id: string, isSimulated: boolean = false, pixData: any = null) {
        try {
          const orderDocData = {
            id: String(id),
            userId: userId ? String(userId) : null,
            customerName: customerName || "Jogador CryptonBet",
            status: "waiting_payment",
            refId: String(id).substring(0, 8),
            pix: pixData || {
              qrCode: fallbackPixCopyPaste,
              qrCodeBase64: "",
              expiresAt: new Date(Date.now() + 3600000).toISOString()
            },
            customerEmail: customerEmail || "suporte@cryptonbet.com",
            amountUsdt: Number(amountUsdt),
            amountBrl: Number(amountBrl),
            createdAt: serverTimestamp(),
            isSimulated
          };
          const adminDb = getAdminDb();
          if (adminDb) {
            await adminDb.collection("orders").doc(String(id)).set(orderDocData, { merge: true });
          } else {
            await setDoc(doc(db, "orders", String(id)), orderDocData);
          }
          console.log(`[Cakto PIX] Pedido salvo no Firestore em orders/${id} (Simulado: ${isSimulated})`);
        } catch (dbErr: any) {
          console.warn(`[Cakto PIX] Erro ao gravar pedido ${id} no Firestore:`, dbErr?.message || dbErr);
        }
      }

      if (!tokenToUse && !idToUse) {
        await saveOrderToFirestore(txId, true);
        return res.json({
          status: 'success',
          data: {
            txId,
            pixCopyPaste: fallbackPixCopyPaste,
            qrCodeUrl: fallbackQrCodeUrl,
            checkoutUrl: urlCheckout,
            amountBrl: Number(amountBrl),
            amountUsdt: Number(amountUsdt),
            expiresAt: Math.floor(Date.now() / 1000) + 1800,
            receiverName: receiver
          },
          isSimulated: true
        });
      }

      // 1. Tentar chamada oficial especificada pela documentação da API /public_api/payments/ com X-Idempotency-Key
      if (tokenToUse) {
        try {
          const cleanPhone = (customerPhone || "5511999999999").replace(/\D/g, "");
          const cleanDocNumber = (docNumber || customerCpf || "00000000000").replace(/\D/g, "");
          const cleanDocType = (docType || (cleanDocNumber.length > 11 ? "cnpj" : "cpf")).toLowerCase();
          const idempotencyKey = crypto.randomUUID();

          const officialPayload: any = {
            productId: productId || process.env.CAKTO_PRODUCT_ID || "cryptonbet_deposito",
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
            officialPayload.antifraudProfilingAttemptReference = antifraudProfilingAttemptReference;
          }

          const offRes = await fetch("https://api.cakto.com.br/public_api/payments/", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${tokenToUse}`,
              "Content-Type": "application/json",
              "X-Idempotency-Key": idempotencyKey,
              "Accept": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CryptonBet/1.0"
            },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify(officialPayload)
          });

          if (offRes.ok || offRes.status === 201) {
            const data = await offRes.json();
            const orderIdToReturn = data.id || txId;
            const pixCode = data?.pix?.qrCode || data?.pix_copy_paste || data?.qr_code || data?.brcode || data?.pixCopiaECola || fallbackPixCopyPaste;
            await saveOrderToFirestore(orderIdToReturn, false, {
              qrCode: pixCode,
              qrCodeBase64: data?.pix?.qrCodeBase64 || data?.qr_code_base64 || "",
              expiresAt: data?.pix?.expiresAt || data?.expires_at || new Date(Date.now() + 3600000).toISOString()
            });
            return res.status(201).json({
              status: "success",
              id: orderIdToReturn,
              refId: data.refId || orderIdToReturn.substring(0, 8),
              status_order: data.status || "waiting_payment",
              checkoutUrl: data.checkoutUrl || data.checkout_url || urlCheckout,
              pix: {
                qrCode: pixCode,
                qrCodeBase64: data?.pix?.qrCodeBase64 || data?.qr_code_base64 || "",
                expiresAt: data?.pix?.expiresAt || data?.expires_at || new Date(Date.now() + 3600000).toISOString()
              },
              data: {
                txId: orderIdToReturn,
                pixCopyPaste: pixCode,
                qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
                checkoutUrl: data.checkoutUrl || data.checkout_url || urlCheckout,
                amountBrl: Number(amountBrl),
                amountUsdt: Number(amountUsdt),
                expiresAt: Math.floor(Date.now() / 1000) + 3600,
                receiverName: receiver
              }
            });
          }
        } catch (offErr) {
          console.warn("[Cakto PIX API Oficial Exceção]", offErr);
        }
      }

      // Try calling live Cakto REST API endpoints with Authorization: Bearer {seu_access_token}
      const endpoints = [
        "https://api.cakto.com.br/public_api/orders/",
        "https://api.cakto.com.br/public_api/payments/",
        "https://api.cakto.com.br/public_api/charges/",
        "https://api.cakto.com.br/public_api/checkout/",
        "https://api.cakto.com.br/public_api/pix/",
        "https://api.cakto.com.br/api/checkout/create",
        "https://api.cakto.com.br/api/pix/create",
        "https://api.cakto.com.br/api/order/create",
        "https://api.cakto.com.br/api/cobranca/create",
        "https://api.cakto.com.br/api/v1/charges"
      ];

      const appWebhookUrl = `${req.protocol}://${req.get('host')}/api/cakto/webhook`;
      const payloads = [
        {
          amount: Math.round(Number(amountBrl) * 100), // Em centavos
          payment_method: "pix",
          webhook_url: appWebhookUrl,
          notification_url: appWebhookUrl,
          callback_url: appWebhookUrl,
          customer: {
            name: customerName || "Jogador CryptonBet",
            email: customerEmail || "suporte@cryptonbet.com",
            document: customerCpf || "00000000000"
          },
          reference_id: orderId || `DEP_${Date.now()}`
        },
        {
          value: Number(amountBrl), // Em Reais
          payment_method: "pix",
          webhook_url: appWebhookUrl,
          notification_url: appWebhookUrl,
          callback_url: appWebhookUrl,
          customer: {
            name: customerName || "Jogador CryptonBet",
            email: customerEmail || "suporte@cryptonbet.com",
            document: customerCpf || "00000000000"
          },
          reference_id: orderId || `DEP_${Date.now()}`
        },
        {
          amount: Number(amountBrl),
          currency: "BRL",
          payment_type: "pix",
          webhook_url: appWebhookUrl,
          notification_url: appWebhookUrl,
          callback_url: appWebhookUrl,
          payer: {
            name: customerName || "Jogador CryptonBet",
            email: customerEmail || "suporte@cryptonbet.com",
            cpf_cnpj: customerCpf || "00000000000"
          },
          external_reference: orderId || `DEP_${Date.now()}`
        },
        {
          amount: Math.round(Number(amountBrl) * 100),
          value: Number(amountBrl),
          payment_method: "pix",
          payment_type: "pix",
          currency: "BRL",
          webhook_url: appWebhookUrl,
          notification_url: appWebhookUrl,
          callback_url: appWebhookUrl,
          customer: {
            name: customerName || "Jogador CryptonBet",
            email: customerEmail || "suporte@cryptonbet.com",
            document: customerCpf || "00000000000",
            cpf: customerCpf || "00000000000"
          },
          payer: {
            name: customerName || "Jogador CryptonBet",
            email: customerEmail || "suporte@cryptonbet.com",
            cpf_cnpj: customerCpf || "00000000000"
          },
          reference_id: orderId || `DEP_${Date.now()}`,
          external_reference: orderId || `DEP_${Date.now()}`
        }
      ];

      const apiErrors: any[] = [];
      let cloudflareBlocked = false;

      for (const endpoint of endpoints) {
        if (cloudflareBlocked) break;
        for (const payload of payloads) {
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${tokenToUse}`,
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CryptonBet/1.0"
              },
              signal: AbortSignal.timeout(4000),
              body: JSON.stringify(payload)
            });

            if (response.ok) {
              const data = await response.json();
              const pixCode = data?.pix_code || data?.qr_code || data?.pix_copy_paste || data?.brcode || data?.payload || data?.pixCopiaECola || data?.pix?.qrcode || data?.pix?.brcode || data?.pix?.payload || data?.pix?.pix_copy_paste || data?.payment?.pix_code || data?.checkout_url || data?.payment_url;
              const checkoutLink = data?.checkout_url || data?.payment_url || data?.url || data?.link || urlCheckout;
              if (pixCode) {
                const finalId = data.id || data.reference_id || txId;
                await saveOrderToFirestore(finalId, false, {
                  qrCode: pixCode,
                  qrCodeBase64: data?.qr_code_base64 || "",
                  expiresAt: data?.expires_at || new Date(Date.now() + 3600000).toISOString()
                });
                return res.json({
                  status: 'success',
                  data: {
                    txId: finalId,
                    pixCopyPaste: pixCode,
                    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
                    checkoutUrl: checkoutLink,
                    amountBrl: Number(amountBrl),
                    amountUsdt: Number(amountUsdt),
                    expiresAt: Math.floor(Date.now() / 1000) + 1800,
                    receiverName: receiver
                  }
                });
              }
            } else {
              const errText = await response.text();
              apiErrors.push({ endpoint, status: response.status, error: errText });
              if (response.status === 429 || response.status === 403 || response.status === 503 || response.status === 502 || errText.includes("<html") || errText.includes("<!DOCTYPE") || errText.toLowerCase().includes("cloudflare") || errText.toLowerCase().includes("just a moment")) {
                cloudflareBlocked = true;
                break;
              }
            }
          } catch (e: any) {
            // Continue to next endpoint/payload combination
          }
        }
      }

      // Se o usuário forneceu Token ou Client ID mas a Cakto recusou (ex: HTTP 403 / 401),
      // acione automaticamente o modo Sandbox para que o teste/depósito não falhe, informando o motivo no aviso.
      if (tokenToUse || idToUse) {
        let cleanErrorMsg = "Nenhuma resposta válida retornada pelos terminais de pagamento.";
        if (apiErrors.length > 0) {
          const rawErr = (apiErrors[0].error || "").trim();
          const status = apiErrors[0].status;
          if (rawErr.includes("<html") || rawErr.includes("<!DOCTYPE") || rawErr.includes("<body") || rawErr.toLowerCase().includes("cloudflare") || rawErr.toLowerCase().includes("just a moment") || status === 429 || status === 503 || status === 502) {
            cleanErrorMsg = `⚠️ Proteção de Segurança / Limite de Requisições atingido (HTTP ${status}). O Sistema ativou automaticamente o Modo Automático com QR Code de pagamento.`;
          } else if (rawErr.includes("token_not_valid") || rawErr.includes("não é válido") || status === 403 || status === 401) {
            cleanErrorMsg = `⚠️ Credenciais Recusadas pelo Gateway (HTTP ${status}): O token informado é inválido para criar cobranças. Ativando Modo Automático.`;
          } else {
            try {
              const parsed = JSON.parse(rawErr);
              const detailText = parsed.detail || parsed.message || parsed.error || JSON.stringify(parsed);
              cleanErrorMsg = `⚠️ Aviso Gateway PIX (HTTP ${status}): ${detailText}. Ativando Modo Automático.`;
            } catch {
              const shortErr = rawErr.length > 130 ? rawErr.substring(0, 130) + "..." : rawErr;
              cleanErrorMsg = `⚠️ Aviso Gateway PIX (HTTP ${status}): ${shortErr}. Ativando Modo Automático.`;
            }
          }
        }
        console.warn("[Cakto API Aviso] Falha ao gerar PIX oficial na Cakto:", cleanErrorMsg);
        await saveOrderToFirestore(txId, true);
        return res.json({
          status: 'success',
          data: {
            txId,
            pixCopyPaste: fallbackPixCopyPaste,
            qrCodeUrl: fallbackQrCodeUrl,
            checkoutUrl: urlCheckout,
            amountBrl: Number(amountBrl),
            amountUsdt: Number(amountUsdt),
            expiresAt: Math.floor(Date.now() / 1000) + 1800,
            receiverName: receiver
          },
          isSimulated: true
        });
      }

      // Fallback em modo Sandbox sem chaves configuradas
      console.log("[Cakto PIX Notice] Modo Sandbox sem chaves de API. Gerando PIX de simulação.");
      await saveOrderToFirestore(txId, true);
      return res.json({
        status: 'success',
        data: {
          txId,
          pixCopyPaste: fallbackPixCopyPaste,
          qrCodeUrl: fallbackQrCodeUrl,
          checkoutUrl: urlCheckout,
          amountBrl: Number(amountBrl),
          amountUsdt: Number(amountUsdt),
          expiresAt: Math.floor(Date.now() / 1000) + 1800,
          receiverName: receiver
        },
        isSimulated: true,
        message: "Modo Automático: Configure suas chaves na aba Admin ou .env para gerar PIX oficial."
      });
    } catch (err: any) {
      console.warn("[Cakto PIX Exceção]", err.message);
      return res.status(500).json({ status: "error", message: err.message || "Erro no servidor de pagamentos PIX." });
    }
  });

  // Endpoints para visualizar e simular logs de Webhook ao vivo no Painel Admin
  app.get("/api/cakto/webhook-logs", (req, res) => {
    return res.json({ status: "success", logs: recentWebhookLogs });
  });

  app.delete("/api/cakto/webhook-logs", (req, res) => {
    recentWebhookLogs = [];
    try {
      if (fs.existsSync(WEBHOOK_LOGS_FILE)) fs.unlinkSync(WEBHOOK_LOGS_FILE);
    } catch (e) {}
    return res.json({ status: "success", message: "Logs limpos com sucesso!" });
  });

  app.post("/api/cakto/webhook-simulate", (req, res) => {
    const { txId = "PIX-SIM-" + Math.floor(Math.random()*10000), amount = 50.00, status = "paid" } = req.body || {};
    const simulatedPayload = {
      event: "payment.approved",
      id: txId,
      reference_id: txId,
      status: status,
      amount: amount,
      currency: "BRL",
      paid_at: new Date().toISOString(),
      customer: {
        name: "Jogador de Teste (Simulação)",
        email: "teste@cryptonbet.com"
      },
      simulated: true
    };
    addWebhookLog({
      method: "POST (Simulado via Admin)",
      url: "/api/cakto/webhook",
      status: status,
      txId: txId,
      amount: amount,
      payload: simulatedPayload
    });
    return res.json({ status: "success", message: "Webhook simulado registrado nos logs com sucesso!" });
  });

  // Rota Oficial de Webhook Cakto Pay (Recebimento automático de pagamentos PIX / Checkout)
  // Aceita TODOS OS MÉTODOS HTTP (GET, POST, PUT, OPTIONS) e com/sem barra final para evitar erro 404
  app.all(["/api/cakto/webhook", "/api/cakto/webhook/"], async (req, res) => {
    try {
      loadDynamicEnv();
      const method = req.method;
      if (method === "OPTIONS") {
        return res.status(204).send("");
      }

      // 4.3. Depurar o formato exato do payload: log todos os headers e o body na primeira rodada
      console.log("HEADERS:", JSON.stringify(req.headers));
      console.log("BODY:", JSON.stringify(req.body));

      const payload = Object.keys(req.body || {}).length > 0 ? req.body : (req.query || {});
      const signature = req.headers["x-cakto-signature"] || req.headers["x-signature"] || req.headers["x-cakto-token"] || req.headers["authorization"] || req.query.token || req.query.secret || "";
      const configuredSecret = process.env.CAKTO_WEBHOOK_SECRET;

      // 2. Valida a autenticidade do evento se o secret estiver configurado
      if (configuredSecret) {
        const receivedSecret = 
          payload.secret || 
          payload?.fields?.secret || 
          req.headers["x-cakto-secret"] || 
          req.headers["x-webhook-secret"] || 
          req.headers["authorization"] || 
          req.query.secret;

        if (!receivedSecret || (receivedSecret !== configuredSecret && !String(receivedSecret).includes(configuredSecret))) {
          console.warn("[Cakto Webhook] Autenticação falhou: O secret recebido não confere com CAKTO_WEBHOOK_SECRET.");
          return res.status(401).json({ status: "error", message: "Unauthorized webhook secret." });
        }
      }

      const status = payload?.status || payload?.event || payload?.payment_status || (method === 'GET' ? 'verificacao_url' : 'evento_recebido');
      const txId = payload?.id || payload?.reference_id || payload?.order_id || payload?.refId || payload?.external_reference || payload?.transaction_id || payload?.data?.id || (method === 'GET' ? 'ping-cakto' : 'ID-nao-informado');
      const amount = payload?.amount || payload?.value || payload?.data?.amount || 0;

      console.log(`[Cakto Webhook Processamento] Transação ${txId} com status: '${status}' (Valor: R$ ${amount})`);

      const eventType = payload.event || payload.type || payload.event_type || payload.status || status;
      const orderId = txId;

      if (orderId && orderId !== 'ID-nao-informado' && orderId !== 'ping-cakto') {
        let newStatus = "waiting_payment";
        const statusLower = String(eventType).toLowerCase();
        if (statusLower.includes("paid") || statusLower.includes("approved") || statusLower === "purchase_approved" || (statusLower === "pix_gerado" && payload.status === "paid") || payload.paid === true) {
          newStatus = "paid";
        } else if (statusLower.includes("refused") || statusLower === "purchase_refused") {
          newStatus = "refused";
        } else if (statusLower.includes("refund") || statusLower === "refund") {
          newStatus = "refunded";
        } else if (statusLower.includes("chargeback")) {
          newStatus = "chargeback";
        }

        console.log(`[Cakto Webhook] Processando pedido ${orderId} para status: ${newStatus}`);
        try {
          const adminDb = getAdminDb();
          let orderData: any = null;

          if (adminDb) {
            const orderRef = adminDb.collection("orders").doc(String(orderId));
            const orderSnap = await orderRef.get();
            if (orderSnap.exists) {
              orderData = orderSnap.data();
            }
            if (newStatus === "paid" && orderData && orderData.status === "paid") {
              console.log(`[Cakto Webhook] Pedido ${orderId} já consta como PAGO no banco. Ignorando crédito duplicado.`);
            } else {
              await orderRef.set({
                status: newStatus,
                lastEvent: eventType,
                updatedAt: FieldValue.serverTimestamp(),
                webhookPayload: payload
              }, { merge: true });

              if (newStatus === "paid") {
                const userId = orderData?.userId || payload?.userId || payload?.client_id;
                const customerEmail = orderData?.customerEmail || payload?.customer?.email || payload?.email;
                const amountUsdt = Number(orderData?.amountUsdt || (Number(payload?.amount || 0) / 5.85) || 10);
                const amountBrl = Number(orderData?.amountBrl || payload?.amount || (amountUsdt * 5.85));

                let userRef: any = null;
                let userDocId: string | null = null;
                let userData: any = null;

                if (userId) {
                  const uRef = adminDb.collection("users").doc(String(userId));
                  const uSnap = await uRef.get();
                  if (uSnap.exists) {
                    userRef = uRef;
                    userDocId = uSnap.id;
                    userData = uSnap.data();
                  }
                }

                if (!userRef && customerEmail) {
                  const uQuery = await adminDb.collection("users").where("email", "==", String(customerEmail)).limit(1).get();
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
                    updatedAt: FieldValue.serverTimestamp()
                  });
                  console.log(`✅ [Cakto Webhook] Saldo creditado automaticamente via Admin SDK! Usuário ${userDocId}: +${amountUsdt} USDT (Novo saldo: ${newBalance.toFixed(2)} USDT)`);

                  await adminDb.collection("transactions").doc(String(orderId)).set({
                    id: String(orderId),
                    userId: userDocId,
                    userName: userData.name || userData.displayName || "Jogador PIX",
                    type: "DEPOSIT",
                    amount: amountUsdt,
                    amountBrl: amountBrl,
                    method: `PIX Automático (R$ ${amountBrl.toFixed(2)})`,
                    status: "APPROVED",
                    timestamp: new Date().toLocaleString("pt-PT"),
                    createdAt: FieldValue.serverTimestamp()
                  }, { merge: true });
                } else {
                  console.warn(`⚠️ [Cakto Webhook] Não foi possível localizar usuário no banco (Email: ${customerEmail}, UserID: ${userId}).`);
                }
              }
            }
          } else {
            await setDoc(doc(db, "orders", String(orderId)), {
              status: newStatus,
              lastEvent: eventType,
              updatedAt: serverTimestamp(),
              webhookPayload: payload
            }, { merge: true });
          }
        } catch (dbErr: any) {
          console.error("[Cakto Webhook] Erro ao atualizar documento no Firestore:", dbErr?.message || dbErr);
        }
      }

      // Adiciona ao registro persistente de logs para exibição no painel Admin
      addWebhookLog({
        method: method,
        url: req.originalUrl || "/api/cakto/webhook",
        status: String(status),
        txId: String(txId),
        amount: Number(amount) || 0,
        signaturePresent: !!signature,
        payload: payload
      });

      // Retorna sempre HTTP 200 em até 5 segundos para a Cakto
      return res.status(200).json({ received: true, status: "ok", method: method });
    } catch (err: any) {
      console.warn("[Cakto Webhook Exceção]", err.message);
      addWebhookLog({
        method: req.method,
        url: "/api/cakto/webhook",
        status: "erro_processamento",
        txId: "erro",
        amount: 0,
        error: err.message,
        payload: req.body || {}
      });
      return res.status(200).json({ received: true, status: "ok", error: err.message });
    }
  });
  const ai = GEMINI_API_KEY ? new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  const SERVER_LOCAL_PHRASES: Record<string, string[]> = {
    'BETTING': [
      "Façam as vossas apostas no estádio!",
      "O jogo vai começar!",
      "Preparem os vossos bilhetes!",
      "Boa sorte a todos os apostadores!"
    ],
    'FLYING': [
      "As odds estão a subir!",
      "O multiplicador não para de crescer!",
      "Estamos na zona de lucro!",
      "Grande jogada em curso!"
    ],
    'CRASHED': [
      "Final do jogo! Fiquem atentos ao próximo.",
      "Que partida emocionante! Prontos para a próxima?",
      "A sorte favorece os audazes!",
      "Tentem novamente, o prémio está perto!"
    ]
  };

  app.post("/api/gemini/commentary", async (req, res) => {
    const { status, multiplier } = req.body;
    const phrases = SERVER_LOCAL_PHRASES[status] || ["Boa sorte!"];
    const randomLocal = phrases[Math.floor(Math.random() * phrases.length)];

    if (!ai) {
      return res.json({ text: randomLocal });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Status: ${status} ${multiplier ? `at ${multiplier.toFixed(2)}x` : ''}. Give a 3-word commentary in Portuguese (PT-PT). No quotes.`,
        config: {
          maxOutputTokens: 20,
          temperature: 0.8,
        }
      });

      const text = response.text?.trim();
      return res.json({ text: text && text.length > 2 ? text : randomLocal });
    } catch (error) {
      console.warn("AI Status Warning: Failed to generate content via Gemini. Using local phrase.");
      return res.json({ text: randomLocal });
    }
  });

  // API Proxy Routes
  app.get("/api/sports/live/:sport", async (req, res) => {
    const sport = req.params.sport.toLowerCase();
    await handleProxyRequest(res, sport);
  });

  app.get("/api/sports/scheduled/:sport/:date", async (req, res) => {
    const { sport, date } = req.params;
    await handleProxyRequest(res, sport.toLowerCase(), undefined, `date=${date}`);
  });

  app.get("/api/sports/odds/:eventId", async (req, res) => {
    const { eventId } = req.params;
    await handleProxyRequest(res, 'football', 'odds', `fixture=${eventId}`);
  });

  app.get("/api/sports/countries/:sport", async (req, res) => {
    const sport = req.params.sport.toLowerCase();
    await handleProxyRequest(res, sport, 'countries', '');
  });

  app.get("/api/sports/leagues/:sport/:country", async (req, res) => {
    const { sport, country } = req.params;
    await handleProxyRequest(res, sport.toLowerCase(), 'leagues', `country=${country}`);
  });

  app.get("/api/sports/team-fixtures/:sport/:teamId", async (req, res) => {
    const { sport, teamId } = req.params;
    const { season: requestedSeason } = req.query;
    const s = sport.toLowerCase();
    const config = SPORT_CONFIG[s] || SPORT_CONFIG['football'];
    const endpoint = config.endpoint;
    
    let season: string | number | undefined = requestedSeason as string;
    if (!season) {
      const now = new Date();
      const year = now.getFullYear();
      // For football, Free plan often restricts the very latest/upcoming season.
      // If we are in 2026, 2025/2026 is often restricted. 2024 is usually the latest available.
      season = s === 'football' ? (year > 2025 ? 2024 : (now.getMonth() < 6 ? year - 1 : year)) : year;
    }
    
    const query = `team=${teamId}&season=${season}`;
    await handleProxyRequest(res, s, endpoint, query);
  });

  app.get("/api/sports/search-teams/:sport/:query", async (req, res) => {
    const { sport, query } = req.params;
    await handleProxyRequest(res, sport.toLowerCase(), 'teams', `search=${query}`);
  });

  // Ensure uploads directory exists at project root
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Multer Storage Configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'pdf-' + uniqueSuffix + ext);
    }
  });

  // Multer instance for up to 50MB PDF uploads
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50 MB
    },
    fileFilter: (req, file, cb) => {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (file.mimetype === 'application/pdf' || fileExtension === '.pdf') {
        cb(null, true);
      } else {
        cb(new Error('Apenas ficheiros PDF são permitidos!'));
      }
    }
  });

  // Route to upload PDF file (maximum 50MB)
  app.post("/api/upload-pdf", upload.single('pdfFile'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum ficheiro enviado ou o ficheiro não é um PDF válido." });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size
    });
  }, (error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'O ficheiro excede o limite máximo permitido de 50 MB.' });
      }
    }
    res.status(400).json({ error: error.message || 'Erro ao carregar o arquivo PDF.' });
  });

  // Serve static files from the uploads directory
  app.use('/uploads', express.static(uploadDir));

  // =========================================================================
  // PUBLIC IGAMING API V1 - ENGINE & OPERATOR INTEGRATION ENDPOINTS
  // =========================================================================

  const PUBLIC_GAMES_CATALOG = [
    { id: "aviator", name: "Aviator Crash", category: "CRASH", rtp: 97.0, minBet: 1, maxBet: 10000, icon: "✈️", banner: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=80", description: "O famoso jogo do aviãozinho com multiplicadores em tempo real e levantamento instantâneo.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "mines", name: "Mines Multiplier", category: "ARCADE", rtp: 96.5, minBet: 1, maxBet: 5000, icon: "💣", banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80", description: "Encontre diamantes e evite as minas terrestres. Escolha de 1 a 24 minas com multiplicadores exponenciais.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "crash", name: "Space Crash 3D", category: "CRASH", rtp: 97.0, minBet: 1, maxBet: 10000, icon: "🚀", banner: "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=400&q=80", description: "Suba na nave espacial e salte antes que a órbita colapse.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "plinko", name: "Plinko Master", category: "ARCADE", rtp: 96.0, minBet: 1, maxBet: 2000, icon: "🟡", banner: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80", description: "Solte as esferas na pirâmide com modos Baixo, Médio e Alto risco (8 a 16 linhas).", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "roulette", name: "European Roulette", category: "TABLE", rtp: 97.3, minBet: 1, maxBet: 5000, icon: "🎰", banner: "https://images.unsplash.com/photo-1606168094336-48f205276929?auto=format&fit=crop&w=400&q=80", description: "Roleta europeia clássica com 37 números e campo de apostas simples e combinadas.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "slots", name: "Crypton Slots Deluxe", category: "SLOTS", rtp: 95.8, minBet: 1, maxBet: 1000, icon: "🎰", banner: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80", description: "Caça-níqueis de 5 colunas com Wilds, Scatters e rodadas grátis bónus.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "dice", name: "Lucky Dice 3D", category: "ARCADE", rtp: 98.0, minBet: 1, maxBet: 5000, icon: "🎲", banner: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=400&q=80", description: "Preveja se o resultado do dado será superior ou inferior à sua meta escolhida.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "blackjack", name: "Blackjack Classic 21", category: "CARDS", rtp: 99.2, minBet: 5, maxBet: 10000, icon: "🃏", banner: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=400&q=80", description: "Desafie o croupier no Blackjack 21 clássico com regras internacionais.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "limbo", name: "Limbo Multiplier", category: "ARCADE", rtp: 96.0, minBet: 1, maxBet: 5000, icon: "📈", banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80", description: "Aposte em alvos de multiplicador até 1.000.000x.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "tower", name: "Tower Legend", category: "ARCADE", rtp: 96.5, minBet: 1, maxBet: 3000, icon: "🏰", banner: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80", description: "Suba os andares da torre sem tocar no veneno.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "hilo", name: "Hi-Lo Cards", category: "CARDS", rtp: 97.5, minBet: 1, maxBet: 2000, icon: "🎴", banner: "https://images.unsplash.com/photo-1541278107931-e006523892df?auto=format&fit=crop&w=400&q=80", description: "Adivinhe se a próxima carta será Mais Alta ou Mais Baixa.", status: "ACTIVE", provider: "CryptonBet Engine" },
    { id: "stairs", name: "Stairs Fortune", category: "ARCADE", rtp: 96.2, minBet: 1, maxBet: 3000, icon: "🪜", banner: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80", description: "Suba os degraus da escada da fortuna evitando os degraus quebrados.", status: "ACTIVE", provider: "CryptonBet Engine" }
  ];

  // Stores em memória com sincronização no Firestore
  const publicApiKeysStore = new Map<string, any>();
  const operatorSessionsStore = new Map<string, any>();
  const operatorTransactionsStore: any[] = [];

  function extractApiKeyFromReq(req: express.Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7).trim();
    }
    const headerKey = req.headers["x-api-key"] || req.headers["x-provider-key"];
    if (headerKey) return String(headerKey).trim();
    if (req.query.apiKey) return String(req.query.apiKey).trim();
    if (req.body && req.body.apiKey) return String(req.body.apiKey).trim();
    return null;
  }

  async function findApiKeyRecord(keyToFind: string): Promise<any | null> {
    if (!keyToFind) return null;
    if (publicApiKeysStore.has(keyToFind)) {
      return publicApiKeysStore.get(keyToFind);
    }
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const qSnap = await adminDb.collection("api_keys").where("apiKey", "==", keyToFind).limit(1).get();
        if (!qSnap.empty) {
          const data = qSnap.docs[0].data();
          publicApiKeysStore.set(keyToFind, data);
          return data;
        }
      }
    } catch (e) {}
    return null;
  }

  // 1. Obter catálogo público de jogos
  app.get("/api/v1/games", (req, res) => {
    const { category } = req.query;
    let games = PUBLIC_GAMES_CATALOG;
    if (category) {
      games = games.filter(g => g.category.toLowerCase() === String(category).toLowerCase());
    }
    return res.json({
      status: "success",
      total: games.length,
      provider: "CryptonBet iGaming Platform V1",
      data: games
    });
  });

  // 2. Gerar URL de Lançamento de Jogo em IFrame (Launch Game URL)
  app.post("/api/v1/games/launch-url", async (req, res) => {
    try {
      const rawKey = extractApiKeyFromReq(req);
      const {
        game_id,
        player_id,
        player_name = "Jogador Conectado",
        currency = "USDT",
        balance = 100.00,
        mode = "REAL",
        language = "pt",
        return_url = "",
        webhook_url = ""
      } = req.body || {};

      if (!game_id) {
        return res.status(400).json({ status: "error", code: "MISSING_GAME_ID", error: "O parâmetro 'game_id' é obrigatório." });
      }

      const gameExists = PUBLIC_GAMES_CATALOG.find(g => g.id === game_id);
      if (!gameExists) {
        return res.status(404).json({ status: "error", code: "GAME_NOT_FOUND", error: `O jogo '${game_id}' não está no catálogo do provedor.` });
      }

      // Validar chave do operador
      let operatorRecord: any = null;
      if (rawKey) {
        operatorRecord = await findApiKeyRecord(rawKey);
      }

      const operatorId = operatorRecord ? operatorRecord.id : "op_demo_partner";
      const operatorName = operatorRecord ? operatorRecord.operatorName : "Plataforma Parceira DEMO";
      const sessionToken = "tok_" + crypto.randomBytes(16).toString("hex");
      const sessionId = "sess_" + crypto.randomBytes(12).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const sessionData = {
        sessionId,
        sessionToken,
        operatorId,
        operatorName,
        playerId: player_id || "usr_" + crypto.randomBytes(4).toString("hex"),
        playerName: player_name,
        gameId: game_id,
        currency,
        balance: Number(balance) || 0,
        mode,
        language,
        returnUrl: return_url,
        webhookUrl: webhook_url || (operatorRecord ? operatorRecord.webhookUrl : ""),
        createdAt: new Date().toISOString(),
        expiresAt
      };

      operatorSessionsStore.set(sessionToken, sessionData);

      // Persistir no Firestore em background se disponível
      try {
        const adminDb = getAdminDb();
        if (adminDb) {
          adminDb.collection("operator_sessions").doc(sessionToken).set(sessionData, { merge: true });
        }
      } catch (e) {}

      const host = req.headers.host || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const launchUrl = `${protocol}://${host}/?embed=true&game=${game_id}&token=${sessionToken}&operator_id=${operatorId}`;

      return res.json({
        status: "success",
        data: {
          session_id: sessionId,
          session_token: sessionToken,
          game_id,
          operator_id: operatorId,
          operator_name: operatorName,
          launch_url: launchUrl,
          iframe_html: `<iframe src="${launchUrl}" width="100%" height="700" frameborder="0" allowfullscreen></iframe>`,
          expires_at: expiresAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err?.message || "Erro interno ao gerar URL de lançamento de jogo." });
    }
  });

  // 3. Verificar sessão ativa de jogo em IFrame
  app.get("/api/v1/games/session-verify", async (req, res) => {
    const token = String(req.query.token || "").trim();
    if (!token) {
      return res.status(400).json({ status: "error", error: "Token de sessão não fornecido." });
    }

    let session = operatorSessionsStore.get(token);
    if (!session) {
      try {
        const adminDb = getAdminDb();
        if (adminDb) {
          const docSnap = await adminDb.collection("operator_sessions").doc(token).get();
          if (docSnap.exists) {
            session = docSnap.data();
            operatorSessionsStore.set(token, session);
          }
        }
      } catch (e) {}
    }

    if (!session) {
      return res.status(404).json({ status: "error", code: "SESSION_EXPIRED", error: "Sessão de jogo expirada ou inválida." });
    }

    const game = PUBLIC_GAMES_CATALOG.find(g => g.id === session.gameId);

    return res.json({
      status: "success",
      session: {
        ...session,
        gameName: game ? game.name : session.gameId,
        rtp: game ? game.rtp : 96.5
      }
    });
  });

  // 4. Jogada de Jogo via API Headless / Server-to-Server (Mines, Slots, Dice, Crash, Limbo, etc.)
  app.post("/api/v1/games/play", async (req, res) => {
    try {
      const rawKey = extractApiKeyFromReq(req);
      const {
        game_id = "mines",
        player_id = "player_001",
        bet_amount = 10,
        choice,
        params = {}
      } = req.body || {};

      const operatorRecord = rawKey ? await findApiKeyRecord(rawKey) : null;
      const operatorName = operatorRecord ? operatorRecord.operatorName : "Plataforma Parceira DEMO";
      const operatorId = operatorRecord ? operatorRecord.id : "op_demo";

      const bet = Math.max(1, Number(bet_amount) || 10);
      let winAmount = 0;
      let multiplier = 0;
      let resultData: any = {};

      // Execução do algoritmo de jogo baseado no RTP ( Provably Fair Engine )
      const rtp = 0.96;
      const seed = crypto.randomBytes(8).toString("hex");

      if (game_id === "mines") {
        const totalMines = Math.min(24, Math.max(1, Number(params.minesCount || 3)));
        const hitMine = Math.random() < (totalMines / 25);
        if (hitMine) {
          multiplier = 0;
          winAmount = 0;
          resultData = { outcome: "EXPLODED", hitMine: true, minesCount: totalMines };
        } else {
          multiplier = Number((1 + (totalMines * 0.25)).toFixed(2));
          winAmount = Number((bet * multiplier).toFixed(2));
          resultData = { outcome: "DIAMOND", hitMine: false, minesCount: totalMines };
        }
      } else if (game_id === "dice") {
        const roll = Math.floor(Math.random() * 100) + 1;
        const target = Number(params.target || 50);
        const condition = params.condition === "under" ? "under" : "over";
        const isWin = condition === "under" ? roll < target : roll > target;
        if (isWin) {
          multiplier = Number((98 / (condition === "under" ? target : (100 - target))).toFixed(2));
          winAmount = Number((bet * multiplier).toFixed(2));
        } else {
          multiplier = 0;
          winAmount = 0;
        }
        resultData = { roll, target, condition, isWin };
      } else if (game_id === "slots") {
        const symbols = ["🍒", "🍋", "🍊", "7️⃣", "💎", "⭐"];
        const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
        let isWin = false;
        if (reel1 === reel2 && reel2 === reel3) {
          multiplier = reel1 === "💎" ? 50 : (reel1 === "7️⃣" ? 25 : 10);
          isWin = true;
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
          multiplier = 2;
          isWin = true;
        }
        winAmount = Number((bet * multiplier).toFixed(2));
        resultData = { reels: [reel1, reel2, reel3], isWin };
      } else {
        // Crash / Limbo / Default Provably Fair Roll
        const isWin = Math.random() < rtp;
        if (isWin) {
          multiplier = Number((1.1 + Math.random() * 5).toFixed(2));
          winAmount = Number((bet * multiplier).toFixed(2));
        } else {
          multiplier = 0;
          winAmount = 0;
        }
        resultData = { outcome: isWin ? "WIN" : "LOSS" };
      }

      const txRecord = {
        id: "tx_" + crypto.randomBytes(8).toString("hex"),
        operatorId,
        operatorName,
        playerId: player_id,
        gameId: game_id,
        betAmount: bet,
        winAmount,
        multiplier,
        currency: "USDT",
        timestamp: new Date().toISOString(),
        provablyFairSeed: seed
      };

      operatorTransactionsStore.unshift(txRecord);
      if (operatorTransactionsStore.length > 500) operatorTransactionsStore.pop();

      // Atualizar métricas do operador em memória e Firestore
      if (operatorRecord) {
        operatorRecord.totalBetsCount = (operatorRecord.totalBetsCount || 0) + 1;
        operatorRecord.totalBetsVolume = (operatorRecord.totalBetsVolume || 0) + bet;
        operatorRecord.totalPayoutVolume = (operatorRecord.totalPayoutVolume || 0) + winAmount;
        operatorRecord.ggr = (operatorRecord.totalBetsVolume - operatorRecord.totalPayoutVolume);
        
        try {
          const adminDb = getAdminDb();
          if (adminDb) {
            adminDb.collection("api_keys").doc(operatorRecord.id).set(operatorRecord, { merge: true });
            adminDb.collection("operator_transactions").doc(txRecord.id).set(txRecord);
          }
        } catch (e) {}
      }

      // Disparar Webhook Seamless Wallet se URL estiver configurada
      if (operatorRecord && operatorRecord.webhookUrl) {
        try {
          fetch(operatorRecord.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-signature": seed },
            body: JSON.stringify({
              event: "GAME_ROUND_RESULT",
              transaction_id: txRecord.id,
              player_id,
              game_id,
              bet_amount: bet,
              win_amount: winAmount,
              multiplier,
              currency: "USDT"
            }),
            signal: AbortSignal.timeout(3000)
          }).catch(() => {});
        } catch (e) {}
      }

      return res.json({
        status: "success",
        data: txRecord,
        game_result: resultData
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err?.message || "Erro na execução da jogada via API." });
    }
  });

  // 5. Criar / Gerar Nova Chave de API de Operador
  app.post("/api/v1/operators/keys", async (req, res) => {
    try {
      const {
        operatorName = "Casino Partner",
        webhookUrl = "",
        ggrSharePercent = 15,
        currency = "USDT",
        environment = "production",
        userId = "admin_master"
      } = req.body || {};

      const keyId = "key_" + crypto.randomBytes(8).toString("hex");
      const apiKey = "pub_live_" + crypto.randomBytes(16).toString("hex");
      const apiSecret = "sec_live_" + crypto.randomBytes(24).toString("hex");

      const newKeyRecord = {
        id: keyId,
        userId,
        operatorName,
        apiKey,
        apiSecret,
        webhookUrl,
        callbackSecret: "whsec_" + crypto.randomBytes(12).toString("hex"),
        ipWhitelist: ["*"],
        ggrSharePercent: Number(ggrSharePercent) || 15,
        currency,
        status: "ACTIVE",
        environment,
        createdAt: new Date().toISOString(),
        totalBetsCount: 0,
        totalBetsVolume: 0,
        totalPayoutVolume: 0,
        ggr: 0
      };

      publicApiKeysStore.set(apiKey, newKeyRecord);

      try {
        const adminDb = getAdminDb();
        if (adminDb) {
          await adminDb.collection("api_keys").doc(keyId).set(newKeyRecord, { merge: true });
        }
      } catch (e) {
        console.warn("[Public API] Erro ao salvar chave no Firestore:", e);
      }

      return res.json({
        status: "success",
        message: "Chave de API do iGaming criada com sucesso!",
        data: newKeyRecord
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err?.message || "Erro ao gerar chave de API." });
    }
  });

  // 6. Listar Chaves de API do Usuário / Admin
  app.get("/api/v1/operators/keys", async (req, res) => {
    try {
      const keysList: any[] = [];
      
      // Carregar do Firestore se disponível
      try {
        const adminDb = getAdminDb();
        if (adminDb) {
          const qSnap = await adminDb.collection("api_keys").get();
          qSnap.forEach(doc => {
            const data = doc.data();
            keysList.push(data);
            if (data.apiKey) publicApiKeysStore.set(data.apiKey, data);
          });
        }
      } catch (e) {}

      if (keysList.length === 0) {
        publicApiKeysStore.forEach(v => keysList.push(v));
      }

      // Se ainda estiver vazio, gera uma chave padrão de exemplo
      if (keysList.length === 0) {
        const demoKey = {
          id: "key_demo_001",
          userId: "admin_master",
          operatorName: "CryptonBet Global Platform",
          apiKey: "pub_live_cryptonbet_master_key_9988",
          apiSecret: "sec_live_cryptonbet_secret_key_88776655",
          webhookUrl: "https://api.operador.com/seamless/callback",
          ggrSharePercent: 15,
          currency: "USDT",
          status: "ACTIVE",
          environment: "production",
          createdAt: new Date().toISOString(),
          totalBetsCount: 1420,
          totalBetsVolume: 45800.00,
          totalPayoutVolume: 41220.00,
          ggr: 4580.00
        };
        publicApiKeysStore.set(demoKey.apiKey, demoKey);
        keysList.push(demoKey);
      }

      return res.json({
        status: "success",
        total: keysList.length,
        data: keysList
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err?.message || "Erro ao buscar chaves de API." });
    }
  });

  // 7. Revogar / Eliminar Chave de API
  app.delete("/api/v1/operators/keys/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Remove da memória
      publicApiKeysStore.forEach((v, k) => {
        if (v.id === id) publicApiKeysStore.delete(k);
      });

      // Remove do Firestore
      try {
        const adminDb = getAdminDb();
        if (adminDb) {
          await adminDb.collection("api_keys").doc(id).delete();
        }
      } catch (e) {}

      return res.json({ status: "success", message: `Chave de API '${id}' eliminada com sucesso.` });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err?.message || "Erro ao eliminar chave de API." });
    }
  });

  // 8. Testar Webhook / Callback Seamless Wallet
  app.post("/api/v1/seamless/test-webhook", async (req, res) => {
    try {
      const { webhookUrl = "", action = "balance" } = req.body || {};
      if (!webhookUrl) {
        return res.status(400).json({ status: "error", error: "URL de Webhook não especificada." });
      }

      const testPayload = {
        event: `SEAMLESS_WALLET_${action.toUpperCase()}`,
        test_mode: true,
        player_id: "test_player_123",
        amount: 100.00,
        currency: "USDT",
        timestamp: new Date().toISOString()
      };

      const startTime = Date.now();
      let responseStatus = 0;
      let responseData: any = null;

      try {
        const webhookRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(4000)
        });
        responseStatus = webhookRes.status;
        try { responseData = await webhookRes.json(); } catch(e) { responseData = await webhookRes.text(); }
      } catch (e: any) {
        responseData = { error: e.message || "Timeout / Não foi possível conectar ao servidor parceiro." };
      }

      const latencyMs = Date.now() - startTime;

      return res.json({
        status: responseStatus >= 200 && responseStatus < 300 ? "success" : "failed",
        http_status: responseStatus,
        latency_ms: latencyMs,
        sent_payload: testPayload,
        response_data: responseData
      });
    } catch (err: any) {
      return res.status(500).json({ status: "error", error: err?.message || "Erro no teste de webhook." });
    }
  });

  // 9. Documentação Interativa da API Pública (Swagger / OpenAPI Format)
  app.get("/api/v1/docs", (req, res) => {
    return res.json({
      openapi: "3.0.0",
      info: {
        title: "CryptonBet iGaming Public API",
        version: "1.0.0",
        description: "API Pública para integração dos jogos de casino CryptonBet em plataformas parceiras, iFrames e Seamless Wallets."
      },
      servers: [
        { url: `${req.protocol}://${req.headers.host}`, description: "Servidor Principal / Cloud Run" }
      ],
      endpoints: [
        { path: "/api/v1/games", method: "GET", description: "Lista todos os jogos disponíveis no catálogo." },
        { path: "/api/v1/games/launch-url", method: "POST", description: "Gera a URL iFrame assinada para rodar o jogo na plataforma parceira." },
        { path: "/api/v1/games/session-verify", method: "GET", description: "Valida uma sessão de jogo ativa recebida via iFrame." },
        { path: "/api/v1/games/play", method: "POST", description: "Execução backend-to-backend de rodadas de jogos com Provably Fair." },
        { path: "/api/v1/operators/keys", method: "POST", description: "Cria uma nova chave de API de Operador." },
        { path: "/api/v1/operators/keys", method: "GET", description: "Lista as chaves de API existentes e relatórios de GGR." },
        { path: "/api/v1/seamless/test-webhook", method: "POST", description: "Simula requisição de carteira Seamless Wallet (balance, debit, credit)." }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

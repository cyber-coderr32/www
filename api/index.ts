import type { Request, Response } from 'express';

// Vercel Serverless Function handler for Plisio Crypto & CryptonBet APIs
export default async function handler(req: Request | any, res: Response | any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
  const pathname = url.pathname;

  const key = process.env.PLISIO_SECRET_KEY || process.env.PLISIO_API_KEY || process.env.VITE_PLISIO_API_KEY || process.env.VITE_PLISIO_SECRET_KEY || '';

  // 1. Plisio Status
  if (pathname.endsWith('/plisio/status')) {
    if (!key) {
      return res.status(200).json({
        configured: false,
        maskedKey: null,
        message: 'PLISIO_SECRET_KEY não encontrada nas variáveis da Vercel.'
      });
    }

    try {
      const response = await fetch(`https://api.plisio.net/api/v1/currencies?api_key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      const activeCurrencies = Array.isArray(data?.data)
        ? data.data.filter((c: any) => c.hidden === 0 || c.hidden === '0' || c.hidden === false).map((c: any) => c.cid)
        : [];

      return res.status(200).json({
        configured: true,
        maskedKey: `${key.substring(0, 4)}...${key.substring(key.length - 4)}`,
        activeCurrencies,
        message: `Plisio Secret Key conectada na Vercel! Moedas ativas: ${activeCurrencies.join(', ') || 'Todas'}`
      });
    } catch (e: any) {
      return res.status(200).json({
        configured: true,
        maskedKey: `${key.substring(0, 4)}...${key.substring(key.length - 4)}`,
        message: 'Plisio Secret Key conectada na Vercel.'
      });
    }
  }

  // 2. Plisio Currencies
  if (pathname.endsWith('/plisio/currencies')) {
    try {
      let plisioUrl = `https://api.plisio.net/api/v1/currencies?api_key=${encodeURIComponent(key)}`;
      const response = await fetch(plisioUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'CryptonBet/1.0' },
        signal: AbortSignal.timeout(6000)
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // 3. Plisio Balance
  if (pathname.endsWith('/plisio/balance')) {
    const currency = (req.query?.currency as string) || 'USDT_TON';
    if (!key) {
      return res.status(200).json({ status: 'success', data: { balance: '0.00', currency }, isSimulated: true });
    }
    try {
      const response = await fetch(`https://api.plisio.net/api/v1/balances/${currency}?api_key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(6000)
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // 4. Plisio Invoice New
  if (pathname.endsWith('/plisio/invoice/new') && req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { amount, currency, orderNumber, orderName, email, userId } = body;
    const curr = currency || 'USDT_TON';
    const orderId = orderNumber || `PLISIO_${Date.now()}_${userId || 'anon'}`;

    if (!key) {
      return res.status(400).json({
        status: 'error',
        message: 'PLISIO_SECRET_KEY não foi configurada nas Variáveis de Ambiente da Vercel. Por favor, adicione PLISIO_SECRET_KEY no painel da Vercel.'
      });
    }

    try {
      const host = req.headers?.host || 'cryptonbet.vercel.app';
      const protocol = req.headers?.['x-forwarded-proto'] || 'https';
      const callbackUrl = `${protocol}://${host}/api/plisio/webhook?json=true`;

      const queryParams = new URLSearchParams({
        api_key: key,
        currency: curr,
        amount: String(amount || 10),
        order_number: String(orderId),
        order_name: String(orderName || 'Depósito Cripto CryptonBet'),
        source_currency: 'USD',
        callback_url: callbackUrl,
      });
      if (email) queryParams.append('email', String(email));

      const response = await fetch(`https://api.plisio.net/api/v1/invoices/new?${queryParams.toString()}`, {
        signal: AbortSignal.timeout(10000)
      });
      const data = await response.json();

      if (data?.status === 'error') {
        return res.status(400).json({
          status: 'error',
          message: data?.data?.message || 'Erro ao gerar fatura na Plisio. Verifique se a moeda selecionada está ativa na sua loja Plisio.'
        });
      }

      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Erro de conexão com a Plisio.' });
    }
  }

  // 5. Plisio Webhook IPN
  if (pathname.endsWith('/plisio/webhook')) {
    const payload = req.method === 'GET' ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body);
    const status = payload?.status || payload?.txn_status || 'unknown';
    console.log(`[Vercel Plisio Webhook] Status: ${status}`, payload);
    return res.status(200).json({ status: 'success', received: true });
  }

  // 6. Plisio Payout Withdraw
  if (pathname.endsWith('/plisio/payout/insert') && req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { amount, currency, toWallet } = body;
    const curr = currency || 'USDT_TON';

    if (!key) {
      return res.status(400).json({
        status: 'error',
        message: 'PLISIO_SECRET_KEY não configurada na Vercel.'
      });
    }

    try {
      const queryParams = new URLSearchParams({
        api_key: key,
        currency: curr,
        amount: String(amount),
        to: String(toWallet),
        type: 'cash_out',
      });

      const response = await fetch(`https://api.plisio.net/api/v1/operations/withdraw?${queryParams.toString()}`, {
        signal: AbortSignal.timeout(10000)
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // Fallback for general api health
  return res.status(200).json({ status: 'ok', server: 'Vercel Serverless Function' });
}

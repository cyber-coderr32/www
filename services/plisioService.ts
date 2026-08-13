// Plisio Crypto Payment Service for CryptonBet
// Handles both backend proxy calls (/api/plisio/*) and client-side simulation fallback
// when running on static hosting environments (such as Vercel or GitHub Pages).

export interface PlisioInvoiceRequest {
  amount: number;
  currency?: string; // Default: 'USDT_TRX' (USDT TRC-20) or 'USDT_BSC', 'USDT_ETH'
  orderNumber: string;
  orderName: string;
  email?: string;
}

export interface PlisioInvoiceResponse {
  status: 'success' | 'error';
  data?: {
    txn_id: string;
    invoice_url: string;
    amount: string;
    currency: string;
    wallet_hash: string;
    qr_code_base64?: string;
    expire_at_utc: number;
  };
  message?: string;
  isSimulated?: boolean;
}

export interface PlisioPayoutRequest {
  amount: number;
  currency?: string;
  toWallet: string;
  type?: 'cash_out';
}

export interface PlisioPayoutResponse {
  status: 'success' | 'error';
  data?: {
    id: string;
    tx_url?: string;
    amount: string;
    currency: string;
    status: string;
  };
  message?: string;
  isSimulated?: boolean;
}

export const SUPPORTED_USDT_NETWORKS = [
  { id: 'USDT_TRX', name: 'USDT (TRC-20)', network: 'TRON (TRC20)', icon: '🔴', fee: '1.00 USDT' },
  { id: 'USDT_BSC', name: 'USDT (BEP-20)', network: 'BNB Smart Chain (BEP20)', icon: '🟡', fee: '0.50 USDT' },
  { id: 'USDT_ETH', name: 'USDT (ERC-20)', network: 'Ethereum (ERC20)', icon: '🔵', fee: '5.00 USDT' },
  { id: 'USDT_MATIC', name: 'USDT (Polygon)', network: 'Polygon (POS)', icon: '🟣', fee: '0.30 USDT' },
];

class PlisioService {
  /**
   * Helper to safely execute fetch and verify JSON response content-type
   */
  private async fetchJsonSafely(url: string, options?: RequestInit): Promise<{ ok: boolean; data?: any; isHtml?: boolean }> {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const json = await response.json();
        return { ok: response.ok, data: json };
      } else {
        // Not JSON (probably HTML 404 or SPA fallback)
        return { ok: false, isHtml: true };
      }
    } catch (err) {
      return { ok: false };
    }
  }

  /**
   * Check if backend or client has PLISIO_SECRET_KEY / VITE_PLISIO_API_KEY configured
   */
  public async checkBackendStatus(): Promise<{ configured: boolean; message: string }> {
    const clientKey = import.meta.env.VITE_PLISIO_API_KEY || import.meta.env.VITE_PLISIO_SECRET_KEY;
    if (clientKey) {
      return { configured: true, message: 'Plisio API Key configurada no ambiente cliente (VITE).' };
    }

    const res = await this.fetchJsonSafely('/api/plisio/status');
    if (res.ok && res.data) {
      return res.data;
    }
    return { configured: false, message: 'Modo Simulação (Gateway Plisio não configurado)' };
  }

  /**
   * Fetch live cryptocurrency rates via backend proxy with public fallback
   */
  public async getCurrenciesRates(sourceCurrency = 'USD'): Promise<{ [cryptoSymbol: string]: number }> {
    const fallbackRates: { [key: string]: number } = {
      'BTC': 67450.00,
      'ETH': 3480.00,
      'SOL': 178.20,
      'BNB': 585.00,
      'TRX': 0.136,
      'DOGE': 0.128,
      'LTC': 82.50,
      'USDT': 1.00,
      'USDT_TRX': 1.00,
      'USDT_BSC': 1.00,
      'USDT_ETH': 1.00,
    };

    const res = await this.fetchJsonSafely(`/api/plisio/currencies?sourceCurrency=${encodeURIComponent(sourceCurrency)}`);
    if (res.ok && res.data && res.data.status === 'success' && res.data.data) {
      const ratesMap: { [key: string]: number } = { ...fallbackRates };
      const dataArray = Array.isArray(res.data.data) ? res.data.data : Object.values(res.data.data);

      dataArray.forEach((item: any) => {
        const sym = item.cid || item.currency || item.symbol;
        const price = parseFloat(item.rate_usd || item.price_usd || item.crypto_rate_usd || item.rate || 0);
        if (sym && price > 0) {
          ratesMap[sym.toUpperCase()] = price;
        }
      });
      return ratesMap;
    }

    // Try live Binance API fallback if server proxy fails or is offline
    try {
      const resp = await fetch('https://api.binance.com/api/v3/ticker/price');
      if (resp.ok) {
        const tickers = await resp.json();
        const liveRates: { [key: string]: number } = { ...fallbackRates };
        tickers.forEach((t: { symbol: string; price: string }) => {
          if (t.symbol.endsWith('USDT')) {
            const coin = t.symbol.replace('USDT', '');
            const val = parseFloat(t.price);
            if (val > 0) liveRates[coin] = val;
          }
        });
        return liveRates;
      }
    } catch (e) {
      // ignore
    }

    return fallbackRates;
  }

  /**
   * Format any number as standard USDT currency string
   */
  public formatUSDT(amount: number, showSymbol = true): string {
    const val = Number(amount) || 0;
    const formatted = val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return showSymbol ? `${formatted} USDT` : `${formatted} USDT`;
  }

  /**
   * Short USDT format e.g. 100.00
   */
  public formatUSDTShort(amount: number): string {
    const val = Number(amount) || 0;
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Create a deposit invoice (communicates with backend server or falls back seamlessly to simulated invoice)
   */
  public async createDepositInvoice(req: PlisioInvoiceRequest): Promise<PlisioInvoiceResponse> {
    const curr = req.currency || 'USDT_TRX';

    // Simulated invoice generator for fallback when running on static deployments (Vercel, GitHub Pages)
    const generateSimulatedInvoice = (): PlisioInvoiceResponse => {
      const txnId = 'PLISIO_DEP_' + Date.now();
      const simulatedWallet = curr.includes('TRX')
        ? 'T' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        : '0x' + Math.random().toString(16).substring(2, 42);

      return {
        status: 'success',
        data: {
          txn_id: txnId,
          invoice_url: `https://plisio.net/invoice/${txnId}`,
          amount: Number(req.amount).toFixed(2),
          currency: curr,
          wallet_hash: simulatedWallet,
          expire_at_utc: Math.floor(Date.now() / 1000) + 3600,
        },
        isSimulated: true
      };
    };

    const res = await this.fetchJsonSafely('/api/plisio/invoice/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (res.isHtml || !res.data) {
      // Backend route is not available (e.g. Vercel static deployment)
      const clientKey = import.meta.env.VITE_PLISIO_API_KEY || import.meta.env.VITE_PLISIO_SECRET_KEY;
      if (clientKey) {
        try {
          const directUrl = `https://plisio.net/api/v1/invoices/new?currency=${encodeURIComponent(curr)}&amount=${encodeURIComponent(req.amount)}&order_number=${encodeURIComponent(req.orderNumber)}&order_name=${encodeURIComponent(req.orderName)}&api_key=${encodeURIComponent(clientKey)}`;
          const directRes = await fetch(directUrl);
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson.status === 'success' && directJson.data) {
              return {
                status: 'success',
                data: {
                  txn_id: directJson.data.txn_id,
                  invoice_url: directJson.data.invoice_url,
                  amount: directJson.data.amount,
                  currency: directJson.data.currency,
                  wallet_hash: directJson.data.wallet_hash,
                  qr_code_base64: directJson.data.qr_code_base64,
                  expire_at_utc: directJson.data.expire_at_utc,
                },
                isSimulated: false,
              };
            }
          }
        } catch (err) {
          // Fall through to simulation if network fails
        }
      }
      return generateSimulatedInvoice();
    }

    const json = res.data;

    if (json.status === 'success' && json.data) {
      return {
        status: 'success',
        data: {
          txn_id: json.data.txn_id,
          invoice_url: json.data.invoice_url,
          amount: json.data.amount,
          currency: json.data.currency,
          wallet_hash: json.data.wallet_hash,
          qr_code_base64: json.data.qr_code_base64,
          expire_at_utc: json.data.expire_at_utc,
        },
        isSimulated: json.isSimulated,
      };
    } else if (json.message) {
      return {
        status: 'error',
        message: json.message
      };
    }

    return generateSimulatedInvoice();
  }

  /**
   * Request a crypto withdrawal (communicates with backend server or falls back seamlessly to simulated payout)
   */
  public async requestWithdrawal(req: PlisioPayoutRequest): Promise<PlisioPayoutResponse> {
    const curr = req.currency || 'USDT_TRX';

    const generateSimulatedPayout = (): PlisioPayoutResponse => {
      const payoutId = 'PLISIO_OUT_' + Date.now();
      return {
        status: 'success',
        data: {
          id: payoutId,
          amount: Number(req.amount).toFixed(2),
          currency: curr,
          status: 'pending',
          tx_url: `https://tronscan.org/#/transaction/simulated_${payoutId}`
        },
        isSimulated: true
      };
    };

    const res = await this.fetchJsonSafely('/api/plisio/payout/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (res.isHtml || !res.data) {
      return generateSimulatedPayout();
    }

    const json = res.data;

    if (json.status === 'success' && json.data) {
      return {
        status: 'success',
        data: {
          id: json.data.id,
          amount: json.data.amount,
          currency: json.data.currency,
          status: json.data.status || 'pending',
          tx_url: json.data.tx_url,
        },
        isSimulated: json.isSimulated,
      };
    } else if (json.message) {
      return {
        status: 'error',
        message: json.message
      };
    }

    return generateSimulatedPayout();
  }

  /**
   * Verify transaction status via backend proxy
   */
  public async checkOperationStatus(id: string): Promise<any> {
    const res = await this.fetchJsonSafely(`/api/plisio/operations/${id}`);
    if (res.ok && res.data) {
      return res.data;
    }
    return { status: 'success', data: { status: 'completed' }, isSimulated: true };
  }
}

export const plisioService = new PlisioService();

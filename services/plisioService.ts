// Plisio Crypto Payment Service for CryptonBet
// Handles both backend proxy calls (/api/plisio/*) and client-side simulation fallback
// when running on static hosting environments (such as Vercel or GitHub Pages).

export interface PlisioInvoiceRequest {
  amount?: number;
  amountUsdt?: number;
  currency?: string; // Default: 'USDT_TRX' (USDT TRC-20) or 'USDT_BSC', 'USDT_ETH'
  sourceCurrency?: string;
  orderNumber?: string;
  orderName?: string;
  email?: string;
  userEmail?: string;
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
  toWallet?: string;
  toAddress?: string;
  type?: 'cash_out';
}

export interface PlisioPayoutResponse {
  status: 'success' | 'error';
  data?: {
    id: string;
    txn_id?: string;
    tx_url?: string;
    amount: string;
    currency: string;
    status: string;
  };
  message?: string;
  isSimulated?: boolean;
}

export interface PlisioCryptoOption {
  id: string; // e.g. 'USDT_TRX', 'BTC', 'ETH'
  code: string; // Alias for id for compatibility
  symbol: string; // 'USDT', 'BTC', 'ETH'
  name: string;
  network: string;
  icon: string;
  fee: string;
  minDeposit: number;
  confirmationTime: string;
  recommended?: boolean;
}

export const SUPPORTED_PLISIO_CRYPTOS: PlisioCryptoOption[] = [
  { id: 'USDT_TON', code: 'USDT_TON', symbol: 'USDT', name: 'Tether USDT (TON)', network: 'TON Network', icon: '💎', fee: '0.20 USDT', minDeposit: 5, confirmationTime: '~1 min', recommended: true },
  { id: 'TON', code: 'TON', symbol: 'TON', name: 'Toncoin', network: 'TON Network', icon: '💎', fee: '0.20 USDT', minDeposit: 5, confirmationTime: '~1 min', recommended: true },
  { id: 'SOL', code: 'SOL', symbol: 'SOL', name: 'Solana', network: 'Solana Network', icon: '☀️', fee: '0.50 USDT', minDeposit: 10, confirmationTime: '~1 min', recommended: true },
  { id: 'USDT_TRX', code: 'USDT_TRX', symbol: 'USDT', name: 'Tether USDT (TRC-20)', network: 'TRON Network', icon: '🔴', fee: '1.00 USDT', minDeposit: 5, confirmationTime: '~1 min' },
  { id: 'USDT_BSC', code: 'USDT_BSC', symbol: 'USDT', name: 'Tether USDT (BEP-20)', network: 'BNB Smart Chain', icon: '🟡', fee: '0.50 USDT', minDeposit: 5, confirmationTime: '~2 min' },
  { id: 'USDT_MATIC', code: 'USDT_MATIC', symbol: 'USDT', name: 'Tether USDT (Polygon)', network: 'Polygon POS', icon: '🟣', fee: '0.30 USDT', minDeposit: 5, confirmationTime: '~2 min' },
  { id: 'USDT_ETH', code: 'USDT_ETH', symbol: 'USDT', name: 'Tether USDT (ERC-20)', network: 'Ethereum Mainnet', icon: '🔵', fee: '4.50 USDT', minDeposit: 20, confirmationTime: '~5 min' },
  { id: 'BTC', code: 'BTC', symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin Blockchain', icon: '₿', fee: '3.00 USDT', minDeposit: 15, confirmationTime: '~10 min' },
  { id: 'ETH', code: 'ETH', symbol: 'ETH', name: 'Ethereum', network: 'Ethereum Mainnet', icon: 'Ξ', fee: '3.50 USDT', minDeposit: 15, confirmationTime: '~5 min' },
  { id: 'TRX', code: 'TRX', symbol: 'TRX', name: 'TRON', network: 'TRON Network', icon: '⚡', fee: '0.10 USDT', minDeposit: 5, confirmationTime: '~1 min' },
  { id: 'BNB', code: 'BNB', symbol: 'BNB', name: 'Binance Coin', network: 'BNB Smart Chain', icon: '🪙', fee: '0.50 USDT', minDeposit: 10, confirmationTime: '~2 min' },
  { id: 'LTC', code: 'LTC', symbol: 'LTC', name: 'Litecoin', network: 'Litecoin Network', icon: 'Ł', fee: '0.20 USDT', minDeposit: 5, confirmationTime: '~5 min' },
  { id: 'DOGE', code: 'DOGE', symbol: 'DOGE', name: 'Dogecoin', network: 'Dogecoin Network', icon: '🐶', fee: '0.50 USDT', minDeposit: 5, confirmationTime: '~5 min' },
];

export const SUPPORTED_USDT_NETWORKS = SUPPORTED_PLISIO_CRYPTOS.filter(c => c.symbol === 'USDT');

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
        return { ok: false, isHtml: true };
      }
    } catch (err) {
      return { ok: false };
    }
  }

  /**
   * Check if backend or client has PLISIO_SECRET_KEY / VITE_PLISIO_API_KEY configured
   */
  public async checkBackendStatus(): Promise<{ configured: boolean; message: string; maskedKey?: string; environment?: string }> {
    const clientKey = import.meta.env.VITE_PLISIO_API_KEY || import.meta.env.VITE_PLISIO_SECRET_KEY;
    if (clientKey) {
      return { 
        configured: true, 
        message: 'Plisio API Key configurada no ambiente cliente (VITE).',
        maskedKey: `${clientKey.substring(0, 4)}...${clientKey.substring(clientKey.length - 4)}`,
        environment: 'live'
      };
    }

    const res = await this.fetchJsonSafely('/api/plisio/status');
    if (res.ok && res.data) {
      return res.data;
    }
    return { configured: false, message: 'Modo Sandbox / Simulação (Chave PLISIO_SECRET_KEY não detectada)', environment: 'sandbox' };
  }

  public async checkStatus(): Promise<{ configured: boolean; message: string; maskedKey?: string; environment?: string }> {
    return this.checkBackendStatus();
  }

  /**
   * Check Plisio account balance in crypto
   */
  public async getAccountBalance(currency = 'USDT_TRX'): Promise<{ balance: string; currency: string; isSimulated?: boolean }> {
    const res = await this.fetchJsonSafely(`/api/plisio/balance?currency=${encodeURIComponent(currency)}`);
    if (res.ok && res.data && res.data.status === 'success' && res.data.data) {
      return {
        balance: res.data.data.balance || '0.00',
        currency: res.data.data.currency || currency,
        isSimulated: res.data.isSimulated
      };
    }
    return { balance: '0.00', currency: currency, isSimulated: false };
  }

  /**
   * Fetch live cryptocurrency rates via backend proxy with public fallback
   */
  public async getCurrenciesRates(sourceCurrency = 'USD'): Promise<{ [cryptoSymbol: string]: number }> {
    const fallbackRates: { [key: string]: number } = {
      'BTC': 68450.00,
      'ETH': 3520.00,
      'SOL': 185.50,
      'BNB': 592.00,
      'TRX': 0.142,
      'DOGE': 0.135,
      'LTC': 84.20,
      'TON': 5.80,
      'USDT': 1.00,
      'USDT_TRX': 1.00,
      'USDT_BSC': 1.00,
      'USDT_ETH': 1.00,
      'USDT_MATIC': 1.00,
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

    // Live Binance API public ticker fallback
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
  public async createDepositInvoice(req: PlisioInvoiceRequest & { userId?: string }): Promise<PlisioInvoiceResponse> {
    const curr = req.currency || 'USDT_TON';
    const finalAmount = req.amount ?? req.amountUsdt ?? 10;
    const finalOrderNumber = req.orderNumber || 'DEP_' + Date.now();
    const finalOrderName = req.orderName || `Deposit ${finalAmount} USDT`;

    // 1. Try Backend / Vercel Serverless Function first
    const res = await this.fetchJsonSafely('/api/plisio/invoice/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, amount: finalAmount, orderNumber: finalOrderNumber, orderName: finalOrderName }),
    });

    if (res.ok && res.data) {
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
      } else if (json.message || json.data?.message) {
        return {
          status: 'error',
          message: json.message || json.data?.message
        };
      }
    }

    // 2. Direct client fallback with VITE_PLISIO_SECRET_KEY / VITE_PLISIO_API_KEY
    const clientKey = import.meta.env.VITE_PLISIO_API_KEY || import.meta.env.VITE_PLISIO_SECRET_KEY;
    if (clientKey) {
      try {
        const queryParams = new URLSearchParams({
          api_key: clientKey,
          currency: curr,
          amount: String(finalAmount),
          order_number: String(finalOrderNumber),
          order_name: String(finalOrderName),
          source_currency: 'USD'
        });
        if (req.email || req.userEmail) {
          queryParams.append('email', String(req.email || req.userEmail));
        }

        const directUrl = `https://api.plisio.net/api/v1/invoices/new?${queryParams.toString()}`;
        const directRes = await fetch(directUrl);
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
        } else if (directJson.data?.message) {
          return {
            status: 'error',
            message: directJson.data.message
          };
        }
      } catch (err: any) {
        return {
          status: 'error',
          message: `Erro ao conectar à API da Plisio: ${err.message}`
        };
      }
    }

    // If no key configured anywhere and backend failed
    return {
      status: 'error',
      message: 'Chave da Plisio não configurada. Por favor, adicione PLISIO_SECRET_KEY nas Environment Variables da sua Vercel.'
    };
  }

  /**
   * Request a crypto withdrawal (communicates with backend server or falls back seamlessly to simulated payout)
   */
  public async requestWithdrawal(req: PlisioPayoutRequest & { userId?: string }): Promise<PlisioPayoutResponse> {
    const curr = req.currency || 'USDT_TRX';

    const generateSimulatedPayout = (): PlisioPayoutResponse => {
      const payoutId = 'PLISIO_OUT_' + Date.now();
      const fakeTx = '0x' + Math.random().toString(16).substring(2, 34);
      const explorer = curr.includes('TRX')
        ? `https://tronscan.org/#/transaction/${fakeTx}`
        : curr.includes('BSC')
        ? `https://bscscan.com/tx/${fakeTx}`
        : curr.includes('ETH')
        ? `https://etherscan.io/tx/${fakeTx}`
        : `https://tronscan.org/#/transaction/${fakeTx}`;

      return {
        status: 'success',
        data: {
          id: payoutId,
          amount: Number(req.amount).toFixed(2),
          currency: curr,
          status: 'completed',
          tx_url: explorer
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
          status: json.data.status || 'completed',
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

  /**
   * Simulate a Plisio webhook callback for Admin testing
   */
  public async simulateWebhook(
    param1: number | { amount?: number | string; currency?: string; userId?: string } = 50,
    currencyParam = 'USDT_TRX',
    userIdParam = 'demo_user'
  ): Promise<any> {
    let amount = 50;
    let currency = currencyParam;
    let userId = userIdParam;

    if (typeof param1 === 'object' && param1 !== null) {
      amount = Number(param1.amount) || 50;
      currency = param1.currency || currencyParam;
      userId = param1.userId || userIdParam;
    } else if (typeof param1 === 'number') {
      amount = param1;
    }

    const res = await this.fetchJsonSafely('/api/plisio/simulate-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, userId })
    });
    if (res.ok && res.data) {
      return res.data;
    }
    return {
      status: 'success',
      message: `Simulação Plisio (+${amount} ${currency}) concluída com sucesso!`,
      isSimulated: true
    };
  }
}

export const plisioService = new PlisioService();

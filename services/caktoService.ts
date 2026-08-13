// Cakto PIX Payment Service for CryptonBet
// Handles PIX deposits for Brazilian users via Cakto Pay API (with automatic simulation fallback)

export interface CaktoPixRequest {
  userId?: string;
  amountUsdt: number;
  amountBrl: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCpf?: string;
  docType?: 'cpf' | 'cnpj';
  docNumber?: string;
  offerId?: string;
  productId?: string;
  antifraudProfilingAttemptReference?: string;
  orderId?: string;
  clientId?: string;
  apiToken?: string;
  clientSecret?: string;
  pixKey?: string;
  receiverName?: string;
  checkoutUrl?: string;
  pixCopyPaste?: string;
}

export interface CaktoPixResponse {
  status: 'success' | 'error';
  data?: {
    txId: string;
    pixCopyPaste: string; // O código PIX Copia e Cola
    qrCodeUrl: string; // URL do QR Code
    checkoutUrl?: string; // Link de checkout oficial do produto Cakto Pay
    amountBrl: number;
    amountUsdt: number;
    expiresAt: number;
    receiverName: string;
  };
  message?: string;
  isSimulated?: boolean;
  apiNotice?: string;
}

class CaktoService {
  private async fetchJsonSafely(url: string, options?: RequestInit): Promise<{ ok: boolean; data?: any }> {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      try {
        return { ok: response.ok, data: JSON.parse(text) };
      } catch {
        return { ok: response.ok, data: { message: text } };
      }
    } catch (error: any) {
      return { ok: false, data: { message: error.message || 'Falha na conexão de rede' } };
    }
  }

  public async checkStatus(): Promise<{ configured: boolean; message: string }> {
    const res = await this.fetchJsonSafely('/api/cakto/status');
    if (res.ok && res.data) {
      return res.data;
    }
    return {
      configured: false,
      message: 'Modo Sandbox / Simulação (Sem chave API configurada no servidor)'
    };
  }

  public async createPixDeposit(req: CaktoPixRequest): Promise<CaktoPixResponse> {
    const res = await this.fetchJsonSafely('/api/cakto/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });

    if (res.ok && res.data && res.data.status === 'success') {
      return res.data;
    }

    if (res.data && res.data.status === 'error') {
      return res.data;
    }

    // Client-side fallback simulation (Apenas em modo Sandbox / teste sem chaves configuradas)
    const txId = 'PIX_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const pixKey = req.pixKey || 'pix@cryptonbet.com';
    const rawReceiver = req.receiverName && req.receiverName !== 'CryptonBet Brasil' ? req.receiverName : 'CryptonBet Brasil';
    const receiver = rawReceiver.substring(0, 25).toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    const city = 'MARILIA';
    const amountStr = req.amountBrl.toFixed(2);
    
    const tagValue = "54" + (amountStr.length >= 10 ? amountStr.length : '0' + amountStr.length) + amountStr;
    const tagReceiver = "59" + (receiver.length >= 10 ? receiver.length : '0' + receiver.length) + receiver;
    const tagCity = "60" + (city.length >= 10 ? city.length : '0' + city.length) + city;
    const shortTxId = txId.substring(0, 15);
    const tagTxId = "62" + ((shortTxId.length + 4) >= 10 ? (shortTxId.length + 4) : '0' + (shortTxId.length + 4)) + "05" + (shortTxId.length >= 10 ? shortTxId.length : '0' + shortTxId.length) + shortTxId;
    
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
    const crcStr = crc.toString(16).toUpperCase().padStart(4, '0');
    
    const pixCopyPaste = req.pixCopyPaste || (basePayload + crcStr);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCopyPaste)}`;

    return {
      status: 'success',
      data: {
        txId,
        pixCopyPaste,
        qrCodeUrl,
        checkoutUrl: req.checkoutUrl,
        amountBrl: req.amountBrl,
        amountUsdt: req.amountUsdt,
        expiresAt: Math.floor(Date.now() / 1000) + 1800, // 30 minutos
        receiverName: receiver
      },
      isSimulated: true
    };
  }

  public async getWebhookLogs(): Promise<{ status: string; logs: any[] }> {
    const res = await this.fetchJsonSafely('/api/cakto/webhook-logs');
    if (res.ok && res.data) {
      return res.data;
    }
    return { status: 'error', logs: [] };
  }

  public async clearWebhookLogs(): Promise<{ status: string; message?: string }> {
    const res = await this.fetchJsonSafely('/api/cakto/webhook-logs', { method: 'DELETE' });
    return res.data || { status: 'success' };
  }

  public async simulateWebhook(txId?: string, amount?: number, status = "paid"): Promise<{ status: string; message?: string }> {
    const res = await this.fetchJsonSafely('/api/cakto/webhook-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId, amount, status })
    });
    return res.data || { status: 'success' };
  }
}

export const caktoService = new CaktoService();

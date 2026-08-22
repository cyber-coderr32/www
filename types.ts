
export enum GameStatus {
  IDLE = 'IDLE',
  BETTING = 'BETTING',
  FLYING = 'FLYING',
  CRASHED = 'CRASHED'
}

export type ViewState = 'LOGIN' | 'REGISTER' | 'HOME' | 'AVIATOR' | 'ROULETTE' | 'SLOTS' | 'DICE' | 'LOTTERY' | 'MINES' | 'PLINKO' | 'PENALTY' | 'BLACKJACK' | 'COINFLIP' | 'POKER' | 'KENO' | 'BACCARAT' | 'SCRATCH' | 'WHEEL' | 'CRASH' | 'POKE_CHOMP' | 'LIMBO' | 'TOWER' | 'HILO' | 'STAIRS' | 'PROFILE' | 'ADMIN' | 'MAINTENANCE' | 'PROMOTIONS' | 'HISTORY' | 'SOCIAL' | 'P2P' | 'PDF_MARKET' | 'PRODUCT_MANAGER' | 'TERMS' | 'PRIVACY' | 'REFUND' | 'SUCCESS' | 'FAILURE' | 'VIEW_PROFILE' | 'CREATE_PRODUCT' | 'API_PORTAL' | 'EMBED_GAME' | 'TRANSACTION_STATUS';

export interface ApiKeyRecord {
  id: string;
  userId: string;
  operatorName: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl?: string;
  callbackSecret?: string;
  ipWhitelist?: string[];
  ggrSharePercent: number; // e.g. 15 (%)
  currency: string; // e.g. 'USDT', 'BRL', 'AOA'
  status: 'ACTIVE' | 'SUSPENDED';
  environment: 'production' | 'sandbox';
  createdAt: string;
  totalBetsCount?: number;
  totalBetsVolume?: number;
  totalPayoutVolume?: number;
  ggr?: number;
}

export interface OperatorSession {
  sessionId: string;
  sessionToken: string;
  operatorId: string;
  operatorName: string;
  playerId: string;
  playerName: string;
  gameId: string;
  currency: string;
  balance: number;
  mode: 'REAL' | 'DEMO';
  returnUrl?: string;
  webhookUrl?: string;
  createdAt: string;
  expiresAt: string;
}

export interface OperatorTransaction {
  id: string;
  operatorId: string;
  operatorName: string;
  playerId: string;
  gameId: string;
  betAmount: number;
  winAmount: number;
  multiplier: number;
  currency: string;
  timestamp: string;
}

export interface GameCatalogItem {
  id: string;
  name: string;
  category: 'CRASH' | 'SLOTS' | 'TABLE' | 'ARCADE' | 'CARDS';
  rtp: number;
  minBet: number;
  maxBet: number;
  icon: string;
  banner: string;
  description: string;
  status: 'ACTIVE' | 'MAINTENANCE';
  provider: string;
}

export interface Bet {
  amount: number;
  autoCashout: number | null;
  cashedOut: boolean;
  winAmount: number;
  multiplierAtCashout: number | null;
  isAutoBet?: boolean;
}

export interface RoundHistory {
  id: string;
  multiplier: number;
  timestamp: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  balance: number;
  usdtBalance?: number;
  role: 'USER' | 'ADMIN';
  isBanned: boolean;
  joinedAt: string;
  bio?: string;
  avatarColor?: string;
  whatsapp?: string;
}

export interface P2POffer {
  id: string;
  userId: string;
  userName: string;
  type: 'BUY' | 'SELL';
  amount: number;
  totalAmount: number;
  price: number;
  minLimit?: number;
  whatsapp?: string;
  paymentDetails: string;
  pixKey?: string;
  internationalPayments?: string;
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
}

export interface P2PTrade {
  id: string;
  offerId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  price: number;
  totalKZ: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  paymentProofUrl?: string;
  paymentDetails?: string;
  pixKey?: string;
  internationalPayments?: string;
  buyerPhone?: string;
  sellerPhone?: string;
  createdAt: string;
  updatedAt: string;
  disputeReason?: string;
  disputedBy?: string;
}

export interface TransactionRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  method: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
  proofUrl?: string;
  accountDetails?: string;
  cryptoCurrency?: string;
  walletAddress?: string;
  txHash?: string;
  txUrl?: string;
  payoutId?: string;
  isAutomaticPayout?: boolean;
  payoutError?: string;
  rejectionReason?: string;
}

export interface CaktoSettings {
  enabled: boolean;
  clientId?: string;
  apiToken?: string;
  clientSecret?: string;
  webhookSecret?: string;
  pixKey: string;
  receiverName: string;
  exchangeRate: number; // USDT to BRL conversion rate (Ex: 5.85)
  environment: 'sandbox' | 'production';
  productId?: string;
  offerId?: string;
  checkoutUrl?: string; // Link de checkout oficial do produto Cakto
  pixCopyPaste?: string; // Código PIX Copia e Cola gerado por produto Cakto
}

export interface PlisioSettings {
  enabled: boolean;
  secretKey?: string;
  whiteLabel?: boolean;
  environment: 'sandbox' | 'production';
  defaultCurrency?: string; // e.g. 'USDT_TRX'
  acceptedCurrencies?: string[];
  depositBonusPercent?: number;
  withdrawMode?: 'automatic' | 'manual'; // 'automatic' direct API payout or 'manual' admin approval queue
  autoWithdrawMaxAmount?: number; // Maximum limit for instant automatic crypto payout without manual review
}

export interface PdfBook {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  sellerId: string;
  sellerName: string;
  coverColor: string;
  coverImage?: string; // High-definition cover photo URL or base64
  createdAt: string;
  downloads: number;
  category?: string;
  pagesCount?: number;
  pdfFileUrl?: string;
  pdfFileName?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'CRYPTO' | 'MOBILE_MONEY' | 'BANK' | 'UNITEL_MONEY' | 'PIX';
  icon: string;
  account: string;
  details?: string;
  isActive: boolean;
  minDeposit: number;
  maxWithdraw: number;
  cryptoType?: 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TRX' | 'BNB' | 'LTC' | 'DOGE';
  cryptoNetwork?: string;
  entityNumber?: string;
  referenceNumber?: string;
  qrCodeUrl?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMO' | 'ALERT' | 'BONUS' | 'FINANCE';
  target: 'ALL' | string; // 'ALL' or specific user ID
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  senderName?: string;
  createdAt: string;
  readBy?: string[];
  actionUrl?: string;
  actionText?: string;
  actionView?: ViewState;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface GlobalSettings {
  siteName: string;
  maintenanceMode: boolean;
  globalRtp: number;
  baitingMode?: boolean;
  houseAdvantageLevel?: 'LOW' | 'MEDIUM' | 'EXTREME';
  maxRoundPayback?: number;
  fakeWinnersEnabled?: boolean;
  forcedAviatorMultiplier: number | null;
  globalNotification: string | null;
  totalVolume: number;
  totalPaid: number;
  paymentMethods: PaymentMethod[];
  cakto?: CaktoSettings;
  plisio?: PlisioSettings;
}

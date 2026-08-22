import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  where,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../services/firebase';
import { soundService } from '../services/soundService';
import {
  Globe,
  Users,
  MessageSquare,
  Send,
  Heart,
  Trash2,
  UserPlus,
  UserCheck,
  UserMinus,
  Search,
  Check,
  X,
  Smile,
  MessageCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ThumbsUp,
  Share2,
  Video,
  Image as ImageIcon,
  MoreHorizontal,
  ArrowUpDown,
  Upload,
  Phone,
  VideoOff,
  Info,
  Gift,
  Bookmark,
  Award,
  Play,
  HelpCircle,
  Hash,
  ShieldCheck,
  CheckCircle2,
  Pin,
  Edit3,
  Copy,
  CornerDownRight,
  Flag,
  Bell,
  BookOpen,
  Wallet,
  ChevronLeft,
  Gavel,
  Megaphone,
  Flame,
  Zap,
  Percent,
  FileText,
  Star,
  ShoppingCart,
  DollarSign,
  Lock,
  Eye,
  ExternalLink,
  MapPin,
  CreditCard,
  Target,
  Calendar,
  RefreshCw,
  Reply,
  Plus,
  BarChart3,
  Store,
  EyeOff,
  Package,
  Layers,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SocialNotification {
  id: string;
  userId: string; // recipient
  senderId: string;
  senderName: string;
  type: 'like_post' | 'comment_post' | 'reply_comment' | 'like_comment' | 'like_reply' | 'friend_request' | 'friend_accept' | 'private_message';
  postId?: string;
  commentId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  likes?: string[];
}

interface PostComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  likes?: string[];
  replies?: CommentReply[];
  isSuperChat?: boolean;
  superChatAmount?: number;
  superChatColor?: string;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  authorId?: string;
  authorName?: string;
  sellerId?: string;
  downloads?: number;
  status?: string;
  content: string;
  likes: string[];
  reactions?: { [userId: string]: string };
  comments?: PostComment[];
  createdAt: any;
  tradeAsset?: string;
  tradeResult?: 'win' | 'loss';
  tradeProfit?: number;
  isPinned?: boolean;
  isMonetized?: boolean;
  imageUrl?: string;
  postType?: 'social' | 'p2p' | 'pdf';
  p2pCoin?: string;
  p2pAmount?: number;
  p2pPrice?: number;
  p2pIban?: string;
  p2pPix?: string;
  p2pInternational?: string;
  p2pStatus?: 'available' | 'sold';
  p2pBuyerId?: string;
  p2pBuyerName?: string;
  pdfTitle?: string;
  pdfAuthor?: string;
  pdfDescription?: string;
  pdfPrice?: number;
  pdfCoverColor?: string;
  pdfDownloads?: number;
  pdfCategory?: string;
  pdfLevel?: string;
  pdfIncludes?: string[];
  pdfPagesCount?: number;
  pdfPreviewSnippet?: string;
  pdfHasGuarantee?: boolean;
  pdfFileUrl?: string;
  pdfFileName?: string;
  sharedFromPostId?: string;
  sharedFromUserName?: string;
  sharedFromContent?: string;
  sharedFromImageUrl?: string;
  sharedFromPostType?: 'social' | 'p2p' | 'pdf';
  sharedFromPdfTitle?: string;
  sharedFromPdfAuthor?: string;
  sharedFromPdfCoverColor?: string;
  sharedFromPdfDescription?: string;
  sharedFromPdfPrice?: number;
  sharedFromPdfFileUrl?: string;
  sharedFromPdfFileName?: string;
  sharedFromP2pCoin?: string;
  sharedFromP2pAmount?: number;
  sharedFromP2pPrice?: number;
}

interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

interface PrivateMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  createdAt: any;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  reactions?: { [emoji: string]: string[] };
}

interface UserProfile {
  uid: string;
  displayName: string;
  balance?: number;
}

interface SocialViewProps {
  balance: number;
  isDemo: boolean;
  onBack: () => void;
  onSelectGame?: (view: any, param?: any) => void;
  onUpdateBalance?: (amount: number) => void;
  initialFilter?: 'all' | 'social' | 'p2p' | 'pdf' | 'manager';
  autoOpenCreateAd?: boolean;
  targetScrollId?: string | null;
  onClearTargetScrollId?: () => void;
}

const SocialView: React.FC<SocialViewProps> = ({ balance, isDemo, onBack, onSelectGame, onUpdateBalance, initialFilter = 'all', autoOpenCreateAd, targetScrollId, onClearTargetScrollId }) => {
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || 'guest_user';
  const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Trader Convidado';

  // Navigation State
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'chat'>('feed');
  const [feedFilter, setFeedFilter] = useState<'all' | 'social' | 'p2p' | 'pdf' | 'manager'>((initialFilter || 'all') as any);
  const [managerFilterType, setManagerFilterType] = useState<'all' | 'pdf' | 'p2p'>('all');
  const [managerSearch, setManagerSearch] = useState('');

  useEffect(() => {
    if (initialFilter) {
      setFeedFilter(initialFilter as any);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (autoOpenCreateAd) {
      setShowCreateAdModal(true);
    }
  }, [autoOpenCreateAd]);

  // Feed Posts State
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (targetScrollId) {
      const timer = setTimeout(() => {
        const idsToCheck = [
          `post-card-${targetScrollId}`,
          `book-card-${targetScrollId}`,
          `ad-card-${targetScrollId}`,
          targetScrollId
        ];
        let el: HTMLElement | null = null;
        for (const id of idsToCheck) {
          el = document.getElementById(id);
          if (el) break;
        }
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-[#049444]', 'ring-offset-4', 'ring-offset-[#060809]', 'transition-all', 'duration-500');
          setTimeout(() => {
            el?.classList.remove('ring-4', 'ring-[#049444]', 'ring-offset-4', 'ring-offset-[#060809]');
          }, 3000);
          if (onClearTargetScrollId) onClearTargetScrollId();
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [targetScrollId, posts]);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  // Post Options and Replies States
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState<string>('');
  const [reportedPostIds, setReportedPostIds] = useState<string[]>([]);
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [commentReplyInputs, setCommentReplyInputs] = useState<{ [commentId: string]: string }>({});

  // Share Modal State
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [shareNote, setShareNote] = useState<string>('');
  const [isPublishingShare, setIsPublishingShare] = useState<boolean>(false);

  // Optional Trade Sharing simulation for post box
  const [shareTrade, setShareTrade] = useState(false);
  const [tradeAsset, setTradeAsset] = useState('BTC/AOA');
  const [tradeProfit, setTradeProfit] = useState('15000');
  const [tradeResult, setTradeResult] = useState<'win' | 'loss'>('win');
  const [postImage, setPostImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consolidated Publishing State
  const [creatorTab, setCreatorTab] = useState<'social' | 'p2p' | 'pdf'>('social');
  const [p2pCoin, setP2pCoin] = useState('USDT');
  const [p2pAmount, setP2pAmount] = useState('50');
  const [p2pPrice, setP2pPrice] = useState('45000');
  const [p2pIban, setP2pIban] = useState('AO06.0040.0000.4152.9912.8271.3 - Banco BAI');
  const [p2pPix, setP2pPix] = useState('');
  const [p2pInternational, setP2pInternational] = useState('');

  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfAuthor, setPdfAuthor] = useState('');
  const [pdfDescription, setPdfDescription] = useState('');
  const [pdfPrice, setPdfPrice] = useState('2500');
  const [pdfCoverColor, setPdfCoverColor] = useState('from-blue-600 to-indigo-900');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfCategory, setPdfCategory] = useState('E-Book');
  const [pdfLevel, setPdfLevel] = useState('Iniciante');
  const [pdfIncludes, setPdfIncludes] = useState('Suporte WhatsApp, Acesso Vitalício, Grupo VIP');
  const [pdfPagesCount, setPdfPagesCount] = useState('45');
  const [pdfPreviewSnippet, setPdfPreviewSnippet] = useState('Aprenda técnicas de Price Action avançadas para o mercado financeiro.');
  const [pdfHasGuarantee, setPdfHasGuarantee] = useState(true);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfImageInputRef = useRef<HTMLInputElement>(null);

  // Reactions, Memberships, Super Chats and Monetization states
  const [activeReactionPostId, setActiveReactionPostId] = useState<string | null>(null);
  const [activeSuperChatPostId, setActiveSuperChatPostId] = useState<string | null>(null);
  const [superChatAmountState, setSuperChatAmountState] = useState<number>(1000);
  const [superChatColorState, setSuperChatColorState] = useState<string>('green');

  const [showCreatorStudio, setShowCreatorStudio] = useState(false);
  const [creatorStudioTab, setCreatorStudioTab] = useState<'progress' | 'analytics'>('progress');
  const [isMonetizationEnabled, setIsMonetizationEnabled] = useState(() => {
    return localStorage.getItem('cryptonbet_monetization_enabled') === 'true';
  });
  const [creatorAdEarningsClaimed, setCreatorAdEarningsClaimed] = useState<number>(() => {
    return Number(localStorage.getItem(`cryptonbet_creator_claimed_earnings_${currentUserId}`) || '0');
  });

  // Helper to check if a post creator is monetized
  const isPostCreatorMonetized = (post: Post) => {
    if (post.userId === currentUserId) {
      return isMonetizationEnabled;
    }
    const MONETIZED_IDS = ['user_mestre_trader', 'user_ana_silva', 'user_carlos_eduardo', 'user_mateus_kwanza'];
    const uName = (post.userName || '').toLowerCase();
    return post.isMonetized || MONETIZED_IDS.includes(post.userId) || uName.includes('trader') || uName.includes('mestre') || uName.includes('pro');
  };

  const [memberships, setMemberships] = useState<{ [creatorId: string]: boolean }>(() => {
    return JSON.parse(localStorage.getItem('cryptonbet_memberships') || '{}');
  });

  // Local state for purchased books (simulated to support downloads/ownership from feed)
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([]);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [openPreviewPostId, setOpenPreviewPostId] = useState<string | null>(null);
  const [showPdfCart, setShowPdfCart] = useState(false);
  const [pdfReviews, setPdfReviews] = useState<Record<string, Array<{ userId: string; userName: string; rating: number; comment: string; createdAt: string }>>>({});
  const [ratingBookId, setRatingBookId] = useState<string | null>(null);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');

  // Carousel, Sponsored Ads & Auction states
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [sponsoredAds, setSponsoredAds] = useState<any[]>([]);

  const [activeAuction, setActiveAuction] = useState({
    id: 'auc_1',
    pdfTitle: '📚 MANUAL SUPREMO DE PRICE ACTION INSTITUCIONAL',
    pdfAuthor: 'Sandro "Pips" Neto',
    currentBid: 7500,
    highestBidder: 'MisterForex_AO',
    timeRemaining: 542, // seconds
    bidsCount: 12,
    minIncrement: 500,
    coverColor: 'from-emerald-600 to-teal-950'
  });

  const [myBidAmount, setMyBidAmount] = useState('8000');

  // Countdown timer for the live PDF auction
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAuction(prev => {
        if (prev.timeRemaining <= 1) {
          // Restart with 10 mins to keep user experience active
          return { ...prev, timeRemaining: 600, bidsCount: prev.bidsCount + 1 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Geographic & Target Audience Definitions for Ads
  const GEOGRAPHIC_LOCATIONS: Record<string, string[]> = {
    'Angola': ['Luanda', 'Lubango (Huíla)', 'Benguela', 'Huambo', 'Cabinda', 'Namibe', 'Malanje', 'Todas as Províncias de Angola'],
    'Brasil': ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Brasília', 'Curitiba', 'Todos os Estados do Brasil'],
    'Portugal': ['Lisboa', 'Porto', 'Braga', 'Faro', 'Coimbra', 'Todas as Regiões de Portugal'],
    'Moçambique': ['Maputo', 'Beira', 'Nampula', 'Tete', 'Todas as Regiões de Moçambique'],
    'Global': ['Global / Qualquer Região']
  };

  const TARGET_AUDIENCE_OPTIONS = [
    '🎯 Geral (Todos os Leitores)',
    '💼 Empreendedores & PMEs',
    '💸 Cripto, P2P & Investidores',
    '🎓 Estudantes & Jovens',
    '🎮 Apostadores & Gamers Aviator',
    '📚 Leitores de E-Books & Cursos'
  ];

  // Paid-To-Read Text Ads & Campaign Monetization states
  const DEFAULT_TEXT_ADS: any[] = [];

  const [textAds, setTextAds] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('cryptonbet_text_ads');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((a: any) => a && !a.id?.startsWith('ta_') && !a.userId?.startsWith('system_sponsor'));
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  // Dynamically determine which slides have REAL data (no test content)
  const realSponsoredAds = useMemo(() => {
    return textAds.filter(a => a && a.userId && !a.userId.startsWith('system_sponsor') && !a.id?.startsWith('ta_') && a.status === 'ACTIVE');
  }, [textAds]);

  const realActiveP2p = useMemo(() => {
    return posts.find(p => p.postType === 'p2p' && p.p2pStatus === 'available' && p.id !== 'fallback_p2p');
  }, [posts]);

  const realActivePdf = useMemo(() => {
    return posts.find(p => p.postType === 'pdf');
  }, [posts]);

  const activeCarouselSlides = useMemo(() => {
    const slides: Array<{ id: string; label: string; icon: string }> = [
      { id: 'wallet', label: 'Painel Financeiro Único', icon: 'wallet' }
    ];
    if (realSponsoredAds.length > 0) {
      slides.push({ id: 'sponsor', label: 'Campanha Patrocinada', icon: 'megaphone' });
    }
    if (realActiveP2p) {
      slides.push({ id: 'p2p', label: 'Anúncio de Venda P2P', icon: 'p2p' });
    }
    if (realActivePdf) {
      slides.push({ id: 'pdf', label: 'E-Book PDF em Destaque', icon: 'pdf' });
    }
    return slides;
  }, [realSponsoredAds, realActiveP2p, realActivePdf]);

  // Autoplay carousel slide change every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex(prev => (prev >= activeCarouselSlides.length - 1 ? 0 : prev + 1));
    }, 8000);
    return () => clearInterval(timer);
  }, [activeCarouselSlides.length]);

  const [showReadAdsModal, setShowReadAdsModal] = useState(false);
  const [showCreateAdModal, setShowCreateAdModal] = useState(false);
  const [readingAd, setReadingAd] = useState<any | null>(null);
  const [readingCountdown, setReadingCountdown] = useState<number>(3);
  const [hasClaimedCurrentAd, setHasClaimedCurrentAd] = useState(false);

  // Extended Form states for creating a new Ad campaign
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdContent, setNewAdContent] = useState('');
  const [newAdLink, setNewAdLink] = useState('');
  const [newAdImageUrl, setNewAdImageUrl] = useState('');
  const [newAdTargetAudience, setNewAdTargetAudience] = useState('🎯 Geral (Todos os Leitores)');
  const [newAdTargetCountry, setNewAdTargetCountry] = useState('Angola');
  const [newAdTargetCity, setNewAdTargetCity] = useState('Luanda');
  const [newAdDurationDays, setNewAdDurationDays] = useState<number>(7);
  const [newAdBudget, setNewAdBudget] = useState<number>(5000);
  const [newAdReward, setNewAdReward] = useState<number>(50);
  const [newAdPaymentMethod, setNewAdPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET');

  // Credit/Debit Card Form States
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Ad Tabs and Renewal
  const [adModalTab, setAdModalTab] = useState<'EXPLORE' | 'MY_ADS'>('EXPLORE');
  const [renewingAdItem, setRenewingAdItem] = useState<any | null>(null);
  const [renewDurationDays, setRenewDurationDays] = useState<number>(7);
  const [renewBudget, setRenewBudget] = useState<number>(5000);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET');

  const adImageInputRef = useRef<HTMLInputElement>(null);

  // Editing Product / Listing state
  const [editingProduct, setEditingProduct] = useState<Post | null>(null);
  const [editPdfTitle, setEditPdfTitle] = useState('');
  const [editPdfPrice, setEditPdfPrice] = useState<number>(1000);
  const [editPdfDescription, setEditPdfDescription] = useState('');
  const [editPdfIncludes, setEditPdfIncludes] = useState('');
  const [editPdfPagesCount, setEditPdfPagesCount] = useState('45');
  const [editPdfPreviewSnippet, setEditPdfPreviewSnippet] = useState('');

  const [editP2pCoin, setEditP2pCoin] = useState('USDT');
  const [editP2pAmount, setEditP2pAmount] = useState<number>(100);
  const [editP2pPriceKz, setEditP2pPriceKz] = useState<number>(1000);
  const [editP2pIban, setEditP2pIban] = useState('');
  const [editP2pPix, setEditP2pPix] = useState('');
  const [editP2pInternational, setEditP2pInternational] = useState('');

  const handleOpenEditProduct = (post: Post) => {
    soundService.playUISelect();
    setEditingProduct(post);
    if (post.postType === 'pdf') {
      setEditPdfTitle(post.pdfTitle || '');
      setEditPdfPrice(post.pdfPrice || 1000);
      setEditPdfDescription(post.pdfDescription || '');
      setEditPdfIncludes((post.pdfIncludes || []).join(', '));
      setEditPdfPagesCount(post.pdfPagesCount?.toString() || '45');
      setEditPdfPreviewSnippet(post.pdfPreviewSnippet || '');
    } else if (post.postType === 'p2p') {
      setEditP2pCoin(post.p2pCoin || 'USDT');
      setEditP2pAmount(post.p2pAmount || 100);
      setEditP2pPriceKz(post.p2pPrice || 1000);
      setEditP2pIban(post.p2pIban || '');
      setEditP2pPix(post.p2pPix || '');
      setEditP2pInternational(post.p2pInternational || '');
    }
  };

  const handleSaveEditedProduct = () => {
    if (!editingProduct) return;
    soundService.playWin();

    const updated = posts.map(p => {
      if (p.id === editingProduct.id) {
        if (p.postType === 'pdf') {
          return {
            ...p,
            pdfTitle: editPdfTitle || p.pdfTitle,
            pdfPrice: Number(editPdfPrice) || p.pdfPrice,
            pdfDescription: editPdfDescription || p.pdfDescription,
            pdfIncludes: editPdfIncludes ? editPdfIncludes.split(',').map(s => s.trim()).filter(Boolean) : p.pdfIncludes,
            pdfPagesCount: parseInt(editPdfPagesCount) || p.pdfPagesCount,
            pdfPreviewSnippet: editPdfPreviewSnippet || p.pdfPreviewSnippet,
          };
        } else if (p.postType === 'p2p') {
          return {
            ...p,
            p2pCoin: editP2pCoin || p.p2pCoin,
            p2pAmount: Number(editP2pAmount) || p.p2pAmount,
            p2pPrice: Number(editP2pPriceKz) || p.p2pPrice,
            p2pIban: editP2pIban || p.p2pIban,
            p2pPix: editP2pPix,
            p2pInternational: editP2pInternational,
          };
        }
      }
      return p;
    });

    setPosts(updated);
    localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));

    if (editingProduct.postType === 'pdf') {
      try {
        const marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
        const updatedBooks = marketBooks.map((b: any) => {
          if (b.id === editingProduct.id || b.title === editingProduct.pdfTitle) {
            return {
              ...b,
              title: editPdfTitle || b.title,
              price: Number(editPdfPrice) || b.price,
              description: editPdfDescription || b.description,
              pagesCount: parseInt(editPdfPagesCount) || b.pagesCount
            };
          }
          return b;
        });
        localStorage.setItem('crypton_market_pdf_books', JSON.stringify(updatedBooks));
      } catch (e) {}
    }

    showAlert('Produto/Anúncio atualizado com sucesso!', 'success');
    setEditingProduct(null);
  };

  const handleDeleteProduct = (post: any) => {
    if (!window.confirm(`Tem certeza que deseja ELIMINAR definitivamente o produto "${post.pdfTitle || post.title || post.p2pCoin || 'Este Item'}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    soundService.playTick();
    const updated = posts.filter(p => p.id !== post.id);
    setPosts(updated);
    localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));

    try {
      const marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
      const updatedBooks = marketBooks.filter((b: any) => b.id !== post.id && b.title !== (post.pdfTitle || post.title));
      localStorage.setItem('crypton_market_pdf_books', JSON.stringify(updatedBooks));
    } catch (e) {}

    showAlert('Produto eliminado com sucesso!', 'success');
  };

  const handleTogglePauseProduct = (post: any) => {
    soundService.playUISelect();
    const newStatus = post.status === 'paused' ? 'active' : 'paused';
    const updated = posts.map(p => {
      if (p.id === post.id) {
        return { ...p, status: newStatus };
      }
      return p;
    });
    setPosts(updated);
    localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));

    try {
      const marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
      const updatedBooks = marketBooks.map((b: any) => {
        if (b.id === post.id || b.title === (post.pdfTitle || post.title)) {
          return { ...b, status: newStatus };
        }
        return b;
      });
      localStorage.setItem('crypton_market_pdf_books', JSON.stringify(updatedBooks));
    } catch (e) {}

    showAlert(`Produto ${newStatus === 'paused' ? 'pausado temporariamente' : 'ativado e visível no mercado'}!`, 'success');
  };

  const handlePromotePost = (post: Post) => {
    if (post.userId !== currentUserId) {
      showAlert('Você só pode promover as suas próprias publicações e produtos.', 'error');
      return;
    }
    soundService.playUISelect();
    setNewAdTitle(`[PROMOÇÃO] ${post.pdfTitle || post.p2pCoin || 'Publicação de ' + post.userName}`);
    setNewAdContent(post.content || post.pdfDescription || `Conteúdo de ${post.userName}`);
    setNewAdLink(`${window.location.origin}/post/${post.id}`);
    setShowCreateAdModal(true);
  };

  // Save text ads to localStorage
  useEffect(() => {
    localStorage.setItem('cryptonbet_text_ads', JSON.stringify(textAds));
  }, [textAds]);

  // Countdown timer when reading an ad
  useEffect(() => {
    let timer: any;
    if (readingAd && readingCountdown > 0) {
      timer = setInterval(() => {
        setReadingCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [readingAd, readingCountdown]);

  // Start reading a text ad
  const handleStartReadingAd = (ad: any) => {
    soundService.playUISelect();
    setReadingAd(ad);
    setReadingCountdown(3);
    setHasClaimedCurrentAd(false);
  };

  // Directly view/interact with ad and claim reward instantly (Facebook style)
  const handleClaimAdReward = (ad: any) => {
    if (!ad) return;
    const hasRead = (ad.readByUsers || []).includes(currentUserId);
    if (hasRead) {
      if (ad.link) {
        window.open(ad.link, '_blank');
      } else {
        showAlert('Já visualizaste este anúncio patrocinado!', 'success');
      }
      return;
    }

    soundService.playDepositSuccess();

    // Update user balance
    onUpdateBalance(ad.reward);

    // Mark as read and increment impression counter
    setTextAds(prev => prev.map(item => {
      if (item.id === ad.id) {
        return {
          ...item,
          impressions: (item.impressions || 120) + 1,
          remainingBudget: Math.max(0, item.remainingBudget - item.reward),
          readByUsers: [...(item.readByUsers || []), currentUserId]
        };
      }
      return item;
    }));

    // Record earnings from reading ads
    const currentReadEarnings = Number(localStorage.getItem(`cryptonbet_ad_read_earnings_${currentUserId}`) || '0');
    localStorage.setItem(`cryptonbet_ad_read_earnings_${currentUserId}`, (currentReadEarnings + ad.reward).toString());

    showAlert(`Parabéns! Visualizaste o anúncio de "${ad.sponsor}" e recebeste +${(ad.reward || 0).toFixed(2)} USDT!`, 'success');

    if (ad.link) {
      window.open(ad.link, '_blank');
    }
  };

  // Ad image upload handler
  const handleAdImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        showAlert('A imagem publicitária não deve exceder 8 MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAdImageUrl(reader.result as string);
        showAlert('Imagem da campanha carregada com sucesso!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  // Create a new text ad campaign with target location, audience, image & payment method
  const handleCreateAdCampaign = () => {
    if (!newAdTitle.trim() || !newAdContent.trim()) {
      showAlert('Por favor, preencha o título e a mensagem publicitária do anúncio.', 'error');
      return;
    }
    if (newAdBudget < 2000) {
      showAlert('O orçamento mínimo para criar uma campanha é de 2 USDT.', 'error');
      return;
    }

    if (newAdPaymentMethod === 'WALLET') {
      if (balance < newAdBudget) {
        showAlert('Saldo insuficiente na carteira para financiar esta campanha. Selecione pagamento por Cartão ou carregue a sua conta.', 'error');
        return;
      }
      soundService.playUISelect();
      onUpdateBalance(-newAdBudget);
    } else {
      // Credit Card Payment Validation
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 13) {
        showAlert('Por favor, insira um número de cartão de crédito/débito válido (13 a 16 dígitos).', 'error');
        return;
      }
      if (!cardHolder.trim()) {
        showAlert('Por favor, insira o nome do titular do cartão.', 'error');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5 || !cardCvv || cardCvv.length < 3) {
        showAlert('Por favor, preencha a data de validade (MM/AA) e o código CVV de segurança.', 'error');
        return;
      }
      soundService.playWin();
    }

    const viewerRewardPool = Math.floor(newAdBudget * 0.70);
    const creatorRevenueShare = Math.floor(newAdBudget * 0.30);

    // Add 30% to global creator ad revenue pool
    const currentGlobalPool = Number(localStorage.getItem('cryptonbet_global_ad_revenue') || '0');
    localStorage.setItem('cryptonbet_global_ad_revenue', (currentGlobalPool + creatorRevenueShare).toString());

    const expiresAt = Date.now() + newAdDurationDays * 86400000;

    // Create new ad item
    const newAd = {
      id: `ta_${Date.now()}`,
      title: newAdTitle,
      content: newAdContent,
      sponsor: currentUserName || 'Patrocinador',
      link: newAdLink || 'https://cryptonbet.app',
      reward: newAdReward,
      totalBudget: newAdBudget,
      remainingBudget: viewerRewardPool,
      imageUrl: newAdImageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80',
      targetAudience: newAdTargetAudience,
      targetCountry: newAdTargetCountry,
      targetCity: newAdTargetCity,
      durationDays: newAdDurationDays,
      createdAt: new Date().toISOString(),
      expiresAt,
      paymentMethod: newAdPaymentMethod,
      userId: currentUserId,
      status: 'ACTIVE',
      readByUsers: []
    };

    setTextAds(prev => [newAd, ...prev]);
    setShowCreateAdModal(false);

    // Clear form
    setNewAdTitle('');
    setNewAdContent('');
    setNewAdLink('');
    setNewAdImageUrl('');
    setNewAdBudget(5000);
    setCardNumber('');
    setCardHolder('');
    setCardExpiry('');
    setCardCvv('');

    const payLabel = newAdPaymentMethod === 'WALLET' ? 'Carteira de Saldo USDT' : 'Cartão de Crédito/Débito';
    showAlert(`🚀 Campanha criada com sucesso! Exposta para ${newAdTargetCity}, ${newAdTargetCountry} por ${newAdDurationDays} dias via ${payLabel}.`, 'success');
  };

  // Renew an existing ad campaign
  const handleRenewAdCampaign = (ad: any) => {
    if (!ad) return;
    if (renewBudget < 1000) {
      showAlert('O orçamento mínimo para renovar a campanha é de 1 USDT.', 'error');
      return;
    }

    if (renewPaymentMethod === 'WALLET') {
      if (balance < renewBudget) {
        showAlert('Saldo insuficiente na carteira para renovar a campanha.', 'error');
        return;
      }
      soundService.playUISelect();
      onUpdateBalance(-renewBudget);
    } else {
      if (cardNumber.replace(/\s/g, '').length < 13 || !cardHolder.trim()) {
        showAlert('Por favor, preencha os dados do cartão de crédito/débito para efetuar o pagamento da renovação.', 'error');
        return;
      }
      soundService.playWin();
    }

    const additionalRewardPool = Math.floor(renewBudget * 0.70);
    const now = Date.now();
    const baseTime = (ad.expiresAt && ad.expiresAt > now) ? ad.expiresAt : now;
    const newExpiresAt = baseTime + renewDurationDays * 86400000;

    const updated = textAds.map(item => {
      if (item.id === ad.id) {
        return {
          ...item,
          totalBudget: (item.totalBudget || 0) + renewBudget,
          remainingBudget: (item.remainingBudget || 0) + additionalRewardPool,
          expiresAt: newExpiresAt,
          durationDays: (item.durationDays || 0) + renewDurationDays,
          status: 'ACTIVE'
        };
      }
      return item;
    });

    setTextAds(updated);
    setRenewingAdItem(null);
    showAlert(`✨ Campanha "${ad.title}" renovada com sucesso! Mais ${renewDurationDays} dias de exposição garantidos!`, 'success');
  };

  const handleToggleMonetization = () => {
    soundService.playDepositSuccess();
    const nextState = !isMonetizationEnabled;
    setIsMonetizationEnabled(nextState);
    localStorage.setItem('cryptonbet_monetization_enabled', nextState ? 'true' : 'false');
    if (nextState) {
      showAlert('🎉 Parabéns! A monetização da tua conta foi ativada. Anúncios patrocinados surgirão nos teus posts!', 'success');
    } else {
      showAlert('Monetização de conteúdo desativada.', 'info');
    }
  };

  const handleClaimCreatorEarnings = (unclaimedAmount: number) => {
    if (unclaimedAmount <= 0) {
      showAlert('Não tens rendimentos pendentes para resgatar de momento.', 'info');
      return;
    }
    soundService.playDepositSuccess();
    onUpdateBalance(unclaimedAmount);
    const newTotalClaimed = creatorAdEarningsClaimed + unclaimedAmount;
    setCreatorAdEarningsClaimed(newTotalClaimed);
    localStorage.setItem(`cryptonbet_creator_claimed_earnings_${currentUserId}`, newTotalClaimed.toString());
    showAlert(`✨ ${unclaimedAmount.toFixed(2)} USDT transferidos para o teu saldo real com sucesso!`, 'success');
  };

  // Users List State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Friend Requests State
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isProcessingFriend, setIsProcessingFriend] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<PrivateMessage[]>([]);
  const [activeChatFriend, setActiveChatFriend] = useState<UserProfile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Private Chat Advanced Features State
  const [replyingToMsg, setReplyingToMsg] = useState<PrivateMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState('');
  const [reactingMsgId, setReactingMsgId] = useState<string | null>(null);

  const handleDeleteMessage = async (msgId: string) => {
    soundService.playUISelect();
    if (currentUserId === 'guest_user') {
      const allMsgs = JSON.parse(localStorage.getItem('cryptonbet_local_messages') || '[]');
      const updated = allMsgs.map((m: any) => m.id === msgId ? { ...m, isDeleted: true, content: '🚫 Esta mensagem foi eliminada.' } : m);
      localStorage.setItem('cryptonbet_local_messages', JSON.stringify(updated));
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true, content: '🚫 Esta mensagem foi eliminada.' } : m));
      return;
    }
    try {
      await updateDoc(doc(db, 'private_messages', msgId), {
        isDeleted: true,
        content: '🚫 Esta mensagem foi eliminada.'
      });
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleSaveEditMessage = async (msgId: string) => {
    if (!editingMsgContent.trim()) return;
    soundService.playUISelect();
    if (currentUserId === 'guest_user') {
      const allMsgs = JSON.parse(localStorage.getItem('cryptonbet_local_messages') || '[]');
      const updated = allMsgs.map((m: any) => m.id === msgId ? { ...m, content: editingMsgContent, isEdited: true } : m);
      localStorage.setItem('cryptonbet_local_messages', JSON.stringify(updated));
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editingMsgContent, isEdited: true } : m));
      setEditingMsgId(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'private_messages', msgId), {
        content: editingMsgContent,
        isEdited: true
      });
      setEditingMsgId(null);
    } catch (err) {
      console.error("Error editing message:", err);
    }
  };

  const handleReactToMessage = async (msg: PrivateMessage, emoji: string) => {
    if (msg.senderId === currentUserId) {
      showAlert('Não podes reagir à tua própria mensagem!', 'error');
      return;
    }
    soundService.playUISelect();
    const existingReactions = msg.reactions || {};
    const usersForEmoji = existingReactions[emoji] || [];
    let newUsers: string[];
    if (usersForEmoji.includes(currentUserId)) {
      newUsers = usersForEmoji.filter(u => u !== currentUserId);
    } else {
      newUsers = [...usersForEmoji, currentUserId];
    }
    const updatedReactions = { ...existingReactions, [emoji]: newUsers };
    if (newUsers.length === 0) delete updatedReactions[emoji];

    setReactingMsgId(null);

    if (currentUserId === 'guest_user') {
      const allMsgs = JSON.parse(localStorage.getItem('cryptonbet_local_messages') || '[]');
      const updated = allMsgs.map((m: any) => m.id === msg.id ? { ...m, reactions: updatedReactions } : m);
      localStorage.setItem('cryptonbet_local_messages', JSON.stringify(updated));
      setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: updatedReactions } : m));
      return;
    }
    try {
      await updateDoc(doc(db, 'private_messages', msg.id), {
        reactions: updatedReactions
      });
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  };

  // Notifications State
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; title?: string; onConfirm: () => void } | null>(null);

  // Deep Professional Friendships states
  const [activeFriendProfile, setActiveFriendProfile] = useState<UserProfile | null>(null);
  const [isSendingBalance, setIsSendingBalance] = useState<UserProfile | null>(null);
  const [transferAmount, setTransferAmount] = useState('1000');
  const [isSendingChallenge, setIsSendingChallenge] = useState<UserProfile | null>(null);
  const [challengeGame, setChallengeGame] = useState<'AVIATOR' | 'MINES' | 'SPORTS' | 'PLINKO'>('AVIATOR');
  const [challengeStake, setChallengeStake] = useState('500');
  const [challengeMultiplier, setChallengeMultiplier] = useState('2.0');
  const [challengeMinesCount, setChallengeMinesCount] = useState('3');
  const [challengeSportsTeam, setChallengeSportsTeam] = useState('Angola');

  const getTraderStats = (userId: string, userName: string) => {
    const charSum = Array.from(userName || '').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const winRate = 60 + (charSum % 25) + ((charSum % 10) / 10);
    const totalTrades = 45 + (charSum % 150);
    const favoriteGame = ['AVIATOR', 'MINES', 'SPORTS', 'PLINKO'][charSum % 4];
    const totalVolume = (charSum % 5 === 0 ? 100000 : charSum % 3 === 0 ? 350000 : 75000) + (charSum * 150);
    const status = ['Iniciante', 'Trader Consistente', 'Pro Scalper', 'Mestre do Crash', 'Sócio VIP'][charSum % 5];
    const friendshipScore = 15 + (charSum % 85);
    const level = Math.floor(friendshipScore / 20) + 1;
    return {
      winRate: winRate.toFixed(1),
      totalTrades,
      favoriteGame,
      totalVolume,
      status,
      friendshipScore,
      level,
      mutualFriends: 1 + (charSum % 3)
    };
  };

  const handleSendBalance = async (recipient: UserProfile, amountStr: string) => {
    soundService.playUISelect();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Valor inválido para envio.', 'error');
      return;
    }

    if (balance < amount) {
      showAlert('Saldo insuficiente para realizar esta transferência.', 'error');
      return;
    }

    if (onUpdateBalance) {
      onUpdateBalance(-amount);

      const transId = 'TXN_' + Date.now().toString(36).toUpperCase();
      const messageContent = `[P2P_TRANSFER:${amount}:${transId}]`;
      const chatId = getChatId(currentUserId, recipient.uid);

      if (currentUserId === 'guest_user') {
        const allMsgs = JSON.parse(localStorage.getItem('cryptonbet_local_messages') || '[]');
        const newM: PrivateMessage = {
          id: 'msg_' + Date.now(),
          chatId,
          senderId: currentUserId,
          senderName: currentUserName,
          receiverId: recipient.uid,
          receiverName: recipient.displayName,
          content: messageContent,
          createdAt: new Date().toISOString()
        };
        allMsgs.push(newM);
        localStorage.setItem('cryptonbet_local_messages', JSON.stringify(allMsgs));
        setChatMessages(prev => [...prev, newM]);

        setTimeout(() => {
          const reply: PrivateMessage = {
            id: 'reply_' + Date.now(),
            chatId,
            senderId: recipient.uid,
            senderName: recipient.displayName,
            receiverId: currentUserId,
            receiverName: currentUserName,
            content: `Muito obrigado pelo envio de ${amount.toFixed(2)} USDT! 🙏 Já entrou na minha banca! Estás convidado para operarmos juntos no próximo palpite.`,
            createdAt: new Date().toISOString()
          };
          allMsgs.push(reply);
          localStorage.setItem('cryptonbet_local_messages', JSON.stringify(allMsgs));
          setChatMessages(prev => [...prev, reply]);
          soundService.playDepositSuccess();
        }, 1500);
      } else {
        try {
          await addDoc(collection(db, 'private_messages'), {
            chatId,
            senderId: currentUserId,
            senderName: currentUserName,
            receiverId: recipient.uid,
            receiverName: recipient.displayName,
            content: messageContent,
            createdAt: serverTimestamp()
          });

          const userRef = doc(db, 'users', recipient.uid);
          await updateDoc(userRef, {
            balance: (recipient.balance || 0) + amount
          });
        } catch (err) {
          console.error("Error sending P2P balance:", err);
        }
      }

      sendNotification(
        recipient.uid,
        'private_message',
        undefined,
        undefined,
        `💸 ${currentUserName} transferiu-te ${amount.toFixed(2)} USDT de saldo!`
      );

      soundService.playDepositSuccess();
      showAlert(`Sucesso! ${amount.toFixed(2)} USDT enviados para ${recipient.displayName}.`, 'success');
      setIsSendingBalance(null);
      setTransferAmount('1000');
    } else {
      showAlert('Erro na integração do saldo.', 'error');
    }
  };

  const showAlert = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Large image lightbox state & long text expand state
  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; caption?: string } | null>(null);

  const toggleExpandPost = (postId: string) => {
    setExpandedPostIds(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  // Stateful Stories (Facebook style - 24h expiration, image upload, reactions, comments)
  const [stories, setStories] = useState<any[]>([]);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyBg, setStoryBg] = useState('from-purple-600 to-pink-500');
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [isPublishingStory, setIsPublishingStory] = useState(false);

  // Selected story & viewer state
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [activeStoryGroup, setActiveStoryGroup] = useState<any[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyCommentText, setStoryCommentText] = useState('');
  const [showStoryComments, setShowStoryComments] = useState(false);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string; x: number }>>([]);

  // Group stories by person (Facebook style: single card per person representing stacked stories)
  const groupedStories = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    stories.forEach(story => {
      const key = story.userId || story.name || 'user';
      if (!groups[key]) groups[key] = [];
      groups[key].push(story);
    });
    return Object.values(groups);
  }, [stories]);

  const handleNextStory = () => {
    if (activeStoryIndex < activeStoryGroup.length - 1) {
      const nextIdx = activeStoryIndex + 1;
      setActiveStoryIndex(nextIdx);
      setSelectedStory(activeStoryGroup[nextIdx]);
      setStoryProgress(0);
    } else {
      setSelectedStory(null);
      setActiveStoryGroup([]);
      setActiveStoryIndex(0);
      setShowStoryComments(false);
      setStoryProgress(0);
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex > 0) {
      const prevIdx = activeStoryIndex - 1;
      setActiveStoryIndex(prevIdx);
      setSelectedStory(activeStoryGroup[prevIdx]);
      setStoryProgress(0);
    }
  };

  // Helper: check if story is within 24 hours
  const isStoryWithin24h = (story: any) => {
    if (!story.createdAt) return true;
    let timeMs: number;
    if (typeof story.createdAt === 'number') {
      timeMs = story.createdAt;
    } else if (typeof story.createdAt === 'string') {
      timeMs = new Date(story.createdAt).getTime();
    } else if (story.createdAt?.toDate) {
      timeMs = story.createdAt.toDate().getTime();
    } else if (story.createdAt?.seconds) {
      timeMs = story.createdAt.seconds * 1000;
    } else if (story.createdAt instanceof Date) {
      timeMs = story.createdAt.getTime();
    } else {
      return true;
    }
    return (Date.now() - timeMs) < (24 * 60 * 60 * 1000);
  };

  // Helper: get relative time string
  const getStoryTimeAgo = (createdAt: any) => {
    if (!createdAt) return 'Recentemente';
    let timeMs: number;
    if (typeof createdAt === 'number') timeMs = createdAt;
    else if (typeof createdAt === 'string') timeMs = new Date(createdAt).getTime();
    else if (createdAt?.toDate) timeMs = createdAt.toDate().getTime();
    else if (createdAt?.seconds) timeMs = createdAt.seconds * 1000;
    else if (createdAt instanceof Date) timeMs = createdAt.getTime();
    else return 'Recentemente';

    const diffMinutes = Math.floor((Date.now() - timeMs) / 60000);
    if (diffMinutes < 1) return 'Agora';
    if (diffMinutes < 60) return `Há ${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return '24h+';
  };

  useEffect(() => {
    if (!selectedStory || isStoryPaused || showStoryComments) {
      return;
    }

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          if (activeStoryIndex < activeStoryGroup.length - 1) {
            const nextIdx = activeStoryIndex + 1;
            setActiveStoryIndex(nextIdx);
            setSelectedStory(activeStoryGroup[nextIdx]);
          } else {
            setSelectedStory(null);
            setActiveStoryGroup([]);
            setActiveStoryIndex(0);
            setShowStoryComments(false);
          }
          return 0;
        }
        return prev + 2;
      });
    }, 100); // 100ms * 50 steps = 5000ms (5 seconds duration)

    return () => clearInterval(interval);
  }, [selectedStory?.id, isStoryPaused, showStoryComments, activeStoryIndex, activeStoryGroup.length]);

  const defaultStories: any[] = [];

  // Subscribe to stories (Firestore + localStorage fallback)
  useEffect(() => {
    if (currentUserId === 'guest_user') {
      const localStories = JSON.parse(localStorage.getItem('cryptonbet_local_stories') || '[]');
      const all = [...localStories, ...defaultStories].filter(isStoryWithin24h);
      setStories(all);
      return;
    }

    const storiesRef = collection(db, 'stories');
    const q = query(storiesRef, orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          name: data.userName || 'Trader',
          avatar: (data.userName || 'T').charAt(0),
          content: data.content || '',
          background: data.background || null,
          image: data.image || null,
          profit: data.profit || null,
          reactions: data.reactions || {},
          comments: data.comments || [],
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date()
        });
      });
      const all = [...fetched, ...defaultStories].filter(isStoryWithin24h);
      setStories(all);
    }, (err) => {
      console.error("Error fetching stories:", err);
      setStories(defaultStories.filter(isStoryWithin24h));
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Image compression helper for stories and posts to prevent oversized base64 strings
  const compressStoryImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1080;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(readerEvent.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(readerEvent.target?.result as string);
        img.src = readerEvent.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handlePublishStorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!storyText.trim() && !storyImage) {
      showAlert('Adicione um texto ou imagem para publicar o Story.', 'error');
      return;
    }

    soundService.playUISelect();
    setIsPublishingStory(true);

    const now = new Date();
    const newStoryId = 'story_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const storyData = {
      id: newStoryId,
      userId: currentUserId,
      name: currentUserName || 'Trader',
      userName: currentUserName || 'Trader',
      avatar: (currentUserName || 'T').charAt(0).toUpperCase(),
      content: storyText.trim(),
      background: storyImage ? null : storyBg,
      image: storyImage || null,
      reactions: {},
      comments: [],
      views: [],
      createdAt: now.toISOString()
    };

    // 1. Immediately save to local stories & update state for instant reactivity
    try {
      const localStories = JSON.parse(localStorage.getItem('cryptonbet_local_stories') || '[]');
      const updatedLocal = [storyData, ...localStories.filter((s: any) => s.id !== newStoryId)];
      localStorage.setItem('cryptonbet_local_stories', JSON.stringify(updatedLocal));
      
      setStories(prev => {
        const withoutDup = prev.filter(s => s.id !== newStoryId);
        return [storyData, ...withoutDup].filter(isStoryWithin24h);
      });
    } catch (e) {
      console.warn("Local story save warning:", e);
    }

    // 2. Clear UI state
    setStoryText('');
    setStoryImage(null);
    setIsCreatingStory(false);
    soundService.playDepositSuccess();
    showAlert('Story publicado com sucesso! (Válido por 24h)');

    // 3. Sync with Firestore in background if online and not guest
    if (currentUserId && currentUserId !== 'guest_user') {
      try {
        await addDoc(collection(db, 'stories'), {
          userId: currentUserId,
          userName: currentUserName || 'Trader',
          content: storyData.content,
          background: storyData.background,
          image: storyData.image,
          reactions: {},
          comments: [],
          views: [],
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Firestore story sync failed, active in local storage:", err);
      }
    }

    setIsPublishingStory(false);
  };

  // Handler for story emoji reaction
  const handleReactToStory = async (storyId: string, emoji: string) => {
    soundService.playUISelect();

    // Trigger floating animation
    const floatId = Math.random().toString();
    const xPos = Math.floor(Math.random() * 60) + 20;
    setFloatingEmojis(prev => [...prev, { id: floatId, emoji, x: xPos }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(f => f.id !== floatId));
    }, 1500);

    if (!selectedStory) return;

    const currentReactions = selectedStory.reactions || {};
    const updatedReactions = {
      ...currentReactions,
      [emoji]: (currentReactions[emoji] || 0) + 1
    };

    const updatedStory = { ...selectedStory, reactions: updatedReactions };
    setSelectedStory(updatedStory);
    setStories(prev => prev.map(s => s.id === storyId ? updatedStory : s));

    // Save reaction
    if (storyId?.startsWith('story_local_') || currentUserId === 'guest_user') {
      const localStories = JSON.parse(localStorage.getItem('cryptonbet_local_stories') || '[]');
      const idx = localStories.findIndex((s: any) => s.id === storyId);
      if (idx !== -1) {
        localStories[idx].reactions = updatedReactions;
        localStorage.setItem('cryptonbet_local_stories', JSON.stringify(localStories));
      }
    } else {
      try {
        const storyRef = doc(db, 'stories', storyId);
        await updateDoc(storyRef, { reactions: updatedReactions });
      } catch (err) {
        console.error("Error updating reactions:", err);
      }
    }
  };

  // Handler for adding a comment to story
  const handleSendStoryComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyCommentText.trim() || !selectedStory) return;

    soundService.playUISelect();
    const newComment = {
      id: 'sc_' + Date.now(),
      userId: currentUserId,
      userName: currentUserName,
      avatar: currentUserName.charAt(0),
      text: storyCommentText.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedComments = [...(selectedStory.comments || []), newComment];
    const updatedStory = { ...selectedStory, comments: updatedComments };

    setSelectedStory(updatedStory);
    setStories(prev => prev.map(s => s.id === selectedStory.id ? updatedStory : s));
    setStoryCommentText('');

    if (selectedStory.id?.startsWith('story_local_') || currentUserId === 'guest_user') {
      const localStories = JSON.parse(localStorage.getItem('cryptonbet_local_stories') || '[]');
      const idx = localStories.findIndex((s: any) => s.id === selectedStory.id);
      if (idx !== -1) {
        localStories[idx].comments = updatedComments;
        localStorage.setItem('cryptonbet_local_stories', JSON.stringify(localStories));
      }
    } else {
      try {
        const storyRef = doc(db, 'stories', selectedStory.id);
        await updateDoc(storyRef, {
          comments: arrayUnion(newComment)
        });
      } catch (err) {
        console.error("Error sending story comment:", err);
      }
    }
  };

  useEffect(() => {
    const purchased = JSON.parse(localStorage.getItem('cryptonbet_purchased_books') || '[]');
    setPurchasedBookIds(purchased);

    const reviews = JSON.parse(localStorage.getItem('cryptonbet_pdf_reviews') || '{}');
    setPdfReviews(reviews);

    if (currentUserId !== 'guest_user') {
      // Subscribe to PDF reviews in Firestore
      const reviewsRef = collection(db, 'pdf_reviews');
      const unsubReviews = onSnapshot(reviewsRef, (snapshot) => {
        const revMap: Record<string, any[]> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const pId = data.postId;
          if (pId) {
            if (!revMap[pId]) revMap[pId] = [];
            revMap[pId].push({
              userId: data.userId,
              userName: data.userName,
              rating: data.rating,
              comment: data.comment,
              createdAt: data.createdAt
            });
          }
        });
        setPdfReviews(prev => ({ ...prev, ...revMap }));
      }, (err) => console.warn("Firestore pdf_reviews subscription warning:", err));

      // Subscribe to PDF purchases in Firestore
      const purchasesRef = collection(db, 'pdf_purchases');
      const qPurchases = query(purchasesRef, where('userId', '==', currentUserId));
      const unsubPurchases = onSnapshot(qPurchases, (snapshot) => {
        const boughtIds: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.postId) boughtIds.push(data.postId);
        });
        if (boughtIds.length > 0) {
          setPurchasedBookIds(prev => {
            const nextList = Array.from(new Set([...prev, ...boughtIds]));
            if (nextList.length === prev.length && nextList.every((id, idx) => id === prev[idx])) {
              return prev;
            }
            return nextList;
          });
        }
      }, (err) => console.warn("Firestore pdf_purchases subscription warning:", err));

      return () => {
        unsubReviews();
        unsubPurchases();
      };
    }
  }, [currentUserId]);

  // 1. Subscribe to Global Feed Posts
  useEffect(() => {
    if (currentUserId === 'guest_user') {
      // Local fallback posts if guest
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      if (localPosts.length === 0) {
        const initial: Post[] = [
          {
            id: 'p1',
            userId: 'system_1',
            userName: 'Cristiano_Trader',
            content: 'Ganhei agora mesmo 250.00 USDT no par BTC/USDT! Estratégia de RSI a funcionar a 100%! 🚀📈 Vamos faturar!',
            likes: ['system_2', 'system_3'],
            tradeAsset: 'BTC/USDT',
            tradeResult: 'win',
            tradeProfit: 250,
            comments: [
              {
                id: 'c1',
                userId: 'system_2',
                userName: 'Marta_USDT',
                content: 'Absoluto rei das opções binárias! Parabéns!',
                createdAt: new Date(Date.now() - 1800000).toISOString()
              }
            ],
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'p2',
            userId: 'system_2',
            userName: 'Marta_USDT',
            content: 'O mercado de SOL/USDT está super volátil hoje. Cuidado com as expirações rápidas de 30s. Recomendo gráficos de 5m. Bons lucros!',
            likes: ['system_1'],
            comments: [],
            createdAt: new Date(Date.now() - 7200000).toISOString()
          },
          {
            id: 'p3',
            userId: 'system_3',
            userName: 'Edivaldo_AO',
            content: 'Acabei de bater 10x de multiplicador no Aviator! Quem voa alto ganha grande! 🚀🇦🇴',
            likes: [],
            comments: [
              {
                id: 'c2',
                userId: 'system_4',
                userName: 'Luísa_Fx',
                content: 'Uau! Que coragem, eu retiro sempre no 2x 😂',
                createdAt: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            createdAt: new Date(Date.now() - 14400000).toISOString()
          },
          {
            id: 'p4',
            userId: 'system_5',
            userName: 'Beatriz_Luanda',
            content: 'Alguém já testou a nova tabela de probabilidades do Plinko? Consegui 3 rodadas seguidas no multiplicador 16x usando banca de 5 USDT! 🎯✨',
            likes: ['system_1', 'system_3'],
            comments: [],
            createdAt: new Date(Date.now() - 21600000).toISOString()
          },
          {
            id: 'p5',
            userId: 'system_6',
            userName: 'Paulo_Kz',
            content: 'Levantamento via Multicaixa Express caiu na minha conta em menos de 2 minutos! A CryptonBet está a pagar super rápido! 💸🇦🇴',
            likes: ['system_2', 'system_4'],
            comments: [
              {
                id: 'c3',
                userId: 'system_1',
                userName: 'Cristiano_Trader',
                content: 'Verdade, o meu saque de 15.000 Kz também entrou instantâneo!',
                createdAt: new Date(Date.now() - 10800000).toISOString()
              }
            ],
            createdAt: new Date(Date.now() - 28800000).toISOString()
          },
          {
            id: 'p6',
            userId: 'system_7',
            userName: 'Nelson_Vip',
            content: 'Dica do dia para as Minas: nunca abra mais do que 4 diamantes se estiver com banca baixa. O segredo da consistência é o juros composto! 📈💎',
            likes: ['system_1'],
            comments: [],
            createdAt: new Date(Date.now() - 43200000).toISOString()
          }
        ];
        localStorage.setItem('cryptonbet_local_posts', JSON.stringify(initial));
        setPosts(initial);
      } else {
        if (localPosts.length <= 3) {
          const morePosts = [
            ...localPosts,
            {
              id: 'p4',
              userId: 'system_5',
              userName: 'Beatriz_Luanda',
              content: 'Alguém já testou a nova tabela de probabilidades do Plinko? Consegui 3 rodadas seguidas no multiplicador 16x usando banca de 5 USDT! 🎯✨',
              likes: ['system_1', 'system_3'],
              comments: [],
              createdAt: new Date(Date.now() - 21600000).toISOString()
            },
            {
              id: 'p5',
              userId: 'system_6',
              userName: 'Paulo_Kz',
              content: 'Levantamento via Multicaixa Express caiu na minha conta em menos de 2 minutos! A CryptonBet está a pagar super rápido! 💸🇦🇴',
              likes: ['system_2', 'system_4'],
              comments: [],
              createdAt: new Date(Date.now() - 28800000).toISOString()
            }
          ];
          localStorage.setItem('cryptonbet_local_posts', JSON.stringify(morePosts));
          setPosts(morePosts);
        } else {
          setPosts(localPosts);
        }
      }
      return;
    }

    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        postsData.push({
          id: doc.id,
          userId: data.userId || '',
          userName: data.userName || 'Trader',
          content: data.content || '',
          likes: data.likes || [],
          comments: data.comments || [],
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : new Date(),
          tradeAsset: data.tradeAsset,
          tradeResult: data.tradeResult,
          tradeProfit: data.tradeProfit,
          isPinned: data.isPinned || false,
          imageUrl: data.imageUrl,
          postType: data.postType || 'social',
          p2pCoin: data.p2pCoin,
          p2pAmount: data.p2pAmount,
          p2pPrice: data.p2pPrice,
          p2pIban: data.p2pIban,
          p2pPix: data.p2pPix,
          p2pInternational: data.p2pInternational,
          p2pStatus: data.p2pStatus,
          p2pBuyerId: data.p2pBuyerId,
          p2pBuyerName: data.p2pBuyerName,
          pdfTitle: data.pdfTitle,
          pdfAuthor: data.pdfAuthor,
          pdfDescription: data.pdfDescription,
          pdfPrice: data.pdfPrice,
          pdfCoverColor: data.pdfCoverColor,
          pdfDownloads: data.pdfDownloads,
          pdfCategory: data.pdfCategory,
          pdfLevel: data.pdfLevel,
          pdfIncludes: data.pdfIncludes,
          pdfPagesCount: data.pdfPagesCount,
          pdfPreviewSnippet: data.pdfPreviewSnippet,
          pdfHasGuarantee: data.pdfHasGuarantee,
          pdfFileUrl: data.pdfFileUrl,
          pdfFileName: data.pdfFileName,
          reactions: data.reactions || {},
          sharedFromPostId: data.sharedFromPostId,
          sharedFromUserName: data.sharedFromUserName,
          sharedFromContent: data.sharedFromContent,
          sharedFromImageUrl: data.sharedFromImageUrl,
          sharedFromPostType: data.sharedFromPostType,
          sharedFromPdfTitle: data.sharedFromPdfTitle,
          sharedFromPdfAuthor: data.sharedFromPdfAuthor,
          sharedFromPdfCoverColor: data.sharedFromPdfCoverColor,
          sharedFromPdfDescription: data.sharedFromPdfDescription,
          sharedFromPdfPrice: data.sharedFromPdfPrice,
          sharedFromPdfFileUrl: data.sharedFromPdfFileUrl,
          sharedFromPdfFileName: data.sharedFromPdfFileName,
          sharedFromP2pCoin: data.sharedFromP2pCoin,
          sharedFromP2pAmount: data.sharedFromP2pAmount,
          sharedFromP2pPrice: data.sharedFromP2pPrice
        });
      });
      setPosts(postsData);
    }, (err) => {
      console.error("Error fetching posts:", err);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // 2. Subscribe to Friend Requests
  useEffect(() => {
    if (currentUserId === 'guest_user') {
      const localRequests = JSON.parse(localStorage.getItem('cryptonbet_local_friend_requests') || '[]');
      setFriendRequests(localRequests);
      return;
    }

    const reqRef = collection(db, 'friend_requests');
    const q = query(reqRef, where('senderId', '==', currentUserId));
    const q2 = query(reqRef, where('receiverId', '==', currentUserId));

    const unsubscribe1 = onSnapshot(q, (snapshot) => {
      updateFriendRequestsList(snapshot, 'sent');
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      updateFriendRequestsList(snapshot, 'received');
    });

    const requestsMap = new Map<string, FriendRequest>();

    const updateFriendRequestsList = (snapshot: any, direction: 'sent' | 'received') => {
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        requestsMap.set(doc.id, {
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          receiverId: data.receiverId,
          receiverName: data.receiverName,
          status: data.status,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        });
      });
      setFriendRequests(Array.from(requestsMap.values()));
    };

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [currentUserId]);

  // 3. Load Registered Users to find friends
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      if (currentUserId === 'guest_user') {
        const localUsers = [
          { uid: 'system_1', displayName: 'Cristiano_Trader' },
          { uid: 'system_2', displayName: 'Marta_USDT' },
          { uid: 'system_3', displayName: 'Edivaldo_AO' },
          { uid: 'system_4', displayName: 'Luísa_Fx' }
        ];
        setAllUsers(localUsers);
        setIsLoadingUsers(false);
        return;
      }

      try {
        const usersCol = collection(db, 'users');
        const snapshot = await getDocs(query(usersCol, limit(50)));
        const usersList: UserProfile[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== currentUserId) {
            usersList.push({
              uid: doc.id,
              displayName: data.displayName || 'Jogador sem nome'
            });
          }
        });
        setAllUsers(usersList);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  // 4. Subscribe to chat messages if friend is active
  useEffect(() => {
    if (!activeChatFriend) {
      setChatMessages([]);
      return;
    }

    if (currentUserId === 'guest_user') {
      const allMsgs = JSON.parse(localStorage.getItem('cryptonbet_local_messages') || '[]');
      const filtered = allMsgs.filter((m: any) => m.chatId === getChatId(currentUserId, activeChatFriend.uid));
      setChatMessages(filtered);
      return;
    }

    const chatId = getChatId(currentUserId, activeChatFriend.uid);
    const msgRef = collection(db, 'private_messages');
    const q = query(
      msgRef,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: PrivateMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          chatId: data.chatId,
          senderId: data.senderId,
          senderName: data.senderName,
          receiverId: data.receiverId,
          receiverName: data.receiverName,
          content: data.content,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
        });
      });
      setChatMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.error("Error loading chat messages:", err);
    });

    return () => unsubscribe();
  }, [activeChatFriend, currentUserId]);

  const getChatId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  // 5. Subscribe to Social Notifications
  useEffect(() => {
    if (currentUserId === 'guest_user') {
      const localNotifs = JSON.parse(localStorage.getItem('cryptonbet_local_notifications') || '[]');
      setNotifications(localNotifs);
      return;
    }

    const notifRef = collection(db, 'social_notifications');
    const q = query(notifRef, where('userId', '==', currentUserId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifsList: SocialNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifsList.push({
          id: doc.id,
          userId: data.userId || '',
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          type: data.type || 'like_post',
          postId: data.postId || '',
          commentId: data.commentId || '',
          content: data.content || '',
          isRead: data.isRead || false,
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      // Sort client-side by date to avoid composite index requirement
      notifsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifsList);
    }, (err) => {
      console.error("Error loading notifications:", err);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const sendNotification = async (
    recipientId: string,
    type: SocialNotification['type'],
    postId?: string,
    commentId?: string,
    content?: string
  ) => {
    if (!recipientId || recipientId === currentUserId) return;

    const newNotif = {
      userId: recipientId,
      senderId: currentUserId,
      senderName: currentUserName,
      type,
      postId: postId || '',
      commentId: commentId || '',
      content: content || '',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    if (currentUserId === 'guest_user') {
      const localNotifs = JSON.parse(localStorage.getItem('cryptonbet_local_notifications') || '[]');
      const createdNotif: SocialNotification = {
        ...newNotif,
        id: 'n_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      };
      const updated = [createdNotif, ...localNotifs];
      localStorage.setItem('cryptonbet_local_notifications', JSON.stringify(updated));
      setNotifications(updated);
      return;
    }

    try {
      await addDoc(collection(db, 'social_notifications'), newNotif);
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  };

  const handleMarkNotificationAsRead = async (notifId: string) => {
    if (currentUserId === 'guest_user') {
      const localNotifs = JSON.parse(localStorage.getItem('cryptonbet_local_notifications') || '[]');
      const updated = localNotifs.map((n: SocialNotification) =>
        n.id === notifId ? { ...n, isRead: true } : n
      );
      localStorage.setItem('cryptonbet_local_notifications', JSON.stringify(updated));
      setNotifications(updated);
      return;
    }

    try {
      const notifRef = doc(db, 'social_notifications', notifId);
      await updateDoc(notifRef, { isRead: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    soundService.playUISelect();
    if (currentUserId === 'guest_user') {
      const localNotifs = JSON.parse(localStorage.getItem('cryptonbet_local_notifications') || '[]');
      const updated = localNotifs.map((n: SocialNotification) => ({ ...n, isRead: true }));
      localStorage.setItem('cryptonbet_local_notifications', JSON.stringify(updated));
      setNotifications(updated);
      showAlert('Todas as notificações marcadas como lidas.');
      return;
    }

    try {
      const unreadNotifs = notifications.filter(n => !n.isRead);
      await Promise.all(unreadNotifs.map(async (n) => {
        const notifRef = doc(db, 'social_notifications', n.id);
        await updateDoc(notifRef, { isRead: true });
      }));
      showAlert('Todas as notificações marcadas como lidas.');
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    soundService.playUISelect();
    if (currentUserId === 'guest_user') {
      const localNotifs = JSON.parse(localStorage.getItem('cryptonbet_local_notifications') || '[]');
      const updated = localNotifs.filter((n: SocialNotification) => n.id !== notifId);
      localStorage.setItem('cryptonbet_local_notifications', JSON.stringify(updated));
      setNotifications(updated);
      showAlert('Notificação eliminada.');
      return;
    }

    try {
      const notifRef = doc(db, 'social_notifications', notifId);
      await deleteDoc(notifRef);
      showAlert('Notificação eliminada.');
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleClearAllNotifications = () => {
    setConfirmDialog({
      title: 'Limpar Notificações',
      message: 'Desejas eliminar todas as notificações? Esta ação é permanente e não pode ser desfeita.',
      onConfirm: async () => {
        soundService.playUISelect();
        if (currentUserId === 'guest_user') {
          localStorage.setItem('cryptonbet_local_notifications', JSON.stringify([]));
          setNotifications([]);
          showAlert('Notificações limpas.');
          return;
        }

        try {
          await Promise.all(notifications.map(async (n) => {
            const notifRef = doc(db, 'social_notifications', n.id);
            await deleteDoc(notifRef);
          }));
          showAlert('Notificações limpas.');
        } catch (err) {
          console.error("Error clearing notifications:", err);
        }
      }
    });
  };

  const handleNotificationClick = async (notif: SocialNotification) => {
    soundService.playUISelect();
    await handleMarkNotificationAsRead(notif.id);
    setShowNotificationsDropdown(false);

    if (notif.type === 'private_message') {
      const sender = allUsers.find(u => u.uid === notif.senderId);
      if (sender) {
        setActiveChatFriend(sender);
        setActiveTab('chat');
      } else {
        setActiveChatFriend({ uid: notif.senderId, displayName: notif.senderName });
        setActiveTab('chat');
      }
    } else if (notif.type === 'friend_request' || notif.type === 'friend_accept') {
      setActiveTab('friends');
    } else if (notif.postId) {
      setActiveTab('feed');
      setActiveCommentsPostId(notif.postId);

      setTimeout(() => {
        const postElement = document.getElementById(`post-card-${notif.postId}`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          postElement.classList.add('ring-2', 'ring-amber-400');
          setTimeout(() => {
            postElement.classList.remove('ring-2', 'ring-amber-400');
          }, 4000);
        }
      }, 300);
    }
  };

  // Compute friend relationships
  const acceptedFriends = allUsers.filter(u => {
    return friendRequests.some(r =>
      r.status === 'accepted' &&
      ((r.senderId === currentUserId && r.receiverId === u.uid) ||
       (r.receiverId === currentUserId && r.senderId === u.uid))
    );
  });

  const pendingReceivedRequests = friendRequests.filter(r => r.receiverId === currentUserId && r.status === 'pending');
  const pendingSentRequests = friendRequests.filter(r => r.senderId === currentUserId && r.status === 'pending');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert('Por favor, selecione uma imagem com menos de 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPostImage(event.target.result as string);
          soundService.playUISelect();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showAlert('Por favor, selecione uma imagem com menos de 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPdfImage(event.target.result as string);
          soundService.playUISelect();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        showAlert('Por favor, selecione um ficheiro PDF com menos de 50MB.', 'error');
        return;
      }
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        showAlert('Por favor, selecione um ficheiro com formato PDF válido.', 'error');
        return;
      }
      setPdfFile(file);
      setPdfFileName(file.name);
      soundService.playUISelect();
    }
  };

  // Submit Feed Post
  const handlePublishPost = async (e: React.FormEvent) => {
    if (e) e.preventDefault();

    if (creatorTab === 'social') {
      if (!postContent.trim() && !shareTrade && !postImage) return;
    } else if (creatorTab === 'p2p') {
      if (!p2pAmount.trim() || !p2pPrice.trim() || (!p2pIban.trim() && !p2pPix.trim() && !p2pInternational.trim())) {
        showAlert('Por favor, informe pelo menos uma forma de pagamento (IBAN, PIX ou Internacional).', 'error');
        return;
      }
    } else if (creatorTab === 'pdf') {
      if (!pdfTitle.trim() || !pdfAuthor.trim() || !pdfPrice.trim()) {
        showAlert('Por favor, preencha o título, autor e preço do E-Book.', 'error');
        return;
      }
      if (!pdfFile) {
        showAlert('Por favor, faça upload do arquivo PDF (máx. 50 MB) para o seu produto.', 'error');
        return;
      }
    }

    soundService.playUISelect();
    setIsPosting(true);

    let uploadedPdfUrl = '';
    let uploadedPdfName = '';

    if (creatorTab === 'pdf' && pdfFile) {
      try {
        uploadedPdfUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(pdfFile);
        });
        uploadedPdfName = pdfFile.name;
      } catch (err: any) {
        console.error("Error reading PDF file:", err);
        showAlert('Erro ao processar ficheiro PDF para armazenamento no Firebase.', 'error');
        setIsPosting(false);
        return;
      }
    }

    const postPayload: any = {
      userId: auth.currentUser?.uid || currentUserId,
      userName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || currentUserName || 'Trader',
      likes: [],
      comments: [],
      createdAt: serverTimestamp(),
      postType: creatorTab,
      content: ''
    };

    if (creatorTab === 'social') {
      postPayload.content = postContent || (shareTrade ? `Partilhou um trade de ${tradeAsset}` : postImage ? 'Publicou uma imagem' : '');
      if (shareTrade) {
        postPayload.tradeAsset = tradeAsset;
        postPayload.tradeResult = tradeResult;
        postPayload.tradeProfit = parseFloat(tradeProfit) || 0;
      }
      if (postImage) {
        postPayload.imageUrl = postImage;
      }
    } else if (creatorTab === 'p2p') {
      const amountVal = parseFloat(p2pAmount) || 0;
      const priceVal = parseFloat(p2pPrice) || 0;
      postPayload.content = `Venda P2P: ${amountVal} ${p2pCoin} por ${priceVal.toFixed(2)} USDT.`;
      postPayload.p2pCoin = p2pCoin;
      postPayload.p2pAmount = amountVal;
      postPayload.p2pPrice = priceVal;
      postPayload.p2pIban = p2pIban;
      postPayload.p2pPix = p2pPix;
      postPayload.p2pInternational = p2pInternational;
      postPayload.p2pStatus = 'available';
    } else if (creatorTab === 'pdf') {
      const priceVal = parseFloat(pdfPrice) || 0;
      postPayload.content = `Novo E-Book PDF publicado no mercado! '${pdfTitle}' por ${priceVal.toFixed(2)} USDT.`;
      postPayload.pdfTitle = pdfTitle;
      postPayload.pdfAuthor = pdfAuthor;
      postPayload.pdfDescription = pdfDescription || 'Sem descrição fornecida.';
      postPayload.pdfPrice = priceVal;
      postPayload.pdfCoverColor = pdfCoverColor;
      postPayload.pdfDownloads = 0;
      postPayload.pdfCategory = pdfCategory;
      postPayload.pdfLevel = pdfLevel;
      postPayload.pdfIncludes = pdfIncludes.split(',').map(s => s.trim()).filter(Boolean);
      postPayload.pdfPagesCount = parseInt(pdfPagesCount) || 45;
      postPayload.pdfPreviewSnippet = pdfPreviewSnippet;
      postPayload.pdfHasGuarantee = pdfHasGuarantee;
      if (pdfImage) {
        postPayload.imageUrl = pdfImage;
      }
      if (uploadedPdfUrl) {
        postPayload.pdfFileUrl = uploadedPdfUrl;
        postPayload.pdfFileName = uploadedPdfName;
      }
    }

    const completePost: Post = {
      id: 'p_' + Date.now(),
      ...postPayload,
      createdAt: new Date().toISOString()
    };

    // Always update local storage & state for instantaneous feedback and guaranteed persistence
    try {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      localPosts.unshift(completePost);
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(localPosts));
      setPosts(prev => [completePost, ...prev]);
    } catch (err) {
      console.warn("Error updating local posts state:", err);
    }

    if (currentUserId !== 'guest_user') {
      try {
        // Prevent Firestore 1MB document size exceeded errors by truncating giant Base64 strings for the network save
        const firestorePayload = { ...postPayload };
        if (firestorePayload.pdfFileUrl && typeof firestorePayload.pdfFileUrl === 'string' && firestorePayload.pdfFileUrl.length > 700000) {
          firestorePayload.pdfFileUrl = 'data:application/pdf;base64,large_file_stored_locally';
        }
        if (firestorePayload.imageUrl && typeof firestorePayload.imageUrl === 'string' && firestorePayload.imageUrl.length > 700000) {
          firestorePayload.imageUrl = 'data:image/jpeg;base64,large_image_stored_locally';
        }
        await addDoc(collection(db, 'posts'), firestorePayload);
      } catch (err) {
        console.warn("Firestore save fallback due to document size or offline mode:", err);
      }
    }

    // Also sync to PDF Marketplace if it is a PDF product!
    if (creatorTab === 'pdf') {
      try {
        const marketBooks = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
        const newMarketBook = {
          id: 'pdf_market_' + Date.now(),
          title: pdfTitle,
          author: pdfAuthor,
          description: pdfDescription || 'Sem descrição fornecida.',
          price: parseFloat(pdfPrice) || 0,
          sellerId: currentUserId,
          sellerName: currentUserName || 'Trader',
          coverColor: pdfCoverColor,
          downloads: 0,
          createdAt: new Date().toISOString()
        };
        marketBooks.unshift(newMarketBook);
        localStorage.setItem('crypton_market_pdf_books', JSON.stringify(marketBooks));
      } catch (err) {
        console.warn("Error syncing to market books:", err);
      }
    }

    setPostContent('');
    setShareTrade(false);
    setPostImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPdfTitle('');
    setPdfAuthor('');
    setPdfDescription('');
    setPdfFile(null);
    setPdfFileName('');
    setPdfCategory('E-Book');
    setPdfLevel('Iniciante');
    setPdfIncludes('Suporte WhatsApp, Acesso Vitalício, Grupo VIP');
    setPdfPagesCount('45');
    setPdfPreviewSnippet('Aprenda técnicas de Price Action avançadas para o mercado financeiro.');
    setPdfHasGuarantee(true);
    setPdfImage(null);
    if (pdfImageInputRef.current) pdfImageInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';

    setIsPosting(false);
    showAlert(creatorTab === 'pdf' ? 'E-Book PDF publicado com sucesso no mercado e no feed!' : 'Publicado com sucesso no feed!', 'success');
  };

  const handleBuyP2pPost = async (post: Post) => {
    if (!post.p2pPrice) return;
    if (post.userId === currentUserId) {
      showAlert('Não podes comprar a tua própria listagem P2P!', 'error');
      return;
    }
    if (balance < post.p2pPrice) {
      showAlert(`Saldo insuficiente. Precisas de ${(post.p2pPrice || 0).toFixed(2)} USDT, mas tens apenas ${balance.toFixed(2)} USDT!`, 'error');
      return;
    }

    setConfirmDialog({
      title: 'Confirmar Compra P2P',
      message: `Queres mesmo comprar ${post.p2pAmount} ${post.p2pCoin} por ${(post.p2pPrice || 0).toFixed(2)} USDT? O valor será debitado do teu saldo.`,
      onConfirm: async () => {
        soundService.playUISelect();
        try {
          if (onUpdateBalance) {
            onUpdateBalance(-post.p2pPrice!);
          }

          if (currentUserId === 'guest_user') {
            const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
            const updated = localPosts.map((p: any) => {
              if (p.id === post.id) {
                return {
                  ...p,
                  p2pStatus: 'sold',
                  p2pBuyerId: currentUserId,
                  p2pBuyerName: currentUserName
                };
              }
              return p;
            });
            localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
            setPosts(updated);
          } else {
            const postRef = doc(db, 'posts', post.id);
            await updateDoc(postRef, {
              p2pStatus: 'sold',
              p2pBuyerId: currentUserId,
              p2pBuyerName: currentUserName
            });
          }
          soundService.playDepositSuccess();
          showAlert(`Compraste com sucesso ${post.p2pAmount} ${post.p2pCoin}! Saldo de USDT atualizado.`);
        } catch (e) {
          console.error("Error in P2P trade buy:", e);
          showAlert("Erro ao processar transação.", "error");
        }
      }
    });
  };

  const handlePlaceBid = () => {
    const bidVal = parseInt(myBidAmount);
    if (isNaN(bidVal)) {
      showAlert('Insira um valor de lance válido.', 'error');
      return;
    }
    if (bidVal < activeAuction.currentBid + activeAuction.minIncrement) {
      showAlert(`O teu lance deve ser de pelo menos ${(activeAuction.currentBid + activeAuction.minIncrement).toFixed(2)} USDT!`, 'error');
      return;
    }
    if (balance < bidVal) {
      showAlert(`Saldo insuficiente! Precisas de ${bidVal.toFixed(2)} USDT para cobrir este lance.`, 'error');
      return;
    }

    soundService.playWithdrawSuccess();
    if (onUpdateBalance) {
      onUpdateBalance(-(bidVal - activeAuction.currentBid));
    }
    setActiveAuction(prev => ({
      ...prev,
      currentBid: bidVal,
      highestBidder: currentUserName,
      bidsCount: prev.bidsCount + 1
    }));
    setMyBidAmount(String(bidVal + 500));
    showAlert(`Excelente! Lance de ${bidVal.toFixed(2)} USDT registado com sucesso! És o licitante principal.`, 'success');
  };

  const handleBuySponsoredItem = (item: any) => {
    if (balance < item.price) {
      showAlert(`Saldo insuficiente. Precisas de ${(item.price || 0).toFixed(2)} USDT para adquirir este produto.`, 'error');
      return;
    }
    setConfirmDialog({
      title: `Adquirir ${item.title}`,
      message: `Desejas mesmo adquirir este item patrocinado por ${(item.price || 0).toFixed(2)} USDT? O valor será debitado do teu saldo.`,
      onConfirm: async () => {
        soundService.playDepositSuccess();
        if (onUpdateBalance) {
          onUpdateBalance(-item.price);
        }
        showAlert(`Parabéns! Adquiriste "${item.title}" com sucesso! O patrocinador entrará em contacto contigo pelo chat.`, 'success');
      }
    });
  };

  const handleBuyPdfPost = async (post: Post) => {
    if (!post.pdfPrice) return;
    if (post.userId === currentUserId) {
      showAlert('Não podes comprar o teu próprio E-Book!', 'error');
      return;
    }
    if (purchasedBookIds.includes(post.id)) {
      showAlert('Já adquiriste este E-Book PDF!', 'success');
      return;
    }
    if (balance < post.pdfPrice) {
      showAlert(`Saldo insuficiente. Precisas de ${(post.pdfPrice || 0).toFixed(2)} USDT, mas tens apenas ${balance.toFixed(2)} USDT!`, 'error');
      return;
    }

    setConfirmDialog({
      title: 'Confirmar Compra de E-Book',
      message: `Queres comprar o E-Book "${post.pdfTitle}" por ${(post.pdfPrice || 0).toFixed(2)} USDT? Ele ficará disponível para download instantâneo.`,
      onConfirm: async () => {
        soundService.playUISelect();
        try {
          if (onUpdateBalance) {
            onUpdateBalance(-post.pdfPrice!);
          }

          const updatedPurchased = [...purchasedBookIds, post.id];
          localStorage.setItem('cryptonbet_purchased_books', JSON.stringify(updatedPurchased));
          setPurchasedBookIds(updatedPurchased);

          if (currentUserId === 'guest_user') {
            const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
            const updated = localPosts.map((p: any) => {
              if (p.id === post.id) {
                return { ...p, pdfDownloads: (p.pdfDownloads || 0) + 1 };
              }
              return p;
            });
            localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
            setPosts(updated);
          } else {
            const postRef = doc(db, 'posts', post.id);
            await updateDoc(postRef, {
              pdfDownloads: (post.pdfDownloads || 0) + 1
            });
            const purchaseDocId = `${currentUserId}_${post.id}`;
            await setDoc(doc(db, 'pdf_purchases', purchaseDocId), {
              userId: currentUserId,
              postId: post.id,
              pdfTitle: post.pdfTitle || '',
              pdfFileUrl: post.pdfFileUrl || '',
              pdfFileName: post.pdfFileName || '',
              price: post.pdfPrice || 0,
              purchasedAt: serverTimestamp()
            });
          }

          soundService.playDepositSuccess();
          showAlert(`E-Book "${post.pdfTitle}" comprado com sucesso! Já podes transferir o teu PDF.`);
        } catch (e) {
          console.error("Error purchasing book:", e);
          showAlert("Erro ao processar transação.", "error");
        }
      }
    });
  };

  const handleDownloadPdfBook = (post: Post) => {
    soundService.playUISelect();
    setDownloadingBookId(post.id);
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloadingBookId(null);
          soundService.playWithdrawSuccess();

          if (post.pdfFileUrl) {
            const link = document.createElement('a');
            link.href = post.pdfFileUrl;
            link.download = post.pdfFileName || `${post.pdfTitle || 'EBook'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showAlert(`Ficheiro transferido: ${post.pdfFileName || `${post.pdfTitle || 'EBook'}.pdf`}!`, 'success');
          } else {
            showAlert(`Transferência concluída: ${post.pdfTitle || 'EBook'}.pdf!`, 'success');
          }
          return 0;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getBookAverageRating = (postId: string) => {
    const reviews = pdfReviews[postId] || [];
    if (reviews.length === 0) return { average: 4.9, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: parseFloat((sum / reviews.length).toFixed(1)),
      count: reviews.length
    };
  };

  const handleAddReview = (postId: string, rating: number, comment: string) => {
    if (!comment.trim()) {
      showAlert('Por favor, escreve um breve comentário para a tua avaliação.', 'error');
      return;
    }
    if (rating < 1 || rating > 5) {
      showAlert('A classificação deve ser entre 1 e 5 estrelas.', 'error');
      return;
    }
    if (!purchasedBookIds.includes(postId)) {
      showAlert('Apenas podes avaliar E-Books que tenhas comprado!', 'error');
      return;
    }

    const review = {
      userId: currentUserId,
      userName: currentUserName,
      rating: rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    const currentReviews = { ...pdfReviews };
    if (!currentReviews[postId]) {
      currentReviews[postId] = [];
    }

    const existingIndex = currentReviews[postId].findIndex(r => r.userId === currentUserId);
    if (existingIndex > -1) {
      currentReviews[postId][existingIndex] = review;
    } else {
      currentReviews[postId].push(review);
    }

    localStorage.setItem('cryptonbet_pdf_reviews', JSON.stringify(currentReviews));
    setPdfReviews(currentReviews);

    if (currentUserId !== 'guest_user') {
      const reviewDocId = `${postId}_${currentUserId}`;
      setDoc(doc(db, 'pdf_reviews', reviewDocId), {
        postId,
        userId: currentUserId,
        userName: currentUserName,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString()
      }).catch(err => console.error("Error saving PDF review to Firestore:", err));
    }

    soundService.playUISelect();
    showAlert('Obrigado! A tua avaliação foi publicada com sucesso.', 'success');
  };

  // Like / Unlike Post (Thumbs Up)
  const handleLikePost = async (post: Post) => {
    soundService.playUISelect();
    const isLiked = post.likes.includes(currentUserId);

    if (currentUserId === 'guest_user') {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      const updated = localPosts.map((p: Post) => {
        if (p.id === post.id) {
          const updatedLikes = isLiked
            ? p.likes.filter(id => id !== currentUserId)
            : [...p.likes, currentUserId];
          return { ...p, likes: updatedLikes };
        }
        return p;
      });
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
      setPosts(updated);

      if (!isLiked && post.userId !== currentUserId) {
        sendNotification(post.userId, 'like_post', post.id, undefined, `${currentUserName} gostou da sua publicação.`);
      }
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
      });

      if (!isLiked && post.userId !== currentUserId) {
        sendNotification(post.userId, 'like_post', post.id, undefined, `${currentUserName} gostou da sua publicação.`);
      }
    } catch (err) {
      console.error("Error updating likes:", err);
    }
  };

  // Facebook-Style Reactions Details & Helpers
  const REACTION_DETAILS: { [key: string]: { emoji: string; label: string; color: string } } = {
    like: { emoji: '👍', label: 'Gosto', color: 'text-[#1877f2]' },
    love: { emoji: '❤️', label: 'Amei', color: 'text-rose-500' },
    haha: { emoji: '😆', label: 'Haha', color: 'text-amber-500' },
    wow: { emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
    sad: { emoji: '😢', label: 'Triste', color: 'text-blue-400' },
    angry: { emoji: '😡', label: 'Irado', color: 'text-red-500' },
  };

  const getPostReactionsSummary = (post: Post) => {
    const reactions = post.reactions || {};
    const likes = post.likes || [];

    const combined: { [userId: string]: string } = { ...reactions };
    likes.forEach(uid => {
      if (!combined[uid]) {
        combined[uid] = 'like';
      }
    });

    const counts: { [type: string]: number } = {};
    Object.values(combined).forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });

    const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const totalCount = Object.keys(combined).length;

    return {
      combined,
      counts,
      sortedTypes,
      totalCount
    };
  };

  const handleReactPost = async (post: Post, reactionType: string) => {
    soundService.playUISelect();
    setActiveReactionPostId(null);

    const currentReactions = post.reactions || {};
    const previousReaction = currentReactions[currentUserId];
    const isRemove = previousReaction === reactionType;

    const newReactions = { ...currentReactions };
    if (isRemove) {
      delete newReactions[currentUserId];
    } else {
      newReactions[currentUserId] = reactionType;
    }

    let newLikes = [...(post.likes || [])];
    const hasAnyReaction = !!newReactions[currentUserId];
    const inLikes = newLikes.includes(currentUserId);

    if (hasAnyReaction && !inLikes) {
      newLikes.push(currentUserId);
    } else if (!hasAnyReaction && inLikes) {
      newLikes = newLikes.filter(id => id !== currentUserId);
    }

    if (currentUserId === 'guest_user') {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      const updated = localPosts.map((p: Post) => {
        if (p.id === post.id) {
          return { ...p, likes: newLikes, reactions: newReactions };
        }
        return p;
      });
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
      setPosts(updated);

      if (!isRemove && post.userId !== currentUserId) {
        sendNotification(post.userId, 'like_post', post.id, undefined, `${currentUserName} reagiu à sua publicação: ${REACTION_DETAILS[reactionType].emoji}`);
      }
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likes: newLikes,
        reactions: newReactions
      });

      if (!isRemove && post.userId !== currentUserId) {
        sendNotification(post.userId, 'like_post', post.id, undefined, `${currentUserName} reagiu à sua publicação: ${REACTION_DETAILS[reactionType].emoji}`);
      }
    } catch (err) {
      console.error("Error updating reactions:", err);
    }
  };

  // Facebook & WhatsApp Style Post/Product Share Handler
  const handleSharePost = (post: Post) => {
    soundService.playUISelect();
    setSharingPost(post);
    setShareNote('');
  };

  const handleConfirmShare = async () => {
    if (!sharingPost) return;
    setIsPublishingShare(true);
    soundService.playUISelect();

    const post = sharingPost;
    const noteText = shareNote.trim();

    const newPostPayload: any = {
      userId: auth.currentUser?.uid || currentUserId,
      userName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || currentUserName || 'Trader',
      content: noteText || `Partilhou a publicação de ${post.userName}`,
      likes: [],
      reactions: {},
      comments: [],
      createdAt: currentUserId === 'guest_user' ? new Date().toISOString() : serverTimestamp(),
      postType: 'social',
      sharedFromPostId: post.id,
      sharedFromUserName: post.userName,
      sharedFromContent: post.content || post.pdfDescription || "",
      sharedFromImageUrl: post.imageUrl || "",
      sharedFromPostType: post.postType || 'social',
      sharedFromPdfTitle: post.pdfTitle || "",
      sharedFromPdfAuthor: post.pdfAuthor || "",
      sharedFromPdfCoverColor: post.pdfCoverColor || "",
      sharedFromPdfDescription: post.pdfDescription || post.content || "",
      sharedFromPdfPrice: post.pdfPrice || 0,
      sharedFromPdfFileUrl: post.pdfFileUrl || "",
      sharedFromPdfFileName: post.pdfFileName || "",
      sharedFromP2pCoin: post.p2pCoin || "",
      sharedFromP2pAmount: post.p2pAmount || 0,
      sharedFromP2pPrice: post.p2pPrice || 0
    };

    if (currentUserId === 'guest_user') {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      const newPost = {
        ...newPostPayload,
        id: 'post_' + Date.now()
      };
      const updated = [newPost, ...localPosts];
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
      setPosts(updated);
      soundService.playDepositSuccess();
      showAlert('Publicação partilhada no teu mural do Crypton Social!', 'success');

      if (post.userId !== currentUserId) {
        sendNotification(post.userId, 'like_post', post.id, undefined, `${currentUserName} partilhou a tua publicação.`);
      }
      setIsPublishingShare(false);
      setSharingPost(null);
      return;
    }

    try {
      await addDoc(collection(db, 'posts'), newPostPayload);
      soundService.playDepositSuccess();
      showAlert('Publicação partilhada no teu mural do Crypton Social!', 'success');

      if (post.userId !== currentUserId) {
        sendNotification(post.userId, 'like_post', post.id, undefined, `${currentUserName} partilhou a tua publicação.`);
      }
    } catch (err) {
      console.error("Error sharing post:", err);
      showAlert('Erro ao partilhar publicação.', 'error');
    } finally {
      setIsPublishingShare(false);
      setSharingPost(null);
    }
  };

  const handleShareToWhatsApp = (post: Post) => {
    soundService.playUISelect();
    const title = post.pdfTitle ? `E-Book "${post.pdfTitle}"` : post.p2pCoin ? `Venda P2P ${post.p2pCoin}` : `Publicação de ${post.userName}`;
    const desc = post.pdfTitle ? `Autor: ${post.pdfAuthor} - Preço: ${(post.pdfPrice || 0).toFixed(2)} USDT` : post.content ? `"${post.content.slice(0, 100)}..."` : 'Confere no Crypton Social';
    const text = `Confere isto no Crypton Social!\n\n📌 ${title}\n${desc}\n\n🔗 https://cryptonbet.app/social`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyPostLink = (post: Post) => {
    soundService.playUISelect();
    const link = `${window.location.origin}/#post_${post.id}`;
    navigator.clipboard.writeText(link).then(() => {
      showAlert('Link da publicação copiado para a área de transferência!', 'success');
    }).catch(() => {
      showAlert('Link copiado!', 'success');
    });
  };

  // YouTube-Style Channel Memberships Support
  const joinMembership = (creatorId: string, creatorName: string) => {
    soundService.playUISelect();
    const COST = 4.90;
    if (balance < COST) {
      showAlert(`Saldo insuficiente! Aderir ao Clube de ${creatorName} custa ${COST.toFixed(2)} USDT.`, 'error');
      return;
    }

    if (onUpdateBalance) {
      onUpdateBalance(-COST);
    }

    const updated = { ...memberships, [creatorId]: true };
    setMemberships(updated);
    localStorage.setItem('cryptonbet_memberships', JSON.stringify(updated));

    const creatorStats = JSON.parse(localStorage.getItem(`cryptonbet_creator_stats_${creatorId}`) || '{"revenue":0,"members":0}');
    creatorStats.revenue = (creatorStats.revenue || 0) + COST;
    creatorStats.members = (creatorStats.members || 0) + 1;
    localStorage.setItem(`cryptonbet_creator_stats_${creatorId}`, JSON.stringify(creatorStats));

    // Update list of members supporting me if supported user is creator
    const simulatedMembersKey = `cryptonbet_my_members_${creatorId}`;
    const membersList: string[] = JSON.parse(localStorage.getItem(simulatedMembersKey) || '[]');
    if (!membersList.includes(currentUserId)) {
      membersList.push(currentUserId);
      localStorage.setItem(simulatedMembersKey, JSON.stringify(membersList));
    }

    soundService.playWithdrawSuccess();
    showAlert(`🎉 Parabéns! Agora és Membro Oficial do Clube de ${creatorName}! Crachás e selos especiais desbloqueados!`, 'success');
  };

  // YouTube-Style Super Chat Send Handler
  const handleAddSuperChatComment = async (postId: string, amount: number, color: string, text: string) => {
    if (!text.trim()) {
      showAlert('Escreve uma mensagem para o teu Super Chat!', 'error');
      return;
    }
    if (balance < amount) {
      showAlert(`Saldo insuficiente para enviar Super Chat! Tens ${balance.toFixed(2)} USDT.`, 'error');
      return;
    }

    soundService.playUISelect();

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (onUpdateBalance) {
      onUpdateBalance(-amount);
    }

    const creatorId = post.userId;
    const creatorStats = JSON.parse(localStorage.getItem(`cryptonbet_creator_stats_${creatorId}`) || '{"revenue":0,"members":0}');
    creatorStats.revenue = (creatorStats.revenue || 0) + amount;
    localStorage.setItem(`cryptonbet_creator_stats_${creatorId}`, JSON.stringify(creatorStats));

    const newComment: PostComment = {
      id: 'sc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId: currentUserId,
      userName: currentUserName,
      content: text.trim(),
      createdAt: new Date().toISOString(),
      likes: [],
      replies: [],
      isSuperChat: true,
      superChatAmount: amount,
      superChatColor: color
    };

    const updatedComments = [...(post.comments || []), newComment];
    await updatePostCommentsInDB(postId, updatedComments);
    setActiveSuperChatPostId(null);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    soundService.playWithdrawSuccess();
    showAlert(`⚡ Super Chat de ${amount.toFixed(2)} USDT enviado com sucesso!`, 'success');

    if (post.userId !== currentUserId) {
      sendNotification(post.userId, 'comment_post', postId, newComment.id, `⚡ ${currentUserName} enviou-te um Super Chat de ${amount.toFixed(2)} USDT!`);
    }
  };

  // Helper to persist updated comments list for a post
  const updatePostCommentsInDB = async (postId: string, updatedComments: PostComment[]) => {
    if (currentUserId === 'guest_user') {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      const updated = localPosts.map((p: Post) => {
        if (p.id === postId) {
          return { ...p, comments: updatedComments };
        }
        return p;
      });
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
      setPosts(updated);
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        comments: updatedComments
      });
    } catch (err) {
      console.error("Error updating comments:", err);
      showAlert('Erro ao atualizar comentários.', 'error');
    }
  };

  // Send Post Comment
  const handleAddComment = async (postId: string) => {
    const inputContent = commentInputs[postId] || '';
    if (!inputContent.trim()) return;

    soundService.playUISelect();

    const newComment: PostComment = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId: currentUserId,
      userName: currentUserName,
      content: inputContent.trim(),
      createdAt: new Date().toISOString(),
      likes: [],
      replies: []
    };

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const updatedComments = [...(post.comments || []), newComment];
    await updatePostCommentsInDB(postId, updatedComments);
    showAlert('Comentário enviado!');

    if (post.userId !== currentUserId) {
      const displayContent = inputContent.trim().length > 30 ? inputContent.trim().substring(0, 30) + '...' : inputContent.trim();
      sendNotification(post.userId, 'comment_post', postId, newComment.id, `${currentUserName} comentou na sua publicação: "${displayContent}"`);
    }
  };

  // Like / React to Comment
  const handleLikeComment = async (postId: string, commentId: string) => {
    soundService.playUISelect();
    const post = posts.find(p => p.id === postId);
    if (!post || !post.comments) return;

    let targetRecipientId = '';
    let isNowLiked = false;

    const updatedComments = post.comments.map((comm) => {
      if (comm.id === commentId) {
        const likesList = comm.likes || [];
        const isLiked = likesList.includes(currentUserId);
        isNowLiked = !isLiked;
        targetRecipientId = comm.userId;
        const updatedLikes = isLiked
          ? likesList.filter(uid => uid !== currentUserId)
          : [...likesList, currentUserId];
        return { ...comm, likes: updatedLikes };
      }
      return comm;
    });

    await updatePostCommentsInDB(postId, updatedComments);

    if (isNowLiked && targetRecipientId && targetRecipientId !== currentUserId) {
      sendNotification(targetRecipientId, 'like_comment', postId, commentId, `${currentUserName} gostou do teu comentário.`);
    }
  };

  // Reply to Comment
  const handleReplyToComment = async (postId: string, commentId: string) => {
    const replyInput = commentReplyInputs[commentId] || '';
    if (!replyInput.trim()) return;

    soundService.playUISelect();

    const newReply: CommentReply = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      userId: currentUserId,
      userName: currentUserName,
      content: replyInput.trim(),
      createdAt: new Date().toISOString(),
      likes: []
    };

    setCommentReplyInputs(prev => ({ ...prev, [commentId]: '' }));
    setActiveReplyCommentId(null);

    const post = posts.find(p => p.id === postId);
    if (!post || !post.comments) return;

    let targetRecipientId = '';

    const updatedComments = post.comments.map((comm) => {
      if (comm.id === commentId) {
        targetRecipientId = comm.userId;
        return {
          ...comm,
          replies: [...(comm.replies || []), newReply]
        };
      }
      return comm;
    });

    await updatePostCommentsInDB(postId, updatedComments);
    showAlert('Resposta enviada!');

    if (targetRecipientId && targetRecipientId !== currentUserId) {
      const displayContent = replyInput.trim().length > 30 ? replyInput.trim().substring(0, 30) + '...' : replyInput.trim();
      sendNotification(targetRecipientId, 'reply_comment', postId, commentId, `${currentUserName} respondeu ao teu comentário: "${displayContent}"`);
    }
  };

  // Like / React to Reply
  const handleLikeReply = async (postId: string, commentId: string, replyId: string) => {
    soundService.playUISelect();
    const post = posts.find(p => p.id === postId);
    if (!post || !post.comments) return;

    let targetRecipientId = '';
    let isNowLiked = false;

    const updatedComments = post.comments.map((comm) => {
      if (comm.id === commentId) {
        const updatedReplies = (comm.replies || []).map((rep) => {
          if (rep.id === replyId) {
            const likesList = rep.likes || [];
            const isLiked = likesList.includes(currentUserId);
            isNowLiked = !isLiked;
            targetRecipientId = rep.userId;
            const updatedLikes = isLiked
              ? likesList.filter(uid => uid !== currentUserId)
              : [...likesList, currentUserId];
            return { ...rep, likes: updatedLikes };
          }
          return rep;
        });
        return { ...comm, replies: updatedReplies };
      }
      return comm;
    });

    await updatePostCommentsInDB(postId, updatedComments);

    if (isNowLiked && targetRecipientId && targetRecipientId !== currentUserId) {
      sendNotification(targetRecipientId, 'like_reply', postId, commentId, `${currentUserName} gostou da tua resposta.`);
    }
  };

  // Delete Comment
  const handleDeleteComment = (postId: string, commentId: string) => {
    setConfirmDialog({
      title: 'Eliminar Comentário',
      message: 'Tens a certeza de que desejas eliminar este comentário permanentemente?',
      onConfirm: async () => {
        soundService.playUISelect();
        const post = posts.find(p => p.id === postId);
        if (!post || !post.comments) return;

        const updatedComments = post.comments.filter(comm => comm.id !== commentId);
        await updatePostCommentsInDB(postId, updatedComments);
        showAlert('Comentário eliminado.');
      }
    });
  };

  // Delete Reply
  const handleDeleteReply = (postId: string, commentId: string, replyId: string) => {
    setConfirmDialog({
      title: 'Eliminar Resposta',
      message: 'Tens a certeza de que desejas eliminar esta resposta?',
      onConfirm: async () => {
        soundService.playUISelect();
        const post = posts.find(p => p.id === postId);
        if (!post || !post.comments) return;

        const updatedComments = post.comments.map((comm) => {
          if (comm.id === commentId) {
            return {
              ...comm,
              replies: (comm.replies || []).filter(rep => rep.id !== replyId)
            };
          }
          return comm;
        });

        await updatePostCommentsInDB(postId, updatedComments);
        showAlert('Resposta eliminada.');
      }
    });
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    setConfirmDialog({
      title: 'Eliminar Publicação',
      message: 'Desejas remover esta publicação permanentemente do Crypton Social?',
      onConfirm: async () => {
        soundService.playUISelect();
        if (currentUserId === 'guest_user') {
          const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
          const filtered = localPosts.filter((p: Post) => p.id !== postId);
          localStorage.setItem('cryptonbet_local_posts', JSON.stringify(filtered));
          setPosts(filtered);
          showAlert('Publicação eliminada.');
          return;
        }

        try {
          await deleteDoc(doc(db, 'posts', postId));
          showAlert('Publicação eliminada.');
        } catch (err) {
          console.error("Error deleting post:", err);
          showAlert('Erro ao eliminar.', 'error');
        }
      }
    });
  };

  // Pin/Unpin Post
  const handleTogglePinPost = async (post: Post) => {
    soundService.playUISelect();
    const newPinnedState = !post.isPinned;

    if (currentUserId === 'guest_user') {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      const updated = localPosts.map((p: Post) => {
        if (p.id === post.id) {
          return { ...p, isPinned: newPinnedState };
        }
        return p;
      });
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
      setPosts(updated);
      showAlert(newPinnedState ? 'Publicação fixada no topo!' : 'Publicação desafixada.');
      setActivePostMenuId(null);
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        isPinned: newPinnedState
      });
      showAlert(newPinnedState ? 'Publicação fixada no topo!' : 'Publicação desafixada.');
    } catch (err) {
      console.error("Error updating pin state:", err);
      showAlert('Erro ao alterar fixação.', 'error');
    }
    setActivePostMenuId(null);
  };

  // Edit Post Submit
  const handleEditPostSubmit = async (postId: string) => {
    if (!editingPostContent.trim()) return;
    soundService.playUISelect();

    if (currentUserId === 'guest_user') {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      const updated = localPosts.map((p: Post) => {
        if (p.id === postId) {
          return { ...p, content: editingPostContent.trim() };
        }
        return p;
      });
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(updated));
      setPosts(updated);
      setEditingPostId(null);
      showAlert('Publicação editada com sucesso!');
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        content: editingPostContent.trim()
      });
      setEditingPostId(null);
      showAlert('Publicação editada com sucesso!');
    } catch (err) {
      console.error("Error editing post:", err);
      showAlert('Erro ao editar publicação.', 'error');
    }
  };

  // Report Post
  const handleReportPost = (postId: string) => {
    soundService.playUISelect();
    setReportedPostIds(prev => [...prev, postId]);
    showAlert('Denúncia enviada com sucesso aos moderadores do Crypton Social!', 'success');
    setActivePostMenuId(null);
  };

  // Friend Requests logic
  const handleSendFriendRequest = async (targetUser: UserProfile) => {
    setIsProcessingFriend(targetUser.uid);
    soundService.playUISelect();

    if (currentUserId === 'guest_user') {
      const localReqs = JSON.parse(localStorage.getItem('cryptonbet_local_friend_requests') || '[]');
      const exists = localReqs.some((r: any) =>
        (r.senderId === currentUserId && r.receiverId === targetUser.uid) ||
        (r.receiverId === currentUserId && r.senderId === targetUser.uid)
      );

      if (exists) {
        showAlert('Pedido já enviado ou já são amigos.', 'error');
        setIsProcessingFriend(null);
        return;
      }

      const newReq: FriendRequest = {
        id: 'req_' + Date.now(),
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: targetUser.uid,
        receiverName: targetUser.displayName,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      localReqs.push(newReq);
      localStorage.setItem('cryptonbet_local_friend_requests', JSON.stringify(localReqs));
      setFriendRequests(localReqs);
      showAlert(`Pedido de amizade enviado para ${targetUser.displayName}!`);
      sendNotification(targetUser.uid, 'friend_request', undefined, undefined, `${currentUserName} enviou-te um pedido de amizade.`);
      setIsProcessingFriend(null);
      return;
    }

    try {
      const reqCol = collection(db, 'friend_requests');
      const q1 = query(reqCol, where('senderId', '==', currentUserId), where('receiverId', '==', targetUser.uid));
      const q2 = query(reqCol, where('senderId', '==', targetUser.uid), where('receiverId', '==', currentUserId));

      const snap1 = await getDocs(q1);
      const snap2 = await getDocs(q2);

      if (!snap1.empty || !snap2.empty) {
        showAlert('Pedido já pendente ou já são amigos.', 'error');
        setIsProcessingFriend(null);
        return;
      }

      await addDoc(collection(db, 'friend_requests'), {
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: targetUser.uid,
        receiverName: targetUser.displayName,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      showAlert(`Pedido de amizade enviado!`);
      sendNotification(targetUser.uid, 'friend_request', undefined, undefined, `${currentUserName} enviou-te um pedido de amizade.`);
    } catch (err) {
      console.error("Error sending request:", err);
    } finally {
      setIsProcessingFriend(null);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    setIsProcessingFriend(request.id);
    soundService.playUISelect();

    if (currentUserId === 'guest_user') {
      const localReqs = JSON.parse(localStorage.getItem('cryptonbet_local_friend_requests') || '[]');
      const updated = localReqs.map((r: any) => {
        if (r.id === request.id) return { ...r, status: 'accepted' };
        return r;
      });
      localStorage.setItem('cryptonbet_local_friend_requests', JSON.stringify(updated));
      setFriendRequests(updated);
      showAlert(`Agora és amigo de ${request.senderName}!`);
      sendNotification(request.senderId, 'friend_accept', undefined, undefined, `${currentUserName} aceitou o teu pedido de amizade. Agora são amigos!`);
      setIsProcessingFriend(null);
      return;
    }

    try {
      const reqRef = doc(db, 'friend_requests', request.id);
      await updateDoc(reqRef, { status: 'accepted' });
      showAlert(`Pedido aceite!`);
      sendNotification(request.senderId, 'friend_accept', undefined, undefined, `${currentUserName} aceitou o teu pedido de amizade. Agora são amigos!`);
    } catch (err) {
      console.error("Error accepting friend request:", err);
    } finally {
      setIsProcessingFriend(null);
    }
  };

  const handleRejectOrCancelRequest = async (requestId: string) => {
    setIsProcessingFriend(requestId);
    soundService.playUISelect();

    if (currentUserId === 'guest_user') {
      const localReqs = JSON.parse(localStorage.getItem('cryptonbet_local_friend_requests') || '[]');
      const filtered = localReqs.filter((r: any) => r.id !== requestId);
      localStorage.setItem('cryptonbet_local_friend_requests', JSON.stringify(filtered));
      setFriendRequests(filtered);
      showAlert('Pedido cancelado.');
      setIsProcessingFriend(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'friend_requests', requestId));
      showAlert('Pedido removido.');
    } catch (err) {
      console.error("Error canceling request:", err);
    } finally {
      setIsProcessingFriend(null);
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    setConfirmDialog({
      title: 'Desfazer Amizade',
      message: 'Tens a certeza de que desejas remover este contacto da tua lista de amigos?',
      onConfirm: async () => {
        soundService.playUISelect();
        const relation = friendRequests.find(r =>
          r.status === 'accepted' &&
          ((r.senderId === currentUserId && r.receiverId === friendId) ||
           (r.receiverId === currentUserId && r.senderId === friendId))
        );

        if (!relation) return;

        if (currentUserId === 'guest_user') {
          const localReqs = JSON.parse(localStorage.getItem('cryptonbet_local_friend_requests') || '[]');
          const filtered = localReqs.filter((r: any) => r.id !== relation.id);
          localStorage.setItem('cryptonbet_local_friend_requests', JSON.stringify(filtered));
          setFriendRequests(filtered);
          showAlert('Amizade removida.');
          if (activeChatFriend?.uid === friendId) setActiveChatFriend(null);
          return;
        }

        try {
          await deleteDoc(doc(db, 'friend_requests', relation.id));
          showAlert('Amizade desfeita.');
          if (activeChatFriend?.uid === friendId) setActiveChatFriend(null);
        } catch (err) {
          console.error("Error unfriending:", err);
        }
      }
    });
  };

  // Messenger Chat Messaging
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatFriend) return;

    const messageText = newMessage;
    const replyToData = replyingToMsg ? {
      id: replyingToMsg.id,
      senderName: replyingToMsg.senderName,
      content: replyingToMsg.content
    } : undefined;

    setNewMessage('');
    setReplyingToMsg(null);
    soundService.playUISelect();

    const chatId = getChatId(currentUserId, activeChatFriend.uid);

    if (currentUserId === 'guest_user') {
      const allMsgs = JSON.parse(localStorage.getItem('cryptonbet_local_messages') || '[]');
      const newM: PrivateMessage = {
        id: 'msg_' + Date.now(),
        chatId,
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: activeChatFriend.uid,
        receiverName: activeChatFriend.displayName,
        content: messageText,
        createdAt: new Date().toISOString(),
        replyTo: replyToData
      };
      allMsgs.push(newM);
      localStorage.setItem('cryptonbet_local_messages', JSON.stringify(allMsgs));
      setChatMessages(prev => [...prev, newM]);

      const displayContent = messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText;
      sendNotification(activeChatFriend.uid, 'private_message', undefined, undefined, `${currentUserName} enviou-te uma mensagem privada: "${displayContent}"`);

      // Intelligent automatic system replies for demonstration
      setTimeout(() => {
        const reply: PrivateMessage = {
          id: 'reply_' + Date.now(),
          chatId,
          senderId: activeChatFriend.uid,
          senderName: activeChatFriend.displayName,
          receiverId: currentUserId,
          receiverName: currentUserName,
          content: `Epa, boas! 🚀 Acabei de analisar a tendência do Bitcoin em BTC/USDT e está em alta forte. Vou abrir uma posição agora mesmo nas criptomoedas e no Aviator! Junta-te a mim e vamos faturar juntos! 📈`,
          createdAt: new Date().toISOString()
        };
        allMsgs.push(reply);
        localStorage.setItem('cryptonbet_local_messages', JSON.stringify(allMsgs));
        setChatMessages(prev => [...prev, reply]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, 1200);

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return;
    }

    try {
      const payload: any = {
        chatId,
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: activeChatFriend.uid,
        receiverName: activeChatFriend.displayName,
        content: messageText,
        createdAt: serverTimestamp()
      };
      if (replyToData) payload.replyTo = replyToData;
      await addDoc(collection(db, 'private_messages'), payload);
      const displayContent = messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText;
      sendNotification(activeChatFriend.uid, 'private_message', undefined, undefined, `${currentUserName} enviou-te uma mensagem privada: "${displayContent}"`);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Send a quick Thumb Up in Messenger chat
  const handleSendLikeThumb = () => {
    setNewMessage('👍');
    setTimeout(() => {
      const mockEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSendMessage(mockEvent);
    }, 50);
  };

  const filteredSearchUsers = allUsers.filter(u => {
    if (u.uid === currentUserId) return false;
    const matchesSearch = (u.displayName || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const isFriend = acceptedFriends.some(f => f.uid === u.uid);
    const hasRequest = friendRequests.some(r =>
      (r.senderId === currentUserId && r.receiverId === u.uid) ||
      (r.receiverId === currentUserId && r.senderId === u.uid)
    );
    return matchesSearch && !isFriend && !hasRequest;
  });

  return (
    <div className="h-full w-full bg-[#f0f2f5] text-slate-800 flex flex-col overflow-hidden relative font-sans">

      {/* FACEBOOK STYLE TOP NAVBAR */}
      <header className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundService.playUISelect();
              onBack();
            }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-all cursor-pointer text-slate-700"
            title="Voltar para a Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Crypton Social Logo Icon */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1877f2] rounded-full flex items-center justify-center font-black text-white text-xl select-none shadow">
              C
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Crypton Social <span className="bg-[#1877f2] text-[8px] font-black uppercase px-1.5 py-0.5 rounded text-white tracking-widest">TRADER</span>
              </span>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">A tua comunidade de apostas</p>
            </div>
          </div>
        </div>

        {/* TOP LEVEL TAB SELECTOR */}
        <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
          <button
            onClick={() => { soundService.playUISelect(); setActiveTab('feed'); }}
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'feed' ? 'bg-[#1877f2] text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden md:inline">Feed</span>
          </button>
          <button
            onClick={() => { soundService.playUISelect(); setActiveTab('friends'); }}
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === 'friends' ? 'bg-[#1877f2] text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Amigos</span>
            {pendingReceivedRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {pendingReceivedRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { soundService.playUISelect(); setActiveTab('chat'); }}
            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chat' ? 'bg-[#1877f2] text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden md:inline">Messenger</span>
          </button>
        </div>

        {/* USER META & SALDO */}
        <div className="flex items-center gap-3">
          {/* BELL ICON BUTTON */}
          <div className="relative">
            <button
              onClick={() => {
                soundService.playUISelect();
                setShowNotificationsDropdown(prev => !prev);
              }}
              className={`p-2 rounded-full border transition-all cursor-pointer relative ${
                showNotificationsDropdown
                  ? 'bg-[#1877f2] text-white border-[#1877f2] shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-white animate-pulse">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS DROPDOWN */}
            <AnimatePresence>
              {showNotificationsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="fixed sm:absolute top-16 sm:top-full left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0 mt-2 w-[92vw] sm:w-96 max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden max-h-[80vh] sm:max-h-[480px]"
                >
                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Notificações</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Tens {notifications.filter(n => !n.isRead).length} por ler</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {notifications.length > 0 && (
                        <>
                          <button
                            onClick={handleMarkAllNotificationsAsRead}
                            className="text-[9px] font-black uppercase text-[#1877f2] hover:underline cursor-pointer bg-blue-50 px-2 py-1 rounded"
                          >
                            Ler tudo
                          </button>
                          <button
                            onClick={handleClearAllNotifications}
                            className="text-[9px] font-black uppercase text-red-600 hover:underline cursor-pointer bg-red-50 px-2 py-1 rounded"
                          >
                            Limpar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          soundService.playUISelect();
                          setShowNotificationsDropdown(false);
                        }}
                        className="p-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center ml-1"
                        title="Fechar Notificações"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Content List */}
                  <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[350px]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Bell className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-500">Sem notificações ainda</span>
                        <p className="text-[10px] text-slate-400 max-w-[200px]">Reações, comentários e mensagens que receberes aparecerão aqui!</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const notifDate = new Date(notif.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });
                        const notifDay = new Date(notif.createdAt).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' });
                        return (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 p-3 transition-all relative group cursor-pointer ${
                              notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/60'
                            }`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            {/* Unread Indicator dot */}
                            {!notif.isRead && (
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#1877f2] rounded-full"></span>
                            )}

                            {/* Sender Initial Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs text-white select-none relative shrink-0 ml-1 ${
                              notif.isRead ? 'bg-slate-400' : 'bg-[#1877f2]'
                            }`}>
                              {notif.senderName.charAt(0)}
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                {notif.type.includes('like') ? (
                                  <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500" />
                                ) : notif.type.includes('comment') || notif.type.includes('reply') ? (
                                  <MessageCircle className="w-2.5 h-2.5 text-blue-500" />
                                ) : notif.type.includes('friend') ? (
                                  <Users className="w-2.5 h-2.5 text-green-500" />
                                ) : (
                                  <MessageSquare className="w-2.5 h-2.5 text-amber-500" />
                                )}
                              </span>
                            </div>

                            {/* Message details */}
                            <div className="flex-1 min-w-0 pr-4">
                              <p className={`text-xs text-slate-800 break-words ${notif.isRead ? 'font-normal' : 'font-semibold'}`}>
                                {notif.content}
                              </p>
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-1 font-mono">
                                <Clock className="w-2.5 h-2.5" />
                                {notifDay}, {notifDate}
                              </span>
                            </div>

                            {/* Delete individual notification button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notif.id);
                              }}
                              className="absolute right-2 top-3 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Eliminar notificação"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-wider">SALDO DISPONÍVEL</span>
            <span className="text-xs font-black text-[#049444] font-mono">
              {balance.toFixed(2)} USDT
            </span>
          </div>
          <button
            onClick={() => {
              soundService.playUISelect();
              setShowPdfCart(true);
            }}
            className="relative p-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border border-amber-400/30 rounded-xl transition-all active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center"
            title="Ver meus E-Books PDF adquiridos e Avaliações"
          >
            <ShoppingCart className="w-4 h-4 text-slate-950" />
            {purchasedBookIds.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                {purchasedBookIds.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ALERT TOAST */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full border flex items-center gap-2 shadow-2xl backdrop-blur ${
              alertMsg.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-[#1877f2]/20 text-[#1877f2]'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-tight">{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR (Facebook Shortcuts - Desktop only) */}
        <aside className="w-64 bg-white p-3 border-r border-slate-200 shrink-0 hidden lg:flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center font-black text-white text-sm">
                {currentUserName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-black block truncate text-slate-900">{currentUserName}</span>
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">Ver o teu perfil</span>
              </div>
            </div>

            <div className="border-t border-slate-200 my-2"></div>

            {/* Simulated Facebook shortcuts */}
            <button
              onClick={() => setActiveTab('friends')}
              className={`w-full flex items-center gap-3.5 p-2.5 rounded-xl transition-all text-left cursor-pointer ${activeTab === 'friends' ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
            >
              <Users className="w-4.5 h-4.5 text-[#1877f2]" />
              <span className="text-xs font-bold text-slate-800">Amigos</span>
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`w-full flex items-center gap-3.5 p-2.5 rounded-xl transition-all text-left cursor-pointer ${activeTab === 'feed' ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
            >
              <Globe className="w-4.5 h-4.5 text-[#2ab051]" />
              <span className="text-xs font-bold text-slate-800">Feed de Notícias</span>
            </button>

            <button
              onClick={() => showAlert('Sinais VIP automáticos ativados para hoje!', 'success')}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-100 transition-all text-left cursor-pointer"
            >
              <Sparkles className="w-4.5 h-4.5 text-[#f5c324]" />
              <span className="text-xs font-bold text-slate-800">Grupo de Sinais VIP</span>
            </button>

            <button
              onClick={() => {
                soundService.playUISelect();
                if (onSelectGame) onSelectGame('PDF_MARKET');
              }}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-100 transition-all text-left cursor-pointer"
            >
              <BookOpen className="w-4.5 h-4.5 text-[#f25718]" />
              <span className="text-xs font-bold text-slate-800">Mercado de Livros PDF</span>
            </button>

            <button
              onClick={() => {
                soundService.playUISelect();
                if (onSelectGame) onSelectGame('P2P');
              }}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-100 transition-all text-left cursor-pointer"
            >
              <ArrowUpDown className="w-4.5 h-4.5 text-[#049444]" />
              <span className="text-xs font-bold text-slate-800">Negociação P2P Cripto</span>
            </button>

            <button
              onClick={() => {
                soundService.playUISelect();
                setShowCreatorStudio(true);
              }}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200/55 transition-all text-left cursor-pointer"
            >
              <Video className="w-4.5 h-4.5 text-red-600 fill-red-600/10" />
              <span className="text-xs font-black text-red-700 flex items-center gap-1.5">
                Estúdio de Criador <span className="bg-red-500 text-[7px] text-white font-black px-1 py-0.2 rounded-sm uppercase tracking-wider animate-pulse">MONETIZAÇÃO</span>
              </span>
            </button>

            {/* Sponsored Ads Shortcuts */}
            <button
              onClick={() => {
                soundService.playUISelect();
                setShowReadAdsModal(true);
              }}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-all text-left cursor-pointer"
            >
              <Megaphone className="w-4.5 h-4.5 text-amber-600" />
              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                Anúncios Patrocinados <span className="bg-amber-500 text-[7px] text-slate-950 font-black px-1 py-0.2 rounded-sm uppercase tracking-wider">FEED</span>
              </span>
            </button>

            <button
              onClick={() => {
                soundService.playUISelect();
                setShowCreateAdModal(true);
              }}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-all text-left cursor-pointer"
            >
              <Megaphone className="w-4.5 h-4.5 text-blue-600" />
              <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                Criar Campanha <span className="bg-blue-600 text-[7px] text-white font-black px-1 py-0.2 rounded-sm uppercase tracking-wider">ANÚNCIO</span>
              </span>
            </button>

            <button
              onClick={() => showAlert('Postagens salvas com sucesso localmente.', 'success')}
              className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-100 transition-all text-left cursor-pointer"
            >
              <Bookmark className="w-4.5 h-4.5 text-[#a855f7]" />
              <span className="text-xs font-bold text-slate-800">Guardados</span>
            </button>
          </div>

          {/* Footer inside sidebar */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-150">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Dica de Trading</span>
            <p className="text-[9px] text-slate-600 font-semibold leading-relaxed">Analisa a volatilidade do mercado antes de apostar saldo real. Faz a gestão adequada da banca.</p>
          </div>
        </aside>

        {/* MIDDLE SECTION: CENTRAL WORKSPACE (Feed, Friends, or Chat) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#f0f2f5]">

          {/* TAB 1: FACEBOOK STYLE FEED */}
          {activeTab === 'feed' && (
            <div className="flex-1 flex overflow-y-auto no-scrollbar">
              <div className="flex-1 p-3 sm:p-5 space-y-4 max-w-2xl mx-auto w-full">

                {/* 1. STORIES ROW */}
                <div className="flex gap-2.5 overflow-x-auto pb-3 no-scrollbar shrink-0 select-none">
                  {/* Card "Criar Story" */}
                  <div
                    onClick={() => { soundService.playUISelect(); setIsCreatingStory(true); }}
                    className="w-28 h-40 bg-white rounded-2xl border border-slate-200 relative overflow-hidden shrink-0 group cursor-pointer shadow-sm flex flex-col justify-between hover:border-[#1877f2]/50 hover:shadow-md transition-all active:scale-95"
                  >
                    <div className="h-[108px] w-full bg-slate-100 overflow-hidden relative">
                      <img
                        src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=150&q=80"
                        alt="Criar Story"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5" />
                    </div>
                    <div className="relative h-12 bg-white flex flex-col items-center justify-center pt-2 pb-1.5">
                      <div className="absolute -top-4 w-8 h-8 rounded-full bg-[#1877f2] border-4 border-white flex items-center justify-center text-white text-base font-black shadow">
                        +
                      </div>
                      <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider mt-1">Criar Story</span>
                    </div>
                  </div>

                  {/* Grouped & Stacked Stories (Facebook Style) */}
                  {groupedStories.map((userStories) => {
                    const story = userStories[0];
                    const count = userStories.length;
                    return (
                      <div
                        key={story.userId || story.name || story.id}
                        onClick={() => {
                          soundService.playUISelect();
                          setActiveStoryGroup(userStories);
                          setActiveStoryIndex(0);
                          setSelectedStory(story);
                        }}
                        className="relative shrink-0 cursor-pointer group py-1 pr-1.5"
                      >
                        {/* Stacked background cards if count > 1 (Facebook overlapping effect) */}
                        {count > 1 && (
                          <>
                            <div className="absolute top-2 left-2 w-28 h-40 bg-slate-300 dark:bg-slate-700 rounded-2xl border border-white transform rotate-6 scale-95 shadow-md -z-20 transition-transform group-hover:rotate-8" />
                            <div className="absolute top-1 left-1 w-28 h-40 bg-slate-200 dark:bg-slate-600 rounded-2xl border border-white transform rotate-3 scale-98 shadow-md -z-10 transition-transform group-hover:rotate-4" />
                          </>
                        )}
                        <div className="w-28 h-40 bg-white rounded-2xl border border-slate-200 relative overflow-hidden shadow-sm group-hover:shadow-md group-hover:border-slate-300 transition-all active:scale-95">
                          {story.image ? (
                            <img
                              src={story.image}
                              alt={story.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 filter brightness-75 group-hover:brightness-90"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-tr ${story.background || 'from-purple-600 to-pink-500'} p-3 flex flex-col justify-between items-center text-center`}>
                              <div className="flex-1 flex items-center justify-center w-full">
                                <span className="text-white font-black text-[9px] uppercase tracking-wide leading-snug break-words px-0.5 drop-shadow">
                                  {story.content}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Avatar badge with ring if multiple stories */}
                          <div className={`absolute top-2.5 left-2.5 z-10 w-8 h-8 rounded-full bg-[#1877f2] border-2 flex items-center justify-center text-white font-black text-[10px] shadow uppercase ${count > 1 ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-white'}`}>
                            {story.avatar || story.name.charAt(0)}
                          </div>

                          {/* Stacked Count Badge */}
                          {count > 1 ? (
                            <span className="absolute top-2.5 right-2 bg-blue-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full shadow uppercase tracking-wide border border-white/30">
                              📚 {count}
                            </span>
                          ) : story.profit ? (
                            <span className="absolute top-2.5 right-2 bg-emerald-500 text-white font-black text-[7px] px-1.5 py-0.5 rounded-md shadow uppercase tracking-wide">
                              {story.profit}
                            </span>
                          ) : null}

                          {/* User Name */}
                          <div className="absolute bottom-2.5 left-2 right-2 z-10">
                            <span className="text-[9px] font-black text-white block drop-shadow-md truncate tracking-wide">
                              {story.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ADVANCED MULTIFUNCTIONAL CAROUSEL (PAINEL FINANCEIRO UNIFICADO & MERCADO PRO) */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 rounded-2xl p-4.5 text-white shadow-xl border border-slate-700/60 relative overflow-hidden transition-all duration-300">
                  {/* Automated progress transition bar at top */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-800 z-10">
                    <motion.div
                      key={carouselIndex}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 8, ease: "linear" }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    />
                  </div>

                  {/* Decorative background blur shapes */}
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Top Header of the Unified Panel */}
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-2.5 mb-3.5 select-none">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: carouselIndex * 90 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="flex items-center justify-center"
                      >
                        {activeCarouselSlides[carouselIndex]?.id === 'wallet' && <Wallet className="w-4.5 h-4.5 text-emerald-400" />}
                        {activeCarouselSlides[carouselIndex]?.id === 'sponsor' && <Megaphone className="w-4.5 h-4.5 text-amber-400" />}
                        {activeCarouselSlides[carouselIndex]?.id === 'p2p' && <ArrowUpDown className="w-4.5 h-4.5 text-blue-400" />}
                        {activeCarouselSlides[carouselIndex]?.id === 'pdf' && <BookOpen className="w-4.5 h-4.5 text-rose-400" />}
                      </motion.div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                        {activeCarouselSlides[carouselIndex]?.label || 'Painel Financeiro Único'}
                      </span>
                    </div>

                    {activeCarouselSlides.length > 1 && (
                      <div className="flex items-center gap-2">
                        {/* Left/Right Buttons */}
                        <button
                          onClick={() => {
                            soundService.playTick();
                            setCarouselIndex(prev => (prev === 0 ? activeCarouselSlides.length - 1 : prev - 1));
                          }}
                          className="w-6 h-6 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/40 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                          title="Anterior"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            soundService.playTick();
                            setCarouselIndex(prev => (prev === activeCarouselSlides.length - 1 ? 0 : prev + 1));
                          }}
                          className="w-6 h-6 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/40 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                          title="Seguinte"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Carousel Inner content with AnimatePresence for smooth slide transitions */}
                  <div className="min-h-[148px] flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                      {activeCarouselSlides[carouselIndex]?.id === 'wallet' && (
                        <motion.div
                          key="wallet-slide"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-3.5"
                        >
                          <div className="flex justify-between items-end">
                            <div>
                              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">Saldo Disponível unificado</span>
                              <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono leading-none mt-1.5">
                                {balance.toFixed(2)} <span className="text-xs text-slate-300 font-semibold">USDT</span>
                              </h2>
                            </div>
                            <button
                              onClick={() => {
                                soundService.playUISelect();
                                showAlert('O teu saldo está sincronizado em tempo real com todas as atividades!', 'success');
                              }}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 transition-all cursor-pointer active:scale-95"
                            >
                              Sincronizado
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/40 text-[9px] font-black text-center">
                            <div className="bg-slate-800/35 p-2 rounded-xl border border-slate-700/20">
                              <span className="text-slate-400 block uppercase tracking-wider text-[8px]">🎮 JOGOS</span>
                              <span className="text-slate-200 mt-1 block font-mono">100% Integrado</span>
                            </div>
                            <div className="bg-slate-800/35 p-2 rounded-xl border border-slate-700/20">
                              <span className="text-slate-400 block uppercase tracking-wider text-[8px]">🪙 CRIPTO P2P</span>
                              <span className="text-slate-200 mt-1 block font-mono">Instantâneo</span>
                            </div>
                            <div className="bg-slate-800/35 p-2 rounded-xl border border-slate-700/20">
                              <span className="text-slate-400 block uppercase tracking-wider text-[8px]">📚 LIVROS PDF</span>
                              <span className="text-slate-200 mt-1 block font-mono">Marketplace</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeCarouselSlides[carouselIndex]?.id === 'sponsor' && realSponsoredAds.length > 0 && (
                        <motion.div
                          key="sponsor-slide"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-3"
                        >
                          {realSponsoredAds.map((ad, idx) => {
                            if (idx !== 0) return null;
                            return (
                              <div key={ad.id || idx} className="space-y-2.5">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[7px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                        {ad.badge || 'PATROCINADO'}
                                      </span>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[120px]">
                                        Por: {ad.sponsor || ad.userName || 'Anunciante'}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-black text-amber-400 uppercase mt-1 leading-snug line-clamp-1">{ad.title}</h4>
                                    <p className="text-[9.5px] text-slate-300 leading-snug font-medium line-clamp-2 mt-0.5">{ad.description || ad.content}</p>
                                  </div>

                                  <div className="shrink-0 bg-gradient-to-tr from-amber-500/20 to-red-500/20 border border-amber-500/25 p-2 rounded-xl text-center min-w-[70px]">
                                    <span className="text-[7px] text-slate-400 font-black block uppercase">PREÇO</span>
                                    <span className="text-[10px] font-black text-amber-300 font-mono">{(ad.price || ad.reward || 0).toFixed(2)} USDT</span>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-slate-700/30 gap-3">
                                  <span className="text-[8px] text-slate-400 font-bold flex items-center gap-1">
                                    👍 {ad.likes || 0} gostaram deste patrocínio
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (ad.link) window.open(ad.link, '_blank');
                                      else handleBuySponsoredItem(ad);
                                    }}
                                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-95"
                                  >
                                    {ad.actionText || 'SABER MAIS'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}

                      {activeCarouselSlides[carouselIndex]?.id === 'p2p' && realActiveP2p && (
                        <motion.div
                          key="p2p-slide"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-3"
                        >
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[7px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    P2P INSTANTÂNEO
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-bold uppercase">
                                    Anunciante: @{realActiveP2p.userName}
                                  </span>
                                </div>
                                <h4 className="text-xs font-black text-emerald-400 uppercase mt-1">
                                  VENDA DE {realActiveP2p.p2pAmount} {realActiveP2p.p2pCoin}
                                </h4>
                                <p className="text-[8px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                                  IBAN/PIX: {realActiveP2p.p2pIban || realActiveP2p.p2pPix || 'Disponível'}
                                </p>
                              </div>

                              <div className="shrink-0 bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg text-center min-w-[85px]">
                                <span className="text-[7px] text-slate-400 font-black block uppercase">VALOR A PAGAR</span>
                                <span className="text-xs font-black text-emerald-300 font-mono">{(realActiveP2p.p2pPrice || 0).toFixed(2)} USDT</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-700/30 gap-3">
                              <span className="text-[8px] text-slate-400 font-semibold flex items-center gap-1">
                                🛡️ Transação protegida por Custódia Segura (Escrow)
                              </span>
                              <button
                                onClick={() => handleBuyP2pPost(realActiveP2p as any)}
                                className="px-3.5 py-1.5 bg-[#049444] hover:bg-[#037c38] text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-95"
                              >
                                COMPRAR P2P
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeCarouselSlides[carouselIndex]?.id === 'pdf' && realActivePdf && (
                        <motion.div
                          key="pdf-slide"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[7px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                                  E-BOOK PDF REAL
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">
                                  Autor: @{realActivePdf.userName || 'Anônimo'}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-rose-400 mt-1 line-clamp-1 uppercase tracking-tight">{realActivePdf.pdfTitle || realActivePdf.content}</h4>
                              <p className="text-[8.5px] text-slate-300 font-medium mt-0.5 line-clamp-2">{realActivePdf.pdfDescription || 'Disponível no Marketplace'}</p>
                            </div>

                            <div className="shrink-0 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center min-w-[85px]">
                              <span className="text-[7px] text-slate-400 font-black block uppercase">PREÇO</span>
                              <span className="text-[11px] font-black text-rose-400 font-mono">{(realActivePdf.pdfPrice || 0).toFixed(2)} USDT</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-700/30 gap-2">
                            <span className="text-[8px] text-slate-400 font-semibold flex items-center gap-1">
                              📚 Disponível no Marketplace de E-Books
                            </span>
                            <button
                              onClick={() => {
                                soundService.playUISelect();
                                setFeedFilter('pdf');
                              }}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-95"
                            >
                              VER PDF
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Dot Indicators */}
                    {activeCarouselSlides.length > 1 && (
                      <div className="flex justify-center gap-2 pt-3 border-t border-slate-800/50 select-none">
                        {activeCarouselSlides.map((slide, idx) => (
                          <button
                            key={slide.id}
                            onClick={() => {
                              soundService.playTick();
                              setCarouselIndex(idx);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${carouselIndex === idx ? 'w-5 bg-emerald-400' : 'w-1.5 bg-slate-700'}`}
                            title={`Slide ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. FACEBOOK STYLE POST CREATOR CARD */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                  {/* Selector de tipo de publicação */}
                  <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/50 shrink-0">
                    <button
                      onClick={() => { soundService.playUISelect(); setCreatorTab('social'); }}
                      className={`flex-1 py-1.5 rounded-md text-center font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${creatorTab === 'social' ? 'bg-white text-[#1877f2] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Post Social
                    </button>
                    <button
                      onClick={() => { soundService.playUISelect(); setCreatorTab('p2p'); }}
                      className={`flex-1 py-1.5 rounded-md text-center font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${creatorTab === 'p2p' ? 'bg-white text-[#049444] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      Criar P2P
                    </button>
                    <button
                      onClick={() => { soundService.playUISelect(); setCreatorTab('pdf'); }}
                      className={`flex-1 py-1.5 rounded-md text-center font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${creatorTab === 'pdf' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Vender PDF
                    </button>
                  </div>

                  {/* TAB 1: SOCIAL POST */}
                  {creatorTab === 'social' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                          {currentUserName.charAt(0)}
                        </div>
                        <form onSubmit={handlePublishPost} className="flex-1">
                          <input
                            type="text"
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value.slice(0, 500))}
                            placeholder={`O que estás a pensar, ${currentUserName}? Partilha os teus ganhos...`}
                            className="w-full bg-slate-100 hover:bg-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-800 placeholder-slate-500 focus:outline-none transition-all border border-slate-200"
                          />
                        </form>
                      </div>

                      {/* Toggle Trade Sharing Option */}
                      {shareTrade && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs"
                        >
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                            <span className="font-black text-[#1877f2] uppercase tracking-wider text-[10px]">Partilhar Estatística de Operação</span>
                            <button onClick={() => setShareTrade(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Ativo</label>
                              <select
                                value={tradeAsset}
                                onChange={(e) => setTradeAsset(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                              >
                                <option value="BTC/USDT">BTC/USDT</option>
                                <option value="ETH/USDT">ETH/USDT</option>
                                <option value="SOL/USDT">SOL/USDT</option>
                                <option value="EUR/USD">EUR/USD</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Lucro (USDT)</label>
                              <input
                                type="number"
                                value={tradeProfit}
                                onChange={(e) => setTradeProfit(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Resultado</label>
                              <select
                                value={tradeResult}
                                onChange={(e) => setTradeResult(e.target.value as any)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                              >
                                <option value="win">Vencer ✅</option>
                                <option value="loss">Perder ❌</option>
                              </select>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Image upload preview */}
                      {postImage && (
                        <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1 flex justify-center max-h-56">
                          <img src={postImage} alt="Preview" className="object-contain max-h-52 rounded-lg" />
                          <button
                            type="button"
                            onClick={() => {
                              setPostImage(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white cursor-pointer transition-all border border-white/20"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            soundService.playUISelect();
                            fileInputRef.current?.click();
                          }}
                          className="flex-1 py-1.5 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-slate-800 font-bold cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 text-[#45bd62]" />
                          <span className="hidden xs:inline">Fazer Upload de Fotos</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundService.playUISelect();
                            setShareTrade(!shareTrade);
                          }}
                          className={`flex-1 py-1.5 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${shareTrade ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                          <TrendingUp className="w-4 h-4 text-[#1877f2]" />
                          <span className="hidden xs:inline">{shareTrade ? 'Ocultar Operação' : 'Partilhar Operação'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: P2P SALE FORM */}
                  {creatorTab === 'p2p' && (
                    <div className="space-y-3 text-xs bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                      <span className="font-black text-[#049444] uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1.5">Registar Nova Oferta P2P</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Criptomoeda</label>
                          <select
                            value={p2pCoin}
                            onChange={(e) => setP2pCoin(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#049444]"
                          >
                            <option value="USDT">USDT (Tether)</option>
                            <option value="BTC">BTC (Bitcoin)</option>
                            <option value="ETH">ETH (Ethereum)</option>
                            <option value="SOL">SOL (Solana)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                          <input
                            type="number"
                            value={p2pAmount}
                            onChange={(e) => setP2pAmount(e.target.value)}
                            placeholder="Ex: 50"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#049444]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Preço Total Desejado (USDT)</label>
                          <input
                            type="number"
                            value={p2pPrice}
                            onChange={(e) => setP2pPrice(e.target.value)}
                            placeholder="Ex: 45000"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold text-emerald-600 focus:outline-none focus:border-[#049444]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">IBAN / Transferência Bancária Local (Angola / EU)</label>
                          <input
                            type="text"
                            value={p2pIban}
                            onChange={(e) => setP2pIban(e.target.value)}
                            placeholder="Ex: AO06.0040... Banco BAI"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#049444]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[9px] font-bold text-emerald-600 uppercase mb-1">🇧🇷 Chave PIX (Brasil)</label>
                            <input
                              type="text"
                              value={p2pPix}
                              onChange={(e) => setP2pPix(e.target.value)}
                              placeholder="CPF, E-mail, Celular ou Chave PIX"
                              className="w-full bg-white border border-emerald-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#049444]"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-purple-600 uppercase mb-1">🌍 Pagamento Internacional</label>
                            <input
                              type="text"
                              value={p2pInternational}
                              onChange={(e) => setP2pInternational(e.target.value)}
                              placeholder="Wise, Revolut, PayPal, Binance Pay ID"
                              className="w-full bg-white border border-purple-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#049444]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PDF BOOK SALE FORM */}
                  {creatorTab === 'pdf' && (
                    <div className="space-y-4 text-xs bg-slate-50 p-4 border border-slate-200 rounded-xl">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="font-black text-amber-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-600" />
                          Registar Novo Produto Digital de Trading
                        </span>
                        <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black uppercase">AVANÇADO</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Título do Produto / Livro</label>
                          <input
                            type="text"
                            value={pdfTitle}
                            onChange={(e) => setPdfTitle(e.target.value)}
                            placeholder="Ex: O Segredo do Price Action"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Autor / Criador</label>
                          <input
                            type="text"
                            value={pdfAuthor}
                            onChange={(e) => setPdfAuthor(e.target.value)}
                            placeholder="Ex: Cristiano Trader"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-700"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Categoria do Produto</label>
                          <select
                            value={pdfCategory}
                            onChange={(e) => setPdfCategory(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-700"
                          >
                            <option value="E-Book">E-Book (Guia em PDF)</option>
                            <option value="Curso Completo">Curso Completo (Vídeo + PDF)</option>
                            <option value="Indicador Técnico">Indicador Técnico (MT4/MT5)</option>
                            <option value="Robô de Trading">Robô de Trading (EA MT4)</option>
                            <option value="Sinais VIP">Canal de Sinais VIP</option>
                            <option value="Mentoria">Mentoria Individual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Nível do Conteúdo</label>
                          <select
                            value={pdfLevel}
                            onChange={(e) => setPdfLevel(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-700"
                          >
                            <option value="Iniciante">Iniciante (Do Zero)</option>
                            <option value="Intermediário">Intermediário</option>
                            <option value="Avançado">Avançado (Profissional)</option>
                            <option value="Todos os Níveis">Todos os Níveis</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Páginas, Aulas ou Versão</label>
                          <input
                            type="text"
                            value={pdfPagesCount}
                            onChange={(e) => setPdfPagesCount(e.target.value)}
                            placeholder="Ex: 45 páginas / 12 aulas / v1.2"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Preço de Venda (USDT)</label>
                          <input
                            type="number"
                            value={pdfPrice}
                            onChange={(e) => setPdfPrice(e.target.value)}
                            placeholder="Ex: 2500"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 font-black text-amber-700 focus:outline-none focus:border-amber-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Breve Descrição Comercial do Produto</label>
                        <input
                          type="text"
                          value={pdfDescription}
                          onChange={(e) => setPdfDescription(e.target.value)}
                          placeholder="Ex: Descubra a metodologia exata utilizada por traders para faturar no mercado angolano..."
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Amostra de Pré-visualização (Pitch de Vendas)</label>
                        <textarea
                          value={pdfPreviewSnippet}
                          onChange={(e) => setPdfPreviewSnippet(e.target.value)}
                          rows={2}
                          placeholder="Ex: Introdução - O mercado de derivativos é o maior do mundo. Aqui, você aprenderá as falhas institucionais e como se posicionar..."
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Benefícios e Itens Incluídos (separados por vírgula)</label>
                        <input
                          type="text"
                          value={pdfIncludes}
                          onChange={(e) => setPdfIncludes(e.target.value)}
                          placeholder="Ex: Suporte WhatsApp, Acesso Vitalício, Grupo VIP de Alunos, Atualizações Grátis"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-700"
                        />
                        <span className="text-[8px] text-slate-400 block mt-0.5 font-medium">Os itens inseridos serão exibidos como tags de bónus profissionais no feed.</span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <div>
                            <span className="block text-[9px] font-bold text-slate-700 uppercase">Selo de Garantia Pro</span>
                            <span className="block text-[8px] text-slate-500">Ativa o selo oficial de devolução/garantia no feed</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={pdfHasGuarantee}
                          onChange={(e) => setPdfHasGuarantee(e.target.checked)}
                          className="w-4 h-4 text-amber-700 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tema da Capa Exclusivo</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { color: 'from-blue-600 to-indigo-900', label: 'Azul Cósmico' },
                            { color: 'from-amber-600 to-amber-950', label: 'Dourado' },
                            { color: 'from-rose-600 to-rose-950', label: 'Fogo Escuro' },
                            { color: 'from-emerald-600 to-teal-950', label: 'Esmeralda' },
                          ].map((theme) => (
                            <button
                              key={theme.color}
                              type="button"
                              onClick={() => { soundService.playUISelect(); setPdfCoverColor(theme.color); }}
                              className={`py-1 rounded text-[8px] font-black uppercase text-white bg-gradient-to-tr ${theme.color} border transition-all cursor-pointer ${pdfCoverColor === theme.color ? 'border-yellow-400 scale-105 shadow-sm' : 'border-slate-300/20'}`}
                            >
                              {theme.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Imagem de Capa ou Ilustração do Produto */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Capa Personalizada do Livro ou Imagem de Ilustração</label>

                        {pdfImage ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-1 flex justify-center max-h-56">
                            <img src={pdfImage} alt="Capa do E-Book" className="object-contain max-h-52 rounded-lg" />
                            <button
                              type="button"
                              onClick={() => {
                                soundService.playUISelect();
                                setPdfImage(null);
                                if (pdfImageInputRef.current) pdfImageInputRef.current.value = '';
                              }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white cursor-pointer transition-all border border-white/20"
                              title="Remover Imagem"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  showAlert('Por favor, selecione uma imagem com menos de 5MB.', 'error');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setPdfImage(event.target.result as string);
                                    soundService.playUISelect();
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            onClick={() => {
                              soundService.playUISelect();
                              pdfImageInputRef.current?.click();
                            }}
                            className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 bg-white cursor-pointer transition-all hover:bg-slate-100 group"
                          >
                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-amber-600 group-hover:scale-110 transition-all" />
                            <div className="text-center">
                              <span className="block text-[10px] font-black text-slate-700 uppercase">Fazer Upload da Capa</span>
                              <span className="block text-[8px] text-slate-400 font-medium">Arraste e solte uma imagem ou clique para procurar</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ficheiro PDF Real do Produto */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Ficheiro PDF do Produto (Máximo 50 MB)</label>

                        {pdfFile ? (
                          <div className="flex items-center justify-between p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-700 shrink-0">
                                <FileText className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <span className="block text-[10px] font-black text-slate-700 truncate">{pdfFile.name}</span>
                                <span className="block text-[8px] text-slate-400 font-bold">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                soundService.playUISelect();
                                setPdfFile(null);
                                setPdfFileName('');
                                if (pdfInputRef.current) pdfInputRef.current.value = '';
                              }}
                              className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-rose-600 cursor-pointer transition-all shrink-0 border border-slate-200"
                              title="Remover PDF"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                if (file.size > 50 * 1024 * 1024) {
                                  showAlert('Por favor, selecione um ficheiro PDF com menos de 50MB.', 'error');
                                  return;
                                }
                                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                if (!isPdf) {
                                  showAlert('Por favor, selecione um ficheiro com formato PDF válido.', 'error');
                                  return;
                                }
                                setPdfFile(file);
                                setPdfFileName(file.name);
                                soundService.playUISelect();
                              }
                            }}
                            onClick={() => {
                              soundService.playUISelect();
                              pdfInputRef.current?.click();
                            }}
                            className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 bg-white cursor-pointer transition-all hover:bg-slate-100 group"
                          >
                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-amber-600 group-hover:scale-110 transition-all" />
                            <div className="text-center">
                              <span className="block text-[10px] font-black text-slate-700 uppercase">Fazer Upload do Ficheiro PDF</span>
                              <span className="block text-[8px] text-slate-400 font-medium">Arraste e solte o ficheiro .pdf (Máx. 50 MB) ou clique para procurar</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    ref={pdfInputRef}
                    onChange={handlePdfFileUpload}
                    accept="application/pdf"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={pdfImageInputRef}
                    onChange={handlePdfImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Submit Button */}
                  <button
                    onClick={handlePublishPost}
                    disabled={isPosting}
                    className="w-full py-2.5 bg-[#1877f2] hover:bg-[#166fe5] text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPosting ? (
                      'A publicar...'
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        {creatorTab === 'social' && 'Publicar no Crypton Social'}
                        {creatorTab === 'p2p' && 'Anunciar Venda Cripto P2P'}
                        {creatorTab === 'pdf' && 'Anunciar Livro PDF no Feed'}
                      </>
                    )}
                  </button>
                </div>

                {/* 3. CATEGORY / TAB FEED FILTER BAR */}
                <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar shrink-0 select-none">
                  {[
                    { id: 'all', label: 'Tudo', icon: <Globe className="w-3.5 h-3.5" />, color: 'hover:bg-slate-100 hover:text-slate-800' },
                    { id: 'social', label: 'Feed Social', icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'hover:bg-blue-50 hover:text-blue-600' },
                    { id: 'p2p', label: 'Mercado P2P', icon: <ArrowUpDown className="w-3.5 h-3.5" />, color: 'hover:bg-emerald-50 hover:text-emerald-600' },
                    { id: 'pdf', label: 'Livros PDF', icon: <BookOpen className="w-3.5 h-3.5" />, color: 'hover:bg-amber-50 hover:text-amber-700' },
                  ].map((filterTab) => {
                    const count = filterTab.id === 'all'
                      ? posts.filter(p => !reportedPostIds.includes(p.id)).length
                      : posts.filter(p => !reportedPostIds.includes(p.id) && (filterTab.id === 'social' ? (!p.postType || p.postType === 'social') : p.postType === filterTab.id)).length;

                    const isActive = feedFilter === filterTab.id;

                    return (
                      <button
                        key={filterTab.id}
                        onClick={() => {
                          soundService.playUISelect();
                          setFeedFilter(filterTab.id as any);
                        }}
                        className={`flex-1 min-w-[85px] py-2 px-3 rounded-lg text-center font-black text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm'
                            : `text-slate-500 ${filterTab.color}`
                        }`}
                      >
                        {filterTab.icon}
                        <span>{filterTab.label}</span>
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 4. LIST OF POSTS */}
                <div className="space-y-4">
                  {posts.filter(p => !reportedPostIds.includes(p.id) && (feedFilter === 'all' ? true : (feedFilter === 'social' ? (!p.postType || p.postType === 'social') : p.postType === feedFilter))).length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-xl border border-slate-200">
                      <Globe className="w-10 h-10 text-slate-400 mx-auto mb-2 animate-pulse" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Feed social vazio.</span>
                      <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Sê o primeiro a incentivar os outros traders de Angola!</p>
                    </div>
                  ) : (
                    posts
                      .filter(p => !reportedPostIds.includes(p.id) && (feedFilter === 'all' ? true : (feedFilter === 'social' ? (!p.postType || p.postType === 'social') : p.postType === feedFilter)))
                      .sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                        return dateB - dateA;
                      })
                      .map((post, postIdx) => {
                        const isLikedByMe = post.likes.includes(currentUserId);
                        const isMyPost = post.userId === currentUserId;
                        const dateDisplay = post.createdAt instanceof Date
                          ? post.createdAt.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
                          : new Date(post.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

                        return (
                          <React.Fragment key={post.id}>
                            <motion.div
                              id={`post-card-${post.id}`}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`bg-white rounded-xl border shadow-sm p-4 sm:p-5 space-y-3.5 hover:shadow-md transition-all text-slate-800 relative ${
                                post.isPinned
                                  ? 'border-amber-300 bg-amber-50/20 border-l-4 border-l-amber-500'
                                  : post.tradeResult === 'win'
                                    ? 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/30 via-white to-white border-l-4 border-l-emerald-500'
                                    : post.postType === 'p2p'
                                      ? 'border-purple-200/80 bg-gradient-to-r from-purple-50/30 via-white to-white border-l-4 border-l-purple-500'
                                      : post.postType === 'pdf'
                                        ? 'border-rose-200/80 bg-gradient-to-r from-rose-50/30 via-white to-white border-l-4 border-l-rose-500'
                                        : 'border-slate-200 border-l-4 border-l-[#1877f2]'
                              }`}
                            >
                            {/* Pinned Post Header Ribbon */}
                            {post.isPinned && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md w-fit absolute -top-3 left-4 shadow-sm z-10">
                                <Pin className="w-3 h-3 fill-amber-500 text-amber-500 rotate-45" />
                                <span>Publicação Fixada</span>
                              </div>
                            )}

                            {/* Post Header */}
                            <div className="flex justify-between items-start pt-1">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[#1877f2] font-extrabold text-sm shadow-sm relative shrink-0">
                                  {post.userName.charAt(0)}
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                </div>
                                <div>
                                  <span className="text-xs font-black text-slate-900 hover:text-[#1877f2] transition-all block cursor-pointer flex items-center gap-1">
                                    {post.userName}
                                    {(post.userName.includes('Trader') || post.userName.includes('USDT')) && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1877f2] fill-[#1877f2] text-white shrink-0" />
                                    )}
                                    {post.userId !== currentUserId && (
                                      memberships[post.userId] ? (
                                        <span className="ml-1.5 bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 shrink-0 border border-emerald-200 animate-pulse" title="És Membro VIP deste criador">
                                          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                          <span>Clube</span>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => joinMembership(post.userId, post.userName)}
                                          className="ml-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 shrink-0 transition-all active:scale-95 shadow-xs cursor-pointer hover:shadow"
                                          title="Aderir ao Clube de Membros por 4.90 USDT"
                                        >
                                          <span>Aderir</span>
                                        </button>
                                      )
                                    )}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-black tracking-wider uppercase flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {dateDisplay}
                                    <span>•</span>
                                    <Globe className="w-3 h-3 text-slate-400" aria-label="Público" />
                                  </span>
                                </div>
                              </div>

                              {/* Three Dots / Post Options Context Menu */}
                              <div className="relative">
                                <button
                                  onClick={() => {
                                    soundService.playUISelect();
                                    setActivePostMenuId(activePostMenuId === post.id ? null : post.id);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-all cursor-pointer shrink-0"
                                  title="Opções da Publicação"
                                >
                                  <MoreHorizontal className="w-5 h-5" />
                                </button>

                                {activePostMenuId === post.id && (
                                  <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-30 text-xs animate-in fade-in slide-in-from-top-1">
                                    {/* Pin / Unpin */}
                                    <button
                                      onClick={() => handleTogglePinPost(post)}
                                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 transition-all text-slate-700 flex items-center gap-2.5 cursor-pointer font-bold"
                                    >
                                      <Pin className="w-4 h-4 text-amber-500 shrink-0" />
                                      <span>{post.isPinned ? 'Desafixar do Topo' : 'Fixar no Topo'}</span>
                                    </button>

                                    {/* Edit Post */}
                                    {isMyPost && (
                                      <button
                                        onClick={() => {
                                          soundService.playUISelect();
                                          setEditingPostId(post.id);
                                          setEditingPostContent(post.content || '');
                                          setActivePostMenuId(null);
                                        }}
                                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 transition-all text-slate-700 flex items-center gap-2.5 cursor-pointer font-bold"
                                      >
                                        <Edit3 className="w-4 h-4 text-[#1877f2] shrink-0" />
                                        <span>Editar Publicação</span>
                                      </button>
                                    )}

                                    {/* Copy Link */}
                                    <button
                                      onClick={() => {
                                        soundService.playUISelect();
                                        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                                        showAlert('Link da publicação copiado!');
                                        setActivePostMenuId(null);
                                      }}
                                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 transition-all text-slate-700 flex items-center gap-2.5 cursor-pointer font-bold"
                                    >
                                      <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                                      <span>Copiar Link</span>
                                    </button>

                                    {/* Report Post */}
                                    <button
                                      onClick={() => handleReportPost(post.id)}
                                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 transition-all text-red-600 flex items-center gap-2.5 cursor-pointer font-bold"
                                    >
                                      <Flag className="w-4 h-4 text-red-500 shrink-0" />
                                      <span>Denunciar Publicação</span>
                                    </button>

                                    {/* Delete option */}
                                    {isMyPost && (
                                      <>
                                        <div className="border-t border-slate-100 my-1"></div>
                                        <button
                                          onClick={() => {
                                            handleDeletePost(post.id);
                                            setActivePostMenuId(null);
                                          }}
                                          className="w-full px-3.5 py-2 text-left hover:bg-red-50 transition-all text-red-600 flex items-center gap-2.5 cursor-pointer font-bold"
                                        >
                                          <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                                          <span>Eliminar do Mural</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Post Message Content or Inline Editing View */}
                            {editingPostId === post.id ? (
                              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
                                <textarea
                                  value={editingPostContent}
                                  onChange={(e) => setEditingPostContent(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#1877f2] font-semibold"
                                  rows={3}
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditingPostId(null)}
                                    className="px-3 py-1.5 hover:bg-slate-200 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600 transition-all cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleEditPostSubmit(post.id)}
                                    className="px-3 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {post.content && (
                                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                                    <p className={`text-xs text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap break-words word-break-all overflow-hidden ${!expandedPostIds.includes(post.id) && post.content.length > 280 ? 'line-clamp-4' : ''}`}>
                                      {post.content}
                                    </p>
                                    {post.content.length > 280 && (
                                      <button
                                        onClick={() => toggleExpandPost(post.id)}
                                        className="mt-2 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                      >
                                        {expandedPostIds.includes(post.id) ? '▲ Ver menos' : '▼ Ver texto completo'}
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Custom P2P Trade Listing Render */}
                                {post.postType === 'p2p' && (
                                  <div className="border border-emerald-100 bg-emerald-50/20 rounded-xl p-4 space-y-3.5 shadow-sm mt-2">
                                    <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm font-black text-sm">
                                          🪙
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider block leading-none">Venda P2P Ativa</span>
                                          <span className="text-xs font-black text-slate-800 uppercase">{post.p2pCoin} via Transferência</span>
                                        </div>
                                      </div>
                                      <div>
                                        {post.p2pStatus === 'sold' ? (
                                          <span className="text-[9px] bg-red-100 text-red-800 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs border border-red-200">
                                            Vendido 🔴
                                          </span>
                                        ) : (
                                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs border border-emerald-200 animate-pulse">
                                            Disponível 🟢
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                      <div>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase block">Quantidade</span>
                                        <span className="text-base font-black text-slate-900 font-mono">{post.p2pAmount} {post.p2pCoin}</span>
                                      </div>
                                      <div>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase block">Preço (USDT)</span>
                                        <span className="text-base font-black text-emerald-600 font-mono">{(post.p2pPrice || 0).toFixed(2)} USDT</span>
                                      </div>
                                    </div>

                                    <div className="bg-white/80 p-2.5 rounded-lg border border-slate-100 text-[10px] space-y-2">
                                      {post.p2pIban && (
                                        <div>
                                          <span className="font-bold text-slate-500 uppercase block text-[8px] mb-0.5">IBAN / Conta Local</span>
                                          <span className="font-mono text-slate-800 select-all font-semibold break-all">{post.p2pIban}</span>
                                        </div>
                                      )}
                                      {post.p2pPix && (
                                        <div>
                                          <span className="font-bold text-emerald-600 uppercase block text-[8px] mb-0.5">🇧🇷 Chave PIX (Brasil)</span>
                                          <span className="font-mono text-slate-800 select-all font-semibold break-all">{post.p2pPix}</span>
                                        </div>
                                      )}
                                      {post.p2pInternational && (
                                        <div>
                                          <span className="font-bold text-purple-600 uppercase block text-[8px] mb-0.5">🌍 Pagamento Internacional</span>
                                          <span className="font-mono text-slate-800 select-all font-semibold break-all">{post.p2pInternational}</span>
                                        </div>
                                      )}
                                    </div>

                                    {post.p2pStatus === 'sold' ? (
                                      <div className="bg-red-50 text-red-800 p-2.5 rounded-lg border border-red-100 text-[10px] text-center font-bold">
                                        Comprado por: @{post.p2pBuyerName || 'Trader'}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleBuyP2pPost(post)}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                      >
                                        <ArrowUpDown className="w-4 h-4" />
                                        Comprar Cripto Instantaneamente
                                      </button>
                                    )}

                                    {/* Product Card Actions: Edit & Promote */}
                                    {isMyPost && (
                                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100/60">
                                        <button
                                          onClick={() => handleOpenEditProduct(post)}
                                          className="py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                                          title="Editar Anúncio P2P"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                          <span>Editar Produto</span>
                                        </button>

                                        <button
                                          onClick={() => handlePromotePost(post)}
                                          className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-300/60"
                                          title="Promover Produto no Feed Patrocinado"
                                        >
                                          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Promover Produto</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Custom PDF E-Book Render */}
                                {post.postType === 'pdf' && (
                                  <div className="border border-amber-200 bg-gradient-to-br from-amber-50/20 via-amber-50/10 to-slate-50 rounded-xl p-4.5 space-y-4 shadow-sm mt-2 relative overflow-hidden">
                                    {/* Guarantee Ribbon background overlay */}
                                    {post.pdfHasGuarantee && (
                                      <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
                                        <div className="bg-emerald-600 text-[6px] font-black text-white text-center uppercase tracking-widest py-1.5 rotate-45 translate-x-7 translate-y-3 shadow-md w-36">
                                          Garantido
                                        </div>
                                      </div>
                                    )}

                                    {/* Product Top Header */}
                                    <div className="flex justify-between items-start border-b border-amber-100 pb-2.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-white shrink-0 shadow-md font-black text-sm">
                                          🏆
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider bg-amber-100 px-2 py-0.5 rounded leading-none">
                                              {post.pdfCategory || 'E-Book'}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">
                                              Nível: {post.pdfLevel || 'Todos'}
                                            </span>
                                          </div>
                                          <span className="text-xs font-black text-slate-800 uppercase block mt-1">Conhecimento Profissional</span>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end pr-8">
                                        <div className="flex items-center gap-0.5 text-[9px] font-black text-yellow-600">
                                          <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                                          <span className="ml-1 text-slate-700">4.9/5</span>
                                        </div>
                                        <span className="text-[7px] text-emerald-600 font-extrabold uppercase mt-0.5 tracking-wider">Verificado pela Comunidade</span>
                                      </div>
                                    </div>

                                    {/* Cover and details */}
                                    <div className="flex flex-col sm:flex-row gap-4">
                                      {/* 3D Elegant Book/Product Cover Representation */}
                                      <div className={`w-24 h-32 shrink-0 bg-gradient-to-tr ${post.pdfCoverColor || 'from-amber-600 to-amber-900'} rounded-lg shadow-xl border-t border-l border-white/30 p-3 flex flex-col justify-between text-white relative overflow-hidden select-none transform hover:scale-102 transition-all`}>
                                        {post.imageUrl && (
                                          <img
                                            src={post.imageUrl}
                                            alt={post.pdfTitle}
                                            className="absolute inset-0 w-full h-full object-cover z-0"
                                            referrerPolicy="no-referrer"
                                          />
                                        )}
                                        {/* Golden Book Spine effect */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-black/30 via-white/20 to-transparent border-r border-black/15 z-10" />

                                        {/* Dark overlay to make text highly legible */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50 z-[1] pointer-events-none" />

                                        <div className="space-y-1 pl-1 relative z-10">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[5px] uppercase tracking-widest font-black text-amber-300">PREMIUM</span>
                                            <span className="text-[5px] font-bold opacity-75">{post.pdfPagesCount || '45'} PG</span>
                                          </div>
                                          <p className="text-[9px] font-black leading-tight tracking-tight line-clamp-3 uppercase drop-shadow-sm mt-1">{post.pdfTitle}</p>
                                        </div>

                                        <div className="pl-1 relative z-10">
                                          <span className="text-[6px] font-black block truncate text-yellow-300 drop-shadow">@{post.pdfAuthor}</span>
                                          <div className="flex items-center justify-between mt-1 text-[4px] font-black tracking-widest text-slate-300">
                                            <span>MERCADO</span>
                                            <span>CRYPTON</span>
                                          </div>
                                        </div>
                                        <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-white/10 rounded-full blur-sm z-0" />
                                      </div>

                                      {/* Commercial details */}
                                      <div className="flex-1 flex flex-col justify-between py-0.5 space-y-3">
                                        <div>
                                          <h4 className="text-sm font-black text-slate-800 leading-snug line-clamp-2">{post.pdfTitle}</h4>
                                          <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-[9px] text-slate-500 font-bold">Criado por: <span className="text-amber-800 font-black">@{post.pdfAuthor}</span></span>
                                            <span className="text-slate-300 text-[10px]">•</span>
                                            <span className="text-[9px] text-slate-500 font-bold font-mono">ID: {post.id.slice(0, 8)}</span>
                                          </div>
                                          <p className="text-[11px] text-slate-600 leading-relaxed mt-2 font-medium">
                                            {post.pdfDescription || 'Descubra a metodologia definitiva para consistência nas suas operações de trading com este material exclusivo.'}
                                          </p>
                                        </div>

                                        {/* Display Benefits / Includes list */}
                                        {post.pdfIncludes && post.pdfIncludes.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {post.pdfIncludes.map((inc, idx) => (
                                              <span key={idx} className="text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/50 flex items-center gap-1">
                                                <span className="text-amber-500 text-[10px]">✓</span> {inc}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        {/* Sales Stats & Guarantee Banner */}
                                        <div className="grid grid-cols-2 gap-3 bg-slate-100/60 p-2.5 rounded-lg border border-slate-200/30 text-[10px]">
                                          <div>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase block">Total de Downloads</span>
                                            <span className="text-xs font-black text-slate-800 font-mono flex items-center gap-1 mt-0.5">
                                              📥 {post.pdfDownloads || 0} acessos adquiridos
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                            {post.pdfHasGuarantee ? (
                                              <>
                                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                <div>
                                                  <span className="block text-[8px] font-black text-emerald-700 uppercase">Garantia Ativa</span>
                                                  <span className="block text-[7px] text-slate-500 font-bold leading-none">Reembolso 7 dias</span>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <Info className="w-5 h-5 text-slate-500" />
                                                <div>
                                                  <span className="block text-[8px] font-black text-slate-700 uppercase">Licença Única</span>
                                                  <span className="block text-[7px] text-slate-500 font-bold leading-none">Download imediato</span>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Toggleable Sample Preview (Rich capability etc.) */}
                                    {post.pdfPreviewSnippet && (
                                      <div className="bg-white rounded-lg border border-slate-200/70 overflow-hidden shadow-xs mt-1">
                                        <button
                                          onClick={() => {
                                            soundService.playUISelect();
                                            setOpenPreviewPostId(openPreviewPostId === post.id ? null : post.id);
                                          }}
                                          className="w-full flex justify-between items-center p-2.5 hover:bg-slate-50/50 text-slate-700 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                          <span className="flex items-center gap-1.5 text-amber-800">
                                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                            {openPreviewPostId === post.id ? 'Ocultar Amostra de Conteúdo' : 'Ver Amostra de Pré-visualização'}
                                          </span>
                                          <span className="font-mono text-slate-400">{openPreviewPostId === post.id ? '▲' : '▼'}</span>
                                        </button>
                                        {openPreviewPostId === post.id && (
                                          <div className="p-3 border-t border-slate-200/50 text-[10px] text-slate-600 bg-amber-50/10 leading-relaxed font-mono whitespace-pre-line border-l-2 border-amber-500 italic relative">
                                            <div className="absolute top-1 right-2 text-[20px] text-amber-200 opacity-20 font-serif leading-none">“</div>
                                            {post.pdfPreviewSnippet}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Bottom action button (Buy or Download) */}
                                    {purchasedBookIds.includes(post.id) ? (
                                      <div className="space-y-2 pt-1 border-t border-slate-200/50">
                                        <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-150 text-[9px] text-center font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-xs">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                          Este Produto Digital Já é Teu!
                                        </div>

                                        {downloadingBookId === post.id ? (
                                          <div className="space-y-1 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-xs">
                                            <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                              <span className="flex items-center gap-1"><span className="animate-pulse">●</span> A descarregar ficheiro seguro...</span>
                                              <span>{downloadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                              <div className="bg-emerald-500 h-full transition-all duration-200" style={{ width: `${downloadProgress}%` }} />
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => handleDownloadPdfBook(post)}
                                            className="w-full py-2.5 bg-gradient-to-tr from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 transform hover:-translate-y-0.5"
                                          >
                                            <BookOpen className="w-4 h-4 text-white" />
                                            Descarregar Produto Digital ({post.pdfPagesCount || '45'} PG)
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleBuyPdfPost(post)}
                                        className="w-full py-2.5 bg-gradient-to-tr from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                                      >
                                        <BookOpen className="w-4 h-4 text-white" />
                                        Adquirir Produto por {(post.pdfPrice || 0).toFixed(2)} USDT
                                      </button>
                                    )}

                                    {/* Product Card Actions for PDF: Edit & Promote */}
                                    {isMyPost && (
                                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60">
                                        <button
                                          onClick={() => handleOpenEditProduct(post)}
                                          className="py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200"
                                          title="Editar Detalhes do Produto Digital"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                          <span>Editar Produto</span>
                                        </button>

                                        <button
                                          onClick={() => handlePromotePost(post)}
                                          className="py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-300/60"
                                          title="Promover Produto no Feed Patrocinado"
                                        >
                                          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Promover Produto</span>
                                        </button>
                                      </div>
                                    )}

                                    {/* Collapsible Reviews List for Feed Card */}
                                    <div className="bg-slate-50/50 rounded-lg border border-slate-200/60 p-3 mt-3 space-y-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                                          Avaliações de Compradores ({(pdfReviews[post.id] || []).length})
                                        </span>
                                        {/* Show average */}
                                        {(() => {
                                          const { average, count } = getBookAverageRating(post.id);
                                          if (count > 0) {
                                            return (
                                              <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                                                ⭐ {average} / 5
                                              </span>
                                            );
                                          }
                                          return <span className="text-[8px] font-bold text-slate-400 uppercase">Sem reviews</span>;
                                        })()}
                                      </div>

                                      {/* Review list */}
                                      {(() => {
                                        const reviews = pdfReviews[post.id] || [];
                                        if (reviews.length === 0) {
                                          return (
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide italic">
                                              Nenhuma avaliação publicada para este E-Book. Sê o primeiro a avaliar após comprar!
                                            </p>
                                          );
                                        }
                                        return (
                                          <div className="space-y-2 max-h-36 overflow-y-auto no-scrollbar divide-y divide-slate-100">
                                            {reviews.map((rev, rIdx) => (
                                              <div key={rIdx} className="pt-2 first:pt-0 space-y-1">
                                                <div className="flex justify-between items-center text-[8px] font-black">
                                                  <span className="text-slate-700">@{rev.userName}</span>
                                                  <div className="flex text-amber-500">
                                                    {Array.from({ length: 5 }).map((_, sI) => (
                                                      <span key={sI} className="text-amber-500">{sI < rev.rating ? '★' : '☆'}</span>
                                                    ))}
                                                  </div>
                                                </div>
                                                <p className="text-[10px] text-slate-600 font-medium leading-normal italic">
                                                  "{rev.comment}"
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}

                                      {/* Write review button on E-Book post card */}
                                      <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between">
                                        {purchasedBookIds.includes(post.id) ? (
                                          <button
                                            onClick={() => {
                                              soundService.playTick();
                                              setShowPdfCart(true);
                                              setRatingBookId(post.id);
                                              const myRev = pdfReviews[post.id]?.find(r => r.userId === currentUserId);
                                              if (myRev) {
                                                setNewRating(myRev.rating);
                                                setNewComment(myRev.comment);
                                              } else {
                                                setNewRating(5);
                                                setNewComment('');
                                              }
                                            }}
                                            className="text-[9px] font-black uppercase text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 shadow-xs transition-colors"
                                          >
                                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                            Avaliar E-Book
                                          </button>
                                        ) : (
                                          <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                            <Lock className="w-3 h-3 text-slate-400" />
                                            Avaliação exclusiva para compradores
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Image Attachment inside post */}
                            {post.imageUrl && post.postType !== 'pdf' && (
                              <div
                                onClick={() => setFullscreenImage({ src: post.imageUrl!, caption: post.content?.slice(0, 100) || 'Imagem da publicação' })}
                                className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 max-h-96 flex justify-center bg-black/5 relative group cursor-pointer"
                              >
                                <img
                                  src={post.imageUrl}
                                  alt="Imagem anexada"
                                  className="object-cover max-h-96 w-full group-hover:scale-102 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="bg-black/80 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1 border border-white/20">
                                    🔍 Ampliar Imagem
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Nested Shared Post Block (Facebook Style) */}
                            {post.sharedFromPostId && (
                              <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-4 space-y-3 shadow-xs mt-2 text-xs">
                                <div className="flex items-center gap-2.5 border-b border-slate-200/60 pb-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center font-black text-white text-xs shrink-0 shadow-sm">
                                    {post.sharedFromUserName?.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-slate-800 block text-[11px]">{post.sharedFromUserName}</span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                      {post.sharedFromPostType === 'pdf' ? 'E-Book / Produto Digital' : post.sharedFromPostType === 'p2p' ? 'Venda P2P' : 'Publicação Original'}
                                    </span>
                                  </div>
                                </div>

                                {/* Original post text or product description */}
                                {(post.sharedFromContent || post.sharedFromPdfDescription) && (
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                                    <p className="text-slate-700 leading-relaxed font-semibold text-[11px] whitespace-pre-wrap break-words word-break-all">
                                      {post.sharedFromContent || post.sharedFromPdfDescription}
                                    </p>
                                  </div>
                                )}

                                {post.sharedFromImageUrl && (
                                  <div
                                    onClick={() => setFullscreenImage({ src: post.sharedFromImageUrl!, caption: post.sharedFromContent?.slice(0, 100) || 'Imagem partilhada' })}
                                    className="rounded-xl overflow-hidden border border-slate-200 max-h-72 flex justify-center bg-black/5 mt-1 relative group cursor-pointer"
                                  >
                                    <img
                                      src={post.sharedFromImageUrl}
                                      alt="Imagem partilhada original"
                                      className="object-cover max-h-72 w-full group-hover:scale-102 transition-transform duration-300"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="bg-black/80 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md border border-white/20">
                                        🔍 Ver em Tela Cheia
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* If original post is a PDF product */}
                                {(post.sharedFromPostType === 'pdf' || post.sharedFromPdfTitle) && (
                                  <div className="border border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-amber-100/30 rounded-xl p-3.5 space-y-2.5 shadow-xs mt-1">
                                    <div className="flex gap-3 items-center">
                                      <div className="w-12 h-16 bg-gradient-to-tr from-amber-500 to-amber-700 rounded-lg flex flex-col justify-between p-2 shadow shrink-0 text-white select-none">
                                        <span className="text-[12px] font-black">PDF</span>
                                        <span className="text-[6px] font-extrabold tracking-widest uppercase">E-Book</span>
                                      </div>
                                      <div className="flex-1 space-y-0.5 min-w-0">
                                        <span className="text-[11px] font-black text-amber-950 block truncate">{post.sharedFromPdfTitle}</span>
                                        <span className="text-[9px] font-bold text-slate-500 block">Autor: {post.sharedFromPdfAuthor}</span>
                                        <span className="text-[10px] font-black text-amber-800 font-mono block">Preço: {(post.sharedFromPdfPrice || 0).toFixed(2)} USDT</span>
                                      </div>
                                    </div>

                                    {/* Direct purchase button for shared PDF */}
                                    {post.sharedFromPdfPrice ? (
                                      <button
                                        onClick={() => {
                                          soundService.playUISelect();
                                          const dummyPdfPost: Post = {
                                            id: post.sharedFromPostId || post.id,
                                            userId: post.userId,
                                            userName: post.sharedFromUserName || 'Autor',
                                            content: post.sharedFromPdfDescription || post.sharedFromContent || '',
                                            pdfTitle: post.sharedFromPdfTitle,
                                            pdfAuthor: post.sharedFromPdfAuthor,
                                            pdfPrice: post.sharedFromPdfPrice,
                                            pdfDescription: post.sharedFromPdfDescription,
                                            pdfFileUrl: post.sharedFromPdfFileUrl,
                                            pdfFileName: post.sharedFromPdfFileName,
                                            likes: [],
                                            comments: [],
                                            createdAt: post.createdAt,
                                          };
                                          handleBuyPdfPost(dummyPdfPost);
                                        }}
                                        className="w-full py-2 bg-gradient-to-tr from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                                      >
                                        <BookOpen className="w-3.5 h-3.5 text-white" />
                                        <span>Adquirir E-Book por {(post.sharedFromPdfPrice || 0).toFixed(2)} USDT</span>
                                      </button>
                                    ) : null}
                                  </div>
                                )}

                                {/* If original post is a P2P product */}
                                {(post.sharedFromPostType === 'p2p' || post.sharedFromP2pCoin) && (
                                  <div className="border border-emerald-200/80 bg-emerald-50/30 rounded-xl p-3 flex items-center justify-between shadow-xs mt-1">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-white text-xs shadow shrink-0">
                                        {post.sharedFromP2pCoin || 'CRYPTO'}
                                      </div>
                                      <div>
                                        <span className="text-[11px] font-black text-emerald-950 block">Anúncio de Venda P2P</span>
                                        <span className="text-[10px] font-bold text-slate-600 block">Quantia: {post.sharedFromP2pAmount} {post.sharedFromP2pCoin}</span>
                                      </div>
                                    </div>
                                    <span className="text-xs font-black text-emerald-800 font-mono">{(post.sharedFromP2pPrice || 0).toFixed(2)} USDT</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Interactive Shared Trade preview */}
                            {post.tradeAsset && (
                              <div className="border border-slate-150 bg-slate-50 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                                <div className="space-y-1">
                                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">OPERAÇÃO PARTILHADA</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-slate-900">{post.tradeAsset}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                      post.tradeResult === 'win' ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-red-100 text-red-800 font-extrabold'
                                    }`}>
                                      {post.tradeResult === 'win' ? 'VITÓRIA' : 'DERROTA'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">LUCRO ESTIMADO</span>
                                  <span className={`text-base font-black font-mono ${post.tradeResult === 'win' ? 'text-[#049444]' : 'text-red-500'}`}>
                                    {post.tradeResult === 'win' ? '+' : '-'}{(post.tradeProfit || 0).toFixed(2)} USDT
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Counters bar (Reactions and comments quantity) */}
                            {(() => {
                              const reactionsSummary = getPostReactionsSummary(post);
                              return (
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-1.5 pt-1">
                                  <div className="flex items-center gap-1.5">
                                    {reactionsSummary.totalCount > 0 ? (
                                      <>
                                        <span className="flex -space-x-1.5">
                                          {reactionsSummary.sortedTypes.slice(0, 3).map((type) => (
                                            <span
                                              key={type}
                                              className="w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center text-xs shadow-xs border border-slate-100"
                                              title={REACTION_DETAILS[type]?.label}
                                            >
                                              {REACTION_DETAILS[type]?.emoji}
                                            </span>
                                          ))}
                                        </span>
                                        <span>
                                          {reactionsSummary.totalCount === 1
                                            ? '1 reação'
                                            : `${reactionsSummary.totalCount} reações`}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-slate-400 font-semibold">Sem reações</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      soundService.playUISelect();
                                      setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id);
                                    }}
                                    className="hover:underline hover:text-[#1877f2] transition-all cursor-pointer font-extrabold"
                                  >
                                    {post.comments?.length || 0} comentários • Partilhado
                                  </button>
                                </div>
                              );
                            })()}

                            {/* Post Action Button Bar */}
                            {(() => {
                              const myActiveReaction = (post.reactions || {})[currentUserId];
                              return (
                                <div className="border-t border-b border-slate-150 py-1 flex items-center justify-between relative">
                                  {/* Like Trigger with Hover Reactions */}
                                  <div
                                    className="flex-1 relative flex flex-col items-center"
                                    onMouseEnter={() => setActiveReactionPostId(post.id)}
                                    onMouseLeave={() => setActiveReactionPostId(null)}
                                  >
                                    {/* Reactions Popover */}
                                    <AnimatePresence>
                                      {activeReactionPostId === post.id && (
                                        <motion.div
                                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                          animate={{ opacity: 1, y: -45, scale: 1 }}
                                          exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                          className="absolute left-0 right-0 mx-auto w-fit bg-white border border-slate-200/90 rounded-full py-1.5 px-3.5 shadow-2xl z-40 flex items-center gap-3 animate-in fade-in zoom-in-50"
                                          style={{ top: 0 }}
                                        >
                                          {Object.keys(REACTION_DETAILS).map((type) => (
                                            <button
                                              key={type}
                                              onClick={() => handleReactPost(post, type)}
                                              className="text-xl hover:scale-135 active:scale-110 transition-all cursor-pointer transform origin-bottom hover:-translate-y-1 block"
                                              title={REACTION_DETAILS[type].label}
                                            >
                                              {REACTION_DETAILS[type].emoji}
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>

                                    <button
                                      onClick={() => {
                                        if (myActiveReaction) {
                                          handleReactPost(post, myActiveReaction); // toggle off
                                        } else {
                                          handleReactPost(post, 'like'); // default
                                        }
                                      }}
                                      className={`w-full py-2 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-black cursor-pointer ${
                                        myActiveReaction ? REACTION_DETAILS[myActiveReaction].color : 'text-slate-600 hover:text-slate-800'
                                      }`}
                                    >
                                      {myActiveReaction ? (
                                        <span className="text-sm select-none shrink-0">{REACTION_DETAILS[myActiveReaction].emoji}</span>
                                      ) : (
                                        <ThumbsUp className="w-4 h-4" />
                                      )}
                                      <span>{myActiveReaction ? REACTION_DETAILS[myActiveReaction].label : 'Gosto'}</span>
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => {
                                      soundService.playUISelect();
                                      setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id);
                                    }}
                                    className="flex-1 py-2 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-slate-800 font-black cursor-pointer"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Comentar</span>
                                  </button>

                                  <button
                                    onClick={() => handleSharePost(post)}
                                    className="flex-1 py-2 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-slate-800 font-black cursor-pointer"
                                  >
                                    <Share2 className="w-4 h-4 text-[#1877f2]" />
                                    <span>Partilhar</span>
                                  </button>

                                  {isMyPost && (
                                    <button
                                      onClick={() => handlePromotePost(post)}
                                      className="flex-1 py-2 hover:bg-emerald-100/70 bg-emerald-50 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs text-emerald-800 font-black cursor-pointer border border-emerald-200"
                                      title="Promover / Impulsionar Publicação"
                                    >
                                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                                      <span className="hidden sm:inline">Promover</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Dynamic Comments & Nested Replies List inside the Post */}
                            {(activeCommentsPostId === post.id || (post.comments && post.comments.length > 0)) && (
                              <div className="space-y-4 pt-1.5">
                                {/* Comments list */}
                                {post.comments && post.comments.length > 0 && (
                                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 no-scrollbar border-b border-slate-100 pb-3">
                                    {post.comments.map((comm) => {
                                      const isCommentLikedByMe = (comm.likes || []).includes(currentUserId);
                                      const isMyComment = comm.userId === currentUserId;
                                      return (
                                        <div key={comm.id} className="space-y-2.5">
                                          {/* Main Comment Row */}
                                          <div className="flex items-start gap-2.5 text-xs">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-[#1877f2] font-black text-[11px] uppercase flex items-center justify-center shrink-0 shadow-xs">
                                              {comm.userName.charAt(0)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                              {comm.isSuperChat ? (
                                                <div className="rounded-xl overflow-hidden shadow-md max-w-[95%] border border-slate-200/40 text-xs animate-in zoom-in-95">
                                                  {/* Super Chat Header */}
                                                  <div className={`px-3.5 py-1.5 flex items-center justify-between gap-4 font-black text-[10px] ${
                                                    comm.superChatColor === 'blue' ? 'bg-blue-600 text-white' :
                                                    comm.superChatColor === 'cyan' ? 'bg-cyan-500 text-slate-900' :
                                                    comm.superChatColor === 'green' ? 'bg-emerald-500 text-slate-900' :
                                                    comm.superChatColor === 'yellow' ? 'bg-yellow-500 text-slate-900' :
                                                    comm.superChatColor === 'orange' ? 'bg-orange-500 text-white' :
                                                    comm.superChatColor === 'red' ? 'bg-rose-600 text-white' :
                                                    'bg-emerald-500 text-slate-900' // default green
                                                  }`}>
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="hover:underline cursor-pointer">{comm.userName}</span>
                                                      <span className="bg-black/15 text-[8px] uppercase px-1.5 py-0.2 rounded font-black tracking-wider">Super Chat</span>
                                                    </div>
                                                    <span className="font-mono text-[9px] tracking-wide">{(comm.superChatAmount || 0).toFixed(2)} USDT</span>
                                                  </div>
                                                  {/* Super Chat Body */}
                                                  <div className={`px-3.5 py-2 leading-relaxed font-bold border-t border-black/5 text-[11px] ${
                                                    comm.superChatColor === 'blue' ? 'bg-blue-50 text-blue-900' :
                                                    comm.superChatColor === 'cyan' ? 'bg-cyan-50 text-cyan-900' :
                                                    comm.superChatColor === 'green' ? 'bg-emerald-50 text-emerald-950' :
                                                    comm.superChatColor === 'yellow' ? 'bg-yellow-50 text-yellow-950' :
                                                    comm.superChatColor === 'orange' ? 'bg-orange-50 text-orange-950' :
                                                    comm.superChatColor === 'red' ? 'bg-rose-50 text-rose-950' :
                                                    'bg-emerald-50 text-emerald-950'
                                                  }`}>
                                                    {comm.content}
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="bg-slate-100 rounded-2xl px-3.5 py-2 inline-block max-w-[95%] relative">
                                                  <span className="font-extrabold text-slate-900 block text-[11px] hover:underline cursor-pointer flex items-center gap-1.5">
                                                    {comm.userName}
                                                    {(comm.userId === currentUserId ? memberships[post.userId] : (comm.userId.charCodeAt(0) % 5 === 0)) && (
                                                      <span className="bg-emerald-100 text-emerald-800 text-[7px] px-1.5 py-0.2 rounded uppercase font-black tracking-wider flex items-center gap-0.5" title="Membro do Canal">
                                                        <Sparkles className="w-2 h-2 text-emerald-600 shrink-0" />
                                                        <span>MEMBRO</span>
                                                      </span>
                                                    )}
                                                  </span>
                                                  <p className="text-slate-700 leading-relaxed font-semibold mt-0.5 text-[11px] break-words">
                                                    {comm.content}
                                                  </p>

                                                  {/* Likes Pill inside comment */}
                                                  {(comm.likes || []).length > 0 && (
                                                    <button
                                                      onClick={() => handleLikeComment(post.id, comm.id)}
                                                      className="absolute -bottom-2 right-2 bg-white border border-slate-150 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-xs hover:border-[#1877f2] transition-all cursor-pointer"
                                                    >
                                                      <ThumbsUp className="w-2.5 h-2.5 text-[#1877f2] fill-[#1877f2]" />
                                                      <span className="text-[9px] font-black text-slate-500 font-mono">
                                                        {(comm.likes || []).length}
                                                      </span>
                                                    </button>
                                                  )}
                                                </div>
                                              )}

                                              {/* Comment Actions row */}
                                              <div className="flex items-center gap-2.5 pl-2.5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                                <button
                                                  onClick={() => handleLikeComment(post.id, comm.id)}
                                                  className={`hover:underline cursor-pointer transition-all ${
                                                    isCommentLikedByMe ? 'text-[#1877f2] font-black' : 'hover:text-[#1877f2]'
                                                  }`}
                                                >
                                                  Gosto
                                                </button>
                                                <span>•</span>
                                                <button
                                                  onClick={() => {
                                                    soundService.playUISelect();
                                                    setActiveReplyCommentId(activeReplyCommentId === comm.id ? null : comm.id);
                                                  }}
                                                  className={`hover:underline cursor-pointer transition-all ${
                                                    activeReplyCommentId === comm.id ? 'text-[#1877f2]' : 'hover:text-[#1877f2]'
                                                  }`}
                                                >
                                                  Responder
                                                </button>
                                                {isMyComment && (
                                                  <>
                                                    <span>•</span>
                                                    <button
                                                      onClick={() => handleDeleteComment(post.id, comm.id)}
                                                      className="hover:underline text-red-500 hover:text-red-700 cursor-pointer transition-all"
                                                    >
                                                      Eliminar
                                                    </button>
                                                  </>
                                                )}
                                                <span>•</span>
                                                <span className="text-[8px] text-slate-400 font-bold lowercase">
                                                  {comm.createdAt ? new Date(comm.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Nested Replies List (Aligned cleanly with connecting branch indicators) */}
                                          {comm.replies && comm.replies.length > 0 && (
                                            <div className="ml-10 border-l-2 border-slate-200 pl-4 space-y-3 relative">
                                              {comm.replies.map((rep) => {
                                                const isReplyLikedByMe = (rep.likes || []).includes(currentUserId);
                                                const isMyReply = rep.userId === currentUserId;
                                                return (
                                                  <div key={rep.id} className="flex items-start gap-2 text-xs relative">
                                                    {/* Clean branching lines for nice visual alignment */}
                                                    <div className="absolute -left-4.5 top-2.5 text-slate-300">
                                                      <CornerDownRight className="w-3.5 h-3.5" />
                                                    </div>

                                                    <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 text-slate-600 font-black text-[9px] uppercase flex items-center justify-center shrink-0 shadow-xs">
                                                      {rep.userName.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                      <div className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-1.5 inline-block max-w-[95%] relative">
                                                        <span className="font-extrabold text-slate-900 block text-[10px]">
                                                          {rep.userName}
                                                        </span>
                                                        <p className="text-slate-700 leading-relaxed font-semibold mt-0.5 text-[10px] break-words">
                                                          {rep.content}
                                                        </p>

                                                        {/* Likes Pill inside nested reply */}
                                                        {(rep.likes || []).length > 0 && (
                                                          <button
                                                            onClick={() => handleLikeReply(post.id, comm.id, rep.id)}
                                                            className="absolute -bottom-2 right-2 bg-white border border-slate-150 rounded-full px-1 py-0.5 flex items-center gap-0.5 shadow-xs hover:border-[#1877f2] scale-90 transition-all cursor-pointer"
                                                          >
                                                            <ThumbsUp className="w-2.5 h-2.5 text-[#1877f2] fill-[#1877f2]" />
                                                            <span className="text-[8px] font-black text-slate-500 font-mono">
                                                              {(rep.likes || []).length}
                                                            </span>
                                                          </button>
                                                        )}
                                                      </div>

                                                      {/* Actions on nested reply */}
                                                      <div className="flex items-center gap-2 pl-2 text-[8px] font-black text-slate-500 uppercase tracking-wider">
                                                        <button
                                                          onClick={() => handleLikeReply(post.id, comm.id, rep.id)}
                                                          className={`hover:underline cursor-pointer transition-all ${
                                                            isReplyLikedByMe ? 'text-[#1877f2] font-black' : 'hover:text-[#1877f2]'
                                                          }`}
                                                        >
                                                          Gosto
                                                        </button>
                                                        {isMyReply && (
                                                          <>
                                                            <span>•</span>
                                                            <button
                                                              onClick={() => handleDeleteReply(post.id, comm.id, rep.id)}
                                                              className="hover:underline text-red-500 hover:text-red-700 cursor-pointer transition-all"
                                                            >
                                                              Eliminar
                                                            </button>
                                                          </>
                                                        )}
                                                        <span>•</span>
                                                        <span className="text-[8px] text-slate-400 font-bold lowercase">
                                                          {rep.createdAt ? new Date(rep.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {/* Inline Reply Input Box under Comment */}
                                          {activeReplyCommentId === comm.id && (
                                            <div className="ml-10 flex items-center gap-2 pt-1.5 pl-4 border-l-2 border-slate-200">
                                              <div className="w-7 h-7 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-black text-[9px] shrink-0 shadow-sm">
                                                {currentUserName.charAt(0)}
                                              </div>
                                              <div className="flex-1 relative flex items-center">
                                                <input
                                                  type="text"
                                                  value={commentReplyInputs[comm.id] || ''}
                                                  onChange={(e) => setCommentReplyInputs(prev => ({ ...prev, [comm.id]: e.target.value }))}
                                                  placeholder={`Responder a ${comm.userName}...`}
                                                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-3 pr-10 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#1877f2] font-medium"
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      handleReplyToComment(post.id, comm.id);
                                                    }
                                                  }}
                                                />
                                                <button
                                                  onClick={() => handleReplyToComment(post.id, comm.id)}
                                                  className="absolute right-2 p-1 text-[#1877f2] hover:text-[#166fe5] transition-all cursor-pointer"
                                                  title="Enviar Resposta"
                                                >
                                                  <Send className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Comment Typing Field */}
                                <div className="space-y-2 pt-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                                      {currentUserName.charAt(0)}
                                    </div>
                                    <div className="flex-1 relative flex items-center gap-1.5">
                                      <div className="flex-1 relative flex items-center">
                                        <input
                                          type="text"
                                          value={commentInputs[post.id] || ''}
                                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                          placeholder="Escreve um comentário no Crypton Social..."
                                          className="w-full bg-slate-100 border border-slate-200 rounded-full pl-4 pr-10 py-2 text-xs text-slate-800 placeholder-slate-500 focus:outline-none focus:bg-white focus:border-[#1877f2] font-medium transition-all"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleAddComment(post.id);
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => handleAddComment(post.id)}
                                          className="absolute right-3 p-1.5 text-[#1877f2] hover:text-[#166fe5] transition-all cursor-pointer"
                                          title="Publicar Comentário"
                                        >
                                          <Send className="w-4 h-4" />
                                        </button>
                                      </div>

                                      <button
                                        onClick={() => {
                                          soundService.playUISelect();
                                          setActiveSuperChatPostId(activeSuperChatPostId === post.id ? null : post.id);
                                        }}
                                        className={`p-2 rounded-full transition-all shrink-0 cursor-pointer ${
                                          activeSuperChatPostId === post.id
                                            ? 'bg-red-500 text-white shadow-md scale-105'
                                            : 'bg-amber-100 hover:bg-amber-200 text-amber-700 hover:scale-105'
                                        }`}
                                        title="Enviar Super Chat de Monetização 💰"
                                      >
                                        <Zap className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* YouTube-Style Super Chat Configuration Box */}
                                  {activeSuperChatPostId === post.id && (
                                    <div className="bg-amber-50/95 border border-amber-200 rounded-2xl p-3.5 space-y-3.5 animate-in slide-in-from-top-2 text-xs font-bold text-slate-700 shadow-md">
                                      <div className="flex items-center justify-between">
                                        <span className="text-amber-800 flex items-center gap-1.5">
                                          <Video className="w-4.5 h-4.5 text-red-600 fill-red-600/10" />
                                          <span className="font-black text-xs">Super Chat Monetização</span>
                                        </span>
                                        <span className="text-[10px] bg-amber-200/50 text-amber-950 px-2.5 py-0.5 rounded-full font-black">
                                          Saldo: {balance.toFixed(2)} USDT
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-3 gap-2 py-1">
                                        {[
                                          { amount: 1, label: '1.00 USDT', color: 'green', bg: 'bg-emerald-500 text-slate-950' },
                                          { amount: 2.5, label: '2.50 USDT', color: 'yellow', bg: 'bg-yellow-500 text-slate-950' },
                                          { amount: 5, label: '5.00 USDT', color: 'orange', bg: 'bg-orange-500 text-white' },
                                          { amount: 10, label: '10.00 USDT', color: 'red', bg: 'bg-rose-600 text-white' },
                                          { amount: 25, label: '25.00 USDT', color: 'blue', bg: 'bg-blue-600 text-white' },
                                          { amount: 50, label: '50.00 USDT', color: 'cyan', bg: 'bg-cyan-500 text-slate-950' },
                                        ].map((opt) => (
                                          <button
                                            key={opt.amount}
                                            onClick={() => {
                                              soundService.playUISelect();
                                              setSuperChatAmountState(opt.amount);
                                              setSuperChatColorState(opt.color);
                                            }}
                                            className={`p-2.5 rounded-xl text-center text-[10px] font-black transition-all ${opt.bg} ${
                                              superChatAmountState === opt.amount
                                                ? 'ring-4 ring-offset-2 ring-slate-800 scale-102 shadow-md'
                                                : 'opacity-75 hover:opacity-100 active:scale-95'
                                            }`}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>

                                      <div className="flex gap-2.5 pt-2 items-center justify-between border-t border-amber-200/60">
                                        <div className="flex-1">
                                          <input
                                            type="text"
                                            value={commentInputs[post.id] || ''}
                                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            placeholder="Escreve uma mensagem em destaque..."
                                            className="w-full bg-white border border-slate-200 rounded-full pl-3.5 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1877f2] font-semibold"
                                          />
                                        </div>
                                        <button
                                          onClick={() => handleAddSuperChatComment(post.id, superChatAmountState, superChatColorState, commentInputs[post.id] || '')}
                                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-black tracking-wider rounded-full transition-all active:scale-95 shadow shrink-0 cursor-pointer"
                                        >
                                          Enviar Super Chat
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </React.Fragment>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AMIGOS & PEDIDOS */}
          {activeTab === 'friends' && (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full">

              {/* Received Requests Panel */}
              {pendingReceivedRequests.length > 0 && (
                <div className="space-y-3.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">PEDIDOS DE AMIZADE RECEBIDOS</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingReceivedRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#131d27] border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-md"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1877f2]/20 flex items-center justify-center text-[#1877f2] font-black text-xs uppercase">
                            {req.senderName.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-black block text-white">{req.senderName}</span>
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wide">Quer conectar-se</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            disabled={isProcessingFriend === req.id}
                            className="p-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                            title="Aceitar Pedido"
                          >
                            <Check className="w-4 h-4 font-black" />
                          </button>
                          <button
                            onClick={() => handleRejectOrCancelRequest(req.id)}
                            disabled={isProcessingFriend === req.id}
                            className="p-1.5 bg-white/10 hover:bg-red-500 hover:text-white text-slate-300 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                            title="Recusar Pedido"
                          >
                            <X className="w-4 h-4 font-black" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search contacts inside application */}
              <div className="space-y-3.5 w-full">
                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">PROCURAR TRADERS EM ANGOLA</h3>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#049444] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digita o nome do trader para enviar pedido no Facebook..."
                    className="w-full bg-white border-2 border-[#049444] focus:border-[#FFCC00] focus:ring-2 focus:ring-[#FFCC00]/40 rounded-xl pl-10 pr-4 py-3 text-xs font-black text-black placeholder:text-slate-500 focus:outline-none shadow-md transition-all"
                  />
                </div>

                {searchQuery.trim().length > 0 && (
                  <div className="bg-[#131d27] border border-white/10 rounded-xl p-2.5 max-h-56 overflow-y-auto space-y-1.5 shadow-xl">
                    {filteredSearchUsers.length === 0 ? (
                      <span className="text-[10px] font-bold text-slate-400 block text-center py-4 uppercase">Nenhum trader disponível para adicionar.</span>
                    ) : (
                      filteredSearchUsers.map((user) => (
                        <div
                          key={user.uid}
                          className="flex items-center justify-between p-2.5 bg-[#162232] hover:bg-[#1e2e42] border border-white/5 rounded-xl transition-all"
                        >
                          <span className="text-xs font-black text-white">{user.displayName}</span>
                          <button
                            onClick={() => handleSendFriendRequest(user)}
                            disabled={isProcessingFriend === user.uid}
                            className="px-3 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Sent Requests lists */}
              {pendingSentRequests.length > 0 && (
                <div className="space-y-3 w-full">
                  <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">PEDIDOS ENVIADOS</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingSentRequests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-[#131d27] border border-white/10 rounded-xl p-3.5 flex items-center justify-between shadow-md"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-white">{req.receiverName}</span>
                        </div>
                        <button
                          onClick={() => handleRejectOrCancelRequest(req.id)}
                          className="px-2 py-1 bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accepted active Friends list */}
              <div className="space-y-3.5 w-full">
                <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase">MEUS AMIGOS ({acceptedFriends.length})</h3>

                {acceptedFriends.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
                    <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-black text-slate-600 uppercase block">Ainda não tens amigos no Facebook.</span>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Digita um nome na pesquisa acima para te conectares a traders de elite!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {acceptedFriends.map((friend) => (
                      <div
                        key={friend.uid}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-[#1877f2]/30 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative cursor-pointer" onClick={() => { soundService.playUISelect(); setActiveFriendProfile(friend); }}>
                            <div className="w-9 h-9 rounded-full bg-[#1877f2]/5 flex items-center justify-center text-[#1877f2] border border-[#1877f2]/10 font-black text-sm uppercase hover:scale-105 transition-all" title="Ver Perfil do Trader">
                              {friend.displayName.charAt(0)}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                          </div>
                          <div className="cursor-pointer" onClick={() => { soundService.playUISelect(); setActiveFriendProfile(friend); }} title="Ver Perfil do Trader">
                            <span className="text-xs font-black block text-slate-900 hover:text-[#1877f2] transition-colors">{friend.displayName}</span>
                            <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest block">Online agora</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              soundService.playUISelect();
                              setActiveChatFriend(friend);
                              setActiveTab('chat');
                            }}
                            className="p-2 bg-slate-100 hover:bg-[#1877f2] hover:text-white text-[#1877f2] rounded-full transition-all cursor-pointer"
                            title="Chat Messenger"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(friend.uid)}
                            className="p-2 bg-slate-100 hover:bg-red-500 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
                            title="Remover Amigo"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FACEBOOK MESSENGER CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex overflow-hidden bg-[#f0f2f5]">

              {/* Messenger Chats List (Left Column) */}
              <div className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
                <div className="p-3 border-b border-slate-150 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 tracking-wider uppercase">Conversas</span>
                  <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-all">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                </div>

                {acceptedFriends.length === 0 ? (
                  <div className="p-4 text-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Nenhum amigo para conversar.</span>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-1">
                    {acceptedFriends.map((f) => {
                      const isSelected = activeChatFriend?.uid === f.uid;
                      return (
                        <button
                          key={f.uid}
                          onClick={() => {
                            soundService.playUISelect();
                            setActiveChatFriend(f);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#1877f2]/10 border-[#1877f2]/20 text-[#1877f2] shadow-xs'
                              : 'bg-transparent border-transparent text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs uppercase flex items-center justify-center border border-slate-200">
                              {f.displayName.charAt(0)}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-black block truncate">{f.displayName}</span>
                            <span className="text-[8px] text-emerald-600 font-extrabold uppercase tracking-widest">Online</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messenger Chat Screen (Middle Column) */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#f0f2f5]">
                {activeChatFriend ? (
                  <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Messenger Active Chat Header */}
                    <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            soundService.playUISelect();
                            setActiveChatFriend(null);
                          }}
                          className="md:hidden p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full mr-1 text-slate-600 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>

                        <div className="relative cursor-pointer" onClick={() => { soundService.playUISelect(); setActiveFriendProfile(activeChatFriend); }} title="Ver Perfil do Trader">
                          <div className="w-9 h-9 rounded-full bg-[#1877f2]/10 border border-[#1877f2]/20 flex items-center justify-center text-[#1877f2] font-black text-xs uppercase hover:scale-105 transition-all">
                            {activeChatFriend.displayName.charAt(0)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                        </div>
                        <div className="cursor-pointer" onClick={() => { soundService.playUISelect(); setActiveFriendProfile(activeChatFriend); }} title="Ver Perfil do Trader">
                          <span className="text-xs font-black block text-slate-900 hover:text-[#1877f2] transition-colors">{activeChatFriend.displayName}</span>
                          <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider block">Ativo agora • Messenger</span>
                        </div>
                      </div>

                      {/* Mock Header actions */}
                      <div className="flex items-center gap-2.5">
                        <button onClick={() => showAlert('Chamadas de voz em breve no Messenger!', 'success')} className="p-2 hover:bg-slate-100 rounded-full text-[#1877f2] cursor-pointer">
                          <Phone className="w-4 h-4" />
                        </button>
                        <button onClick={() => showAlert('Videochamada requer permissão de câmara!', 'success')} className="p-2 hover:bg-slate-100 rounded-full text-[#1877f2] cursor-pointer">
                          <Video className="w-4 h-4" />
                        </button>
                        <button onClick={() => showAlert('Perfil sincronizado do Facebook.', 'success')} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer">
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar bg-slate-50">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                          <MessageSquare className="w-10 h-10 text-slate-400 mb-2 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest block text-slate-800">Diz olá a {activeChatFriend.displayName}!</span>
                          <p className="text-[9px] font-bold mt-1 uppercase text-slate-500">Inicia a conversa privada com este trader angolano.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = msg.senderId === currentUserId;

                          const isP2pTransfer = Boolean(msg.content?.startsWith('[P2P_TRANSFER:'));
                          const isChallenge = Boolean(msg.content?.startsWith('[CHALLENGE:'));

                          if (isP2pTransfer) {
                            try {
                              const parts = msg.content.substring(14, msg.content.length - 1).split(':');
                              const amount = parseFloat(parts[0]) || 0;
                              const transId = parts[1] || 'N/A';
                              return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-300 rounded-2xl p-4 text-xs font-sans space-y-2 max-w-[85%] text-slate-850 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                                    <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider">
                                      <Wallet className="w-3.5 h-3.5 text-emerald-600" /> P2P Transferência de Saldo
                                    </div>
                                    <p className="text-slate-700 font-bold leading-normal">
                                      {isMe
                                        ? `Enviaste um presente de ${amount.toFixed(2)} USDT para o teu amigo!`
                                        : `Recebeste um presente de ${amount.toFixed(2)} USDT de ${msg.senderName}!`}
                                    </p>
                                    <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-emerald-200/50 pt-2 font-mono">
                                      <span>Ref: {transId}</span>
                                      <span className="text-emerald-600 font-extrabold uppercase">✓ Confirmado</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            } catch (e) {
                              // fallback
                            }
                          }

                          if (isChallenge) {
                            try {
                              const parts = msg.content.substring(11, msg.content.length - 1).split(':');
                              const game = parts[0] || 'AVIATOR';
                              const stake = parseFloat(parts[1]) || 0;
                              const mult = parts[2] || '2.0';
                              const mines = parts[3] || '3';
                              const team = parts[4] || '';

                              const gameEmojiMap: Record<string, string> = {
                                AVIATOR: '✈️',
                                MINES: '💣',
                                SPORTS: '⚽',
                                PLINKO: '🟢'
                              };

                              const gameNameMap: Record<string, string> = {
                                AVIATOR: 'Aviator',
                                MINES: 'Mines',
                                SPORTS: 'Apostas Desportivas',
                                PLINKO: 'Plinko'
                              };

                              return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl p-4 text-xs font-sans space-y-3 max-w-[85%] text-slate-850 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                                    <div className="flex items-center gap-1.5 text-indigo-700 font-black text-[10px] uppercase tracking-widest">
                                      <Zap className="w-3.5 h-3.5 animate-pulse text-amber-500 fill-amber-500" /> Desafio de {gameNameMap[game] || game}
                                    </div>

                                    <div className="space-y-1 bg-white/75 p-2.5 rounded-xl border border-blue-100">
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span className="font-bold uppercase">Jogo:</span>
                                        <span className="font-extrabold text-slate-800">{gameNameMap[game]}</span>
                                      </div>
                                      <div className="flex justify-between text-[10px] text-slate-500">
                                        <span className="font-bold uppercase">Aposta Proposta:</span>
                                        <span className="font-extrabold text-blue-600">{stake.toFixed(2)} USDT</span>
                                      </div>
                                      {game === 'AVIATOR' && (
                                        <div className="flex justify-between text-[10px] text-slate-500">
                                          <span className="font-bold uppercase">Alvo de Auto-Retirada:</span>
                                          <span className="font-extrabold text-amber-600">{mult}x</span>
                                        </div>
                                      )}
                                      {game === 'MINES' && (
                                        <div className="flex justify-between text-[10px] text-slate-500">
                                          <span className="font-bold uppercase">Quantidade de Minas:</span>
                                          <span className="font-extrabold text-red-600">{mines} Minas</span>
                                        </div>
                                      )}
                                      {game === 'SPORTS' && (
                                        <div className="flex justify-between text-[10px] text-slate-500">
                                          <span className="font-bold uppercase">Equipa Escolhida:</span>
                                          <span className="font-extrabold text-emerald-600">{team}</span>
                                        </div>
                                      )}
                                    </div>

                                    <p className="text-slate-600 text-[10px] leading-relaxed">
                                      {isMe
                                        ? `Enviou uma proposta de operação para copiar.`
                                        : `Recebeu um convite de operação! Copie a aposta abaixo.`}
                                    </p>

                                    {!isMe && (
                                      <button
                                        onClick={() => {
                                          soundService.playUISelect();
                                          showAlert(`A carregar aposta em ${gameNameMap[game]}...`, 'success');
                                          if (onSelectGame) {
                                            onSelectGame(game);
                                          }
                                        }}
                                        className="w-full py-2 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                                      >
                                        <Play className="w-3 h-3 fill-white text-white" />
                                        <span>Copiar Aposta</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            } catch (e) {
                              // fallback
                            }
                          }

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group mb-1`}
                            >
                              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed shadow-xs relative ${
                                isMe
                                  ? 'bg-[#1877f2] text-white rounded-br-none'
                                  : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                              }`}>
                                {/* Quoted Reply Block */}
                                {msg.replyTo && (
                                  <div className={`mb-2 p-2 rounded-xl text-[10px] border-l-2 flex items-center gap-1.5 ${
                                    isMe ? 'bg-black/20 border-white/80 text-blue-100' : 'bg-slate-100 border-[#1877f2] text-slate-600'
                                  }`}>
                                    <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                                    <div className="truncate">
                                      <span className="font-extrabold mr-1">{msg.replyTo.senderName}:</span>
                                      <span className="italic opacity-90">"{msg.replyTo.content}"</span>
                                    </div>
                                  </div>
                                )}

                                {/* Message Content / Edit Mode */}
                                {editingMsgId === msg.id ? (
                                  <div className="space-y-2 py-1 min-w-[200px]">
                                    <input
                                      type="text"
                                      value={editingMsgContent}
                                      onChange={(e) => setEditingMsgContent(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditMessage(msg.id); }}
                                      className="w-full bg-black/30 border border-white/30 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-white"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button type="button" onClick={() => setEditingMsgId(null)} className="text-[10px] px-2.5 py-1 bg-white/20 rounded-md hover:bg-white/30 font-bold cursor-pointer">Cancelar</button>
                                      <button type="button" onClick={() => handleSaveEditMessage(msg.id)} className="text-[10px] px-2.5 py-1 bg-white text-[#1877f2] rounded-md font-black hover:bg-blue-50 cursor-pointer">Guardar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className={msg.isDeleted ? 'italic opacity-70 font-normal' : ''}>{msg.content}</p>
                                    {msg.isEdited && !msg.isDeleted && (
                                      <span className={`text-[9px] block text-right mt-0.5 font-mono opacity-80 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>(editado)</span>
                                    )}
                                  </div>
                                )}

                                {/* Reactions Badges */}
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                  <div className={`flex flex-wrap gap-1 mt-1.5 -mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    {Object.entries(msg.reactions).map(([emoji, users]) => {
                                      const userList = (users as string[]) || [];
                                      return (
                                      <span
                                        key={emoji}
                                        onClick={() => !msg.isDeleted && handleReactToMessage(msg, emoji)}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] cursor-pointer shadow-xs transition-transform hover:scale-105 ${
                                          userList.includes(currentUserId)
                                            ? 'bg-amber-100 border border-amber-400 text-slate-900 font-extrabold'
                                            : 'bg-slate-100 border border-slate-300 text-slate-700 font-bold'
                                        }`}
                                        title={`Reagido por ${userList.length} utilizador(es)`}
                                      >
                                        <span>{emoji}</span>
                                        <span>{userList.length}</span>
                                      </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Action Bar (Reply, React, Edit, Delete) */}
                              {!msg.isDeleted && (
                                <div className={`flex items-center gap-2 mt-1 px-1 opacity-90 text-[10px] select-none ${isMe ? 'flex-row-reverse text-slate-500' : 'flex-row text-slate-500'}`}>
                                  {/* Reply */}
                                  <button
                                    type="button"
                                    onClick={() => { soundService.playUISelect(); setReplyingToMsg(msg); }}
                                    className="hover:text-[#1877f2] flex items-center gap-0.5 cursor-pointer font-bold transition-colors"
                                    title="Responder a esta mensagem"
                                  >
                                    <Reply className="w-3 h-3" />
                                    <span>Responder</span>
                                  </button>

                                  {/* React */}
                                  {!isMe ? (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() => setReactingMsgId(reactingMsgId === msg.id ? null : msg.id)}
                                        className="hover:text-amber-500 flex items-center gap-0.5 cursor-pointer font-bold transition-colors"
                                        title="Reagir com emoji"
                                      >
                                        <Smile className="w-3 h-3" />
                                        <span>Reagir</span>
                                      </button>
                                      {reactingMsgId === msg.id && (
                                        <div className="absolute bottom-5 left-0 bg-white border border-slate-200 shadow-2xl rounded-full px-2.5 py-1.5 flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                                          {['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🚀'].map(emoji => (
                                            <button
                                              key={emoji}
                                              type="button"
                                              onClick={() => handleReactToMessage(msg, emoji)}
                                              className="hover:scale-125 transition-transform text-base p-1 cursor-pointer"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span
                                      onClick={() => showAlert('O dono da mensagem não pode reagir na sua própria mensagem!', 'error')}
                                      className="opacity-40 cursor-not-allowed flex items-center gap-0.5 font-bold"
                                      title="Não é permitido reagir à própria mensagem"
                                    >
                                      <Smile className="w-3 h-3" />
                                      <span>Reagir</span>
                                    </span>
                                  )}

                                  {/* Edit & Delete (only for sender) */}
                                  {isMe && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => { soundService.playUISelect(); setEditingMsgId(msg.id); setEditingMsgContent(msg.content); }}
                                        className="hover:text-blue-600 flex items-center gap-0.5 cursor-pointer font-bold transition-colors"
                                        title="Editar mensagem"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        <span>Editar</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="hover:text-red-600 flex items-center gap-0.5 cursor-pointer font-bold transition-colors text-red-500/80"
                                        title="Eliminar mensagem"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Eliminar</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Replying Preview Banner */}
                    {replyingToMsg && (
                      <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex items-center justify-between text-xs text-slate-700 animate-in fade-in duration-150 shrink-0">
                        <div className="flex items-center gap-2 truncate">
                          <CornerDownRight className="w-4 h-4 text-[#1877f2] shrink-0" />
                          <span className="font-bold text-slate-900 shrink-0">A responder a {replyingToMsg.senderName}:</span>
                          <span className="truncate text-slate-500 italic">"{replyingToMsg.content}"</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingToMsg(null)}
                          className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Messenger Input Field */}
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => { soundService.playUISelect(); setIsSendingChallenge(activeChatFriend); }}
                        className="p-2 hover:bg-[#1877f2]/10 rounded-full text-[#1877f2] cursor-pointer"
                        title="Desafiar Amigo (Partilhar Palpite)"
                      >
                        <Zap className="w-4 h-4 text-[#1877f2]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => { soundService.playUISelect(); setIsSendingBalance(activeChatFriend); }}
                        className="p-2 hover:bg-emerald-50 rounded-full text-emerald-600 cursor-pointer"
                        title="Transferir Saldo P2P"
                      >
                        <Wallet className="w-4 h-4 text-emerald-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => showAlert('Para enviar imagens no Messenger, compartilhe a foto na galeria do Feed!', 'info')}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Escreve uma mensagem privada no Messenger...`}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-slate-200/50"
                      />

                      <button
                        type="button"
                        onClick={() => showAlert('Emojis do Facebook ativados!', 'success')}
                        className="p-2 hover:bg-slate-100 rounded-full text-amber-500 cursor-pointer"
                      >
                        <Smile className="w-4 h-4" />
                      </button>

                      {newMessage.trim() ? (
                        <button
                          type="submit"
                          className="p-2.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-full transition-all cursor-pointer shadow-md"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendLikeThumb}
                          className="p-2.5 bg-transparent hover:bg-slate-100 text-[#1877f2] rounded-full transition-all cursor-pointer"
                          title="Enviar Gosto Rápido"
                        >
                          <ThumbsUp className="w-4 h-4 fill-[#1877f2]" />
                        </button>
                      )}
                    </form>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-50">

                    {/* Mobile responsive chat selection helper */}
                    <div className="md:hidden w-full max-w-sm space-y-2 mb-4">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block text-left mb-1.5">Seleciona um amigo para enviar mensagem</span>
                      {acceptedFriends.length === 0 ? (
                        <span className="text-[10px] text-slate-500 font-bold block py-4 bg-white rounded-xl border border-slate-200">Ainda não tens amigos. Adiciona-os na aba Amigos!</span>
                      ) : (
                        acceptedFriends.map(f => (
                          <button
                            key={f.uid}
                            onClick={() => {
                              soundService.playUISelect();
                              setActiveChatFriend(f);
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-left transition-all cursor-pointer shadow-xs"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#1877f2]/10 text-[#1877f2] font-black text-xs uppercase flex items-center justify-center">
                              {f.displayName.charAt(0)}
                            </div>
                            <div>
                              <span className="text-xs font-black block text-slate-900">{f.displayName}</span>
                              <span className="text-[8px] text-emerald-600 font-bold uppercase block">Online agora</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="hidden md:flex flex-col items-center">
                      <MessageSquare className="w-12 h-12 text-[#1877f2]/20 mb-2 animate-bounce" />
                      <span className="text-sm font-black text-slate-800 uppercase block">Nenhuma conversa selecionada</span>
                      <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Escolhe um amigo da lista do Messenger para começar o chat.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recipient info panel (Right Column - Desktop only) */}
              {activeChatFriend && (
                <div className="w-60 bg-white border-l border-slate-200 p-4 hidden lg:flex flex-col items-center space-y-5 overflow-y-auto">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-[#1877f2]/10 border-2 border-[#1877f2]/20 flex items-center justify-center text-[#1877f2] font-black text-2xl uppercase shadow-xs">
                      {activeChatFriend.displayName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">{activeChatFriend.displayName}</span>
                      <span className="text-[8px] text-emerald-600 font-extrabold uppercase tracking-widest block mt-0.5">Disponível no Messenger</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-150 w-full pt-4 space-y-3.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Opções da Conversa</span>

                    <button onClick={() => { soundService.playUISelect(); setActiveFriendProfile(activeChatFriend); }} className="w-full text-left text-xs font-bold text-slate-600 hover:text-[#1877f2] flex items-center gap-2.5 cursor-pointer">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Cartão do Trader</span>
                    </button>

                    <button onClick={() => { soundService.playUISelect(); setIsSendingBalance(activeChatFriend); }} className="w-full text-left text-xs font-bold text-slate-600 hover:text-emerald-500 flex items-center gap-2.5 cursor-pointer">
                      <Wallet className="w-4 h-4 text-slate-400" />
                      <span>Enviar Saldo (P2P)</span>
                    </button>

                    <button onClick={() => { soundService.playUISelect(); setIsSendingChallenge(activeChatFriend); }} className="w-full text-left text-xs font-bold text-slate-600 hover:text-[#1877f2] flex items-center gap-2.5 cursor-pointer">
                      <Zap className="w-4 h-4 text-slate-400" />
                      <span>Desafiar Amigo / Palpite</span>
                    </button>

                    <button onClick={() => showAlert('Conversa silenciada por 8 horas!', 'success')} className="w-full text-left text-xs font-bold text-slate-600 hover:text-[#1877f2] flex items-center gap-2.5 cursor-pointer">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Silenciar Notificações</span>
                    </button>

                    <button onClick={() => showAlert('Conversa limpa com sucesso localmente!', 'success')} className="w-full text-left text-xs font-bold text-[#f02849] hover:text-red-500 flex items-center gap-2.5 cursor-pointer">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Eliminar Mensagens</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

        {/* RIGHT SIDEBAR (Facebook Contacts & Advertisements) */}
        {activeTab === 'feed' && (
          <aside className="w-60 bg-white p-3.5 border-l border-slate-200 shrink-0 hidden xl:flex flex-col justify-between">
            <div className="space-y-4">
              {/* Patrocinados (Mock Facebook Ads) */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">PATROCINADO</span>

                <div
                  onClick={() => showAlert('Abra a aba Ofertas do CryptonBet para receber bónus!', 'success')}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🏆</span>
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Trading de Elite</span>
                  </div>
                  <p className="text-[9px] text-slate-600 font-semibold leading-relaxed">Ganhe até 200% de bónus de boas-vindas no teu primeiro depósito no CryptonBet. Regulado e Seguro.</p>
                </div>

                <div
                  onClick={() => { soundService.playUISelect(); onSelectGame?.('AVIATOR'); }}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🚀</span>
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">Aviator Multiplicador</span>
                  </div>
                  <p className="text-[9px] text-slate-600 font-semibold leading-relaxed">Alcance os céus e multiplique o seu saldo até 100x em segundos no jogo favorito de Angola!</p>
                </div>
              </div>

              {/* Online contacts list */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">CONTACTOS ONLINE</span>

                {acceptedFriends.length === 0 ? (
                  <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Sem contactos online. Adiciona amigos!</span>
                ) : (
                  <div className="space-y-2">
                    {acceptedFriends.map(f => (
                      <div
                        key={f.uid}
                        onClick={() => {
                          soundService.playUISelect();
                          setActiveChatFriend(f);
                          setActiveTab('chat');
                        }}
                        className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase flex items-center justify-center border border-slate-200">
                              {f.displayName.charAt(0)}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white rounded-full"></span>
                          </div>
                          <span className="text-xs font-bold text-slate-700 group-hover:text-[#1877f2] transition-colors">{f.displayName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 text-center">
              <span className="text-[8px] text-slate-450 font-bold block uppercase tracking-wider">CryptonBet Messenger v3.5</span>
            </div>
          </aside>
        )}

      {/* 4. STORY CREATOR MODAL */}
      <AnimatePresence>
        {isCreatingStory && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[1000] p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full border border-slate-200 max-h-[92vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Criar um Story</h3>
                    <span className="bg-[#049444]/10 text-[#049444] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#049444]/20 uppercase">
                      ⏱️ 24h Visível
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">Partilha momentos, imagens ou lucros do teu dia</p>
                </div>
                <button
                  onClick={() => { soundService.playUISelect(); setIsCreatingStory(false); setStoryImage(null); }}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Content Split */}
              <div className="p-4 sm:p-6 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Form & Image/Bg Picker */}
                <form onSubmit={handlePublishStorySubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Texto do Story</label>
                    <textarea
                      value={storyText}
                      onChange={(e) => setStoryText(e.target.value.slice(0, 150))}
                      placeholder="Qual é a novidade de hoje? Max 150 caracteres..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-850 font-semibold focus:outline-none focus:border-[#1877f2] transition-colors resize-none"
                    />
                  </div>

                  {/* Image Upload Input & Presets */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase block">Inserir Imagem no Story</label>

                    {storyImage ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-28 bg-slate-900 group">
                        <img src={storyImage} alt="Story Upload" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setStoryImage(null)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-transform active:scale-90 cursor-pointer"
                          title="Remover imagem"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* File upload button */}
                        <label
                          htmlFor="story-file-input"
                          className="w-full bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 hover:border-[#1877f2] rounded-2xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all text-xs font-black text-slate-700 uppercase tracking-wider"
                        >
                          <Upload className="w-4 h-4 text-[#1877f2]" />
                          <span>Carregar do Dispositivo</span>
                        </label>
                        <input
                          id="story-file-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressStoryImage(file);
                                if (compressed) {
                                  setStoryImage(compressed);
                                }
                              } catch (err) {
                                showAlert('Erro ao carregar a imagem. Tente outra foto.', 'error');
                              }
                            }
                          }}
                        />

                        {/* Image Presets */}
                        <div className="pt-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Ou Escolha um Preset:</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: 'Trading', url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=300&q=80' },
                              { label: 'Cripto', url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=300&q=80' },
                              { label: 'Ouro', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=300&q=80' },
                              { label: 'Troféu', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=300&q=80' }
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setStoryImage(preset.url)}
                                className="h-10 rounded-xl overflow-hidden border border-slate-200 relative hover:scale-105 transition-transform group cursor-pointer"
                              >
                                <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                                <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[8px] font-black text-white uppercase">{preset.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gradient picker (only if no image) */}
                  {!storyImage && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase block">Fundo de Cor (Gradients)</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { name: 'Sunset', class: 'from-purple-600 to-pink-500' },
                          { name: 'Crypton', class: 'from-[#049444] to-[#FFCC00]' },
                          { name: 'Deep', class: 'from-blue-600 to-indigo-900' },
                          { name: 'Lava', class: 'from-red-500 to-orange-500' },
                          { name: 'Shadow', class: 'from-slate-800 to-black' }
                        ].map((bg, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { soundService.playTick(); setStoryBg(bg.class); }}
                            className={`h-9 rounded-xl bg-gradient-to-tr ${bg.class} border-2 transition-all ${storyBg === bg.class ? 'border-[#1877f2] scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                            title={bg.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPublishingStory || (!storyText.trim() && !storyImage)}
                    className="w-full bg-[#1877f2] hover:bg-[#1565c0] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isPublishingStory ? 'A Publicar...' : 'Publicar Story'}
                  </button>
                </form>

                {/* Live Preview Panel */}
                <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[220px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Pré-visualização</span>
                  <div className={`w-40 h-60 rounded-2xl p-4 flex flex-col justify-between items-center text-center relative shadow-xl overflow-hidden border border-white/20 ${!storyImage ? `bg-gradient-to-tr ${storyBg}` : 'bg-slate-900'}`}>
                    {storyImage && (
                      <img src={storyImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover filter brightness-90" />
                    )}
                    {storyImage && <div className="absolute inset-0 bg-black/40" />}

                    <div className="relative z-10 top-1 left-1 self-start w-6 h-6 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white font-black text-[9px] uppercase">
                      {currentUserName.charAt(0)}
                    </div>

                    <div className="relative z-10 flex-1 flex items-center justify-center w-full my-2">
                      <p className="text-white font-black text-[10px] uppercase tracking-wide leading-snug break-words px-1.5 drop-shadow-md">
                        {storyText || (storyImage ? '' : 'O teu texto aparecerá aqui...')}
                      </p>
                    </div>

                    <div className="relative z-10 w-full text-center">
                      <span className="text-[8px] font-black text-white/80 block uppercase tracking-wider drop-shadow">{currentUserName}</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. STORY VIEWER MODAL */}
      <AnimatePresence>
        {selectedStory && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-[1000] p-3 sm:p-4">

            {/* Floating emojis layer */}
            <div className="fixed inset-0 pointer-events-none z-[1010] overflow-hidden">
              {floatingEmojis.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 1, y: '80vh', scale: 0.8 }}
                  animate={{ opacity: 0, y: '20vh', scale: 1.8 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  className="absolute text-4xl filter drop-shadow-lg"
                  style={{ left: `${f.x}%` }}
                >
                  {f.emoji}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-sm w-full h-[620px] max-h-[92vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10 bg-slate-950"
            >
              {/* Progress bar and metadata header overlay */}
              <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-50 space-y-3">
                {/* Auto-progress lines (segmented for stacked stories) */}
                <div className="flex items-center gap-1.5 w-full">
                  {(activeStoryGroup.length > 0 ? activeStoryGroup : [selectedStory]).map((s, idx) => {
                    let w = 0;
                    if (idx < activeStoryIndex) w = 100;
                    else if (idx === activeStoryIndex) w = storyProgress;
                    else w = 0;
                    return (
                      <div key={s.id || idx} className="flex-1 bg-white/20 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-white h-full transition-all duration-100 ease-linear"
                          style={{ width: `${w}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* User info & 24h expiration badge */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1877f2] border border-white/20 flex items-center justify-center text-white font-black text-xs shadow uppercase shrink-0">
                      {selectedStory.avatar || selectedStory.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-black text-xs block uppercase tracking-wide drop-shadow">
                          {selectedStory.name}
                        </span>
                        <span className="bg-white/20 text-white/90 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                          ⏳ {getStoryTimeAgo(selectedStory.createdAt)}
                        </span>
                      </div>
                      <span className="text-[8px] text-white/60 font-bold block uppercase tracking-widest drop-shadow mt-0.5">
                        {selectedStory.profit ? `Aposta Ganha: ${selectedStory.profit}` : 'Story CryptonBet (24h)'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => { soundService.playUISelect(); setSelectedStory(null); }}
                    className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Display Area (Image or Gradient) */}
              <div className="flex-1 w-full relative flex items-center justify-center overflow-hidden">
                {/* Left and Right navigation tap targets for successive story viewing */}
                <div className="absolute inset-y-16 left-0 w-1/3 z-30 cursor-pointer" onClick={handlePrevStory} title="Story Anterior" />
                <div className="absolute inset-y-16 right-0 w-1/3 z-30 cursor-pointer" onClick={handleNextStory} title="Próximo Story" />
                {selectedStory.image ? (
                  <div className="w-full h-full relative">
                    <img
                      src={selectedStory.image}
                      alt={selectedStory.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80" />

                    {selectedStory.content && (
                      <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
                        <p className="text-white font-black text-base sm:text-lg uppercase tracking-wide leading-relaxed px-3 break-words drop-shadow-2xl bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
                          {selectedStory.content}
                        </p>
                      </div>
                    )}

                    {selectedStory.profit && !selectedStory.content && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-6 text-center z-10">
                        <span className="bg-emerald-500 text-white font-black text-[11px] px-4 py-1.5 rounded-full shadow-2xl uppercase tracking-widest mb-2 animate-bounce">
                          {selectedStory.profit} PROFIT
                        </span>
                        <p className="text-white/90 text-[10px] font-black uppercase tracking-wider">Histórico de Trader VIP</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`w-full h-full bg-gradient-to-tr ${selectedStory.background || 'from-purple-600 to-pink-500'} flex flex-col items-center justify-center text-center p-8`}>
                    <p className="text-white font-black text-base sm:text-lg uppercase tracking-wide leading-relaxed px-2 break-words drop-shadow-2xl">
                      {selectedStory.content}
                    </p>
                  </div>
                )}

                {/* Comments Drawer (Expandable) */}
                <AnimatePresence>
                  {showStoryComments && (
                    <motion.div
                      initial={{ opacity: 0, y: 100 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 100 }}
                      className="absolute inset-x-0 bottom-16 bg-slate-900/95 backdrop-blur-md border-t border-white/10 p-4 z-40 max-h-60 overflow-y-auto no-scrollbar flex flex-col space-y-3"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-white/10">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-[#1877f2]" />
                          Comentários ({selectedStory.comments?.length || 0})
                        </span>
                        <button
                          onClick={() => setShowStoryComments(false)}
                          className="text-white/60 hover:text-white text-xs font-bold"
                        >
                          Fechar
                        </button>
                      </div>

                      {(!selectedStory.comments || selectedStory.comments.length === 0) ? (
                        <p className="text-center text-[10px] text-white/50 py-4 font-bold uppercase">Seja o primeiro a comentar neste Story!</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedStory.comments.map((c: any) => (
                            <div key={c.id} className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex gap-2.5 items-start">
                              <div className="w-6 h-6 rounded-full bg-[#1877f2] flex items-center justify-center text-white font-black text-[9px] shrink-0 uppercase">
                                {c.avatar || c.userName?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-black text-white uppercase tracking-wider">{c.userName}</span>
                                  <span className="text-[7px] text-white/40 font-bold">{getStoryTimeAgo(c.createdAt)}</span>
                                </div>
                                <p className="text-[10px] text-white/90 font-medium break-words mt-0.5">{c.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer: Reactions & Comment Input Bar */}
              <div className="p-3 bg-gradient-to-t from-black via-black/90 to-transparent z-50 space-y-2.5 shrink-0">

                {/* Emojis Reaction Row */}
                <div className="flex items-center justify-between gap-1 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
                  {['❤️', '🔥', '👏', '😂', '😮', '🚀', '💰'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactToStory(selectedStory.id, emoji)}
                      className="flex-1 py-1 text-lg hover:scale-130 active:scale-90 transition-transform flex items-center justify-center relative cursor-pointer"
                      title={`Reagir com ${emoji}`}
                    >
                      <span>{emoji}</span>
                      {selectedStory.reactions?.[emoji] > 0 && (
                        <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[7px] font-black px-1 rounded-full shadow">
                          {selectedStory.reactions[emoji]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Comment Bar Input & Toggle Comments */}
                <form onSubmit={handleSendStoryComment} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playUISelect();
                      setShowStoryComments(!showStoryComments);
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${showStoryComments ? 'bg-[#1877f2] text-white border-[#1877f2]' : 'bg-white/10 text-white/80 border-white/10 hover:bg-white/20'}`}
                    title="Ver Comentários"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={storyCommentText}
                    onChange={(e) => setStoryCommentText(e.target.value)}
                    onFocus={() => setIsStoryPaused(true)}
                    onBlur={() => setIsStoryPaused(false)}
                    placeholder="Enviar mensagem ou resposta..."
                    className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#1877f2] font-medium"
                  />

                  <button
                    type="submit"
                    disabled={!storyCommentText.trim()}
                    className="bg-[#1877f2] hover:bg-[#1565c0] text-white p-2.5 rounded-2xl font-black transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BEAUTIFUL CUSTOM CONFIRM MODAL DIALOG */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setConfirmDialog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#142031] to-[#0a111a] border border-white/10 p-6 rounded-[2.5rem] shadow-2xl text-center space-y-5 overflow-hidden text-white"
            >
              {/* Decorative top accent glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent animate-pulse" />

              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FFCC00]">
                  {confirmDialog.title || 'Ação Requerida'}
                </h3>
                <p className="text-xs font-semibold text-slate-200 leading-relaxed font-sans px-2">
                  {confirmDialog.message}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    soundService.playTick();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-red-600/10"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRADER STATISTICS PROFILE CARD MODAL */}
      <AnimatePresence>
        {activeFriendProfile && (() => {
          const stats = getTraderStats(activeFriendProfile.uid, activeFriendProfile.displayName);
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/75 backdrop-blur-md"
                onClick={() => setActiveFriendProfile(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-gradient-to-b from-[#142031] to-[#0a111a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden text-white"
              >
                {/* Decorative background glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#1877f2]/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

                {/* Modal Header */}
                <div className="p-6 pb-0 flex justify-between items-center relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#1877f2] bg-[#1877f2]/10 px-3 py-1 rounded-full border border-[#1877f2]/10">
                    Licença de Trader Ativa
                  </span>
                  <button
                    onClick={() => setActiveFriendProfile(null)}
                    className="p-1.5 hover:bg-white/5 rounded-full transition-all cursor-pointer text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Hero profile segment */}
                <div className="p-6 text-center space-y-3 border-b border-white/5 relative z-10">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1877f2] to-indigo-600 p-[3px] shadow-xl">
                        <div className="w-full h-full rounded-full bg-[#131d27] flex items-center justify-center font-black text-2xl uppercase text-white">
                          {activeFriendProfile.displayName.charAt(0)}
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-[#142031] rounded-full flex items-center justify-center shadow-md">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <h4 className="text-lg font-black tracking-tight">{activeFriendProfile.displayName}</h4>
                      <CheckCircle2 className="w-4 h-4 text-[#1877f2] fill-[#1877f2]/10 shrink-0" aria-label="Trader Verificado por Crypton" />
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      {stats.status}
                    </span>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="p-6 space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Métricas de Performance</span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Win Rate (ROI)</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black text-emerald-400">{stats.winRate}%</span>
                        <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-tighter">↑ CONSISTENTE</span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Operações Realizadas</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black text-slate-100">{stats.totalTrades}</span>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">TRADES</span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Volume de Negociação</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-black text-slate-100">{(stats.totalVolume).toFixed(2)} USDT</span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Mercado Favorito</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xs font-black text-[#1877f2] uppercase">{stats.favoriteGame}</span>
                      </div>
                    </div>
                  </div>

                  {/* Affinity Meter */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                        <span className="text-[10px] text-slate-300 font-extrabold uppercase">Afinidade de Conexão</span>
                      </div>
                      <span className="text-[10px] font-black text-orange-500">Nível {stats.level}</span>
                    </div>

                    <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full"
                        style={{ width: `${stats.friendshipScore}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                      <span>Score: {stats.friendshipScore}/100</span>
                      <span>{stats.mutualFriends} Amigos em Comum</span>
                    </div>
                  </div>
                </div>

                {/* Quick actions in Footer */}
                <div className="p-6 bg-black/25 border-t border-white/5 flex gap-3">
                  <button
                    onClick={() => {
                      soundService.playUISelect();
                      setIsSendingBalance(activeFriendProfile);
                      setActiveFriendProfile(null);
                    }}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-50 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Enviar Saldo</span>
                  </button>

                  <button
                    onClick={() => {
                      soundService.playUISelect();
                      setIsSendingChallenge(activeFriendProfile);
                      setActiveFriendProfile(null);
                    }}
                    className="flex-1 py-3.5 bg-[#1877f2] hover:bg-[#166fe5] rounded-2xl text-[10px] font-black uppercase tracking-wider text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#1877f2]/10"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Desafiar Amigo</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* P2P BALANCE SEND MODAL */}
      <AnimatePresence>
        {isSendingBalance && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setIsSendingBalance(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#142031] to-[#0a111a] border border-white/10 p-6 rounded-[2rem] shadow-2xl text-center space-y-5 text-white"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[3px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />

              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-6 h-6 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Enviar Saldo P2P</h3>
                <p className="text-[11px] font-semibold text-slate-300 px-2 leading-relaxed">
                  Podes enviar parte da tua banca de trading diretamente para a conta de <span className="font-extrabold text-white">{isSendingBalance.displayName}</span> sem taxas extras.
                </p>
              </div>

              {/* Balance Box */}
              <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex justify-between items-center text-left">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Teu Saldo Disponível</span>
                  <span className="text-xs font-black text-slate-200">{(balance).toFixed(2)} USDT</span>
                </div>
                <span className="text-[9px] font-black text-[#FFCC00] uppercase bg-[#FFCC00]/10 px-2.5 py-1 rounded-full">REAL</span>
              </div>

              {/* Amount input */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Envio (USDT)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full bg-[#131d27] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 text-center font-extrabold"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    soundService.playTick();
                    setIsSendingBalance(null);
                    setTransferAmount('1000');
                  }}
                  className="flex-1 py-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSendBalance(isSendingBalance, transferAmount)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-50 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
                >
                  Confirmar Envio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SEND BET CHALLENGE MODAL */}
      <AnimatePresence>
        {isSendingChallenge && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setIsSendingChallenge(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#142031] to-[#0a111a] border border-white/10 p-6 rounded-[2rem] shadow-2xl text-center space-y-4 text-white"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[3px] bg-gradient-to-r from-transparent via-[#1877f2] to-transparent animate-pulse" />

              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-[#1877f2]/10 border border-[#1877f2]/25 flex items-center justify-center text-[#1877f2]">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1877f2]">Criar Desafio / Palpite</h3>
                <p className="text-[11px] font-semibold text-slate-300 leading-relaxed px-2">
                  Partilha uma estratégia ou aposta sugerida diretamente no Messenger para <span className="font-extrabold text-white">{isSendingChallenge.displayName}</span> copiar!
                </p>
              </div>

              {/* Game Selection Selector */}
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Escolher Jogo</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['AVIATOR', 'MINES', 'SPORTS', 'PLINKO'] as const).map((game) => {
                    const gameEmojiMap = { AVIATOR: '✈️', MINES: '💣', SPORTS: '⚽', PLINKO: '🟢' };
                    return (
                      <button
                        key={game}
                        type="button"
                        onClick={() => { soundService.playTick(); setChallengeGame(game); }}
                        className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                          challengeGame === game
                            ? 'bg-[#1877f2] border-[#1877f2] text-white shadow-xs'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-sm block">{gameEmojiMap[game]}</span>
                        <span className="text-[8px] font-black uppercase block truncate">{game}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional parameters based on Game */}
              <div className="space-y-3.5 text-left border-t border-b border-white/5 py-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor da Operação (USDT)</label>
                  <input
                    type="number"
                    value={challengeStake}
                    onChange={(e) => setChallengeStake(e.target.value)}
                    className="w-full bg-[#131d27] border border-white/10 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-200 focus:outline-none"
                    placeholder="Ex: 500"
                  />
                </div>

                {challengeGame === 'AVIATOR' && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Multiplicador Alvo</label>
                    <input
                      type="text"
                      value={challengeMultiplier}
                      onChange={(e) => setChallengeMultiplier(e.target.value)}
                      className="w-full bg-[#131d27] border border-white/10 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-200 focus:outline-none"
                      placeholder="Ex: 2.5"
                    />
                  </div>
                )}

                {challengeGame === 'MINES' && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantidade de Minas</label>
                    <select
                      value={challengeMinesCount}
                      onChange={(e) => setChallengeMinesCount(e.target.value)}
                      className="w-full bg-[#131d27] border border-white/10 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-200 focus:outline-none"
                    >
                      <option value="1">1 Mina</option>
                      <option value="3">3 Minas (Recomendado)</option>
                      <option value="5">5 Minas (Dificuldade Média)</option>
                      <option value="10">10 Minas (Alta Dificuldade)</option>
                      <option value="20">20 Minas (Dificuldade Extrema)</option>
                    </select>
                  </div>
                )}

                {challengeGame === 'SPORTS' && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Palpite de Equipa / Evento</label>
                    <input
                      type="text"
                      value={challengeSportsTeam}
                      onChange={(e) => setChallengeSportsTeam(e.target.value)}
                      className="w-full bg-[#131d27] border border-white/10 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-200 focus:outline-none"
                      placeholder="Ex: Vitória de Angola"
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    soundService.playTick();
                    setIsSendingChallenge(null);
                  }}
                  className="flex-1 py-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    soundService.playUISelect();
                    const payloadText = `[CHALLENGE:${challengeGame}:${challengeStake}:${challengeMultiplier}:${challengeMinesCount}:${challengeSportsTeam}]`;
                    const chatId = getChatId(currentUserId, isSendingChallenge.uid);

                    if (currentUserId === 'guest_user') {
                      const allMsgs = JSON.parse(localStorage.getItem('cryptonbet_local_messages') || '[]');
                      const newM: PrivateMessage = {
                        id: 'msg_' + Date.now(),
                        chatId,
                        senderId: currentUserId,
                        senderName: currentUserName,
                        receiverId: isSendingChallenge.uid,
                        receiverName: isSendingChallenge.displayName,
                        content: payloadText,
                        createdAt: new Date().toISOString()
                      };
                      allMsgs.push(newM);
                      localStorage.setItem('cryptonbet_local_messages', JSON.stringify(allMsgs));
                      setChatMessages(prev => [...prev, newM]);

                      setTimeout(() => {
                        const reply: PrivateMessage = {
                          id: 'reply_' + Date.now(),
                          chatId,
                          senderId: isSendingChallenge.uid,
                          senderName: isSendingChallenge.displayName,
                          receiverId: currentUserId,
                          receiverName: currentUserName,
                          content: `Epa! Desafio Aceite! 🎮 Vou agora mesmo abrir o jogo e apostar esses ${challengeStake} USDT. Vamos ver se bate! 🚀`,
                          createdAt: new Date().toISOString()
                        };
                        allMsgs.push(reply);
                        localStorage.setItem('cryptonbet_local_messages', JSON.stringify(allMsgs));
                        setChatMessages(prev => [...prev, reply]);
                        soundService.playUISelect();
                      }, 1800);
                    } else {
                      try {
                        await addDoc(collection(db, 'private_messages'), {
                          chatId,
                          senderId: currentUserId,
                          senderName: currentUserName,
                          receiverId: isSendingChallenge.uid,
                          receiverName: isSendingChallenge.displayName,
                          content: payloadText,
                          createdAt: serverTimestamp()
                        });
                      } catch (err) {
                        console.error("Error sending challenge:", err);
                      }
                    }

                    sendNotification(
                      isSendingChallenge.uid,
                      'private_message',
                      undefined,
                      undefined,
                      `🎯 ${currentUserName} enviou-te um desafio em ${challengeGame}!`
                    );

                    showAlert('Desafio enviado com sucesso para o chat!');
                    setIsSendingChallenge(null);
                  }}
                  className="flex-1 py-3 bg-[#1877f2] hover:bg-[#166fe5] rounded-2xl text-[10px] font-black uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-[#1877f2]/10"
                >
                  Enviar Desafio
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* PDF SHOPPING CART & EVALUATIONS DRAWER */}
        {showPdfCart && (
          <div className="fixed inset-0 z-[250] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                soundService.playTick();
                setShowPdfCart(false);
                setRatingBookId(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Sliding Drawer Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-10 text-slate-100"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                    <ShoppingCart className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase text-slate-100 tracking-wider">Meus E-Books PDF</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Adquiridos & Avaliações</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundService.playTick();
                    setShowPdfCart(false);
                    setRatingBookId(null);
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar bg-gradient-to-b from-slate-900 to-slate-950 text-left">
                {(() => {
                  const purchasedBooks = posts.filter(p => p.postType === 'pdf' && purchasedBookIds.includes(p.id));

                  if (purchasedBooks.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-500">
                          <ShoppingCart className="w-8 h-8 text-slate-500" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black uppercase text-slate-200">Nenhum E-Book Adquirido</h4>
                          <p className="text-[10px] text-slate-500 font-bold max-w-[280px] leading-relaxed uppercase">
                            Explora o Mercado de PDFs no feed para encontrar e comprar as melhores estratégias de trading de Angola!
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            soundService.playUISelect();
                            setFeedFilter('pdf');
                            setActiveTab('feed');
                            setShowPdfCart(false);
                          }}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/10 cursor-pointer mx-auto"
                        >
                          Ir para o Mercado PDF
                        </button>
                      </div>
                    );
                  }

                  return purchasedBooks.map(book => {
                    const myReview = pdfReviews[book.id]?.find(r => r.userId === currentUserId);
                    const isRatingThis = ratingBookId === book.id;

                    return (
                      <div key={book.id} className="bg-slate-850 border border-slate-800 rounded-xl p-4 space-y-4 relative overflow-hidden shadow-lg group">
                        {/* Book Basic Meta */}
                        <div className="flex gap-3.5">
                          <div className={`w-14 h-20 shrink-0 bg-gradient-to-tr ${book.pdfCoverColor || 'from-amber-600 to-amber-900'} rounded-lg shadow-md border border-white/15 p-1.5 flex flex-col justify-between text-white relative overflow-hidden select-none`}>
                            {book.imageUrl && (
                              <img src={book.imageUrl} alt={book.pdfTitle} className="absolute inset-0 w-full h-full object-cover z-0" />
                            )}
                            <div className="absolute inset-0 bg-black/50 z-[1]" />
                            <div className="relative z-10 text-[5px] font-black tracking-widest text-amber-400">PDF</div>
                            <p className="relative z-10 text-[6px] font-black leading-tight uppercase line-clamp-3">{book.pdfTitle}</p>
                            <span className="relative z-10 text-[4px] font-bold opacity-75">@{book.pdfAuthor}</span>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <h4 className="text-xs font-black text-slate-100 uppercase tracking-tight truncate">{book.pdfTitle}</h4>
                              <span className="text-[9px] text-slate-400 font-bold block">Autor: <span className="text-amber-500">@{book.pdfAuthor}</span></span>
                            </div>

                            <button
                              onClick={() => handleDownloadPdfBook(book)}
                              className="w-fit px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <BookOpen className="w-3 h-3 text-amber-500" />
                              Descarregar PDF
                            </button>
                          </div>
                        </div>

                        {/* Reviews / Ratings Section */}
                        <div className="border-t border-slate-800/60 pt-3.5 mt-1">
                          {myReview && !isRatingThis ? (
                            <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">A tua Avaliação</span>
                                <div className="flex text-amber-500 text-[10px]">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className="text-amber-500">{i < myReview.rating ? '★' : '☆'}</span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-300 font-semibold italic text-left">"{myReview.comment}"</p>
                              <button
                                onClick={() => {
                                  soundService.playTick();
                                  setRatingBookId(book.id);
                                  setNewRating(myReview.rating);
                                  setNewComment(myReview.comment);
                                }}
                                className="text-[8px] font-black uppercase text-amber-500 hover:underline cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/10 mt-1 block w-fit"
                              >
                                Editar Avaliação
                              </button>
                            </div>
                          ) : isRatingThis ? (
                            /* Rating Input Box */
                            <div className="bg-slate-900/80 border border-slate-700/50 p-3 rounded-xl space-y-3">
                              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">Escrever Avaliação</span>

                              {/* Stars selection */}
                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Classificação</span>
                                <div className="flex gap-1.5 text-lg">
                                  {Array.from({ length: 5 }).map((_, i) => {
                                    const ratingVal = i + 1;
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                          soundService.playTick();
                                          setNewRating(ratingVal);
                                        }}
                                        className={`transition-transform hover:scale-110 cursor-pointer ${
                                          ratingVal <= newRating ? 'text-amber-500' : 'text-slate-600'
                                        }`}
                                      >
                                        ★
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Comment Field */}
                              <div className="space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Comentário</span>
                                <textarea
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  placeholder="Ex: Excelente conteúdo, técnicas fáceis de aplicar em Angola!"
                                  rows={2}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                                />
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    soundService.playTick();
                                    setRatingBookId(null);
                                    setNewComment('');
                                  }}
                                  className="flex-1 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase text-slate-400 transition-all cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => {
                                    handleAddReview(book.id, newRating, newComment);
                                    setRatingBookId(null);
                                    setNewComment('');
                                  }}
                                  className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                                >
                                  Submeter
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Prompt to review */
                            <button
                              onClick={() => {
                                soundService.playTick();
                                setRatingBookId(book.id);
                                setNewRating(5);
                                setNewComment('');
                              }}
                              className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 font-black uppercase text-[9px] tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-500/10 text-amber-500" />
                              Avaliar este E-Book
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
                <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">
                  Crypton PDF Market - Angola 🇦🇴
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Lightbox Modal for Large Images */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            <button
              onClick={() => setFullscreenImage(null)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white font-black text-lg flex items-center justify-center transition-all cursor-pointer shadow-lg border border-white/20"
            >
              ✕
            </button>
          </div>

          <div className="max-w-4xl max-h-[88vh] relative flex flex-col items-center p-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage.src}
              alt={fullscreenImage.caption || 'Imagem expandida'}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/20"
              referrerPolicy="no-referrer"
            />
            {fullscreenImage.caption && (
              <p className="mt-4 text-white/90 text-xs font-semibold text-center max-w-xl bg-black/70 px-4 py-2.5 rounded-xl backdrop-blur-md border border-white/10 shadow-xl">
                {fullscreenImage.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: LISTA DE ANÚNCIOS DE TEXTO REMUNERADOS & GESTÃO DE CAMPANHAS */}
      <AnimatePresence>
        {showReadAdsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-2xl w-full text-slate-100 shadow-2xl relative space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider">Anúncios & Campanhas Patrocinadas</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Promove o teu negócio ou lê anúncios para ganhar USDT</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReadAdsModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1 text-[11px] font-black uppercase">
                <button
                  onClick={() => setAdModalTab('EXPLORE')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    adModalTab === 'EXPLORE' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  📢 Anúncios Ativos (+USDT)
                </button>
                <button
                  onClick={() => setAdModalTab('MY_ADS')}
                  className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    adModalTab === 'MY_ADS' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  ⚙️ Meus Anúncios ({textAds.filter(a => a.userId === currentUserId).length})
                </button>
              </div>

              {/* TAB 1: EXPLORE / READ ADS */}
              {adModalTab === 'EXPLORE' && (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                  {textAds.filter(ad => (ad.status !== 'EXPIRED' && (!ad.expiresAt || ad.expiresAt > Date.now()))).length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400 font-bold uppercase">Sem anúncios ativos no momento.</p>
                      <button
                        onClick={() => {
                          setShowReadAdsModal(false);
                          setShowCreateAdModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        + Criar Primeiro Anúncio
                      </button>
                    </div>
                  ) : (
                    textAds.filter(ad => (ad.status !== 'EXPIRED' && (!ad.expiresAt || ad.expiresAt > Date.now()))).map((ad) => {
                      const hasRead = (ad.readByUsers || []).includes(currentUserId);
                      const daysLeft = ad.expiresAt ? Math.max(1, Math.ceil((ad.expiresAt - Date.now()) / 86400000)) : 7;
                      return (
                        <div
                          key={ad.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                            hasRead ? 'bg-slate-950/40 border-slate-800 opacity-70' : 'bg-slate-800/60 border-amber-500/20 hover:border-amber-500/50 shadow-lg'
                          }`}
                        >
                          {ad.imageUrl && (
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="w-full md:w-28 h-20 rounded-xl object-cover border border-slate-700/50 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                +{(ad.reward || 0).toFixed(2)} USDT
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Patrocinador: {ad.sponsor}</span>
                              {ad.targetCountry && (
                                <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" /> {ad.targetCity || 'Luanda'}, {ad.targetCountry}
                                </span>
                              )}
                              {ad.targetAudience && (
                                <span className="text-[8px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" /> {ad.targetAudience}
                                </span>
                              )}
                              <span className="text-[8px] text-amber-400 font-mono font-bold flex items-center gap-1 ml-auto">
                                <Clock className="w-2.5 h-2.5" /> {daysLeft}d exposição
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-slate-100 uppercase">{ad.title}</h4>
                            <p className="text-[10px] text-slate-300 font-medium line-clamp-2">{ad.content}</p>
                          </div>

                          <button
                            onClick={() => handleClaimAdReward(ad)}
                            className={`shrink-0 w-full md:w-auto px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              hasRead
                                ? 'bg-slate-800 text-slate-500 border border-slate-700'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md active:scale-95'
                            }`}
                          >
                            {hasRead ? 'Já Visualizado' : `Saber Mais (+${(ad.reward || 0).toFixed(2)} USDT)`}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: MY ADS & CAMPAIGNS */}
              {adModalTab === 'MY_ADS' && (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                  {textAds.filter(a => a.userId === currentUserId || a.sponsor === currentUserName).length === 0 ? (
                    <div className="text-center py-10 space-y-3 bg-slate-950/50 rounded-2xl border border-slate-800 p-6">
                      <Megaphone className="w-12 h-12 text-blue-500 mx-auto opacity-80" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-200">Ainda não tens campanhas ativas</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Cria um anúncio segmentado com imagens, cidades específicas (Luanda, Lubango, São Paulo) e atrai clientes em minutos.</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowReadAdsModal(false);
                          setShowCreateAdModal(true);
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                      >
                        + Lançar Nova Campanha de Anúncio
                      </button>
                    </div>
                  ) : (
                    textAds.filter(a => a.userId === currentUserId || a.sponsor === currentUserName).map((ad) => {
                      const isExpired = ad.expiresAt ? ad.expiresAt < Date.now() : false;
                      const remainingBudget = ad.remainingBudget || 0;
                      const daysLeft = ad.expiresAt ? Math.max(0, Math.ceil((ad.expiresAt - Date.now()) / 86400000)) : 0;

                      return (
                        <div
                          key={ad.id}
                          className={`p-4 rounded-2xl border transition-all space-y-3 ${
                            isExpired ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-800/80 border-blue-500/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                isExpired ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              }`}>
                                {isExpired ? '🔴 EXPIRADO' : `🟢 ATIVO (${daysLeft} Dias Restantes)`}
                              </span>
                              <h4 className="text-xs font-black text-slate-100 uppercase">{ad.title}</h4>
                            </div>

                            <button
                              onClick={() => {
                                setRenewingAdItem(ad);
                                setRenewDurationDays(7);
                                setRenewBudget(5000);
                              }}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              ⚡ Renovar Pagamento & Exposição
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 font-bold uppercase block text-[8px]">Público & Alvo</span>
                              <span className="text-slate-200 font-black flex items-center gap-1 truncate">
                                <Users className="w-3 h-3 text-purple-400" /> {ad.targetAudience || 'Geral'}
                              </span>
                            </div>

                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 font-bold uppercase block text-[8px]">Localização Geográfica</span>
                              <span className="text-slate-200 font-black flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-blue-400" /> {ad.targetCity || 'Luanda'}, {ad.targetCountry || 'Angola'}
                              </span>
                            </div>

                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                              <span className="text-slate-400 font-bold uppercase block text-[8px]">Orçamento Restante</span>
                              <span className="text-amber-400 font-mono font-black block">
                                {remainingBudget.toFixed(2)} USDT / {(ad.totalBudget || 5).toFixed(2)} USDT
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                <span>Desejas promover a tua marca ou produto?</span>
                <button
                  onClick={() => {
                    setShowReadAdsModal(false);
                    setShowCreateAdModal(true);
                  }}
                  className="text-amber-400 hover:underline font-black cursor-pointer flex items-center gap-1"
                >
                  + Criar Nova Campanha de Anúncio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RENOVAÇÃO DE ANÚNCIO EXPIRADO OU ATIVO */}
      <AnimatePresence>
        {renewingAdItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full text-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider">Renovar Pagamento do Anúncio</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase line-clamp-1">{renewingAdItem.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRenewingAdItem(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-semibold">
                {/* Duration */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Tempo de Exposição Adicional</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[3, 7, 15, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setRenewDurationDays(days)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border ${
                          renewDurationDays === days
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        +{days} dias
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Orçamento Adicional (USDT)</label>
                  <input
                    type="number"
                    value={renewBudget}
                    onChange={(e) => setRenewBudget(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold outline-none focus:border-amber-500"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Forma de Pagamento da Renovação</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRenewPaymentMethod('WALLET')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        renewPaymentMethod === 'WALLET' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase block">👛 Carteira (USDT)</span>
                      <span className="text-[9px] text-slate-400 font-mono">Saldo: {balance.toFixed(2)} USDT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRenewPaymentMethod('CARD')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        renewPaymentMethod === 'CARD' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase block">💳 Cartão de Crédito</span>
                      <span className="text-[9px] text-slate-400">Visa / Mastercard</span>
                    </button>
                  </div>
                </div>

                {renewPaymentMethod === 'CARD' && (
                  <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    <input
                      type="text"
                      placeholder="Número do Cartão (16 dígitos)"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 font-mono text-[10px]"
                    />
                    <input
                      type="text"
                      placeholder="Nome do Titular"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 text-[10px]"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => handleRenewAdCampaign(renewingAdItem)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                ⚡ Pagar Renovação ({renewBudget.toFixed(2)} USDT)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: CRIAR CAMPANHA DE ANÚNCIO COMPLETA COM IMAGENS, LOCALIZAÇÃO, PÚBLICO E DURAÇÃO */}
      <AnimatePresence>
        {showCreateAdModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 md:p-8 max-w-2xl w-full text-slate-100 shadow-2xl relative space-y-5 text-left max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-blue-400 tracking-wider">Criar Campanha de Anúncio Segmentada</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Define imagens, público alvo, cidades e tempo de exposição</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateAdModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                {/* Título e Conteúdo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Título da Campanha / Marca *</label>
                    <input
                      type="text"
                      placeholder="Ex: Robô de Sinais VIP Luanda"
                      value={newAdTitle}
                      onChange={(e) => setNewAdTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Link de Destino / WhatsApp (Opcional)</label>
                    <input
                      type="text"
                      placeholder="https://wa.me/244923000000"
                      value={newAdLink}
                      onChange={(e) => setNewAdLink(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Mensagem do Anúncio *</label>
                  <textarea
                    rows={2}
                    placeholder="Escreve o texto publicitário atrativo para captar clientes..."
                    value={newAdContent}
                    onChange={(e) => setNewAdContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-medium outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Imagem do Anúncio */}
                <div className="space-y-1.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Imagem Promocional do Anúncio (Carregar Ficheiro ou URL)
                    </label>
                    {newAdImageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewAdImageUrl('')}
                        className="text-[9px] text-red-400 font-bold hover:underline"
                      >
                        Remover Imagem
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => adImageInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      Carregar Imagem do Dispositivo
                    </button>

                    <input
                      type="file"
                      ref={adImageInputRef}
                      onChange={handleAdImageUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <span className="text-[9px] text-slate-500 font-bold uppercase hidden sm:inline">OU</span>

                    <input
                      type="text"
                      placeholder="Cole aqui a URL da imagem (Ex: https://...)"
                      value={newAdImageUrl}
                      onChange={(e) => setNewAdImageUrl(e.target.value)}
                      className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-[10px] outline-none focus:border-blue-500"
                    />
                  </div>

                  {newAdImageUrl && (
                    <div className="pt-2 flex items-center gap-3">
                      <img
                        src={newAdImageUrl}
                        alt="Preview"
                        className="w-24 h-16 rounded-xl object-cover border border-blue-500/30"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Imagem Carregada com Sucesso
                      </span>
                    </div>
                  )}
                </div>

                {/* Público Alvo & Localização Geográfica */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Público Alvo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <Users className="w-3 h-3 text-purple-400" /> Público Alvo Segmentado
                    </label>
                    <select
                      value={newAdTargetAudience}
                      onChange={(e) => setNewAdTargetAudience(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold outline-none focus:border-blue-500"
                    >
                      {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* País e Cidade */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-400" /> País & Cidade de Exposição
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={newAdTargetCountry}
                        onChange={(e) => {
                          const country = e.target.value;
                          setNewAdTargetCountry(country);
                          const cities = GEOGRAPHIC_LOCATIONS[country] || ['Luanda'];
                          setNewAdTargetCity(cities[0]);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold text-[11px] outline-none focus:border-blue-500"
                      >
                        {Object.keys(GEOGRAPHIC_LOCATIONS).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>

                      <select
                        value={newAdTargetCity}
                        onChange={(e) => setNewAdTargetCity(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold text-[11px] outline-none focus:border-blue-500"
                      >
                        {(GEOGRAPHIC_LOCATIONS[newAdTargetCountry] || ['Luanda']).map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tempo de Exposição em Dias */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" /> Tempo Determinado de Exposição (Dias)
                    </label>
                    <span className="text-[9px] text-amber-400 font-bold uppercase">
                      Validade até: {new Date(Date.now() + newAdDurationDays * 86400000).toLocaleDateString('pt-PT')}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 3, 7, 15, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setNewAdDurationDays(days)}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border ${
                          newAdDurationDays === days
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {days} {days === 1 ? 'Dia' : 'Dias'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orçamento & Recompensa */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Orçamento Total (USDT)</label>
                    <input
                      type="number"
                      value={newAdBudget}
                      onChange={(e) => setNewAdBudget(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-amber-400 font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Recompensa / Leitor (USDT)</label>
                    <input
                      type="number"
                      value={newAdReward}
                      onChange={(e) => setNewAdReward(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-400 font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-2 p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <label className="text-[10px] font-black text-blue-400 uppercase block">Forma de Pagamento da Campanha</label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAdPaymentMethod('WALLET')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        newAdPaymentMethod === 'WALLET' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase block flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5" /> Carteira de Saldo
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">Disponível: {balance.toFixed(2)} USDT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewAdPaymentMethod('CARD')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        newAdPaymentMethod === 'CARD' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase block flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Cartão de Crédito
                      </span>
                      <span className="text-[9px] text-slate-400">Visa, Mastercard, Multicaixa</span>
                    </button>
                  </div>

                  {newAdPaymentMethod === 'CARD' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800 mt-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase">Número do Cartão de Crédito/Débito</label>
                        <input
                          type="text"
                          placeholder="4000 1234 5678 9010"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono text-xs outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase">Nome do Titular</label>
                          <input
                            type="text"
                            placeholder="MATEUS SILVA"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-xs uppercase outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">Validade</label>
                            <input
                              type="text"
                              placeholder="MM/AA"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono text-xs text-center outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase">CVV</label>
                            <input
                              type="text"
                              placeholder="123"
                              maxLength={4}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono text-xs text-center outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateAdCampaign}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Megaphone className="w-4 h-4" />
                🚀 Pagar & Lançar Campanha ({newAdBudget.toFixed(2)} USDT • {newAdDurationDays} Dias)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: EDITAR PRODUTO DIGITAL / ANÚNCIO */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-lg w-full text-slate-900 shadow-2xl relative space-y-5 text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-black">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Editar Produto / Anúncio</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Atualiza as informações visíveis aos compradores</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editingProduct.postType === 'pdf' ? (
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Título do E-Book / Produto</label>
                    <input
                      type="text"
                      value={editPdfTitle}
                      onChange={(e) => setEditPdfTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Preço (USDT)</label>
                      <input
                        type="number"
                        value={editPdfPrice}
                        onChange={(e) => setEditPdfPrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-amber-700 font-bold outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Total de Páginas</label>
                      <input
                        type="text"
                        value={editPdfPagesCount}
                        onChange={(e) => setEditPdfPagesCount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Descrição do Produto</label>
                    <textarea
                      rows={3}
                      value={editPdfDescription}
                      onChange={(e) => setEditPdfDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium outline-none focus:border-blue-600 resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Inclui / Benefícios (separados por vírgula)</label>
                    <input
                      type="text"
                      value={editPdfIncludes}
                      onChange={(e) => setEditPdfIncludes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Amostra de Conteúdo / Pré-visualização</label>
                    <textarea
                      rows={3}
                      value={editPdfPreviewSnippet}
                      onChange={(e) => setEditPdfPreviewSnippet(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 font-mono text-[11px] outline-none focus:border-blue-600 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Moeda Cripto</label>
                      <input
                        type="text"
                        value={editP2pCoin}
                        onChange={(e) => setEditP2pCoin(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold outline-none focus:border-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Quantidade</label>
                      <input
                        type="number"
                        value={editP2pAmount}
                        onChange={(e) => setEditP2pAmount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Preço (USDT)</label>
                    <input
                      type="number"
                      value={editP2pPriceKz}
                      onChange={(e) => setEditP2pPriceKz(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-emerald-700 font-bold outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">IBAN / Transferência Local</label>
                    <input
                      type="text"
                      value={editP2pIban}
                      onChange={(e) => setEditP2pIban(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 text-[11px] outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-600 uppercase">🇧🇷 Chave PIX (Brasil)</label>
                      <input
                        type="text"
                        value={editP2pPix}
                        onChange={(e) => setEditP2pPix(e.target.value)}
                        placeholder="CPF, E-mail, Celular ou Chave PIX"
                        className="w-full bg-slate-50 border border-emerald-200 rounded-xl p-2.5 font-mono text-slate-800 text-[11px] outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-purple-600 uppercase">🌍 Pagamento Internacional</label>
                      <input
                        type="text"
                        value={editP2pInternational}
                        onChange={(e) => setEditP2pInternational(e.target.value)}
                        placeholder="Wise, Revolut, PayPal, Binance Pay ID"
                        className="w-full bg-slate-50 border border-purple-200 rounded-xl p-2.5 font-mono text-slate-800 text-[11px] outline-none focus:border-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEditedProduct}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Guardar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: ESTÚDIO DE CRIADORES & PROGRAMA DE MONETIZAÇÃO */}
      <AnimatePresence>
        {showCreatorStudio && (() => {
          const myPosts = posts.filter(p => p.userId === currentUserId);
          const myPostsCount = myPosts.length;
          const myTotalLikes = myPosts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
          const myTotalImpressions = myPosts.reduce((acc, p) => acc + (p.pdfDownloads || 0) * 12 + (p.likes?.length || 0) * 8 + 140, 0) + (myPostsCount * 65);
          const myAdImpressions = isMonetizationEnabled ? Math.floor(myTotalImpressions * 0.45) : 0;
          const myAdClicks = isMonetizationEnabled ? Math.floor(myAdImpressions * 0.08) : 0;
          const myEstimatedEarnings = isMonetizationEnabled ? Math.floor(myAdImpressions * 2.5 + myAdClicks * 15) : 0;
          const myUnclaimedEarnings = Math.max(0, myEstimatedEarnings - creatorAdEarningsClaimed);

          const step1Met = myPostsCount >= 5;
          const step2Met = myTotalLikes >= 10;
          const step3Met = myTotalImpressions >= 500;
          const step4Met = true;
          const totalStepsMet = (step1Met ? 1 : 0) + (step2Met ? 1 : 0) + (step3Met ? 1 : 0) + (step4Met ? 1 : 0);
          const monetizationProgress = Math.min(100, Math.round((totalStepsMet / 4) * 100));

          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-red-500/30 rounded-3xl p-5 md:p-7 max-w-2xl w-full text-slate-100 shadow-2xl relative space-y-5 text-left max-h-[90vh] overflow-y-auto no-scrollbar"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black uppercase text-red-400 tracking-wider">Estúdio de Criadores & Monetização</h3>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isMonetizationEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}>
                          {isMonetizationEnabled ? 'CONTA MONETIZADA ✓' : 'EM PROGRESSO'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Programa de Parcerias de Conteúdo • Crypton Social</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreatorStudio(false)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Studio Tab Selection */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-black">
                  <button
                    onClick={() => setCreatorStudioTab('progress')}
                    className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      creatorStudioTab === 'progress' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Requisitos de Monetização</span>
                  </button>
                  <button
                    onClick={() => setCreatorStudioTab('analytics')}
                    className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      creatorStudioTab === 'analytics' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Estatísticas & Rendimentos</span>
                  </button>
                </div>

                {/* TAB 1: REQUISITOS PARA MONETIZAR */}
                {creatorStudioTab === 'progress' && (
                  <div className="space-y-4">
                    {/* Overall Progress Banner */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-extrabold uppercase">
                        <span className="text-slate-300">Progresso do Programa de Criadores</span>
                        <span className="text-red-400 font-mono font-black">{monetizationProgress}% Concluído</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-500 to-amber-500 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${monetizationProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Cumpre as etapas abaixo como no Facebook ou YouTube. Assim que a monetização for ativada, os anúncios patrocinados aparecerão automaticamente nos teus posts e gerarão receitas por visualização e clique!
                      </p>
                    </div>

                    {/* Step Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Step 1 */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${
                        step1Met ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400">Etapa 1: Publicações</span>
                            <h4 className="text-xs font-black text-slate-100 uppercase mt-0.5">Mínimo 5 Posts Ativos</h4>
                          </div>
                          {step1Met ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="text-[10px] font-black text-amber-400 font-mono">{myPostsCount}/5</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          Publica conteúdos no feed para construir audiência.
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${
                        step2Met ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400">Etapa 2: Engajamento</span>
                            <h4 className="text-xs font-black text-slate-100 uppercase mt-0.5">10+ Reações / Curtidas</h4>
                          </div>
                          {step2Met ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="text-[10px] font-black text-amber-400 font-mono">{myTotalLikes}/10</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          Ganha reações e interações da comunidade.
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${
                        step3Met ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400">Etapa 3: Alcance</span>
                            <h4 className="text-xs font-black text-slate-100 uppercase mt-0.5">500+ Impressões Totais</h4>
                          </div>
                          {step3Met ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="text-[10px] font-black text-amber-400 font-mono">{myTotalImpressions}/500</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          Visualizações capturadas em todas as tuas publicações.
                        </p>
                      </div>

                      {/* Step 4 */}
                      <div className="p-3.5 rounded-2xl border bg-emerald-950/20 border-emerald-500/40">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400">Etapa 4: Diretrizes</span>
                            <h4 className="text-xs font-black text-slate-100 uppercase mt-0.5">Conformidade com Regras</h4>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          Perfil verificado em conformidade com as regras do feed.
                        </p>
                      </div>
                    </div>

                    {/* Action Toggle Monetization */}
                    <div className="pt-2">
                      <button
                        onClick={handleToggleMonetization}
                        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                          isMonetizationEnabled
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-red-500/20'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{isMonetizationEnabled ? 'Desativar Monetização da Conta' : 'Ativar Monetização de Criador'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: ANALYTICS & RENDIMENTOS */}
                {creatorStudioTab === 'analytics' && (
                  <div className="space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Visualizações (Impressões)</span>
                        <div className="text-xl font-black font-mono text-blue-400">
                          {myTotalImpressions.toLocaleString('pt-AO')}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">Capturadas nas tuas publicações</span>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Anúncios Exibidos</span>
                        <div className="text-xl font-black font-mono text-purple-400">
                          {myAdImpressions.toLocaleString('pt-AO')}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">Pop-ups exibidos nos teus posts</span>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Cliques em Anúncios</span>
                        <div className="text-xl font-black font-mono text-amber-400">
                          {myAdClicks.toLocaleString('pt-AO')}
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">Interações dos leitores</span>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Rendimento Estimado</span>
                        <div className="text-xl font-black font-mono text-emerald-400">
                          {(myEstimatedEarnings || 0).toFixed(2)} USDT
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">Partilha de receitas CPM/CPC</span>
                      </div>
                    </div>

                    {/* Unclaimed Earnings Box */}
                    <div className="bg-gradient-to-r from-emerald-950/40 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-left space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-emerald-400 block tracking-wider">Saldo Pendente de Monetização</span>
                        <div className="text-2xl font-black font-mono text-emerald-300">
                          {(myUnclaimedEarnings || 0).toFixed(2)} USDT
                        </div>
                      </div>

                      <button
                        onClick={() => handleClaimCreatorEarnings(myUnclaimedEarnings)}
                        disabled={myUnclaimedEarnings <= 0}
                        className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                          myUnclaimedEarnings > 0
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <Wallet className="w-4 h-4" />
                        <span>Transferir p/ Saldo Real</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL INTERATIVO DE PARTILHA DE POSTS E PRODUTOS */}
      <AnimatePresence>
        {sharingPost && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-lg w-full border border-slate-200 shadow-2xl text-slate-900 space-y-4 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#1877f2]/10 flex items-center justify-center text-[#1877f2]">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Partilhar Conteúdo</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Partilha no teu mural do Crypton Social ou com amigos</p>
                  </div>
                </div>
                <button
                  onClick={() => setSharingPost(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview of item being shared */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-bold border-b border-slate-200/60 pb-2">
                  <div className="w-6 h-6 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[10px] font-black">
                    {sharingPost.userName?.charAt(0)}
                  </div>
                  <span className="text-slate-900 font-extrabold">{sharingPost.userName}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">• Publicação Original</span>
                </div>

                {sharingPost.content && (
                  <p className="text-slate-700 font-medium italic line-clamp-3">
                    "{sharingPost.content}"
                  </p>
                )}

                {/* PDF Product Badge */}
                {sharingPost.pdfTitle && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 flex items-center gap-3">
                    <div className="w-10 h-12 bg-gradient-to-tr from-amber-500 to-amber-700 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs">
                      PDF
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-amber-950 text-xs block truncate">{sharingPost.pdfTitle}</span>
                      <span className="text-[10px] text-slate-500 font-medium block">Por {sharingPost.pdfAuthor}</span>
                      <span className="text-[10px] font-black text-amber-800 font-mono block">{(sharingPost.pdfPrice || 0).toFixed(2)} USDT</span>
                    </div>
                  </div>
                )}

                {/* P2P Product Badge */}
                {sharingPost.p2pCoin && (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-emerald-600 text-white rounded-md font-black text-[10px]">
                        {sharingPost.p2pCoin}
                      </span>
                      <span className="font-bold text-slate-800 text-xs">{sharingPost.p2pAmount} {sharingPost.p2pCoin}</span>
                    </div>
                    <span className="font-black text-emerald-800 font-mono text-xs">{(sharingPost.p2pPrice || 0).toFixed(2)} USDT</span>
                  </div>
                )}

                {/* Image preview */}
                {sharingPost.imageUrl && (
                  <div className="max-h-36 rounded-xl overflow-hidden border border-slate-200 bg-black/5">
                    <img src={sharingPost.imageUrl} alt="Anexo" className="object-cover w-full h-36" />
                  </div>
                )}
              </div>

              {/* Note / Comment textarea */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Adicionar Nota ao teu Mural (Opcional)
                </label>
                <textarea
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="Escreve aqui o teu comentário sobre esta publicação ou produto..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2] transition-all resize-none h-20 font-medium"
                />
              </div>

              {/* Actions Grid */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleConfirmShare}
                  disabled={isPublishingShare}
                  className="w-full py-3 bg-[#1877f2] hover:bg-[#166fe5] active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isPublishingShare ? 'A partilhar...' : 'Publicar no Meu Mural'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleShareToWhatsApp(sharingPost)}
                    className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleCopyPostLink(sharingPost)}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copiar Link</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
};

export default SocialView;

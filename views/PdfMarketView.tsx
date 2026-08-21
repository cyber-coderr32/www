import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  BookOpen, 
  Search, 
  PlusCircle, 
  Download, 
  DollarSign, 
  BookMarked, 
  ShoppingBag, 
  CheckCircle, 
  AlertCircle,
  FolderOpen,
  User,
  Sparkles,
  ChevronRight,
  Bookmark,
  Share2,
  Image as ImageIcon,
  Camera,
  Trash2
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { soundService } from '../services/soundService';
import { PdfBook } from '../types';

interface PdfMarketViewProps {
  balance: number;
  isDemo: boolean;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

const PDF_COVERS = [
  'from-blue-600 to-indigo-900',
  'from-emerald-600 to-teal-900',
  'from-purple-600 to-pink-900',
  'from-amber-500 to-orange-700',
  'from-red-600 to-rose-950',
  'from-slate-700 to-slate-900'
];

const PRESET_COVER_IMAGES = [
  { label: 'Aviator Pro', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80' },
  { label: 'Análise Técnica', url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=600&q=80' },
  { label: 'Mindset Trader', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80' },
  { label: 'Mines & Estratégia', url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80' },
  { label: 'Criptomoedas', url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80' }
];

const INITIAL_BOOKS: PdfBook[] = [
  {
    id: 'pdf_1',
    title: 'Segredos do Aviator em Angola',
    author: 'Mateus Manuel',
    description: 'Um guia prático com estratégias matemáticas avançadas para dominar o algoritmo do Aviator e maximizar retornos de forma consistente.',
    price: 1500,
    sellerId: 'admin_seller',
    sellerName: 'Mateus Pro Trader',
    coverColor: 'from-orange-600 to-red-600',
    coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
    downloads: 142
  },
  {
    id: 'pdf_2',
    title: 'Análise Técnica para Iniciantes de Kwanza',
    author: 'Dra. Sandra Silva',
    description: 'Aprenda os fundamentos de velas, suportes, resistências e médias móveis aplicados ao mercado de câmbio angolano e criptomoedas.',
    price: 3500,
    sellerId: 'admin_seller',
    sellerName: 'Sandra Silva',
    coverColor: 'from-blue-600 to-indigo-900',
    coverImage: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
    downloads: 98
  },
  {
    id: 'pdf_3',
    title: 'Mentalidade de Tubarão nas Apostas',
    author: 'Ricardo Santos',
    description: 'Gestão emocional rigorosa, disciplina tática e estratégias de banca para sobreviver e prosperar no competitivo mercado de apostas de Angola.',
    price: 2000,
    sellerId: 'user_seller_1',
    sellerName: 'Ricardo Tubarão',
    coverColor: 'from-emerald-600 to-teal-900',
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
    downloads: 65
  },
  {
    id: 'pdf_4',
    title: 'O Guia Supremo do Mines',
    author: 'António Kipungo',
    description: 'Descubra como padrões probabilísticos podem ajudá-lo a encontrar diamantes e evitar as minas terrestres no clássico jogo Mines.',
    price: 1200,
    sellerId: 'user_seller_2',
    sellerName: 'Kipungo Dourado',
    coverColor: 'from-purple-600 to-pink-900',
    coverImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
    createdAt: new Date().toISOString(),
    downloads: 211
  }
];

const PdfMarketView: React.FC<PdfMarketViewProps> = ({ balance, isDemo, onUpdateBalance, onBack }) => {
  const currentUserId = auth.currentUser?.uid || 'guest_user';
  const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Trader Convidado';

  const [activeTab, setActiveTab] = useState<'browse' | 'my-books' | 'sell'>('browse');
  const [books, setBooks] = useState<PdfBook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create book state
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [selectedCover, setSelectedCover] = useState(PDF_COVERS[0]);
  const [coverImage, setCoverImage] = useState<string>(PRESET_COVER_IMAGES[0].url);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [isListing, setIsListing] = useState(false);

  // Handle Cover Photo Upload (PNG, JPG, WEBP)
  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setCoverImage(event.target.result as string);
            soundService.playUISelect();
            showAlert('Foto de capa carregada com sucesso!', 'success');
          }
        };
        reader.readAsDataURL(file);
      } else {
        showAlert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).', 'error');
      }
    }
  };

  // Purchased books local list
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([]);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Success/Alert state
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Load and sync books
  useEffect(() => {
    // Load initial purchased books from localStorage
    const savedPurchased = JSON.parse(localStorage.getItem(`crypton_purchased_books_${currentUserId}`) || '["pdf_1"]'); // Default user starts with book 1 purchased for demo
    setPurchasedBookIds(savedPurchased);

    // Sync books
    const localBooks = localStorage.getItem('crypton_market_pdf_books');
    if (localBooks) {
      setBooks(JSON.parse(localBooks));
    } else {
      localStorage.setItem('crypton_market_pdf_books', JSON.stringify(INITIAL_BOOKS));
      setBooks(INITIAL_BOOKS);
    }

    // Attempt Firebase DB Sync if online
    try {
      const q = query(collection(db, 'pdf_books'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const dbBooks: PdfBook[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          dbBooks.push({
            id: doc.id,
            title: data.title,
            author: data.author,
            description: data.description,
            price: data.price,
            sellerId: data.sellerId,
            sellerName: data.sellerName,
            coverColor: data.coverColor || 'from-blue-600 to-indigo-900',
            coverImage: data.coverImage || data.imageUrl,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            downloads: data.downloads || 0
          });
        });
        
        if (dbBooks.length > 0) {
          // Merge with initial books to ensure variety
          const merged = [...dbBooks];
          INITIAL_BOOKS.forEach(ib => {
            if (!merged.some(mb => mb.id === ib.id)) {
              merged.push(ib);
            }
          });
          setBooks(merged);
          localStorage.setItem('crypton_market_pdf_books', JSON.stringify(merged));
        }
      }, (err) => {
        console.warn("Firestore PDF sync offline fallback used.");
      });
      return () => unsubscribe();
    } catch (e) {
      // Offline mode
    }
  }, [currentUserId]);

  // Handle PDF Purchase
  const handleBuyBook = (book: PdfBook) => {
    soundService.playUISelect();

    if (purchasedBookIds.includes(book.id)) {
      showAlert('Já possui este livro na sua Biblioteca!', 'success');
      return;
    }

    if (balance < book.price) {
      showAlert(`Saldo insuficiente! Este livro PDF custa ${book.price.toFixed(2)} USDT e o seu saldo é ${balance.toFixed(2)} USDT.`, 'error');
      return;
    }

    // Deduct balance
    onUpdateBalance(-book.price);
    soundService.playWin();

    // Add to library
    const updatedLibrary = [...purchasedBookIds, book.id];
    setPurchasedBookIds(updatedLibrary);
    localStorage.setItem(`crypton_purchased_books_${currentUserId}`, JSON.stringify(updatedLibrary));

    // Update book download count locally
    const updatedBooks = books.map(b => b.id === book.id ? { ...b, downloads: b.downloads + 1 } : b);
    setBooks(updatedBooks);
    localStorage.setItem('crypton_market_pdf_books', JSON.stringify(updatedBooks));

    showAlert(`Compra efetuada com sucesso! "${book.title}" adicionado à sua biblioteca.`, 'success');
    setActiveTab('my-books');
  };

  // Simulate PDF file selection
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setPdfFileName(file.name);
        soundService.playUISelect();
      } else {
        showAlert('Por favor, selecione apenas arquivos em formato PDF.', 'error');
      }
    }
  };

  // Handle List New Book
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim() || !newDesc.trim() || !newPrice.trim()) {
      showAlert('Por favor, preencha todos os campos.', 'error');
      return;
    }

    if (!pdfFileName) {
      showAlert('Por favor, faça o upload do arquivo PDF do livro.', 'error');
      return;
    }

    setIsListing(true);
    soundService.playUISelect();

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      showAlert('Por favor, digite um preço válido maior que zero.', 'error');
      setIsListing(false);
      return;
    }

    const finalCoverImage = coverImage || customCoverUrl.trim() || PRESET_COVER_IMAGES[0].url;

    const newBookPayload = {
      title: newTitle,
      author: newAuthor,
      description: newDesc,
      price: priceNum,
      sellerId: currentUserId,
      sellerName: currentUserName,
      coverColor: selectedCover,
      coverImage: finalCoverImage,
      downloads: 0,
      createdAt: new Date().toISOString()
    };

    // Firebase upload
    try {
      await addDoc(collection(db, 'pdf_books'), newBookPayload);
    } catch (e) {
      console.warn("Saving book to local storage fallback due to offline status.");
    }

    // Save to local storage anyway for instantaneous updates
    const currentList = JSON.parse(localStorage.getItem('crypton_market_pdf_books') || '[]');
    const completeBook: PdfBook = {
      id: 'pdf_local_' + Date.now(),
      ...newBookPayload
    };
    currentList.unshift(completeBook);
    localStorage.setItem('crypton_market_pdf_books', JSON.stringify(currentList));
    setBooks(currentList);

    // Also sync to Social Feed!
    try {
      const localPosts = JSON.parse(localStorage.getItem('cryptonbet_local_posts') || '[]');
      localPosts.unshift({
        id: 'p_pdf_' + Date.now(),
        userId: currentUserId,
        userName: currentUserName || 'Trader',
        postType: 'pdf',
        content: `Novo E-Book PDF publicado no mercado! '${newTitle}' por ${priceNum.toFixed(2)} USDT.`,
        pdfTitle: newTitle,
        pdfAuthor: newAuthor,
        pdfDescription: newDesc,
        pdfPrice: priceNum,
        pdfCoverColor: selectedCover,
        imageUrl: finalCoverImage,
        coverImage: finalCoverImage,
        pdfImage: finalCoverImage,
        pdfDownloads: 0,
        pdfCategory: 'E-Book',
        pdfLevel: 'Todos os Níveis',
        pdfIncludes: ['Download Seguro', 'Acesso Instantâneo'],
        pdfPagesCount: 45,
        pdfHasGuarantee: true,
        likes: [],
        comments: [],
        reactions: {},
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('cryptonbet_local_posts', JSON.stringify(localPosts));
    } catch (err) {
      console.warn("Error syncing to local posts:", err);
    }

    // Reset Form
    setNewTitle('');
    setNewAuthor('');
    setNewDesc('');
    setNewPrice('');
    setPdfFileName('');
    setCustomCoverUrl('');
    setCoverImage(PRESET_COVER_IMAGES[0].url);
    setIsListing(false);
    showAlert('O seu livro PDF foi listado com sucesso no Marketplace!', 'success');
    setActiveTab('browse');
  };

  // Simulate downloading the PDF book with progress bar
  const handleDownloadPdf = (book: PdfBook) => {
    if (downloadingBookId) return;
    
    soundService.playUISelect();
    setDownloadingBookId(book.id);
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setDownloadingBookId(null);
            soundService.playWin();
            showAlert(`Download concluído! O PDF "${book.title}" foi salvo com sucesso.`, 'success');
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Filter books by search query
  const filteredBooks = books.filter(b => 
    (b.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (b.author || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (b.description || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <div className="h-full w-full bg-[#0b0e11] text-white flex flex-col font-sans overflow-hidden">
      {/* HEADER BAR */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#131d27]/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { soundService.playUISelect(); onBack(); }}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#FFCC00] bg-[#FFCC00]/10 px-2 py-0.5 rounded-md">LIVROS DIGITAIS</span>
            </div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Crypton <span className="text-[#049444]">PDF Marketplace</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#131d27] border border-white/10 px-4 py-2 rounded-2xl">
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">O Teu Saldo</span>
            <span className="font-mono font-black text-sm text-[#FFCC00]">
              {balance.toFixed(2)} USDT
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/10 flex items-center justify-center text-[#FFCC00]">
            💰
          </div>
        </div>
      </header>

      {/* SUB NAV TABS */}
      <div className="px-6 py-3 bg-[#0d131a] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { soundService.playUISelect(); setActiveTab('browse'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'browse' ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Explorar Livros
          </button>
          <button 
            onClick={() => { soundService.playUISelect(); setActiveTab('my-books'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'my-books' ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            <BookMarked className="w-4 h-4" />
            Minha Biblioteca
            {purchasedBookIds.length > 0 && (
              <span className="bg-[#FFCC00] text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">
                {purchasedBookIds.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => { soundService.playUISelect(); setActiveTab('sell'); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'sell' ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            <PlusCircle className="w-4 h-4" />
            Vender Livro PDF
          </button>
        </div>

        {activeTab === 'browse' && (
          <div className="relative max-w-xs w-full hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#049444]" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar livros PDF..."
              className="w-full bg-white border-2 border-[#049444] focus:border-[#FFCC00] focus:ring-2 focus:ring-[#FFCC00]/40 rounded-xl pl-9 pr-4 py-1.5 text-xs font-black text-black placeholder-slate-500 focus:outline-none shadow-md transition-all"
            />
          </div>
        )}
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        
        {/* Custom Alert */}
        <AnimatePresence>
          {alertMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border shadow-xl ${
                alertMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {alertMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span className="text-xs font-semibold leading-relaxed">{alertMsg.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. BROWSE BOOKS TAB */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#131d27] to-[#0b1016] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#049444]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-xl space-y-2">
                <span className="text-[9px] font-black text-[#FFCC00] uppercase tracking-widest block">CONHECIMENTO É PODER</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Biblioteca Digital Crypton</h2>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Melhore as suas apostas, estratégias e inteligência financeira. Compre livros digitais em formato PDF de traders consagrados de Angola e receba download instantâneo diretamente na sua biblioteca.
                </p>
              </div>
            </div>

            {/* Mobile Search input */}
            <div className="relative w-full sm:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#049444]" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar livros PDF..."
                className="w-full bg-white border-2 border-[#049444] focus:border-[#FFCC00] focus:ring-2 focus:ring-[#FFCC00]/40 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black text-black placeholder-slate-500 focus:outline-none shadow-md transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBooks.map((book) => {
                const isOwned = purchasedBookIds.includes(book.id);
                return (
                  <motion.div 
                    key={book.id}
                    whileHover={{ y: -3 }}
                    className="bg-[#131d27]/50 border border-white/5 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-white/10 transition-all relative group overflow-hidden"
                  >
                    <div className="space-y-2.5">
                      {/* Interactive Visual Cover Photo Design */}
                      <div className={`h-40 sm:h-44 w-full bg-gradient-to-br ${book.coverColor} rounded-xl flex flex-col justify-between p-3 shadow-lg border border-white/10 relative overflow-hidden group-hover:shadow-[#049444]/20 transition-all duration-300`}>
                        {book.coverImage ? (
                          <>
                            <img 
                              src={book.coverImage} 
                              alt={book.title}
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {/* Realistic Book Gradient and Spine Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25 pointer-events-none" />
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 border-r border-black/30 backdrop-blur-[1px] pointer-events-none" />
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl transform translate-x-4 -translate-y-4" />
                          </>
                        )}
                        
                        <div className="flex justify-between items-start z-10">
                          <span className="text-[8px] font-black tracking-widest text-white bg-black/60 border border-white/20 backdrop-blur-md px-2 py-0.5 rounded-md uppercase flex items-center gap-1 shadow-sm">
                            <BookOpen className="w-2.5 h-2.5 text-[#FFCC00]" /> E-BOOK PDF
                          </span>
                          <span className="text-[8px] font-bold text-white/90 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                            {book.downloads} downloads
                          </span>
                        </div>

                        <div className="space-y-0.5 z-10 mt-auto">
                          <h4 className="text-xs sm:text-sm font-black text-white leading-tight drop-shadow-md uppercase line-clamp-2">{book.title}</h4>
                          <span className="text-[9px] text-[#FFCC00] font-bold block italic truncate drop-shadow">por {book.author}</span>
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-white/15 z-10">
                          <span className="text-[7px] font-black text-white/80 uppercase tracking-wider block">CRYPTON DIGITAL</span>
                          <span className="text-[7px] font-black text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded uppercase">VERIFICADO</span>
                        </div>
                      </div>

                      {/* Info & Details */}
                      <div className="space-y-1 px-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Autor: {book.author}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-snug line-clamp-2">
                          {book.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Preço</span>
                        <span className="text-xs sm:text-sm font-black font-mono text-[#FFCC00]">
                          {book.price.toFixed(2)} USDT
                        </span>
                      </div>

                      {isOwned ? (
                        <button 
                          onClick={() => { soundService.playUISelect(); setActiveTab('my-books'); }}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Biblioteca
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleBuyBook(book)}
                          className="px-3.5 py-1.5 bg-[#049444] hover:bg-[#037c39] active:scale-95 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-[#049444]/15"
                        >
                          Comprar PDF
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {filteredBooks.length === 0 && (
                <div className="col-span-full py-16 text-center bg-[#131d27]/20 border border-white/5 rounded-3xl">
                  <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Nenhum livro PDF encontrado</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Experimente pesquisar por outros termos ou publique o seu próprio livro digital!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MY BOOKS / LIBRARY TAB */}
        {activeTab === 'my-books' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">A Minha Biblioteca PDF</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Livros que comprou e estão prontos para descarregar</p>
              </div>
              <span className="px-3 py-1.5 bg-[#131d27] border border-white/10 rounded-xl text-xs font-black uppercase text-[#FFCC00]">
                {purchasedBookIds.length} Livros Digitais
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books
                .filter(b => purchasedBookIds.includes(b.id))
                .map((book) => {
                  const isDownloading = downloadingBookId === book.id;
                  return (
                    <motion.div 
                      key={book.id}
                      className="bg-[#131d27]/50 border border-white/5 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between hover:border-white/10 transition-all overflow-hidden"
                    >
                      <div className="space-y-2.5">
                        <div className={`h-36 sm:h-40 w-full bg-gradient-to-br ${book.coverColor} rounded-xl flex flex-col justify-between p-3 shadow-md border border-white/10 relative overflow-hidden group`}>
                          {book.coverImage ? (
                            <>
                              <img 
                                src={book.coverImage} 
                                alt={book.title} 
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25 pointer-events-none" />
                              <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 border-r border-black/30 backdrop-blur-[1px] pointer-events-none" />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-black/15 mix-blend-overlay" />
                          )}

                          <div className="flex justify-between items-start z-10">
                            <span className="text-[8px] font-black tracking-widest text-white bg-emerald-600/90 border border-emerald-400/30 backdrop-blur-md px-2 py-0.5 rounded uppercase flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5 text-white" /> Adquirido
                            </span>
                            <BookMarked className="w-3.5 h-3.5 text-white/90" />
                          </div>

                          <div className="space-y-0.5 z-10 mt-auto">
                            <h4 className="text-xs sm:text-sm font-black text-white leading-tight uppercase truncate drop-shadow">{book.title}</h4>
                            <span className="text-[9px] text-[#FFCC00] font-semibold block italic truncate">por {book.author}</span>
                          </div>
                        </div>

                        <div className="space-y-1 px-0.5">
                          <h4 className="text-xs font-bold text-white uppercase truncate">{book.title}</h4>
                          <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-snug line-clamp-2">
                            {book.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 space-y-2">
                        <div className="flex justify-between text-[7px] text-slate-500 font-black uppercase tracking-widest">
                          <span>Formato: PDF</span>
                          <span>~4.8 MB</span>
                        </div>

                        {isDownloading ? (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400">
                              <span className="animate-pulse">A Descarregar...</span>
                              <span className="font-mono">{downloadProgress}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#049444] h-full rounded-full transition-all duration-150" 
                                style={{ width: `${downloadProgress}%` }} 
                              />
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleDownloadPdf(book)}
                            className="w-full py-2 bg-[#049444] hover:bg-[#037c39] text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Descarregar PDF
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

              {purchasedBookIds.length === 0 && (
                <div className="col-span-full py-16 text-center bg-[#131d27]/20 border border-white/5 rounded-3xl">
                  <BookMarked className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">A sua biblioteca está vazia</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Navegue no Marketplace e compre livros digitais para ver nesta secção.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. LIST / SELL BOOK TAB */}
        {activeTab === 'sell' && (
          <div className="max-w-xl mx-auto bg-[#131d27]/30 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-[#FFCC00]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#FFCC00]">PUBLIQUE E VENDA EM USDT</span>
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight">Listar Livro PDF para Venda</h2>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-relaxed">
                Venda as suas estratégias, análises e truques em PDF para a maior comunidade de traders de Angola. Você fica com 100% dos ganhos das suas vendas!
              </p>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Título do Livro</label>
                  <input 
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value.slice(0, 80))}
                    placeholder="Ex: Segredos Ocultos do Aviator"
                    className="w-full bg-[#131d27] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#049444]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Nome do Autor</label>
                  <input 
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value.slice(0, 50))}
                    placeholder="Ex: Manuel Antunes Pro"
                    className="w-full bg-[#131d27] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#049444]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Descrição do E-Book</label>
                <textarea 
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value.slice(0, 300))}
                  placeholder="Escreva um resumo cativante sobre os tópicos que o seu PDF ensina para convencer os compradores..."
                  rows={3}
                  className="w-full bg-[#131d27] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#049444] resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Preço de Venda (USDT)</label>
                  <input 
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Preço em USDT, ex: 2.50"
                    className="w-full bg-[#131d27] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#049444]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Fazer Upload do Arquivo PDF</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={handlePdfFileChange}
                      className="hidden" 
                      id="pdf-upload-market"
                    />
                    <label 
                      htmlFor="pdf-upload-market"
                      className="w-full bg-[#131d27] border border-dashed border-white/20 rounded-xl px-4 py-2 text-xs text-slate-400 flex items-center justify-between cursor-pointer hover:border-[#049444] hover:text-white transition-all overflow-hidden"
                    >
                      <span className="truncate max-w-[150px]">{pdfFileName || 'Selecionar arquivo .pdf'}</span>
                      <Download className="w-3.5 h-3.5 shrink-0 text-[#FFCC00]" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Cover Photo Upload & Customizer */}
              <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#FFCC00]" /> Foto da Capa do Livro PDF
                  </label>
                  <span className="text-[8px] font-bold text-emerald-400 uppercase">Aparece no Card do Marketplace</span>
                </div>

                {/* Upload or URL options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCoverImageUpload}
                      id="cover-image-upload" 
                      className="hidden"
                    />
                    <label 
                      htmlFor="cover-image-upload"
                      className="w-full flex items-center justify-center gap-2 p-2.5 bg-[#131d27] hover:bg-[#1a2735] text-white border border-white/10 hover:border-[#049444] rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#FFCC00]" /> Carregar Foto do Computador/Celular
                    </label>
                  </div>

                  <div>
                    <input 
                      type="url"
                      value={customCoverUrl}
                      onChange={(e) => {
                        setCustomCoverUrl(e.target.value);
                        if (e.target.value.trim()) setCoverImage(e.target.value.trim());
                      }}
                      placeholder="Ou cole a URL da imagem da capa..."
                      className="w-full bg-[#131d27] border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-[#049444]"
                    />
                  </div>
                </div>

                {/* Cover Presets */}
                <div className="space-y-1.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Ou selecione uma capa temática premium:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COVER_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setCoverImage(preset.url);
                          setCustomCoverUrl('');
                          soundService.playUISelect();
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase transition-all cursor-pointer ${
                          coverImage === preset.url 
                            ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-md' 
                            : 'bg-black/30 text-slate-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-4 h-4 rounded object-cover" />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gradient Fallback Selector */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Cor de Fundo / Gradiente:</span>
                  <div className="flex gap-2">
                    {PDF_COVERS.map((cov) => (
                      <button
                        key={cov}
                        type="button"
                        onClick={() => setSelectedCover(cov)}
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cov} border-2 transition-all cursor-pointer ${selectedCover === cov ? 'border-[#FFCC00] scale-110 shadow' : 'border-transparent hover:scale-105'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Card Preview with Cover Photo */}
              <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-2">
                <span className="text-[8px] font-black text-[#FFCC00] uppercase tracking-widest block flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Pré-visualização do Card no Marketplace
                </span>
                <div className="flex gap-4 items-center">
                  <div className={`w-20 h-28 bg-gradient-to-br ${selectedCover} rounded-xl relative overflow-hidden shadow-xl shrink-0 border border-white/20`}>
                    {coverImage ? (
                      <>
                        <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white/30 border-r border-black/40 pointer-events-none" />
                      </>
                    ) : null}
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs px-1 py-0.2 rounded text-[6px] font-black text-white">PDF</div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <span className="text-[7px] font-black text-white uppercase leading-tight block truncate drop-shadow">{newTitle || 'Título do Livro'}</span>
                      <span className="text-[6px] text-[#FFCC00] font-bold block truncate drop-shadow">{newAuthor || 'Autor'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-black text-white uppercase">{newTitle || 'Seu E-Book PDF com Foto de Capa'}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{newDesc || 'A descrição e a foto da capa serão exibidas em destaque para todos os compradores do mercado.'}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black font-mono text-[#FFCC00]">{parseFloat(newPrice) ? parseFloat(newPrice).toFixed(2) + ' USDT' : '--- USDT'}</span>
                      <span className="text-[8px] bg-[#049444]/20 text-emerald-400 px-2 py-0.5 rounded font-black uppercase">Foto Ativa</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isListing}
                className="w-full py-3.5 bg-[#049444] hover:bg-[#037c39] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#049444]/20 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                {isListing ? 'A Publicar E-Book...' : 'Publicar Livro com Foto no Marketplace'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default PdfMarketView;

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
  Share2
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { soundService } from '../services/soundService';

interface PdfBook {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  sellerId: string;
  sellerName: string;
  coverColor: string;
  createdAt: string;
  downloads: number;
}

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
  const [pdfFileName, setPdfFileName] = useState('');
  const [isListing, setIsListing] = useState(false);

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

    const newBookPayload = {
      title: newTitle,
      author: newAuthor,
      description: newDesc,
      price: priceNum,
      sellerId: currentUserId,
      sellerName: currentUserName,
      coverColor: selectedCover,
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBooks.map((book) => {
                const isOwned = purchasedBookIds.includes(book.id);
                return (
                  <motion.div 
                    key={book.id}
                    whileHover={{ y: -4 }}
                    className="bg-[#131d27]/50 border border-white/5 rounded-3xl p-4 flex flex-col justify-between hover:border-white/10 transition-all relative group"
                  >
                    <div className="space-y-4">
                      {/* Interactive Cover Design */}
                      <div className={`h-48 w-full bg-gradient-to-br ${book.coverColor} rounded-2xl flex flex-col justify-between p-4 shadow-xl border border-white/10 relative overflow-hidden group-hover:shadow-[#049444]/10 transition-all duration-300`}>
                        <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl transform translate-x-4 -translate-y-4" />
                        
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] font-black tracking-widest text-white/80 bg-black/20 backdrop-blur-md px-2 py-0.5 rounded uppercase">E-BOOK PDF</span>
                          <BookOpen className="w-5 h-5 text-white/80" />
                        </div>

                        <div className="space-y-1.5 z-10">
                          <h4 className="text-base font-black text-white leading-tight drop-shadow uppercase">{book.title}</h4>
                          <span className="text-[10px] text-white/70 font-semibold block italic">por {book.author}</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                          <span className="text-[7px] font-black text-[#FFCC00] uppercase tracking-wider block">CRYPTON DIGITAL</span>
                          <span className="text-[8px] font-bold text-white/60">{book.downloads} downloads</span>
                        </div>
                      </div>

                      {/* Info & Details */}
                      <div className="space-y-2 px-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Autor: {book.author}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed line-clamp-3">
                          {book.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Preço Único</span>
                        <span className="text-sm font-black font-mono text-[#FFCC00]">
                          {book.price.toFixed(2)} USDT
                        </span>
                      </div>

                      {isOwned ? (
                        <button 
                          onClick={() => { soundService.playUISelect(); setActiveTab('my-books'); }}
                          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Ver Biblioteca
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleBuyBook(book)}
                          className="px-5 py-2.5 bg-[#049444] hover:bg-[#037c39] active:scale-95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#049444]/15"
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
                      className="bg-[#131d27]/50 border border-white/5 rounded-3xl p-4 flex flex-col justify-between hover:border-white/10 transition-all"
                    >
                      <div className="space-y-4">
                        <div className={`h-40 w-full bg-gradient-to-br ${book.coverColor} rounded-2xl flex flex-col justify-between p-4 shadow-lg border border-white/10 relative overflow-hidden`}>
                          <div className="absolute inset-0 bg-black/15 mix-blend-overlay" />
                          <div className="flex justify-between items-start">
                            <span className="text-[7px] font-black tracking-widest text-white/80 bg-emerald-500/80 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" /> Adquirido
                            </span>
                            <BookMarked className="w-4 h-4 text-white/80" />
                          </div>
                          <div className="space-y-1 z-10">
                            <h4 className="text-sm font-black text-white leading-tight uppercase truncate">{book.title}</h4>
                            <span className="text-[9px] text-white/70 font-semibold block italic">por {book.author}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 px-1">
                          <h4 className="text-sm font-bold text-white uppercase truncate">{book.title}</h4>
                          <p className="text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed line-clamp-2">
                            {book.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                        <div className="flex justify-between text-[8px] text-slate-500 font-black uppercase tracking-widest">
                          <span>Formato: PDF Seguro</span>
                          <span>Tamanho: ~4.8 MB</span>
                        </div>

                        {isDownloading ? (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
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
                            className="w-full py-2.5 bg-[#049444] hover:bg-[#037c39] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#049444]/15 active:scale-95"
                          >
                            <Download className="w-4 h-4" />
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
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Fazer Upload do PDF</label>
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
                      <Download className="w-3.5 h-3.5 shrink-0" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Design Customizer cover preview */}
              <div className="space-y-2">
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Estilo da Capa do Livro</label>
                <div className="flex gap-2.5">
                  {PDF_COVERS.map((cov) => (
                    <button
                      key={cov}
                      type="button"
                      onClick={() => setSelectedCover(cov)}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cov} border-2 transition-all cursor-pointer ${selectedCover === cov ? 'border-[#FFCC00] scale-110 shadow' : 'border-transparent hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Live Card Preview */}
              <div className="p-4 bg-black/20 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest block">Pré-visualização do Marketplace</span>
                <div className="flex gap-4 items-center">
                  <div className={`w-16 h-20 bg-gradient-to-br ${selectedCover} rounded-lg flex flex-col justify-between p-2 shadow shrink-0 border border-white/10`}>
                    <BookOpen className="w-3 h-3 text-white/80" />
                    <span className="text-[6px] font-black text-white uppercase leading-none truncate">{newTitle || 'Título do Livro'}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase">{newTitle || 'Seu Lindo E-Book PDF'}</h4>
                    <span className="text-[9px] text-slate-400 font-bold">Autor: {newAuthor || 'Seu Nome'}</span>
                    <span className="text-[10px] font-bold text-[#FFCC00] block">{parseFloat(newPrice) ? '' + parseFloat(newPrice).toFixed(2) + ' USDT' : '--- USDT'}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isListing}
                className="w-full py-3 bg-[#049444] hover:bg-[#037c39] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#049444]/20 cursor-pointer active:scale-95"
              >
                {isListing ? 'A Publicar E-Book...' : 'Publicar Livro no Marketplace'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default PdfMarketView;

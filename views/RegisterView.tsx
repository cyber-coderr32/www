
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import TermsView from './TermsView';
import PrivacyView from './PrivacyView';
import RefundView from './RefundView';

interface RegisterViewProps {
  onRegister: (name: string, email: string, phone: string, pass: string) => void;
  onLoginGoogle: () => void;
  onGoToLogin: () => void;
  onOpenLegalView?: (view: 'TERMS' | 'PRIVACY' | 'REFUND') => void;
  onQuickAdmin?: () => void;
}

const COUNTRY_CODES = [
  { code: '+244', country: 'Angola', flag: '🇦🇴' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+258', country: 'Moçambique', flag: '🇲🇿' },
  { code: '+238', country: 'Cabo Verde', flag: '🇨🇻' },
  { code: '+239', country: 'S. Tomé e Príncipe', flag: '🇸🇹' },
  { code: '+245', country: 'Guiné-Bissau', flag: '🇬🇼' },
];

const RegisterView: React.FC<RegisterViewProps> = ({ onRegister, onLoginGoogle, onGoToLogin, onOpenLegalView, onQuickAdmin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+244');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [activeModal, setActiveModal] = useState<'TERMS' | 'PRIVACY' | 'REFUND' | null>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 786);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 786);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRegister = () => {
    const trimmedEmail = (email || '').trim();
    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();
    const trimmedPassword = (password || '').trim();

    if (!trimmedName) {
      alert("Por favor, introduza o seu nome completo.");
      return;
    }
    if (!trimmedEmail) {
      alert("Por favor, introduza um endereço de e-mail.");
      return;
    }
    if (!trimmedPhone) {
      alert("Por favor, introduza o seu número de telefone.");
      return;
    }
    if (!trimmedPassword) {
      alert("Por favor, defina uma palavra-passe.");
      return;
    }
    if (trimmedPassword.length < 6) {
      alert("A palavra-passe deve conter pelo menos 6 caracteres.");
      return;
    }
    if (!acceptedTerms) {
      alert("Para continuar, deves aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }

    const fullPhone = `${countryCode} ${trimmedPhone}`;
    onRegister(trimmedName, trimmedEmail, fullPhone, trimmedPassword);
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-3 sm:p-6 bg-[#0b0e11] overflow-y-auto no-scrollbar">
      <div className={`w-full max-w-md bg-white ${isDesktop ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-3xl'} shadow-2xl my-2 sm:my-8 transition-all duration-300 max-h-[95vh] overflow-y-auto no-scrollbar`}>
        
        <div className={`text-center ${isDesktop ? 'mb-8' : 'mb-4'}`}>
          <div className={`flex justify-center items-center ${isDesktop ? 'mb-6' : 'mb-4'}`}>
            <div className="bg-[#049444] px-3 py-1 sm:px-4 sm:py-1.5 rounded shadow-lg">
              <span className={`text-white font-black italic ${isDesktop ? 'text-xl' : 'text-sm'} tracking-tighter`}>CRYPTON</span>
            </div>
            <span className={`text-[#049444] font-black italic ${isDesktop ? 'text-xl' : 'text-sm'} tracking-tighter ml-2`}>BET</span>
          </div>
          <h2 className={`${isDesktop ? 'text-2xl' : 'text-lg'} font-black tracking-tight text-slate-800 uppercase`}>Cria a tua Conta</h2>
          <p className="text-slate-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5">Regista-te e começa a ganhar hoje</p>
        </div>

        <div className={`space-y-2.5 sm:space-y-4`}>
          <div className="space-y-0.5 sm:space-y-1">
            <label className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">Nome Completo</label>
            <input 
              type="text" 
              placeholder="Ex: João da Silva" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 sm:px-5 py-2.5 sm:py-4 text-slate-800 text-xs sm:text-base outline-none focus:border-[#049444] transition-all font-medium"
            />
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <label className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">E-mail</label>
            <input 
              type="email" 
              placeholder="exemplo@email.ao" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 sm:px-5 py-2.5 sm:py-4 text-slate-800 text-xs sm:text-base outline-none focus:border-[#049444] transition-all font-medium"
            />
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <label className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">Telefone</label>
            <div className="flex gap-1.5 sm:gap-2">
              <div className="relative shrink-0">
                <select 
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-full bg-slate-100 border border-slate-200 rounded-xl px-2 sm:px-3 text-slate-800 outline-none focus:border-[#049444] transition-all font-bold text-[9px] sm:text-xs appearance-none pr-6 sm:pr-8 cursor-pointer"
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <svg className="w-2.5 h-2.5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              <input 
                type="tel" 
                placeholder="900 000 000" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 sm:px-5 py-2.5 sm:py-4 text-slate-800 text-xs sm:text-base outline-none focus:border-[#049444] transition-all font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <label className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase ml-1 tracking-widest">Palavra-passe</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 sm:px-5 py-2.5 sm:py-4 text-slate-800 text-xs sm:text-base outline-none focus:border-[#049444] transition-all font-medium"
            />
          </div>

          {/* Terms and Policies Checkbox */}
          <div className="pt-1 flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => setAcceptedTerms(!acceptedTerms)}
              className={`w-4 h-4 rounded shrink-0 flex items-center justify-center mt-0.5 border transition-all cursor-pointer ${
                acceptedTerms 
                  ? 'bg-[#049444] border-[#049444] text-white' 
                  : 'bg-slate-100 border-slate-300'
              }`}
            >
              {acceptedTerms && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium leading-tight">
              Li e aceito os{' '}
              <button
                type="button"
                onClick={() => onOpenLegalView ? onOpenLegalView('TERMS') : setActiveModal('TERMS')}
                className="text-[#049444] font-bold hover:underline cursor-pointer"
              >
                Termos de Uso
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => onOpenLegalView ? onOpenLegalView('PRIVACY') : setActiveModal('PRIVACY')}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Política de Privacidade
              </button>{' '}
              e{' '}
              <button
                type="button"
                onClick={() => onOpenLegalView ? onOpenLegalView('REFUND') : setActiveModal('REFUND')}
                className="text-purple-600 font-bold hover:underline cursor-pointer"
              >
                Reembolsos
              </button>
              .
            </p>
          </div>

          <button 
            onClick={handleRegister}
            className="w-full bg-[#049444] hover:bg-[#037235] text-white font-black py-3.5 sm:py-5 rounded-xl shadow-xl shadow-[#049444]/20 transition-all active:scale-[0.98] uppercase tracking-[0.1em] text-[10px] sm:text-[11px] mt-1 sm:mt-4 cursor-pointer"
          >
            Registar Agora
          </button>

          <div className="flex items-center gap-2 py-2">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Ou com</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button 
            onClick={onLoginGoogle}
            className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-3 sm:py-4 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[9px] sm:text-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
        </div>

        <button 
          onClick={onGoToLogin}
          className="w-full mt-5 sm:mt-6 text-slate-500 hover:text-[#049444] text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
        >
          Já tens conta? <span className="text-[#049444] font-black underline">Fazer Login</span>
        </button>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Registo com Criptografia SSL & Firebase</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            <button
              type="button"
              onClick={() => onOpenLegalView ? onOpenLegalView('TERMS') : setActiveModal('TERMS')}
              className="hover:text-[#049444] cursor-pointer underline"
            >
              Termos
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegalView ? onOpenLegalView('PRIVACY') : setActiveModal('PRIVACY')}
              className="hover:text-blue-600 cursor-pointer underline"
            >
              Privacidade
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegalView ? onOpenLegalView('REFUND') : setActiveModal('REFUND')}
              className="hover:text-purple-600 cursor-pointer underline"
            >
              Reembolsos
            </button>
          </div>
        </div>
      </div>

      {/* Modal Overlay for Legal Views */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl my-auto">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            {activeModal === 'TERMS' && <TermsView onBack={() => setActiveModal(null)} />}
            {activeModal === 'PRIVACY' && <PrivacyView onBack={() => setActiveModal(null)} />}
            {activeModal === 'REFUND' && <RefundView onBack={() => setActiveModal(null)} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterView;


import React, { useState } from 'react';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Mail, ShieldCheck, FileText, Lock, RefreshCw, X } from 'lucide-react';
import { authService } from '../services/authService';
import TermsView from './TermsView';
import PrivacyView from './PrivacyView';
import RefundView from './RefundView';

interface LoginViewProps {
  onLogin: (email: string, pass: string) => void;
  onLoginGoogle: () => void;
  onGoToRegister: () => void;
  onOpenLegalView?: (view: 'TERMS' | 'PRIVACY' | 'REFUND') => void;
  onQuickAdmin?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onLoginGoogle, onGoToRegister, onOpenLegalView, onQuickAdmin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT'>('LOGIN');
  const [activeModal, setActiveModal] = useState<'TERMS' | 'PRIVACY' | 'REFUND' | null>(null);
  
  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 786);

  React.useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 786);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = resetEmail.trim();
    if (!trimmed) {
      setResetMessage({ type: 'error', text: 'Por favor, introduza o seu endereço de e-mail.' });
      return;
    }

    setResetLoading(true);
    setResetMessage(null);

    try {
      const res = await authService.resetPassword(trimmed);
      setResetMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setResetMessage({ type: 'error', text: err.message || 'Erro ao enviar o e-mail de recuperação.' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-3 sm:p-6 bg-[#0b0e11]">
      <div className={`w-full max-w-sm bg-white ${isDesktop ? 'p-8 rounded-3xl' : 'p-5 rounded-2xl'} shadow-2xl overflow-y-auto no-scrollbar max-h-[95vh]`}>
        <div className={`text-center ${isDesktop ? 'mb-6' : 'mb-4'}`}>
          <div className={`flex justify-center items-center ${isDesktop ? 'mb-5' : 'mb-3'}`}>
            <div className="bg-[#049444] px-3 py-1 sm:px-4 sm:py-1.5 rounded shadow-lg">
              <span className={`text-white font-black italic ${isDesktop ? 'text-xl' : 'text-sm'} tracking-tighter`}>CRYPTON</span>
            </div>
            <span className={`text-[#049444] font-black italic ${isDesktop ? 'text-xl' : 'text-sm'} tracking-tighter ml-2`}>BET</span>
          </div>

          {mode === 'LOGIN' ? (
            <>
              <h1 className={`${isDesktop ? 'text-2xl' : 'text-lg'} font-black tracking-tight text-slate-800 uppercase`}>Boas-vindas</h1>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5">Introduza os seus dados para aceder</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-[#049444]/10 text-[#049444] rounded-2xl flex items-center justify-center mx-auto mb-2 border border-[#049444]/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className={`${isDesktop ? 'text-xl' : 'text-lg'} font-black tracking-tight text-slate-800 uppercase`}>Recuperar Senha</h1>
              <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5">Enviaremos as instruções de redefinição para o seu e-mail</p>
            </>
          )}
        </div>

        {mode === 'LOGIN' ? (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 ml-1">E-mail</label>
              <input 
                type="email" 
                placeholder="Digite o seu e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-slate-800 outline-none focus:border-[#049444] transition-all font-medium text-xs sm:text-base"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1 sm:mb-1.5 ml-1">
                <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Palavra-passe</label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetMessage(null);
                    setMode('FORGOT');
                  }}
                  className="text-[9px] sm:text-[11px] font-bold text-[#049444] hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-slate-800 outline-none focus:border-[#049444] transition-all font-medium text-xs sm:text-base"
              />
            </div>
            <button 
              onClick={() => {
                const trimmedEmail = email.trim();
                if (!trimmedEmail) {
                  alert("Por favor, introduza o seu e-mail.");
                  return;
                }
                if (!password) {
                  alert("Por favor, introduza a sua palavra-passe.");
                  return;
                }
                onLogin(trimmedEmail, password);
              }}
              className="w-full bg-[#049444] hover:bg-[#037235] text-white font-black py-3 sm:py-4 rounded-xl shadow-lg shadow-[#049444]/20 transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] sm:text-sm cursor-pointer"
            >
              Entrar Agora
            </button>

            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ou entra com</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <button 
              onClick={onLoginGoogle}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 sm:py-4 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] sm:text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendResetLink} className="space-y-4">
            {resetMessage && (
              <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-medium ${
                resetMessage.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {resetMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{resetMessage.text}</span>
              </div>
            )}

            <div>
              <label className="block text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                E-mail da Conta
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="exemplo@e-mail.com" 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-slate-800 outline-none focus:border-[#049444] transition-all font-medium text-xs sm:text-sm"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button 
              type="submit"
              disabled={resetLoading}
              className="w-full bg-[#049444] hover:bg-[#037235] text-white font-black py-3.5 rounded-xl shadow-lg shadow-[#049444]/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {resetLoading ? 'A enviar...' : 'Enviar Link de Recuperação'}
            </button>

            <button 
              type="button"
              onClick={() => setMode('LOGIN')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Login
            </button>
          </form>
        )}

        <div className="mt-6 sm:mt-8 text-center flex flex-col gap-3">
          {mode === 'LOGIN' && (
            <button 
              onClick={onGoToRegister}
              className="text-slate-500 hover:text-[#049444] text-[10px] sm:text-xs font-bold transition-colors cursor-pointer"
            >
              Ainda não tens conta? <span className="text-[#049444] font-black underline">Regista-te aqui</span>
            </button>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Autenticação Real & Protegida</span>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider pt-1">
              <button
                type="button"
                onClick={() => onOpenLegalView ? onOpenLegalView('TERMS') : setActiveModal('TERMS')}
                className="hover:text-[#049444] transition-colors cursor-pointer underline decoration-slate-300"
              >
                Termos de Uso
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegalView ? onOpenLegalView('PRIVACY') : setActiveModal('PRIVACY')}
                className="hover:text-blue-600 transition-colors cursor-pointer underline decoration-slate-300"
              >
                Privacidade
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegalView ? onOpenLegalView('REFUND') : setActiveModal('REFUND')}
                className="hover:text-purple-600 transition-colors cursor-pointer underline decoration-slate-300"
              >
                Reembolsos
              </button>
            </div>
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

export default LoginView;

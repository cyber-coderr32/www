import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React error intercepted:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    try {
      localStorage.removeItem('skyhigh_view');
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  private handleClearCache = () => {
    try {
      const keysToPreserve = ['cryptonbet_local_users_db', 'cryptonbet_local_user_session'];
      const preserved: Record<string, string | null> = {};
      keysToPreserve.forEach(k => {
        preserved[k] = localStorage.getItem(k);
      });
      localStorage.clear();
      keysToPreserve.forEach(k => {
        if (preserved[k]) localStorage.setItem(k, preserved[k]!);
      });
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[100dvh] w-full bg-[#0b0e11] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans z-[9999] relative">
          <div className="max-w-md w-full bg-[#131d27] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto text-red-500 shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>
            
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">
                Ops! Instabilidade na Tela
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                Encontrámos uma inconsistência ao processar os elementos desta interface. O seu saldo, conta e apostas permanecem 100% seguros.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-left max-h-32 overflow-y-auto no-scrollbar">
                <p className="text-[10px] font-mono text-red-400 font-bold break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3.5 bg-gradient-to-r from-[#049444] to-[#037235] hover:from-[#05a84e] hover:to-[#04863e] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar Recarregar Tela</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
              >
                <Home className="w-4 h-4" />
                <span>Voltar ao Início (Dashboard)</span>
              </button>

              <button
                onClick={this.handleClearCache}
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Cache do Dispositivo & Restaurar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

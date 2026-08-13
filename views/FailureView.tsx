import React from 'react';
import { XCircle, RefreshCw, MessageSquare, AlertTriangle, ArrowLeft, Home } from 'lucide-react';

interface FailureViewProps {
  title?: string;
  message?: string;
  errorCode?: string;
  reason?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onSupport?: () => void;
}

const FailureView: React.FC<FailureViewProps> = ({
  title = "Falha no Processamento da Transação",
  message = "Não foi possível concluir a operação solicitada. O seu saldo permanece inalterado.",
  errorCode = "ERR-PAYMENT-REJECTED",
  reason = "Tempo limite excedido ou dados do comprovativo inválidos.",
  onRetry,
  onGoHome,
  onSupport
}) => {
  return (
    <div className="min-h-full w-full bg-[#0b0e11] text-slate-200 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg bg-[#141821] border border-red-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative overflow-hidden">
        {/* Top Red Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Error Icon Badge */}
        <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/10">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed max-w-sm mx-auto">
          {message}
        </p>

        {/* Failure Details Card */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 sm:p-5 text-left space-y-3 mb-6 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-red-500/10">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Código de Erro</span>
            <span className="text-red-400 font-mono font-black">{errorCode}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium block">Motivo Provável:</span>
            <p className="text-slate-300 font-semibold bg-black/20 p-2 rounded-xl text-[11px] leading-relaxed">
              {reason}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 text-[10px] text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Nenhum valor foi debitado indevidamente do seu saldo.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Tentar Novamente
            </button>
          )}

          {onSupport && (
            <button
              onClick={onSupport}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" /> Falar com Suporte Master
            </button>
          )}

          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-bold py-2.5 rounded-xl uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" /> Voltar ao Painel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FailureView;

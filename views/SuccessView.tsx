import React from 'react';
import { CheckCircle2, ArrowRight, Download, Share2, ShieldCheck, Home, Wallet } from 'lucide-react';

interface SuccessViewProps {
  title?: string;
  message?: string;
  amount?: string | number;
  txId?: string;
  method?: string;
  date?: string;
  onGoHome?: () => void;
  onGoWallet?: () => void;
}

const SuccessView: React.FC<SuccessViewProps> = ({
  title = "Transação Concluída com Sucesso!",
  message = "O seu depósito/operação foi processado e confirmado na rede com total segurança.",
  amount = "10.000,00 KZ",
  txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`,
  method = "Multicaixa Express / Escrow",
  date = new Date().toLocaleString('pt-AO'),
  onGoHome,
  onGoWallet
}) => {
  return (
    <div className="min-h-full w-full bg-[#0b0e11] text-slate-200 p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg bg-[#141821] border border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Success Icon Badge */}
        <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed max-w-sm mx-auto">
          {message}
        </p>

        {/* Transaction Receipt Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-left space-y-3 mb-6 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <span className="text-slate-400 uppercase font-bold text-[10px]">Valor Confirmado</span>
            <span className="text-emerald-400 font-mono font-black text-base">{amount}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">ID da Transação:</span>
            <span className="text-white font-mono font-bold select-all">{txId}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Método Utilizado:</span>
            <span className="text-slate-200 font-semibold">{method}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Data & Hora:</span>
            <span className="text-slate-300 font-mono text-[11px]">{date}</span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-400 font-medium">Estado:</span>
            <span className="bg-emerald-500/20 text-emerald-400 font-black text-[9px] uppercase px-2 py-0.5 rounded-md border border-emerald-500/30">
              Confirmado
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onGoWallet && (
            <button
              onClick={onGoWallet}
              className="w-full bg-[#049444] hover:bg-[#037235] text-white font-black py-3.5 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-[#049444]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4" /> Ver na Carteira
            </button>
          )}

          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" /> Voltar ao Início
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Comprovativo protegido por Criptografia SSL</span>
        </div>
      </div>
    </div>
  );
};

export default SuccessView;

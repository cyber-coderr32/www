import React from 'react';
import { RefreshCw, ArrowLeft, ShieldAlert, CheckCircle2, Clock, HelpCircle } from 'lucide-react';

interface RefundViewProps {
  onBack?: () => void;
}

const RefundView: React.FC<RefundViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-full w-full bg-[#0b0e11] text-slate-200 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-[#141821] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Política de Reembolso
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Garantia de Transações & Devoluções • CryptonBet Angola
              </p>
            </div>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              1. Condições Gerais para Reembolso
            </h2>
            <p className="mb-2">
              A CryptonBet visa proporcionar uma experiência transparente e justa. Um utilizador pode ter direito a reembolso nas seguintes circunstâncias:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong>Falha no Processamento do Depósito:</strong> Se o valor foi debitado da conta bancária/carteira do utilizador mas não creditado no saldo da conta devido a erro do sistema num prazo superior a 24 horas.</li>
              <li><strong>Cancelamento de Ordem P2P em Escrow:</strong> Se o vendedor não libertar os USDT ou se houver cancelamento acordado antes do pagamento ser efetuado.</li>
              <li><strong>Interrupção Técnica Crítica no Servidor:</strong> Em caso de falha sistémica comprovada durante uma aposta ativa em que o resultado tenha sido afetado negativamente por indisponibilidade dos servidores.</li>
            </ul>
          </section>

          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              2. Prazos e Processamento
            </h2>
            <p className="mb-2">Os reembolsos aprovados são processados conforme os prazos abaixo:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong>Saldo em Conta / USDT:</strong> Processamento imediato ou até 2 horas.</li>
              <li><strong>Transações Bancárias (IBAN / Multicaixa Express):</strong> Entre 24 a 48 horas úteis, dependendo do banco emissor.</li>
              <li><strong>Chave PIX / Criptomoedas (Blockchain):</strong> De 15 a 60 minutos após validação na blockchain.</li>
            </ul>
          </section>

          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              3. Situações Não Elegíveis para Reembolso
            </h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>Apostas perdedoras efetuadas voluntariamente em qualquer jogo da plataforma.</li>
              <li>Erros na introdução de dados de conta bancária ou endereço cripto fornecidos pelo utilizador.</li>
              <li>Contas suspensas por violação dos Termos de Uso (uso de bots, fraudes ou múltiplas contas).</li>
            </ul>
          </section>

          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-400" />
              4. Como Solicitar um Reembolso
            </h2>
            <p>
              Para solicitar um reembolso, aceda ao canal de Suporte no chat da plataforma ou envie o ID da transação, comprovativo e e-mail cadastrado para a nossa equipa de moderação no P2P / Suporte Master.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-400" />
            <span>Suporte Master P2P & Escrow Ativo 24/7</span>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black px-6 py-2.5 rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Compreendi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundView;

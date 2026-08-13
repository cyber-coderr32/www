import React from 'react';
import { ShieldCheck, ArrowLeft, FileText, Lock, Scale, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface TermsViewProps {
  onBack?: () => void;
}

const TermsView: React.FC<TermsViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-full w-full bg-[#0b0e11] text-slate-200 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-[#141821] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#049444]/20 border border-[#049444]/40 flex items-center justify-center text-[#049444]">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Termos de Uso & Serviço
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Última atualização: 24 de Julho de 2026 • CryptonBet Angola
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
          {/* Section 1 */}
          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#049444] text-white flex items-center justify-center text-xs font-mono">1</span>
              Aceitação dos Termos
            </h2>
            <p>
              Ao aceder, registar-se ou utilizar a plataforma CryptonBet, concorda expressamente em cumprir todos os termos, condições e avisos aqui previstos. Se não concordar com qualquer disposição destes Termos de Uso, não deverá utilizar os nossos serviços.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#049444] text-white flex items-center justify-center text-xs font-mono">2</span>
              Elegibilidade e Maioridade Legal (+18)
            </h2>
            <p className="mb-3">
              O acesso aos jogos de entretenimento e negociação P2P da CryptonBet é estritamente restrito a indivíduos que tenham pelo menos <strong>18 anos de idade</strong> ou a maioridade legal na sua jurisdição de residência.
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>A criação de contas com dados falsos ou por menores de idade resultará no encerramento imediato da conta e no bloqueio permanente de fundos.</span>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#049444] text-white flex items-center justify-center text-xs font-mono">3</span>
              Segurança da Conta e Autenticação
            </h2>
            <p>
              O utilizador é o único responsável por manter a confidencialidade das suas credenciais de acesso (e-mail, palavra-passe e chaves de autenticação). Qualquer atividade efetuada através da sua conta será da sua inteira responsabilidade.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#049444] text-white flex items-center justify-center text-xs font-mono">4</span>
              Regras do Mercado P2P e Escrow Segurado
            </h2>
            <p className="mb-2">
              Nas transações Peer-to-Peer (P2P), o CryptonBet atua como garante através de um contrato de Escrow automatizado.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>Os fundos em USDT são bloqueados no Escrow assim que a ordem é aberta.</li>
              <li>O comprador deve efetuar o pagamento comprovado (Multicaixa Express, IBAN ou PIX) antes de marcar como pago.</li>
              <li>Fraudes ou falsos comprovativos acarretam banimento sumário e liquidação a favor da vítima na disputa.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#049444] text-white flex items-center justify-center text-xs font-mono">5</span>
              Jogo Responsável
            </h2>
            <p>
              Encorajamos o jogo consciente e responsável. Os utilizadores podem definir limites de depósito diários ou solicitar a autoexclusão temporária através do painel de perfil ou suporte direto.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#049444] text-white flex items-center justify-center text-xs font-mono">6</span>
              Alterações aos Termos
            </h2>
            <p>
              O CryptonBet reserva-se o direito de atualizar estes termos a qualquer momento. As alterações entrarão em vigor assim que publicadas nesta página.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#049444]" />
            <span>CryptonBet Angola • Plataforma Certificada & Protegida</span>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-[#049444] hover:bg-[#037235] text-white font-black px-6 py-2.5 rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Compreendi e Aceito
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsView;

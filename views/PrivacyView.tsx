import React from 'react';
import { Lock, ArrowLeft, Shield, Eye, Database, Key, CheckCircle } from 'lucide-react';

interface PrivacyViewProps {
  onBack?: () => void;
}

const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
  return (
    <div className="min-h-full w-full bg-[#0b0e11] text-slate-200 p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-[#141821] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Política de Privacidade
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Proteção de Dados & Privacidade • CryptonBet Angola
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
              <Eye className="w-5 h-5 text-blue-400" />
              1. Informações que Recolhemos
            </h2>
            <p className="mb-2">
              Na CryptonBet, a transparência e a privacidade são fundamentais. Recolhemos apenas os dados necessários para garantir o funcionamento seguro dos serviços:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li><strong>Dados de Identificação:</strong> Nome completo, endereço de e-mail e número de telefone.</li>
              <li><strong>Dados Transacionais:</strong> Histórico de depósitos, levantamentos, apostas e transações P2P.</li>
              <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de dispositivo e dados de navegação para prevenção de fraude.</li>
            </ul>
          </section>

          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              2. Como Utilizamos os seus Dados
            </h2>
            <p className="mb-2">Utilizamos as suas informações exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>Processar depósitos, levantamentos e liquidações P2P no Escrow;</li>
              <li>Verificar a identidade e prevenir acessos não autorizados ou múltiplas contas ilícitas;</li>
              <li>Garantir o suporte ao cliente e resolução de litígios;</li>
              <li>Cumprir com obrigações legais e regulatórias de combate ao branqueamento de capitais.</li>
            </ul>
          </section>

          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              3. Criptografia e Armazenamento Seguro
            </h2>
            <p>
              Todas as palavras-passe e sessões são protegidas utilizando encriptação avançada de ponta a ponta (SSL 256-bit) e infraestrutura de servidores em nuvem Firebase com regras rígidas de segurança contra acessos externos.
            </p>
          </section>

          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              4. Partilha de Dados com Terceiros
            </h2>
            <p>
              <strong>Nunca vendemos, alugamos ou comercializamos os seus dados pessoais a terceiros.</strong> A partilha de informações ocorre estritamente quando exigida por lei ou com processadores de pagamento autorizados (como gateways Blockchain e parceiros bancários) para a execução direta das suas transações.
            </p>
          </section>

          <section className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5">
            <h2 className="text-base sm:text-lg font-black text-white uppercase mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-teal-400" />
              5. Os Seus Direitos
            </h2>
            <p>
              Tem o direito de solicitar o acesso, retificação ou eliminação dos seus dados pessoais a qualquer momento, enviando um pedido formal ao nosso suporte técnico através da plataforma.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Dados Encriptados com Padrão de Segurança SSL/TLS</span>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyView;

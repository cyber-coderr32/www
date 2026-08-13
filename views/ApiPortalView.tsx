import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Key, 
  Code, 
  Gamepad2, 
  BarChart3, 
  Globe, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  Layers, 
  ShieldCheck, 
  Zap, 
  DollarSign, 
  Terminal, 
  Send,
  HelpCircle
} from 'lucide-react';
import { ApiKeyRecord, GameCatalogItem } from '../types';

interface ApiPortalViewProps {
  onBack?: () => void;
}

export const ApiPortalView: React.FC<ApiPortalViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'catalog' | 'ggr' | 'webhooks' | 'docs'>('keys');
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [games, setGames] = useState<GameCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  // Form para nova chave
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newGgrShare, setNewGgrShare] = useState('15');
  const [newCurrency, setNewCurrency] = useState('USDT');
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);

  // IFrame Generator State
  const [selectedGameForEmbed, setSelectedGameForEmbed] = useState<string>('mines');
  const [embedMode, setEmbedMode] = useState<'REAL' | 'DEMO'>('REAL');
  const [embedBalance, setEmbedBalance] = useState<string>('100.00');
  const [generatedLaunchUrl, setGeneratedLaunchUrl] = useState<string>('');
  const [generatedIframeHtml, setGeneratedIframeHtml] = useState<string>('');
  const [codeLanguage, setCodeLanguage] = useState<'html' | 'curl' | 'nodejs' | 'python' | 'php' | 'react'>('html');
  const [isGeneratingLaunch, setIsGeneratingLaunch] = useState(false);

  // Webhook Tester State
  const [testWebhookUrl, setTestWebhookUrl] = useState('https://api.meucasino.com/seamless/callback');
  const [testAction, setTestAction] = useState<'balance' | 'debit' | 'credit' | 'rollback'>('balance');
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // Endpoint Explorer State
  const [selectedDocEndpoint, setSelectedDocEndpoint] = useState<string>('/api/v1/games');
  const [docApiResponse, setDocApiResponse] = useState<any>(null);
  const [isTestingDocApi, setIsTestingDocApi] = useState(false);

  // Buscar dados de API e catálogo ao montar
  useEffect(() => {
    fetchApiKeys();
    fetchGamesCatalog();
  }, []);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/operators/keys');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
          setApiKeys(data.data);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar chaves de API:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGamesCatalog = async () => {
    try {
      const res = await fetch('/api/v1/games');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.data)) {
          setGames(data.data);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar jogos do catálogo:', e);
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpName.trim()) {
      alert('Digite o nome da plataforma parceira/operador.');
      return;
    }
    setIsSubmittingKey(true);
    try {
      const res = await fetch('/api/v1/operators/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorName: newOpName.trim(),
          webhookUrl: newWebhookUrl.trim(),
          ggrSharePercent: Number(newGgrShare) || 15,
          currency: newCurrency
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          alert('✅ Chave de API iGaming criada com sucesso!');
          setShowNewKeyModal(false);
          setNewOpName('');
          setNewWebhookUrl('');
          fetchApiKeys();
        }
      }
    } catch (e) {
      alert('Erro ao criar chave de API.');
    } finally {
      setIsSubmittingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Tem certeza que deseja revogar esta chave de API? Todas as integrações com esta chave serão suspensas.')) return;
    try {
      const res = await fetch(`/api/v1/operators/keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        setApiKeys(prev => prev.filter(k => k.id !== keyId));
      }
    } catch (e) {
      alert('Erro ao eliminar chave.');
    }
  };

  const handleGenerateLaunchUrl = async () => {
    setIsGeneratingLaunch(true);
    const activeKey = apiKeys[0]?.apiKey || 'pub_live_cryptonbet_master_key_9988';
    try {
      const res = await fetch('/api/v1/games/launch-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': activeKey
        },
        body: JSON.stringify({
          game_id: selectedGameForEmbed,
          player_id: 'player_demo_' + Math.floor(Math.random() * 1000),
          player_name: 'Jogador Exemplo',
          currency: 'USDT',
          balance: Number(embedBalance) || 100.00,
          mode: embedMode
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setGeneratedLaunchUrl(json.data.launch_url);
          setGeneratedIframeHtml(json.data.iframe_html);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLaunch(false);
    }
  };

  const handleRunWebhookTest = async () => {
    if (!testWebhookUrl) {
      alert('Insira uma URL de callback válida.');
      return;
    }
    setIsTestingWebhook(true);
    setWebhookResult(null);
    try {
      const res = await fetch('/api/v1/seamless/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: testWebhookUrl,
          action: testAction
        })
      });
      const data = await res.json();
      setWebhookResult(data);
    } catch (e: any) {
      setWebhookResult({ status: 'failed', error: e.message || 'Falha de conexão.' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleTestDocApi = async (endpoint: string) => {
    setIsTestingDocApi(true);
    setDocApiResponse(null);
    try {
      const activeKey = apiKeys[0]?.apiKey || 'pub_live_cryptonbet_master_key_9988';
      let res: Response;
      if (endpoint === '/api/v1/games/launch-url') {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
          body: JSON.stringify({ game_id: 'mines', player_id: 'usr_test', balance: 50.00 })
        });
      } else if (endpoint === '/api/v1/games/play') {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': activeKey },
          body: JSON.stringify({ game_id: 'mines', player_id: 'usr_test', bet_amount: 10, params: { minesCount: 3 } })
        });
      } else {
        res = await fetch(endpoint);
      }
      const data = await res.json();
      setDocApiResponse(data);
    } catch (e: any) {
      setDocApiResponse({ error: e.message });
    } finally {
      setIsTestingDocApi(false);
    }
  };

  const totalBetsVolume = apiKeys.reduce((acc, k) => acc + (k.totalBetsVolume || 0), 0);
  const totalPayoutVolume = apiKeys.reduce((acc, k) => acc + (k.totalPayoutVolume || 0), 0);
  const totalGgr = totalBetsVolume - totalPayoutVolume;

  return (
    <div className="min-h-full w-full bg-[#0a0d14] text-white p-4 md:p-8 font-sans pb-24 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER PRINCIPAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#049444]/20 rounded-2xl border border-[#049444]/40 text-[#049444]">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#049444]">
                  iGaming Provider Engine V1
                </span>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  API Pública de Jogos <span className="text-[#049444]">CryptonBet</span>
                </h1>
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-2 max-w-2xl">
              Integre os jogos da CryptonBet diretamente na sua casa de apostas, cassino online ou aplicativo móvel. A API pública é estritamente destinada ao aproveitamento dos jogos (lançamento, execução de partidas e integração via IFrame/Seamless Wallet).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#049444]/10 border border-[#049444]/30 text-[#049444] rounded-lg text-[11px] font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[#049444]" />
                Chave Única Master (Integração Coletiva de Todos os Jogos)
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Acesso Exclusivo para Provedoria &amp; Execução de Jogos
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="px-5 py-3 bg-[#049444] hover:bg-[#037a37] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-[#049444]/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Gerar Chave de API
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer border border-white/10"
              >
                Voltar
              </button>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-2 scrollbar-none">
          {[
            { id: 'keys', label: 'Chaves de API', icon: Key },
            { id: 'catalog', label: 'Catálogo & Embed IFrame', icon: Gamepad2 },
            { id: 'ggr', label: 'Métricas & GGR', icon: BarChart3 },
            { id: 'webhooks', label: 'Seamless Wallet Webhook', icon: Zap },
            { id: 'docs', label: 'Documentação da API', icon: Code }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-[#049444] text-white shadow-lg shadow-[#049444]/30' 
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CHAVES DE API */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Chaves Ativas</span>
                  <p className="text-2xl font-black text-white">{apiKeys.length}</p>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-[#049444]/10 text-[#049444] rounded-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Status do Servidor</span>
                  <p className="text-xl font-black text-[#049444] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#049444] animate-pulse"></span>
                    ONLINE 99.9%
                  </p>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Partilha de GGR Padrão</span>
                  <p className="text-2xl font-black text-white">15.0%</p>
                </div>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black uppercase text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#049444]" /> Minhas Chaves de Integração
              </h3>

              {isLoading ? (
                <div className="py-12 text-center text-slate-500 text-xs uppercase tracking-widest">A carregar chaves de API...</div>
              ) : apiKeys.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Nenhuma chave de API gerada. Clique em "Gerar Chave de API" para iniciar a integração.
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map(keyObj => (
                    <div key={keyObj.id} className="p-5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#049444]/20 text-[#049444] border border-[#049444]/30">
                              {keyObj.environment}
                            </span>
                            <h4 className="font-bold text-lg text-white">{keyObj.operatorName}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">ID da Chave: {keyObj.id} • Criada em: {new Date(keyObj.createdAt).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">Comissão GGR: <strong className="text-white">{keyObj.ggrSharePercent}%</strong></span>
                          <button
                            onClick={() => handleDeleteKey(keyObj.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition cursor-pointer"
                            title="Revogar Chave"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Chave Pública (API Key / Client ID)</label>
                          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-2 font-mono text-xs">
                            <span className="truncate flex-1 text-slate-200">{keyObj.apiKey}</span>
                            <button
                              onClick={() => handleCopy(keyObj.apiKey, keyObj.id + '_pub')}
                              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition cursor-pointer ml-2"
                            >
                              {copiedField === keyObj.id + '_pub' ? <Check className="w-4 h-4 text-[#049444]" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Chave Secreta (API Secret)</label>
                          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-2 font-mono text-xs">
                            <span className="truncate flex-1 text-slate-200">
                              {visibleSecrets[keyObj.id] ? keyObj.apiSecret : '••••••••••••••••••••••••••••••••'}
                            </span>
                            <button
                              onClick={() => setVisibleSecrets(prev => ({ ...prev, [keyObj.id]: !prev[keyObj.id] }))}
                              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition cursor-pointer"
                            >
                              {visibleSecrets[keyObj.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleCopy(keyObj.apiSecret, keyObj.id + '_sec')}
                              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition cursor-pointer ml-1"
                            >
                              {copiedField === keyObj.id + '_sec' ? <Check className="w-4 h-4 text-[#049444]" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {keyObj.webhookUrl && (
                        <div className="text-xs text-slate-400 pt-2 border-t border-white/5 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-400" /> Webhook Seamless Wallet: <span className="font-mono text-slate-300 truncate">{keyObj.webhookUrl}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CATÁLOGO & GERADOR DE EMBED IFRAME */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-[#049444]" /> Catálogo de Jogos &amp; Suíte IFrame
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Sua chave de API faz a <strong>integração coletiva</strong> automática de todo o catálogo. Você escolhe se deseja incorporar o <strong>Lobby Completo</strong> com todos os jogos de uma só vez ou redirecionar para um jogo individual.
                  </p>
                </div>
                <div className="bg-[#049444]/10 border border-[#049444]/30 text-[#049444] px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <Zap className="w-4 h-4 text-[#049444]" /> 1 Chave = Acesso Completo
                </div>
              </div>

              {/* CARD DE SELEÇÃO: LOBBY COLETIVO VS JOGOS INDIVIDUAIS */}
              <div className="space-y-3 mb-8">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. Selecione a Modalidade de Incorporação:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Opção 1: Lobby Completo (Coletivo) */}
                  <button
                    onClick={() => setSelectedGameForEmbed('all')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                      selectedGameForEmbed === 'all' 
                        ? 'bg-[#049444]/20 border-[#049444] shadow-xl shadow-[#049444]/20 ring-2 ring-[#049444]' 
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#049444]/20 text-[#049444] rounded-xl text-2xl">
                          🎰
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white uppercase flex items-center gap-2">
                            Lobby Completo (Todos os Jogos)
                            <span className="px-2 py-0.5 bg-[#049444] text-white text-[9px] font-black rounded-full uppercase">Coletivo</span>
                          </h4>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Incorpora o catálogo inteiro em um único IFrame. O jogador escolhe qualquer jogo dentro da interface.
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Opção 2: Explicativo de Jogo Individual */}
                  <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-white uppercase flex items-center gap-1.5">
                        <Gamepad2 className="w-4 h-4 text-amber-400" /> Jogo Único Especificado
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Passe o parâmetro <code className="text-amber-300 font-mono">game_id</code> ("mines", "crash", "plinko", etc.) para abrir diretamente uma sala específica.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                    2. Ou Escolha um Jogo Específico do Catálogo ({games.length} disponíveis):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {games.map(game => (
                      <button
                        key={game.id}
                        onClick={() => setSelectedGameForEmbed(game.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          selectedGameForEmbed === game.id 
                            ? 'bg-[#049444]/20 border-[#049444] shadow-lg shadow-[#049444]/20' 
                            : 'bg-white/5 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="text-2xl mb-2">{game.icon}</div>
                        <div>
                          <h4 className="font-bold text-xs text-white truncate">{game.name}</h4>
                          <span className="text-[10px] text-slate-400 block font-mono">RTP {game.rtp}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SIMULADOR AO VIVO DE IFRAME */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h4 className="font-bold text-base text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#049444]" /> Simulador IFrame em Tempo Real: <span className="text-[#049444] uppercase">{selectedGameForEmbed}</span>
                    </h4>
                    <p className="text-xs text-slate-400">Configure os parâmetros e teste o carregamento do jogo em modo embutido.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateLaunchUrl}
                      disabled={isGeneratingLaunch}
                      className="px-4 py-2 bg-[#049444] hover:bg-[#037a37] text-white font-bold rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
                    >
                      {isGeneratingLaunch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Gerar Link de Teste
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Modo de Jogo</label>
                    <select
                      value={embedMode}
                      onChange={(e: any) => setEmbedMode(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#049444]"
                    >
                      <option value="REAL">Dinheiro Real (REAL)</option>
                      <option value="DEMO">Modo Demonstração (DEMO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Saldo Inicial do Jogador (USDT)</label>
                    <input
                      type="number"
                      value={embedBalance}
                      onChange={(e) => setEmbedBalance(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#049444]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Moeda da Sessão</label>
                    <input
                      type="text"
                      disabled
                      value="USDT"
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-slate-400"
                    />
                  </div>
                </div>

                {/* PREVIEW DO IFRAME */}
                {generatedLaunchUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-black p-3 rounded-t-xl border border-white/10 text-xs">
                      <span className="text-slate-400 font-mono truncate max-w-xl">{generatedLaunchUrl}</span>
                      <a href={generatedLaunchUrl} target="_blank" rel="noreferrer" className="text-[#049444] hover:underline font-bold flex items-center gap-1">
                        Abrir em nova aba <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="w-full h-[550px] bg-black rounded-b-xl overflow-hidden border border-white/10 border-t-0 shadow-2xl relative">
                      <iframe
                        src={generatedLaunchUrl}
                        className="w-full h-full border-0"
                        title="Preview IFrame"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center border-2 border-dashed border-white/10 rounded-xl">
                    <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Clique em <strong>"Gerar Link de Teste"</strong> para visualizar o jogo incorporado.</p>
                  </div>
                )}

                {/* GERADOR DE CÓDIGO */}
                <div className="pt-6 border-t border-white/10 space-y-4 max-w-full overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2 shrink-0">
                      <Terminal className="w-4 h-4 text-[#049444]" /> Código de Integração Pronto
                    </h4>

                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 overflow-x-auto no-scrollbar max-w-full">
                      {(['html', 'curl', 'nodejs', 'python', 'php', 'react'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => setCodeLanguage(lang)}
                          className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer whitespace-nowrap shrink-0 ${
                            codeLanguage === lang ? 'bg-[#049444] text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/90 p-3 sm:p-4 rounded-xl border border-white/10 font-mono text-xs text-green-400 max-w-full overflow-hidden">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => handleCopy(
                          codeLanguage === 'html' ? (generatedIframeHtml || `<iframe src="https://cryptonbet.com/?embed=true&game=${selectedGameForEmbed}&token=SESSION_TOKEN" width="100%" height="700" frameborder="0"></iframe>`)
                          : codeLanguage === 'curl' ? `curl -X POST "https://cryptonbet.com/api/v1/games/launch-url" \\
  -H "x-api-key: SUA_CHAVE_API" \\
  -H "Content-Type: application/json" \\
  -d '{"game_id": "${selectedGameForEmbed}", "player_id": "usr_123", "currency": "USDT", "balance": 100.0}'`
                          : `// Exemplo de integração ${codeLanguage.toUpperCase()}\nfetch('https://cryptonbet.com/api/v1/games/launch-url', {\n  method: 'POST',\n  headers: { 'x-api-key': 'SUA_CHAVE_API', 'Content-Type': 'application/json' },\n  body: JSON.stringify({ game_id: '${selectedGameForEmbed}', player_id: 'usr_123', balance: 100 })\n});`,
                          'code_snippet'
                        )}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'code_snippet' ? <Check className="w-3.5 h-3.5 text-[#049444]" /> : <Copy className="w-3.5 h-3.5" />} Copiar
                      </button>
                    </div>

                    <pre className="whitespace-pre-wrap break-all sm:break-normal overflow-x-auto no-scrollbar max-w-full">
                      {codeLanguage === 'html' && (generatedIframeHtml || `<iframe src="https://cryptonbet.com/?embed=true&game=${selectedGameForEmbed}&token=YOUR_SESSION_TOKEN" width="100%" height="700" frameborder="0" allowfullscreen></iframe>`)}
                      {codeLanguage === 'curl' && `curl -X POST "https://cryptonbet.com/api/v1/games/launch-url" \\
  -H "x-api-key: YOUR_PUBLIC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "game_id": "${selectedGameForEmbed}",
    "player_id": "usr_9988",
    "currency": "USDT",
    "balance": 150.00,
    "mode": "REAL"
  }'`}
                      {codeLanguage === 'nodejs' && `const response = await fetch('https://cryptonbet.com/api/v1/games/launch-url', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CRYPTONBET_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    game_id: '${selectedGameForEmbed}',
    player_id: req.user.id,
    currency: 'USDT',
    balance: req.user.balance
  })
});
const { data } = await response.json();
console.log('Launch URL:', data.launch_url);`}
                      {codeLanguage === 'python' && `import requests

url = "https://cryptonbet.com/api/v1/games/launch-url"
headers = {
    "x-api-key": "YOUR_PUBLIC_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "game_id": "${selectedGameForEmbed}",
    "player_id": "usr_9988",
    "balance": 150.00
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
                      {codeLanguage === 'php' && `<?php
$response = Http::withHeaders([
    'x-api-key' => config('services.cryptonbet.key'),
])->post('https://cryptonbet.com/api/v1/games/launch-url', [
    'game_id' => '${selectedGameForEmbed}',
    'player_id' => $user->id,
    'balance' => $user->balance,
]);

$launchUrl = $response->json('data.launch_url');
?>`}
                      {codeLanguage === 'react' && `import React from 'react';

export const GameEmbed = ({ launchUrl }) => (
  <iframe
    src={launchUrl}
    style={{ width: '100%', height: '700px', border: 'none', borderRadius: '12px' }}
    allow="fullscreen"
  />
);`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MÉTRICAS & GGR (GROSS GAMING REVENUE) */}
        {activeTab === 'ggr' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Volume Total Apostado</span>
                <p className="text-2xl font-black text-white mt-1 font-mono">${totalBetsVolume.toFixed(2)} USDT</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Pago aos Jogadores</span>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono">${totalPayoutVolume.toFixed(2)} USDT</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Receita Bruta (GGR)</span>
                <p className="text-2xl font-black text-[#049444] mt-1 font-mono">${totalGgr.toFixed(2)} USDT</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Lucro do Provedor (15%)</span>
                <p className="text-2xl font-black text-blue-400 mt-1 font-mono">${(totalGgr * 0.15).toFixed(2)} USDT</p>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black uppercase text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#049444]" /> Relatório do Operador por Chave de API
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-white/5 uppercase text-[10px] font-bold text-slate-400">
                    <tr>
                      <th className="p-3">Operador</th>
                      <th className="p-3">Ambiente</th>
                      <th className="p-3 font-mono">Volume Apostado</th>
                      <th className="p-3 font-mono">Payout</th>
                      <th className="p-3 font-mono">GGR</th>
                      <th className="p-3">Comissão (15%)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {apiKeys.map(k => (
                      <tr key={k.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-bold font-sans text-white">{k.operatorName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[9px] bg-white/10 text-slate-300">{k.environment}</span>
                        </td>
                        <td className="p-3">${(k.totalBetsVolume || 0).toFixed(2)}</td>
                        <td className="p-3 text-amber-400">${(k.totalPayoutVolume || 0).toFixed(2)}</td>
                        <td className="p-3 text-[#049444] font-bold">${((k.totalBetsVolume || 0) - (k.totalPayoutVolume || 0)).toFixed(2)}</td>
                        <td className="p-3 text-blue-400">${(((k.totalBetsVolume || 0) - (k.totalPayoutVolume || 0)) * 0.15).toFixed(2)}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[9px] bg-[#049444]/20 text-[#049444] font-sans font-bold">
                            {k.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SEAMLESS WALLET WEBHOOK TESTER */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Simulador de Webhook / Seamless Wallet
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Teste o recebimento de callbacks de saldo, débito de aposta e crédito de vitória diretamente no servidor da sua casa de apostas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-white/10">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">URL de Callback do Seu Servidor</label>
                  <input
                    type="url"
                    value={testWebhookUrl}
                    onChange={(e) => setTestWebhookUrl(e.target.value)}
                    placeholder="https://suaplataforma.com/api/seamless/callback"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#049444]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Evento a Simular</label>
                  <select
                    value={testAction}
                    onChange={(e: any) => setTestAction(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#049444]"
                  >
                    <option value="balance">SEAMLESS_WALLET_BALANCE</option>
                    <option value="debit">SEAMLESS_WALLET_DEBIT (Débito de Aposta)</option>
                    <option value="credit">SEAMLESS_WALLET_CREDIT (Crédito de Vitória)</option>
                    <option value="rollback">SEAMLESS_WALLET_ROLLBACK (Estorno)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleRunWebhookTest}
                disabled={isTestingWebhook}
                className="px-6 py-3 bg-[#049444] hover:bg-[#037a37] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-lg shadow-[#049444]/20"
              >
                {isTestingWebhook ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Disparar Teste de Webhook
              </button>

              {webhookResult && (
                <div className="p-4 rounded-xl bg-black/80 border border-white/10 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-white">Resultado do Teste:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      webhookResult.status === 'success' ? 'bg-[#049444]/20 text-[#049444]' : 'bg-red-500/20 text-red-400'
                    }`}>
                      HTTP {webhookResult.http_status || '400'} ({webhookResult.latency_ms || 0} ms)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Payload Enviado:</span>
                    <pre className="text-amber-300 mt-1 bg-white/5 p-2 rounded overflow-x-auto">
                      {JSON.stringify(webhookResult.sent_payload, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Resposta Recebida do Servidor Parceiro:</span>
                    <pre className="text-green-400 mt-1 bg-white/5 p-2 rounded overflow-x-auto">
                      {JSON.stringify(webhookResult.response_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENTAÇÃO COMPLETA DA API (OPENAPI EXPLORER) */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-black uppercase text-white mb-2 flex items-center gap-2">
                <Code className="w-5 h-5 text-[#049444]" /> Documentação Interativa da API (OpenAPI v3)
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Consulte as especificações oficiais dos endpoints REST para integração de jogos e gerenciamento de sessões.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Endpoints Disponíveis</span>
                  {[
                    { path: '/api/v1/games', method: 'GET', desc: 'Obter Catálogo de Jogos' },
                    { path: '/api/v1/games/launch-url', method: 'POST', desc: 'Gerar URL de Lançamento IFrame' },
                    { path: '/api/v1/games/session-verify', method: 'GET', desc: 'Validar Sessão de Jogo' },
                    { path: '/api/v1/games/play', method: 'POST', desc: 'Executar Jogada Headless' },
                    { path: '/api/v1/operators/keys', method: 'GET', desc: 'Listar Chaves de API' },
                    { path: '/api/v1/docs', method: 'GET', desc: 'Obter JSON da Especificação' }
                  ].map(ep => (
                    <button
                      key={ep.path}
                      onClick={() => setSelectedDocEndpoint(ep.path)}
                      className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                        selectedDocEndpoint === ep.path 
                          ? 'bg-[#049444]/20 border-[#049444]' 
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono mr-2 ${
                          ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#049444]/20 text-[#049444]'
                        }`}>{ep.method}</span>
                        <span className="font-mono text-xs text-white">{ep.path}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{ep.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-2 bg-black/60 border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="font-bold text-sm text-white font-mono">{selectedDocEndpoint}</h4>
                    <button
                      onClick={() => handleTestDocApi(selectedDocEndpoint)}
                      disabled={isTestingDocApi}
                      className="px-3 py-1.5 bg-[#049444] hover:bg-[#037a37] text-white font-bold rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                    >
                      {isTestingDocApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Testar Endpoint
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">
                    {selectedDocEndpoint === '/api/v1/games' && 'Retorna a lista completa de jogos suportados com RTP, imagem de capa e categorias.'}
                    {selectedDocEndpoint === '/api/v1/games/launch-url' && 'Recebe as credenciais do jogador e retorna a URL Iframe assinada para incorporação.'}
                    {selectedDocEndpoint === '/api/v1/games/session-verify' && 'Verifica se o token de jogo recebido no Iframe é válido e se a sessão está ativa.'}
                    {selectedDocEndpoint === '/api/v1/games/play' && 'Permite que plataformas parceiras executem apostas diretamente via API REST sem usar a interface IFrame.'}
                    {selectedDocEndpoint === '/api/v1/operators/keys' && 'Retorna todas as chaves de API e relatórios de GGR do operador.'}
                    {selectedDocEndpoint === '/api/v1/docs' && 'Retorna a especificação completa em formato Swagger/OpenAPI v3.'}
                  </p>

                  {docApiResponse && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Resposta do Servidor:</span>
                      <pre className="bg-black p-4 rounded-xl border border-white/10 font-mono text-xs text-green-400 overflow-x-auto max-h-80">
                        {JSON.stringify(docApiResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: GERAR NOVA CHAVE DE API */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121620] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#049444]" /> Gerar Chave de API de Operador
              </h3>
              <button
                onClick={() => setShowNewKeyModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div className="p-3 bg-[#049444]/10 border border-[#049444]/30 rounded-xl flex items-start gap-3">
                <Zap className="w-5 h-5 text-[#049444] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#049444] uppercase block mb-0.5">Integração Coletiva Habilitada</span>
                  <p className="text-slate-300">
                    Esta chave concede acesso coletivo e automático a <strong>TODOS OS JOGOS</strong> do catálogo. Não é preciso gerar chaves separadas por jogo. Você decide no seu sistema se carrega o Lobby Completo ou jogos específicos.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Nome da Plataforma Parceira / Cassino *
                </label>
                <input
                  type="text"
                  required
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  placeholder="Ex: AngolaBet, Bet365 Partner, MyCasino.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#049444]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  URL de Callback (Seamless Wallet Webhook)
                </label>
                <input
                  type="url"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://seu-servidor.com/api/seamless/callback"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#049444]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Comissão GGR (%)
                  </label>
                  <input
                    type="number"
                    value={newGgrShare}
                    onChange={(e) => setNewGgrShare(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#049444]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Moeda Padrão
                  </label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#049444]"
                  >
                    <option value="USDT">USDT (Tether)</option>
                    <option value="BRL">BRL (Real)</option>
                    <option value="AOA">AOA (Kwanza)</option>
                    <option value="USD">USD (Dólar)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewKeyModal(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingKey}
                  className="px-6 py-2.5 bg-[#049444] hover:bg-[#037a37] text-white font-bold rounded-xl text-xs uppercase transition cursor-pointer shadow-lg shadow-[#049444]/20"
                >
                  {isSubmittingKey ? 'A gerar...' : 'Criar Chave API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApiPortalView;

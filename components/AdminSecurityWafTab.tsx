import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  Terminal, 
  RefreshCw, 
  Ban, 
  Unlock, 
  Trash2, 
  Zap, 
  Cpu, 
  Search, 
  Sliders, 
  CheckCircle2, 
  Globe 
} from 'lucide-react';
import { soundService } from '../services/soundService';

interface ThreatEvent {
  id: string;
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  tool: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchedRule: string;
  payloadSnippet: string;
  action: 'BLOCKED_403' | 'IP_AUTO_BANNED' | 'RATE_LIMITED_429';
  userAgent: string;
}

interface BannedIpItem {
  ip: string;
  reason?: string;
  expiresAt: string;
  remainingMinutes: number;
}

interface WafOverview {
  status: string;
  totalThreatsBlocked: number;
  activeBannedIpsCount: number;
  bannedIps: BannedIpItem[];
  breakdown: {
    sqlmap: number;
    nmap: number;
    burpSuite: number;
    scanners: number;
    reconnaissance: number;
    commandInjection: number;
    pathTraversal: number;
    rateLimit: number;
  };
  config: {
    enabled: boolean;
    sensitivity: 'STANDARD' | 'STRICT' | 'PARANOID';
    blockSqlMap: boolean;
    blockNmap: boolean;
    blockBurpSuite: boolean;
    blockScanners: boolean;
    blockSqlInjection: boolean;
    blockPathTraversal: boolean;
    blockCommandInjection: boolean;
    blockReconnaissancePaths: boolean;
    rateLimitEnabled: boolean;
    maxRequestsPerMinute: number;
    autoBanThreshold: number;
    banDurationMinutes: number;
  };
  recentLogs: ThreatEvent[];
}

export const AdminSecurityWafTab: React.FC = () => {
  const [data, setData] = useState<WafOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTool, setFilterTool] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [manualBanIp, setManualBanIp] = useState<string>('');
  const [manualBanReason, setManualBanReason] = useState<string>('Tentativa de intrusão detetada');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/waf/overview');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar telemetria WAF:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 6000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleUnban = async (ip: string) => {
    try {
      soundService.playTick();
      const res = await fetch('/api/admin/waf/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        soundService.playUISelect();
        showNotification(`✅ IP ${ip} desbanido com sucesso.`);
        fetchOverview();
      }
    } catch (e) {
      showNotification('Erro ao desbanir IP.');
    }
  };

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanIp.trim()) return;
    try {
      soundService.playTick();
      const res = await fetch('/api/admin/waf/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: manualBanIp.trim(),
          reason: manualBanReason.trim(),
          durationMinutes: 120
        })
      });
      if (res.ok) {
        soundService.playLoss();
        showNotification(`🚨 IP ${manualBanIp} banido com sucesso no WAF.`);
        setManualBanIp('');
        fetchOverview();
      }
    } catch (e) {
      showNotification('Erro ao banir IP.');
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Deseja realmente limpar os registos históricos do WAF?')) return;
    try {
      soundService.playTick();
      const res = await fetch('/api/admin/waf/clear-logs', { method: 'POST' });
      if (res.ok) {
        soundService.playUISelect();
        showNotification('🗑️ Registos de ameaças limpos.');
        fetchOverview();
      }
    } catch (e) {
      showNotification('Erro ao limpar registos.');
    }
  };

  const handleToggleRule = async (key: string, currentValue: boolean) => {
    try {
      soundService.playTick();
      const res = await fetch('/api/admin/waf/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: !currentValue })
      });
      if (res.ok) {
        showNotification('Regra do WAF atualizada.');
        fetchOverview();
      }
    } catch (e) {
      showNotification('Erro ao atualizar regra.');
    }
  };

  const handleSetSensitivity = async (mode: 'STANDARD' | 'STRICT' | 'PARANOID') => {
    try {
      soundService.playTick();
      const res = await fetch('/api/admin/waf/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensitivity: mode })
      });
      if (res.ok) {
        soundService.playUISelect();
        showNotification(`Modo de sensibilidade alterado para: ${mode}`);
        fetchOverview();
      }
    } catch (e) {
      showNotification('Erro ao alterar sensibilidade.');
    }
  };

  const filteredLogs = (data?.recentLogs || []).filter((log) => {
    if (filterTool !== 'ALL' && !log.tool.toLowerCase().includes(filterTool.toLowerCase())) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        log.ip.toLowerCase().includes(term) ||
        log.path.toLowerCase().includes(term) ||
        log.matchedRule.toLowerCase().includes(term) ||
        log.payloadSnippet.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {statusMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in font-bold text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main Header / Shield Status */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <ShieldAlert className="w-9 h-9 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Sentinel WAF & Defesa Anti-Hacker
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Escudo Ativo 24/7
                </span>
              </div>
              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
                Blindagem ativa contra ferramentas automatizadas de exploração: 
                <span className="text-rose-400 font-mono font-bold"> sqlmap</span> (SQLi), 
                <span className="text-amber-400 font-mono font-bold"> nmap</span> (Port & Path Scanner), 
                <span className="text-purple-400 font-mono font-bold"> Burp Suite</span> (Fuzzers & Collaborator), 
                além de ataques de Path Traversal e Execução Remota (RCE).
              </p>
            </div>
          </div>

          {/* Quick Actions & Sensitivity Selector */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="bg-black/50 border border-white/10 p-1.5 rounded-2xl flex items-center gap-1">
              {(['STANDARD', 'STRICT', 'PARANOID'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleSetSensitivity(mode)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    data?.config.sensitivity === mode
                      ? mode === 'PARANOID'
                        ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                        : 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {mode === 'STANDARD' ? 'Padrão' : mode === 'STRICT' ? 'Rigoroso' : 'Paranoico 🔥'}
                </button>
              ))}
            </div>

            <button
              onClick={fetchOverview}
              disabled={isLoading}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shrink-0"
              title="Sincronizar WAF"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* SQLMap */}
        <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest">Proteção SQLMap</span>
            <Terminal className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {data?.breakdown.sqlmap ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Injeções SQL & Probes Neutralizados</p>
          <div className="absolute -bottom-4 -right-4 text-rose-500/10 text-6xl font-black select-none pointer-events-none">
            SQL
          </div>
        </div>

        {/* Nmap */}
        <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest">Proteção Nmap</span>
            <Search className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {data?.breakdown.nmap ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Varreduras de Portas & Reconnaissance</p>
          <div className="absolute -bottom-4 -right-4 text-amber-500/10 text-6xl font-black select-none pointer-events-none">
            NMAP
          </div>
        </div>

        {/* Burp Suite */}
        <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest">Proteção Burp Suite</span>
            <Activity className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono">
            {data?.breakdown.burpSuite ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Fuzzers, OAST & Collaborators Barrados</p>
          <div className="absolute -bottom-4 -right-4 text-purple-500/10 text-6xl font-black select-none pointer-events-none">
            BURP
          </div>
        </div>

        {/* Active Banned IPs */}
        <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-red-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest">IPs Atualmente Banidos</span>
            <Ban className="w-5 h-5" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-red-400 font-mono">
            {data?.activeBannedIpsCount ?? 0}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Bloqueados por Ofensas Consecutivas</p>
          <div className="absolute -bottom-4 -right-4 text-red-500/10 text-6xl font-black select-none pointer-events-none">
            BAN
          </div>
        </div>
      </div>

      {/* Production WAF Rule Controls & IP Quarantine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Rule Engine Toggles */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Módulos de Inspeção Ativos</h3>
                <p className="text-[10px] text-slate-400">Filtros heurísticos e regras de firewall</p>
              </div>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              {[
                { key: 'blockSqlMap', label: 'Assinaturas & Probes SQLMap', val: data?.config.blockSqlMap },
                { key: 'blockNmap', label: 'Inspeção de Portas/User-Agent Nmap', val: data?.config.blockNmap },
                { key: 'blockBurpSuite', label: 'Cabeçalhos Burp Collaborator & Fuzzers', val: data?.config.blockBurpSuite },
                { key: 'blockSqlInjection', label: 'Filtro Deep SQL Injection (Query & Body)', val: data?.config.blockSqlInjection },
                { key: 'blockPathTraversal', label: 'Bloqueio de Path Traversal (../, etc/passwd)', val: data?.config.blockPathTraversal },
                { key: 'blockCommandInjection', label: 'Proteção RCE & Log4Shell JNDI', val: data?.config.blockCommandInjection },
                { key: 'blockReconnaissancePaths', label: 'Honeypots (.env, .git, phpmyadmin)', val: data?.config.blockReconnaissancePaths },
                { key: 'rateLimitEnabled', label: 'Rate Limiter Anti-DDoS / Força Bruta', val: data?.config.rateLimitEnabled }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-300 font-medium text-[11px]">{item.label}</span>
                  <button
                    onClick={() => handleToggleRule(item.key, !!item.val)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      item.val ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        item.val ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-slate-500">
            Auto-Ban ativo: <strong className="text-slate-300">3 infrações = Banimento por 30 minutos</strong>
          </div>
        </div>

        {/* Manual Ban & Currently Banned IPs */}
        <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Gestão de IPs Bloqueados</h3>
                <p className="text-[10px] text-slate-400">Quarentena e bloqueio manual</p>
              </div>
            </div>

            {/* Manual Ban Form */}
            <form onSubmit={handleManualBan} className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: 192.168.1.100 ou IP público"
                  value={manualBanIp}
                  onChange={(e) => setManualBanIp(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer"
                >
                  Banir
                </button>
              </div>
              <input
                type="text"
                placeholder="Motivo do bloqueio..."
                value={manualBanReason}
                onChange={(e) => setManualBanReason(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none"
              />
            </form>

            {/* Banned IPs List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(!data?.bannedIps || data.bannedIps.length === 0) ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-400 text-xs">
                  Nenhum IP em quarentena no momento. Rede segura.
                </div>
              ) : (
                data.bannedIps.map((banned, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 flex items-center justify-between gap-2">
                    <div className="overflow-hidden">
                      <div className="font-mono text-xs font-bold text-red-300">{banned.ip}</div>
                      <div className="text-[10px] text-slate-400 truncate">{banned.reason || 'Atividade maliciosa'}</div>
                      <div className="text-[9px] text-slate-500">Expira em: {banned.remainingMinutes} min</div>
                    </div>
                    <button
                      onClick={() => handleUnban(banned.ip)}
                      className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                      title="Desbanir IP"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Liberar</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Whitelisted: 127.0.0.1, ::1</span>
            <span className="text-emerald-400 font-bold">Protegido</span>
          </div>
        </div>
      </div>

      {/* Real-Time Threats Logs Table */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base md:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-5 h-5 text-rose-400" />
                Registo de Ataques Neutralizados (WAF Logs)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold font-mono">
                {filteredLogs.length} eventos
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Auditoria em tempo real de tentativas de exploração bloqueadas pelo firewall
            </p>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tool Filter Selector */}
            <div className="bg-black/50 border border-white/10 p-1 rounded-xl flex items-center gap-1 text-[10px] font-bold">
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'SQLMap', label: 'SQLMap' },
                { id: 'Nmap', label: 'Nmap' },
                { id: 'Burp', label: 'Burp Suite' },
                { id: 'Traversal', label: 'Path Traversal' },
                { id: 'Command', label: 'RCE' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTool(tab.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterTool === tab.id ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar IP, rota, regra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 w-44"
              />
            </div>

            {/* Clear Button */}
            <button
              onClick={handleClearLogs}
              className="p-2 bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Limpar Registos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">Data / Hora</th>
                <th className="py-3 px-3">Ferramenta / Vetor</th>
                <th className="py-3 px-3">Endereço IP</th>
                <th className="py-3 px-3">Rota / Método</th>
                <th className="py-3 px-3">Regra Disparada</th>
                <th className="py-3 px-3">Amostra do Payload</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum ataque malicioso correspondente aos filtros. Sistema 100% íntegro.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isCritical = log.severity === 'CRITICAL';
                  const isHigh = log.severity === 'HIGH';

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString('pt-PT')}
                        <span className="block text-[9px] text-slate-600">
                          {new Date(log.timestamp).toLocaleDateString('pt-PT')}
                        </span>
                      </td>

                      {/* Tool */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          log.tool === 'SQLMap'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : log.tool === 'Nmap'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : log.tool === 'Burp Suite'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        }`}>
                          {log.tool}
                        </span>
                      </td>

                      {/* IP */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-slate-200">
                        {log.ip}
                      </td>

                      {/* Path */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                        <span className="text-emerald-400 font-bold mr-1.5">{log.method}</span>
                        <span className="text-slate-300">{log.path}</span>
                      </td>

                      {/* Rule */}
                      <td className="py-3 px-3 text-slate-300 text-[11px] max-w-xs truncate" title={log.matchedRule}>
                        {log.matchedRule}
                      </td>

                      {/* Payload */}
                      <td className="py-3 px-3 max-w-xs truncate font-mono text-[10px] text-rose-300 bg-black/30 rounded px-2 py-1" title={log.payloadSnippet}>
                        {log.payloadSnippet || 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 whitespace-nowrap text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          log.action === 'IP_AUTO_BANNED'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 text-rose-300 border border-rose-500/30'
                        }`}>
                          {log.action === 'IP_AUTO_BANNED' ? '🚫 Auto-Banned' : '🛡️ Bloqueado 403'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

export interface ThreatLog {
  id: string;
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  tool: 'SQLMap' | 'Nmap' | 'Burp Suite' | 'Web Scanner / Fuzzer' | 'SQL Injection' | 'Path Traversal' | 'Command Injection (RCE)' | 'Reconnaissance Probe' | 'Rate Limit (DDoS/Fuzz)';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchedRule: string;
  payloadSnippet: string;
  action: 'BLOCKED_403' | 'IP_AUTO_BANNED' | 'RATE_LIMITED_429';
  userAgent: string;
}

export interface WafConfig {
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
  autoBanThreshold: number; // offenses before ban
  banDurationMinutes: number;
}

interface IpTracking {
  requests: { count: number; resetAt: number };
  offenses: { count: number; lastOffense: number };
  bannedUntil?: number;
  banReason?: string;
}

const THREAT_LOGS_FILE = path.join(process.cwd(), 'security_waf_threats.json');
const WAF_CONFIG_FILE = path.join(process.cwd(), 'security_waf_config.json');

class SecurityWafEngine {
  private config: WafConfig = {
    enabled: true,
    sensitivity: 'STRICT',
    blockSqlMap: true,
    blockNmap: true,
    blockBurpSuite: true,
    blockScanners: true,
    blockSqlInjection: true,
    blockPathTraversal: true,
    blockCommandInjection: true,
    blockReconnaissancePaths: true,
    rateLimitEnabled: true,
    maxRequestsPerMinute: 180,
    autoBanThreshold: 3,
    banDurationMinutes: 30
  };

  private threatLogs: ThreatLog[] = [];
  private ipTracker: Map<string, IpTracking> = new Map();
  private manuallyBannedIps: Set<string> = new Set();
  private whitelistedIps: Set<string> = new Set(['127.0.0.1', '::1']);

  constructor() {
    this.loadState();
    // Periodic cleanup of stale tracking entries every 10 minutes
    setInterval(() => this.cleanupTrackers(), 10 * 60 * 1000);
  }

  private loadState() {
    try {
      if (fs.existsSync(THREAT_LOGS_FILE)) {
        this.threatLogs = JSON.parse(fs.readFileSync(THREAT_LOGS_FILE, 'utf8'));
      }
    } catch (e) {
      this.threatLogs = [];
    }

    try {
      if (fs.existsSync(WAF_CONFIG_FILE)) {
        const loaded = JSON.parse(fs.readFileSync(WAF_CONFIG_FILE, 'utf8'));
        this.config = { ...this.config, ...loaded };
      }
    } catch (e) {}
  }

  private saveState() {
    try {
      fs.writeFileSync(THREAT_LOGS_FILE, JSON.stringify(this.threatLogs.slice(0, 300), null, 2));
    } catch (e) {}
    try {
      fs.writeFileSync(WAF_CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (e) {}
  }

  private cleanupTrackers() {
    const now = Date.now();
    for (const [ip, tracking] of this.ipTracker.entries()) {
      if (tracking.bannedUntil && tracking.bannedUntil > now) {
        continue; // Still banned
      }
      if (tracking.requests.resetAt < now && (!tracking.offenses.count || now - tracking.offenses.lastOffense > 3600000)) {
        this.ipTracker.delete(ip);
      }
    }
  }

  public getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  public isIpBanned(ip: string): { isBanned: boolean; reason?: string; remainingSeconds?: number } {
    if (this.whitelistedIps.has(ip)) return { isBanned: false };
    if (this.manuallyBannedIps.has(ip)) return { isBanned: true, reason: 'Banimento manual por administrador.' };

    const tracking = this.ipTracker.get(ip);
    if (tracking && tracking.bannedUntil) {
      const now = Date.now();
      if (tracking.bannedUntil > now) {
        return {
          isBanned: true,
          reason: tracking.banReason || 'IP bloqueado por múltiplas violações de segurança (WAF Sentinel).',
          remainingSeconds: Math.ceil((tracking.bannedUntil - now) / 1000)
        };
      } else {
        delete tracking.bannedUntil;
        delete tracking.banReason;
      }
    }
    return { isBanned: false };
  }

  public banIp(ip: string, reason: string, durationMinutes = this.config.banDurationMinutes) {
    if (this.whitelistedIps.has(ip)) return;
    let tracking = this.ipTracker.get(ip);
    if (!tracking) {
      tracking = {
        requests: { count: 1, resetAt: Date.now() + 60000 },
        offenses: { count: this.config.autoBanThreshold, lastOffense: Date.now() }
      };
      this.ipTracker.set(ip, tracking);
    }
    tracking.bannedUntil = Date.now() + durationMinutes * 60 * 1000;
    tracking.banReason = reason;
    this.saveState();
  }

  public unbanIp(ip: string) {
    this.manuallyBannedIps.delete(ip);
    const tracking = this.ipTracker.get(ip);
    if (tracking) {
      delete tracking.bannedUntil;
      delete tracking.banReason;
      tracking.offenses.count = 0;
    }
    this.saveState();
  }

  public logThreat(event: Omit<ThreatLog, 'id' | 'timestamp'>) {
    const log: ThreatLog = {
      id: 'SEC-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      ...event
    };

    console.warn(`🚨 [WAF SENTINEL BLOCKED] ${log.tool} - IP: ${log.ip} - Path: ${log.path} - Rule: ${log.matchedRule}`);
    this.threatLogs.unshift(log);
    if (this.threatLogs.length > 500) {
      this.threatLogs = this.threatLogs.slice(0, 500);
    }
    this.saveState();
  }

  private registerOffense(ip: string, reason: string): boolean {
    if (this.whitelistedIps.has(ip)) return false;
    let tracking = this.ipTracker.get(ip);
    const now = Date.now();
    if (!tracking) {
      tracking = {
        requests: { count: 1, resetAt: now + 60000 },
        offenses: { count: 1, lastOffense: now }
      };
      this.ipTracker.set(ip, tracking);
    } else {
      tracking.offenses.count += 1;
      tracking.offenses.lastOffense = now;
    }

    if (tracking.offenses.count >= this.config.autoBanThreshold) {
      this.banIp(ip, reason);
      return true; // Newly banned
    }
    return false;
  }

  /**
   * Deep recursive inspect string representation of any object (body, query, headers)
   */
  private extractAllStringValues(obj: any, maxDepth = 4, currentDepth = 0): string[] {
    if (currentDepth > maxDepth || !obj) return [];
    if (typeof obj === 'string') return [obj];
    if (typeof obj === 'number' || typeof obj === 'boolean') return [String(obj)];

    const results: string[] = [];
    if (Array.isArray(obj)) {
      for (const item of obj) {
        results.push(...this.extractAllStringValues(item, maxDepth, currentDepth + 1));
      }
    } else if (typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj)) {
        results.push(key);
        results.push(...this.extractAllStringValues(val, maxDepth, currentDepth + 1));
      }
    }
    return results;
  }

  /**
   * Inspects incoming request against hacker tools signatures and exploits
   */
  public inspectRequest(req: Request): { isThreat: boolean; threat?: Omit<ThreatLog, 'id' | 'timestamp' | 'ip' | 'method' | 'path' | 'userAgent'> } {
    if (!this.config.enabled) return { isThreat: false };

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const url = req.originalUrl || req.url || '';
    const rawPath = req.path || '';
    const method = req.method.toUpperCase();

    // 1. REJECT MALICIOUS / PROBE HTTP METHODS (Nmap / WebDAV / Debug Probing)
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(method)) {
      return {
        isThreat: true,
        threat: {
          tool: 'Nmap',
          severity: 'HIGH',
          matchedRule: `Método HTTP não autorizado (${method}) típico de scanners Nmap/Nessus`,
          payloadSnippet: `Method: ${method}`,
          action: 'BLOCKED_403'
        }
      };
    }

    // 2. DETECTION: SQLMAP SIGNATURES
    if (this.config.blockSqlMap) {
      if (userAgent.includes('sqlmap') || userAgent.includes('sqlmate')) {
        return {
          isThreat: true,
          threat: {
            tool: 'SQLMap',
            severity: 'CRITICAL',
            matchedRule: 'Assinatura explícita de User-Agent do sqlmap',
            payloadSnippet: userAgent,
            action: 'BLOCKED_403'
          }
        };
      }
    }

    // 3. DETECTION: NMAP & NETWORK RECONNAISSANCE SCANNER SIGNATURES
    if (this.config.blockNmap) {
      const nmapKeywords = ['nmap', 'masscan', 'zmap', 'zgrab', 'morfeus', 'nikto'];
      for (const kw of nmapKeywords) {
        if (userAgent.includes(kw)) {
          return {
            isThreat: true,
            threat: {
              tool: 'Nmap',
              severity: 'CRITICAL',
              matchedRule: `Assinatura de scanner de portas/redes: ${kw}`,
              payloadSnippet: userAgent,
              action: 'BLOCKED_403'
            }
          };
        }
      }
    }

    // 4. DETECTION: BURP SUITE SIGNATURES
    if (this.config.blockBurpSuite) {
      // Check Burp Suite specific headers
      const burpHeaders = ['x-burp-collaborator', 'burpcollaborator', 'x-burp-collaborator-id', 'burp'];
      for (const bh of burpHeaders) {
        if (req.headers[bh]) {
          return {
            isThreat: true,
            threat: {
              tool: 'Burp Suite',
              severity: 'CRITICAL',
              matchedRule: `Cabeçalho ativo de Burp Suite Collaborator detetado: ${bh}`,
              payloadSnippet: String(req.headers[bh]),
              action: 'BLOCKED_403'
            }
          };
        }
      }

      // Check Burp User-Agents
      if (userAgent.includes('burp') || userAgent.includes('burpsuite') || userAgent.includes('portswigger')) {
        return {
          isThreat: true,
          threat: {
            tool: 'Burp Suite',
            severity: 'CRITICAL',
            matchedRule: 'User-Agent associado ao Burp Suite Professional / Intruder',
            payloadSnippet: userAgent,
            action: 'BLOCKED_403'
          }
        };
      }

      // Check for Out-of-band application security testing (OAST) callbacks (Burp Collaborator / Oastify)
      const allHeadersStr = JSON.stringify(req.headers);
      if (allHeadersStr.includes('.burpcollaborator.net') || allHeadersStr.includes('.oastify.com') || allHeadersStr.includes('.oast.pro') || allHeadersStr.includes('.canarytokens.com')) {
        return {
          isThreat: true,
          threat: {
            tool: 'Burp Suite',
            severity: 'CRITICAL',
            matchedRule: 'Callback OAST / Burp Collaborator detetado em cabeçalhos HTTP',
            payloadSnippet: allHeadersStr.substring(0, 150),
            action: 'BLOCKED_403'
          }
        };
      }
    }

    // 5. DETECTION: GENERIC AUTOMATED VULNERABILITY SCANNERS & FUZZERS
    if (this.config.blockScanners) {
      const scannerAgents = [
        'gobuster', 'dirbuster', 'ffuf', 'nuclei', 'wpscan', 'wfuzz',
        'acunetix', 'nessus', 'openvas', 'hydra', 'netsparker', 'havij',
        'pangolin', 'sqlninja', 'arachni', 'qualys', 'appscan'
      ];
      for (const sa of scannerAgents) {
        if (userAgent.includes(sa)) {
          return {
            isThreat: true,
            threat: {
              tool: 'Web Scanner / Fuzzer',
              severity: 'HIGH',
              matchedRule: `Scanner automatizado de vulnerabilidades bloqueado: ${sa}`,
              payloadSnippet: userAgent,
              action: 'BLOCKED_403'
            }
          };
        }
      }
    }

    // 6. DETECTION: HONEYPOT & SENSITIVE PATH RECONNAISSANCE (Used by Nmap, DirBuster, Nikto)
    if (this.config.blockReconnaissancePaths) {
      const forbiddenPaths = [
        /^\/\.env(\.|$)/i,
        /^\/\.git(\/|$)/i,
        /^\/\.svn(\/|$)/i,
        /^\/\.well-known\/security\.txt\.bak/i,
        /^\/(wp-admin|wp-login\.php|xmlrpc\.php)/i,
        /^\/(phpmyadmin|pma|mysql|adminer|dbadmin)/i,
        /^\/(actuator|console|solr|server-status|server-info)/i,
        /^\/(c99|r57|shell|alfa|cmd)\.php/i,
        /^\/(web\.config|\.htaccess|\.htpasswd|config\.json\.bak)/i,
        /^\/owa(\/|$)/i
      ];

      for (const pattern of forbiddenPaths) {
        if (pattern.test(rawPath)) {
          return {
            isThreat: true,
            threat: {
              tool: 'Reconnaissance Probe',
              severity: 'HIGH',
              matchedRule: `Varredura de ficheiro/diretório sensível ou honeypot: ${rawPath}`,
              payloadSnippet: rawPath,
              action: 'BLOCKED_403'
            }
          };
        }
      }
    }

    // 7. PAYLOAD DEEP INSPECTION (Query, Body, Decoded URL)
    const samples: string[] = [url];
    try {
      samples.push(decodeURIComponent(url));
    } catch (e) {}

    if (req.query && Object.keys(req.query).length > 0) {
      samples.push(...this.extractAllStringValues(req.query));
    }
    if (req.body && Object.keys(req.body).length > 0) {
      samples.push(...this.extractAllStringValues(req.body));
    }

    // Combine all strings into lowercase test stream
    for (const sample of samples) {
      if (!sample || typeof sample !== 'string') continue;
      const lower = sample.toLowerCase();

      // 7.1 SQL INJECTION (SQLMap probes & manual SQLi)
      if (this.config.blockSqlInjection) {
        const sqliPatterns = [
          { rule: 'UNION SELECT injection', regex: /\bunion(\s+all)?\s+select\b/i },
          { rule: 'SQL Tautology / Boolean Blind (OR 1=1)', regex: /(\bor\b|\band\b)\s+['"\d\w]+\s*=\s*['"\d\w]+/i },
          { rule: 'SQL Tautology Boolean Numeric', regex: /'(\s*)or(\s*)'\d+'='?\d+/i },
          { rule: 'SQL Time-Based Blind Injection', regex: /\b(sleep\s*\(\s*\d+\s*\)|benchmark\s*\(\s*\d+|waitfor\s+delay\s+['"]|pg_sleep\s*\()/i },
          { rule: 'SQL Error-Based Injection', regex: /\b(extractvalue\s*\(|updatexml\s*\(|exp\s*\(\s*~\s*\(select)/i },
          { rule: 'Database Metadata / Information Schema Probing', regex: /\b(information_schema|sqlite_master|sys\.tables|@@version|version\(\))\b/i },
          { rule: 'SQL Stacked / Destructive Execution', regex: /;\s*(drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b/i },
          { rule: 'SQL Hex Literal Injection Probe', regex: /0x[0-9a-f]{8,}/i },
          { rule: 'SQL Inline Comment Injection', regex: /\/\*![\s\S]*?\*\/|;\s*--/i }
        ];

        for (const p of sqliPatterns) {
          if (p.regex.test(sample)) {
            return {
              isThreat: true,
              threat: {
                tool: 'SQLMap',
                severity: 'CRITICAL',
                matchedRule: `Padrão de injeção SQL neutralizado: ${p.rule}`,
                payloadSnippet: sample.substring(0, 160),
                action: 'BLOCKED_403'
              }
            };
          }
        }
      }

      // 7.2 PATH TRAVERSAL / DIRECTORY ESCAPE (Burp Suite, DirBuster, LFI)
      if (this.config.blockPathTraversal) {
        const pathTraversalPatterns = [
          { rule: 'Directory Traversal Relative Path (../)', regex: /\.\.[\/\\]/ },
          { rule: 'URL Encoded Directory Traversal (%2e%2e)', regex: /(%2e%2e|\.\.%2f|\.\.%5c|%252e%252e)/i },
          { rule: 'System Sensitive Path Access (/etc/passwd, win.ini)', regex: /(\/etc\/passwd|\/etc\/shadow|\/proc\/self\/environ|windows\/win\.ini|boot\.ini)/i }
        ];

        for (const p of pathTraversalPatterns) {
          if (p.regex.test(sample)) {
            return {
              isThreat: true,
              threat: {
                tool: 'Path Traversal',
                severity: 'CRITICAL',
                matchedRule: `Tentativa de navegação em diretórios restritos: ${p.rule}`,
                payloadSnippet: sample.substring(0, 160),
                action: 'BLOCKED_403'
              }
            };
          }
        }
      }

      // 7.3 COMMAND INJECTION & RCE (Remote Code Execution, Burp Fuzzing, Log4j)
      if (this.config.blockCommandInjection) {
        const cmdPatterns = [
          { rule: 'Command Pipe / Execution Chain', regex: /(\||;|&|`|\$\()\s*(whoami|cat\s+\/etc|ls\s+-|id\b|powershell|cmd\.exe|wget\s+|curl\s+http)/i },
          { rule: 'Log4Shell / JNDI Remote Code Execution', regex: /\$\{jndi:(ldap|rmi|dns):/i },
          { rule: 'Server-Side Template Injection (SSTI)', regex: /\{\{7\*7\}\}|\$\{7\*7\}|<%= 7\*7 %>/i },
          { rule: 'Prototype Pollution Exploit', regex: /\b(__proto__|constructor\.prototype)\b/i }
        ];

        for (const p of cmdPatterns) {
          if (p.regex.test(sample)) {
            return {
              isThreat: true,
              threat: {
                tool: 'Command Injection (RCE)',
                severity: 'CRITICAL',
                matchedRule: `Tentativa de execução remota de comandos ou template: ${p.rule}`,
                payloadSnippet: sample.substring(0, 160),
                action: 'BLOCKED_403'
              }
            };
          }
        }
      }
    }

    return { isThreat: false };
  }

  /**
   * Evaluates Rate Limiting per IP
   */
  public checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
    if (!this.config.rateLimitEnabled || this.whitelistedIps.has(ip)) {
      return { allowed: true };
    }

    const now = Date.now();
    let tracking = this.ipTracker.get(ip);
    if (!tracking) {
      tracking = {
        requests: { count: 1, resetAt: now + 60000 },
        offenses: { count: 0, lastOffense: 0 }
      };
      this.ipTracker.set(ip, tracking);
      return { allowed: true };
    }

    if (now > tracking.requests.resetAt) {
      tracking.requests.count = 1;
      tracking.requests.resetAt = now + 60000;
      return { allowed: true };
    }

    tracking.requests.count += 1;
    if (tracking.requests.count > this.config.maxRequestsPerMinute) {
      const retryAfter = Math.ceil((tracking.requests.resetAt - now) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  /**
   * Express Middleware function
   */
  public middleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. HARDEN HTTP HEADERS & STRIP IDENTIFIERS
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const ip = this.getClientIp(req);

    // 2. CHECK IF IP IS CURRENTLY BANNED
    const banStatus = this.isIpBanned(ip);
    if (banStatus.isBanned) {
      res.status(403).json({
        success: false,
        error: 'Access Denied: Your IP address has been temporarily banned by CryptonBet WAF Sentinel.',
        reason: banStatus.reason,
        remainingSeconds: banStatus.remainingSeconds,
        reference: 'WAF-IP-BANNED'
      });
      return;
    }

    // 3. CHECK RATE LIMITING
    const rateStatus = this.checkRateLimit(ip);
    if (!rateStatus.allowed) {
      this.logThreat({
        ip,
        method: req.method,
        path: req.originalUrl || req.url,
        tool: 'Rate Limit (DDoS/Fuzz)',
        severity: 'MEDIUM',
        matchedRule: `Limite de requisições excedido (${this.config.maxRequestsPerMinute}/minuto)`,
        payloadSnippet: `IP realizou mais de ${this.config.maxRequestsPerMinute} chamadas em 60s`,
        action: 'RATE_LIMITED_429',
        userAgent: req.headers['user-agent'] || 'Unknown'
      });

      res.setHeader('Retry-After', String(rateStatus.retryAfter || 60));
      res.status(429).json({
        success: false,
        error: 'Too Many Requests: Rate limit exceeded. Protegendo o servidor contra ataques de força bruta e DoS.',
        retryAfterSeconds: rateStatus.retryAfter
      });
      return;
    }

    // 4. DEEP THREAT & SCANNER INSPECTION
    const inspection = this.inspectRequest(req);
    if (inspection.isThreat && inspection.threat) {
      const willBan = this.registerOffense(ip, inspection.threat.matchedRule);
      const action = willBan ? 'IP_AUTO_BANNED' : 'BLOCKED_403';

      this.logThreat({
        ip,
        method: req.method,
        path: req.originalUrl || req.url,
        tool: inspection.threat.tool,
        severity: inspection.threat.severity,
        matchedRule: inspection.threat.matchedRule,
        payloadSnippet: inspection.threat.payloadSnippet,
        action,
        userAgent: req.headers['user-agent'] || 'Unknown'
      });

      res.status(403).json({
        success: false,
        status: 403,
        error: 'Forbidden: Threat Neutralized by CryptonBet WAF Sentinel',
        toolBlocked: inspection.threat.tool,
        incidentDetails: inspection.threat.matchedRule,
        actionTaken: action,
        clientIp: ip,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };

  /**
   * Returns statistics and threat events for Admin Dashboard
   */
  public getOverview() {
    const now = Date.now();
    const bannedIpsList: Array<{ ip: string; reason?: string; expiresAt: string; remainingMinutes: number }> = [];

    for (const [ip, tracking] of this.ipTracker.entries()) {
      if (tracking.bannedUntil && tracking.bannedUntil > now) {
        bannedIpsList.push({
          ip,
          reason: tracking.banReason,
          expiresAt: new Date(tracking.bannedUntil).toISOString(),
          remainingMinutes: Math.ceil((tracking.bannedUntil - now) / 60000)
        });
      }
    }

    for (const ip of this.manuallyBannedIps) {
      bannedIpsList.push({
        ip,
        reason: 'Banimento manual permanente por administrador.',
        expiresAt: 'Permanente',
        remainingMinutes: 999999
      });
    }

    // Counts by tool
    const breakdown = {
      sqlmap: this.threatLogs.filter(t => t.tool === 'SQLMap').length,
      nmap: this.threatLogs.filter(t => t.tool === 'Nmap').length,
      burpSuite: this.threatLogs.filter(t => t.tool === 'Burp Suite').length,
      scanners: this.threatLogs.filter(t => t.tool === 'Web Scanner / Fuzzer').length,
      reconnaissance: this.threatLogs.filter(t => t.tool === 'Reconnaissance Probe').length,
      commandInjection: this.threatLogs.filter(t => t.tool === 'Command Injection (RCE)').length,
      pathTraversal: this.threatLogs.filter(t => t.tool === 'Path Traversal').length,
      rateLimit: this.threatLogs.filter(t => t.tool === 'Rate Limit (DDoS/Fuzz)').length
    };

    return {
      status: 'SHIELD_ACTIVE',
      totalThreatsBlocked: this.threatLogs.length,
      activeBannedIpsCount: bannedIpsList.length,
      bannedIps: bannedIpsList,
      breakdown,
      config: this.config,
      recentLogs: this.threatLogs.slice(0, 100)
    };
  }

  public updateConfig(newConfig: Partial<WafConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveState();
    return this.config;
  }

  public clearLogs() {
    this.threatLogs = [];
    this.saveState();
  }
}

export const securityWaf = new SecurityWafEngine();

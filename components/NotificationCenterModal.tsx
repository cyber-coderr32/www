import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Sparkles, 
  Gift, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Wallet, 
  Trophy, 
  ChevronRight, 
  ExternalLink,
  Clock,
  Trash2,
  Filter,
  User,
  Megaphone,
  Zap
} from 'lucide-react';
import { AppNotification, ViewState } from '../types';
import { soundService } from '../services/soundService';
import { notificationService } from '../services/notificationService';
import AudioVoicePlayer from './AudioVoicePlayer';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  currentUserId: string;
  onSelectGame?: (view: ViewState, param?: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUserId,
  onSelectGame
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'INDIVIDUAL' | 'BROADCAST' | 'PROMO'>('ALL');

  if (!isOpen) return null;

  // Filter notifications for this user (broadcast + individual targeting this user, excluding deleted)
  const userNotifs = notifications.filter(n => {
    if ((n.deletedBy || []).includes(currentUserId)) return false;
    return n.target === 'ALL' || n.target === currentUserId || n.targetUserId === currentUserId;
  });

  const unreadCount = userNotifs.filter(n => !(n.readBy || []).includes(currentUserId)).length;

  const filteredNotifs = userNotifs.filter(n => {
    const isRead = (n.readBy || []).includes(currentUserId);
    if (filter === 'UNREAD') return !isRead;
    if (filter === 'INDIVIDUAL') return n.target !== 'ALL';
    if (filter === 'BROADCAST') return n.target === 'ALL';
    if (filter === 'PROMO') return n.type === 'PROMO' || n.type === 'BONUS';
    return true;
  });

  const handleMarkAllRead = () => {
    soundService.playTick();
    notificationService.markAllAsRead(currentUserId, userNotifs);
  };

  const handleDeleteNotification = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    soundService.playCrash();
    notificationService.deleteNotificationForUser(notifId, currentUserId);
  };

  const handleClearAll = () => {
    if (userNotifs.length === 0) return;
    soundService.playCrash();
    notificationService.clearAllForUser(currentUserId, userNotifs);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    notificationService.markAsRead(notif.id, currentUserId);
    if (notif.actionView && onSelectGame) {
      soundService.playUISelect();
      onSelectGame(notif.actionView);
      onClose();
    }
  };

  const getTypeStyle = (type: AppNotification['type']) => {
    switch (type) {
      case 'BONUS':
        return {
          icon: Gift,
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          badgeBg: 'bg-amber-500 text-black',
          label: 'BÓNUS'
        };
      case 'PROMO':
        return {
          icon: Trophy,
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          badgeBg: 'bg-purple-600 text-white',
          label: 'PROMOÇÃO'
        };
      case 'WARNING':
      case 'ALERT':
        return {
          icon: AlertTriangle,
          bg: 'bg-red-500/20 text-red-300 border-red-500/40',
          badgeBg: 'bg-red-600 text-white',
          label: 'ALERTA'
        };
      case 'FINANCE':
        return {
          icon: Wallet,
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          badgeBg: 'bg-[#049444] text-white',
          label: 'FINANCEIRO'
        };
      case 'SUCCESS':
        return {
          icon: CheckCircle2,
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          badgeBg: 'bg-emerald-500 text-black',
          label: 'SUCESSO'
        };
      default:
        return {
          icon: Info,
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          badgeBg: 'bg-blue-600 text-white',
          label: 'INFORMAÇÃO'
        };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return '⚡ Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Hoje às ${date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}`;
      if (diffDays === 1) return 'Ontem';
      return date.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' });
    } catch {
      return 'Recentemente';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Clickable Backdrop */}
      <div 
        className="fixed inset-0 bg-transparent" 
        onClick={() => {
          soundService.playUISelect();
          onClose();
        }} 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl bg-[#0c121d] border-2 border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] my-auto"
      >
        {/* HEADER */}
        <div className="shrink-0 p-3.5 sm:p-5 bg-gradient-to-r from-[#049444]/25 via-[#101826] to-amber-500/15 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#049444]/20 border border-[#049444]/40 flex items-center justify-center text-[#049444] shadow-inner relative shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-lg animate-bounce">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black uppercase italic tracking-tight text-white">
                  Central de <span className="text-[#049444]">Notificações</span>
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] sm:text-[10px] font-black">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">
                Avisos oficiais, bónus exclusivos e atualizações da sua conta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-[10px] sm:text-xs font-bold text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer shrink-0"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#049444]" />
                <span className="hidden sm:inline">Marcar lidas</span>
              </button>
            )}

            {userNotifs.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[10px] sm:text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 transition-all cursor-pointer shrink-0"
                title="Eliminar todas as notificações"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar Tudo</span>
              </button>
            )}

            <button
              onClick={() => {
                soundService.playUISelect();
                onClose();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FILTER CHIPS */}
        <div className="shrink-0 px-3 sm:px-4 py-2 bg-[#080d15] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => {
              soundService.playTick();
              setFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#049444] text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Todas ({userNotifs.length})
          </button>
          <button
            onClick={() => {
              soundService.playTick();
              setFilter('UNREAD');
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === 'UNREAD'
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>Não Lidas</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              soundService.playTick();
              setFilter('INDIVIDUAL');
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
              filter === 'INDIVIDUAL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Para Você</span>
          </button>
          <button
            onClick={() => {
              soundService.playTick();
              setFilter('BROADCAST');
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
              filter === 'BROADCAST'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Megaphone className="w-3 h-3" />
            <span>Gerais</span>
          </button>
          <button
            onClick={() => {
              soundService.playTick();
              setFilter('PROMO');
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
              filter === 'PROMO'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Gift className="w-3 h-3" />
            <span>Bónus & Promo</span>
          </button>
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-3 no-scrollbar">
          {filteredNotifs.length === 0 ? (
            <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-3">
                <Bell className="w-7 h-7 sm:w-8 sm:h-8 opacity-40" />
              </div>
              <h3 className="text-white font-bold text-sm">Nenhuma notificação por aqui</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                {filter === 'UNREAD' 
                  ? 'Você está em dia! Não há notificações pendentes.' 
                  : 'Fique atento para receber bónus especiais e alertas importantes.'}
              </p>
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const isRead = (notif.readBy || []).includes(currentUserId);
              const style = getTypeStyle(notif.type);
              const IconComponent = style.icon;
              const isIndividual = notif.target !== 'ALL';

              return (
                <div
                  key={notif.id}
                  onClick={() => notificationService.markAsRead(notif.id, currentUserId)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    !isRead
                      ? 'bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-transparent border-[#049444]/50 shadow-lg shadow-[#049444]/10'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Left indicator for unread */}
                  {!isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#049444]" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border flex items-center justify-center shrink-0 ${style.bg}`}>
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${style.badgeBg}`}>
                            {style.label}
                          </span>

                          {isIndividual ? (
                            <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />
                              <span>Para Você</span>
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10 flex items-center gap-1">
                              <Megaphone className="w-2.5 h-2.5 text-amber-400" />
                              <span>Todos os Jogadores</span>
                            </span>
                          )}

                          {notif.priority === 'URGENT' && (
                            <span className="text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500 text-white animate-pulse">
                              ⚡ Urgente
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeTime(notif.createdAt)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(e, notif.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
                            title="Eliminar esta notificação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className={`text-xs sm:text-sm font-black text-white ${!isRead ? 'text-emerald-300 font-black' : ''}`}>
                        {notif.title}
                      </h4>

                      <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                        {notif.message}
                      </p>

                      {/* Audio Voice Note (WhatsApp style) */}
                      {notif.audioUrl && (
                        <div className="pt-2">
                          <AudioVoicePlayer
                            audioUrl={notif.audioUrl}
                            duration={notif.audioDuration}
                            senderName={notif.senderName || 'Administração'}
                          />
                        </div>
                      )}

                      {/* Action Button if attached */}
                      {notif.actionView && (
                        <div className="pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notif);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#049444] hover:bg-[#037235] text-white font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer active:scale-95"
                          >
                            <span>{notif.actionText || 'Acessar Agora'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="shrink-0 p-3 sm:p-4 bg-[#080d15] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
            CryptonBet Angola • Notificações Oficiais
          </span>
          <button
            onClick={() => {
              soundService.playUISelect();
              onClose();
            }}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white font-black rounded-xl uppercase text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default NotificationCenterModal;


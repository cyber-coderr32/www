
import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Zap, TrendingUp, ChevronRight, Star } from 'lucide-react';
import { soundService } from '../services/soundService';
import { ViewState } from '../types';

interface FeaturedGame {
  id: ViewState;
  title: string;
  category: string;
  image: string;
  badge: string;
  color: string;
}

const FEATURED: FeaturedGame[] = [
  { id: 'CRASH', title: 'Poke Chomp', category: 'Crash Game', image: '😮', badge: 'NOVO', color: 'from-purple-600 via-indigo-600 to-emerald-600' },
  { id: 'BLACKJACK', title: 'Blackjack 21', category: 'Cartas', image: '🃏', badge: 'HOT', color: 'from-blue-600 via-indigo-700 to-slate-900' },
  { id: 'PLINKO', title: 'Plinko Ball', category: 'Arcade', image: '⚪', badge: 'POPULAR', color: 'from-pink-600 via-purple-600 to-indigo-600' },
  { id: 'AVIATOR', title: 'Aviator', category: 'Crash Game', image: '🚀', badge: 'POPULAR', color: 'from-red-600 via-red-500 to-orange-500' },
  { id: 'STAIRS', title: 'Stairs VIP', category: 'Escadaria', image: '🪜', badge: 'VIP', color: 'from-green-600 via-green-500 to-teal-500' },
  { id: 'MINES', title: 'Mines', category: 'Original', image: '💣', badge: 'HOT', color: 'from-slate-800 via-slate-700 to-indigo-900' },
];

interface FeaturedGamesProps {
  onSelect: (view: ViewState) => void;
}

export const FeaturedGames: React.FC<FeaturedGamesProps> = ({ onSelect }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm md:text-xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Star className="w-4 h-4 md:w-5 md:h-5 text-[#FFCC00] fill-[#FFCC00]" />
          JOGOS EM DESTAQUE
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
        {FEATURED.map((game, idx) => (
          <motion.div
            key={game.id + idx}
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
            onClick={() => {
              soundService.playUISelect();
              onSelect(game.id);
            }}
            className={`relative min-w-[200px] md:min-w-[280px] h-32 md:h-40 rounded-3xl overflow-hidden cursor-pointer group shadow-xl`}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
            
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_0)] bg-[length:20px_20px]" />

            {/* Content */}
            <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-between z-10">
              <div className="flex justify-between items-start">
                <span className="px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-md text-[8px] md:text-[10px] font-black text-white tracking-widest uppercase">
                  {game.badge}
                </span>
                <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
                  {game.image}
                </div>
              </div>

              <div>
                <p className="text-[8px] md:text-[10px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">
                  {game.category}
                </p>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase italic line-clamp-1">
                    {game.title}
                  </h3>
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-3xl" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

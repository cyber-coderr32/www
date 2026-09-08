import React, { useEffect, useState } from 'react';

interface GameCardAnimationProps {
  gameId: string;
  className?: string;
}

export const GameCardAnimation: React.FC<GameCardAnimationProps> = ({ gameId, className = '' }) => {
  const normalizedId = gameId.toUpperCase();

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}>
      {normalizedId === 'AVIATOR' && <AviatorCardAnimation />}
      {normalizedId === 'MINES' && <MinesCardAnimation />}
      {normalizedId === 'ROULETTE' && <RouletteCardAnimation />}
      {normalizedId === 'SLOTS' && <SlotsCardAnimation />}
      {normalizedId === 'PLINKO' && <PlinkoCardAnimation />}
      {normalizedId === 'DICE' && <DiceCardAnimation />}
      {normalizedId === 'COINFLIP' && <CoinFlipCardAnimation />}
      {(normalizedId === 'BLACKJACK' || normalizedId === 'POKER' || normalizedId === 'HILO' || normalizedId === 'BACCARAT') && <CardsCardAnimation />}
      {normalizedId === 'CRASH' && <CrashCardAnimation />}
      {(normalizedId === 'TOWER' || normalizedId === 'STAIRS') && <TowerCardAnimation />}
      {(normalizedId === 'WHEEL' || normalizedId === 'LOTTERY') && <WheelCardAnimation />}
      {(normalizedId === 'LIMBO' || normalizedId === 'KENO' || normalizedId === 'SCRATCH') && <LimboCardAnimation />}
    </div>
  );
};

/* ====================================================================================
   1. AVIATOR: Real flight trajectory curve, animated jet, exhaust flame & multiplier
   ==================================================================================== */
const AviatorCardAnimation: React.FC = () => {
  const [multiplier, setMultiplier] = useState(1.00);

  useEffect(() => {
    let current = 1.00;
    const interval = setInterval(() => {
      current += 0.04;
      if (current > 3.80) {
        current = 1.00;
      }
      setMultiplier(Number(current.toFixed(2)));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Radar Coordinate Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#fff" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#fff" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#fff" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#fff" strokeWidth="1" strokeDasharray="3 3" />
      </svg>

      {/* Flight Path SVG Curve */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="aviatorGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="aviatorArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Fill Area Under Curve */}
        <path d="M 10 110 Q 90 105 180 30 L 180 110 Z" fill="url(#aviatorArea)" />
        {/* Glow Line */}
        <path d="M 10 110 Q 90 105 180 30" fill="none" stroke="url(#aviatorGrad)" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Soaring Red Jet Plane */}
      <div 
        className="absolute z-10 transition-transform duration-75"
        style={{
          right: '12%',
          top: '22%',
          transform: 'translate(10%, -10%) rotate(-18deg)'
        }}
      >
        <div className="relative flex items-center">
          {/* Exhaust Jet Fire Particles */}
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center">
            <div className="w-5 h-2 bg-gradient-to-l from-amber-400 via-rose-500 to-transparent rounded-full blur-[1px] animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-white/80 blur-[0.5px] -ml-1 animate-ping" />
          </div>

          {/* Jet Plane SVG */}
          <svg className="w-9 h-9 md:w-11 md:h-11 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" viewBox="0 0 24 24" fill="none">
            <path 
              d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          </svg>
        </div>
      </div>

      {/* Real Live Multiplier Badge */}
      <div className="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-red-500/40 shadow-lg flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
        <span className="font-mono font-black text-red-400 text-xs md:text-sm tracking-tight">
          {multiplier.toFixed(2)}x
        </span>
      </div>
    </div>
  );
};

/* ====================================================================================
   2. MINES: Real 3x3 Grid revealing sparkling emerald gems with particle glints
   ==================================================================================== */
const MinesCardAnimation: React.FC = () => {
  const [activeTiles, setActiveTiles] = useState<number[]>([1, 4, 7]);

  useEffect(() => {
    const cycle = [
      [0, 4, 8],
      [1, 3, 7],
      [2, 4, 6],
      [0, 5, 7],
      [1, 4, 8]
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % cycle.length;
      setActiveTiles(cycle[idx]);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-end pr-3 md:pr-6">
      {/* 3x3 Isometric Mini Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-1.5 p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-emerald-500/20 shadow-2xl rotate-3">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
          const isRevealed = activeTiles.includes(index);
          return (
            <div
              key={index}
              className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
                isRevealed
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-700 border border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-105'
                  : 'bg-slate-800/80 border border-slate-700/60'
              }`}
            >
              {isRevealed ? (
                <div className="relative flex items-center justify-center">
                  <span className="text-xs md:text-sm drop-shadow-[0_0_4px_rgba(255,255,255,0.9)] animate-pulse">💎</span>
                  {/* Sparkle Glint */}
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600/50" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ====================================================================================
   3. ROULETTE: Real European rotating wheel with orbital ivory ball
   ==================================================================================== */
const RouletteCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-2 md:pr-5">
      <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
        {/* Rotating Roulette Wheel Outer Ring */}
        <div 
          className="absolute inset-0 rounded-full border-4 border-amber-600/60 shadow-2xl animate-[spin_14s_linear_infinite]"
          style={{
            background: 'conic-gradient(#ef4444 0deg 20deg, #0f172a 20deg 40deg, #ef4444 40deg 60deg, #0f172a 60deg 80deg, #ef4444 80deg 100deg, #0f172a 100deg 120deg, #10b981 120deg 130deg, #ef4444 130deg 150deg, #0f172a 150deg 170deg, #ef4444 170deg 190deg, #0f172a 190deg 210deg, #ef4444 210deg 230deg, #0f172a 230deg 250deg, #ef4444 250deg 270deg, #0f172a 270deg 290deg, #ef4444 290deg 310deg, #0f172a 310deg 330deg, #ef4444 330deg 350deg, #0f172a 350deg 360deg)'
          }}
        />

        {/* Inner Gold Cone & Turret */}
        <div className="absolute w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 border-2 border-amber-200 shadow-inner flex items-center justify-center">
          <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-amber-950 border border-amber-300/60 shadow" />
        </div>

        {/* Orbiting Ivory Ball in Opposite Spin Direction */}
        <div className="absolute inset-1.5 rounded-full animate-[spin_2.8s_linear_infinite_reverse]">
          <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff] border border-slate-300 absolute top-0 left-1/2 -translate-x-1/2" />
        </div>
      </div>
    </div>
  );
};

/* ====================================================================================
   4. SLOTS: Real 3-reel high-speed spinning reels locking on winning paylines
   ==================================================================================== */
const SlotsCardAnimation: React.FC = () => {
  const symbols = ['7️⃣', '💎', '🍒', '👑', '⭐', '🔔'];
  const [reel1, setReel1] = useState('7️⃣');
  const [reel2, setReel2] = useState('7️⃣');
  const [reel3, setReel3] = useState('7️⃣');
  const [isWin, setIsWin] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      // Rapid reel cycling
      const r1 = symbols[Math.floor(Math.random() * symbols.length)];
      const r2 = symbols[Math.floor(Math.random() * symbols.length)];
      const r3 = Math.random() > 0.4 ? r1 : symbols[Math.floor(Math.random() * symbols.length)];
      
      setReel1(r1);
      setReel2(r2);
      setReel3(r3);
      setIsWin(r1 === r2 && r2 === r3);
    }, 1400);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-end pr-3 md:pr-6">
      <div className="relative p-2 rounded-2xl bg-black/60 backdrop-blur-md border-2 border-amber-500/40 shadow-2xl flex flex-col items-center">
        {/* Payline Light Bar */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 bg-amber-500 text-black text-[7px] font-black rounded-full uppercase tracking-widest shadow">
          {isWin ? 'WIN 777' : 'SPIN'}
        </div>

        {/* 3 Reels Display */}
        <div className="flex gap-1.5 mt-1">
          {[reel1, reel2, reel3].map((sym, i) => (
            <div 
              key={i}
              className="w-7 h-10 md:w-9 md:h-12 rounded-lg bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border border-amber-400/30 flex items-center justify-center text-sm md:text-lg shadow-inner overflow-hidden"
            >
              <span className="transform transition-transform duration-300 scale-100 hover:scale-110 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]">
                {sym}
              </span>
            </div>
          ))}
        </div>

        {/* Golden Central Payline Laser */}
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-1 animate-pulse" />
      </div>
    </div>
  );
};

/* ====================================================================================
   5. PLINKO: Real peg pyramid with physics bouncing neon spheres
   ==================================================================================== */
const PlinkoCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-4 md:pr-8">
      <div className="relative w-28 h-24 md:w-36 md:h-28 flex flex-col justify-between items-center">
        {/* Peg Rows (Triangular Formation) */}
        <div className="flex justify-center gap-4">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
        </div>
        <div className="flex justify-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
        </div>
        <div className="flex justify-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
        </div>
        <div className="flex justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow" />
        </div>

        {/* Multiplier Buckets */}
        <div className="w-full flex justify-between gap-1 pt-1 border-t border-white/10">
          <span className="text-[7px] font-black text-rose-400 bg-rose-500/20 px-1 rounded">10x</span>
          <span className="text-[7px] font-black text-amber-400 bg-amber-500/20 px-1 rounded">2x</span>
          <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/20 px-1 rounded">0.5x</span>
          <span className="text-[7px] font-black text-amber-400 bg-amber-500/20 px-1 rounded">2x</span>
          <span className="text-[7px] font-black text-rose-400 bg-rose-500/20 px-1 rounded">10x</span>
        </div>

        {/* Bouncing Glowing Ball with CSS keyframe */}
        <div className="absolute w-3 h-3 rounded-full bg-gradient-to-tr from-pink-500 to-rose-300 shadow-[0_0_10px_#f43f5e] animate-[plinkoDrop_3s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes plinkoDrop {
          0% { top: 0%; left: 48%; transform: scale(0.8); }
          25% { top: 30%; left: 42%; }
          50% { top: 55%; left: 58%; }
          75% { top: 78%; left: 35%; }
          90% { top: 92%; left: 20%; transform: scale(1.2); }
          100% { top: 92%; left: 20%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/* ====================================================================================
   6. DICE: Real 3D isometric tumbling dice
   ==================================================================================== */
const DiceCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-4 md:pr-8">
      <div className="flex gap-2 items-center">
        {/* First Die */}
        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-800 border border-white/30 shadow-xl flex items-center justify-center rotate-[-12deg] animate-[bounce_2s_infinite]">
          <div className="grid grid-cols-2 gap-1.5 p-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
          </div>
        </div>

        {/* Second Die */}
        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-900 border border-white/30 shadow-xl flex items-center justify-center rotate-[15deg] animate-[bounce_2.4s_infinite]">
          <div className="flex flex-col gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ====================================================================================
   7. COINFLIP: 3D rapid spinning golden coin with metallic specular glare
   ==================================================================================== */
const CoinFlipCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-5 md:pr-10">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 border-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center animate-[spinY_2s_linear_infinite]">
        <span className="font-black text-amber-950 text-base md:text-lg drop-shadow">₿</span>
      </div>

      <style>{`
        @keyframes spinY {
          0% { transform: perspective(400px) rotateY(0deg); }
          100% { transform: perspective(400px) rotateY(360deg); }
        }
      `}</style>
    </div>
  );
};

/* ====================================================================================
   8. BLACKJACK / CARDS: Smooth sliding felt playing cards with Ace/King reveals
   ==================================================================================== */
const CardsCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-4 md:pr-7">
      <div className="relative flex items-center">
        {/* Card 1: Ace of Spades */}
        <div className="w-10 h-14 md:w-12 md:h-16 rounded-lg bg-white border border-slate-300 shadow-2xl p-1 flex flex-col justify-between -rotate-12 transition-transform hover:rotate-0">
          <div className="text-[9px] font-black text-black leading-none">A♠</div>
          <div className="text-center text-sm md:text-base leading-none">♠</div>
          <div className="text-[9px] font-black text-black leading-none text-right rotate-180">A♠</div>
        </div>

        {/* Card 2: King of Hearts */}
        <div className="w-10 h-14 md:w-12 md:h-16 rounded-lg bg-white border border-slate-300 shadow-2xl p-1 flex flex-col justify-between rotate-6 -ml-4 z-10 transition-transform hover:rotate-12">
          <div className="text-[9px] font-black text-red-600 leading-none">K♥</div>
          <div className="text-center text-sm md:text-base text-red-600 leading-none">♥</div>
          <div className="text-[9px] font-black text-red-600 leading-none text-right rotate-180">K♥</div>
        </div>
      </div>
    </div>
  );
};

/* ====================================================================================
   9. CRASH / POKE CHOMP: Rocket launch with cosmic stars and ion trail
   ==================================================================================== */
const CrashCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Starfield Particles */}
      <div className="absolute top-2 left-6 w-1 h-1 bg-white rounded-full animate-ping opacity-60" />
      <div className="absolute bottom-4 right-12 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse opacity-80" />
      <div className="absolute top-6 right-20 w-1 h-1 bg-cyan-300 rounded-full animate-ping opacity-70" />

      {/* Ascending Space Rocket / Mascot */}
      <div className="absolute right-6 bottom-4 md:right-8 md:bottom-5 animate-[rocketRise_2.5s_ease-out_infinite]">
        <div className="relative flex flex-col items-center rotate-[-35deg]">
          <span className="text-2xl md:text-3xl filter drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">🚀</span>
          {/* Exhaust Flame */}
          <div className="w-2 h-6 bg-gradient-to-b from-amber-400 via-rose-500 to-transparent rounded-full blur-[1px] animate-pulse -mt-1" />
        </div>
      </div>

      <style>{`
        @keyframes rocketRise {
          0% { transform: translate(-30px, 30px) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(15px, -35px) scale(1.1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/* ====================================================================================
   10. TOWER / STAIRS: Ascending neon step platforms with climbing marker
   ==================================================================================== */
const TowerCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-4 md:pr-7">
      <div className="flex flex-col-reverse gap-1 items-end">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] transition-all"
            style={{
              width: `${step * 14 + 18}px`,
              opacity: step === 4 ? 1 : 0.6 + step * 0.1
            }}
          />
        ))}
      </div>
    </div>
  );
};

/* ====================================================================================
   11. WHEEL: Carnival lucky wheel spinning continuously with colored sectors
   ==================================================================================== */
const WheelCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-3 md:pr-6">
      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/40 shadow-2xl overflow-hidden animate-[spin_6s_linear_infinite]">
        <div 
          className="absolute inset-0"
          style={{
            background: 'conic-gradient(#f43f5e 0deg 45deg, #3b82f6 45deg 90deg, #10b981 90deg 135deg, #eab308 135deg 180deg, #8b5cf6 180deg 225deg, #ec4899 225deg 270deg, #06b6d4 270deg 315deg, #f97316 315deg 360deg)'
          }}
        />
        <div className="absolute inset-4 rounded-full bg-black/80 border border-white/20 flex items-center justify-center">
          <span className="text-[10px] font-black text-amber-400">WIN</span>
        </div>
      </div>
    </div>
  );
};

/* ====================================================================================
   12. LIMBO / KENO / SCRATCH: Ascending laser multiplier beam
   ==================================================================================== */
const LimboCardAnimation: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-end pr-4 md:pr-8">
      <div className="w-16 md:w-20 p-2 rounded-xl bg-black/60 border border-cyan-500/30 shadow-lg flex flex-col items-center">
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-[limboProgress_2s_ease-in-out_infinite]" />
        </div>
        <span className="text-[9px] font-mono font-black text-cyan-300 animate-pulse">99.00x</span>
      </div>

      <style>{`
        @keyframes limboProgress {
          0% { width: 10%; }
          70% { width: 95%; }
          100% { width: 10%; }
        }
      `}</style>
    </div>
  );
};

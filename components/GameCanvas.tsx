
import React, { useRef, useEffect, useState } from 'react';
import { GameStatus } from '../types';

interface GameCanvasProps {
  status: GameStatus;
  multiplier: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  life: number;
  color: string;
  vx: number;
  vy: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, multiplier }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const stateRef = useRef({ status, multiplier });
  
  const [, setResizeTick] = useState(0);

  // Keep ref updated with latest props for the animation loop
  useEffect(() => {
    stateRef.current = { status, multiplier };
  }, [status, multiplier]);

  const updateDimensions = () => {
    if (canvasRef.current) {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        const { clientWidth, clientHeight } = parent;
        if (clientWidth > 0 && clientHeight > 0) {
          dimensionsRef.current = { width: clientWidth, height: clientHeight };
          
          const dpr = window.devicePixelRatio || 1;
          canvasRef.current.width = clientWidth * dpr;
          canvasRef.current.height = clientHeight * dpr;
          
          setResizeTick(t => t + 1);
        }
      }
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const parent = canvasRef.current.parentElement;
    if (!parent) return;

    // Use ResizeObserver for precise container size tracking
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(parent);

    // Initial trigger
    updateDimensions();

    return () => {
      observer.disconnect();
    };
  }, []);

  const createParticle = (x: number, y: number, isCrash: boolean = false) => {
    const count = isCrash ? 50 : 1;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        size: isCrash ? Math.random() * 8 + 4 : Math.random() * 2 + 1,
        life: 1.0,
        color: isCrash ? (Math.random() > 0.5 ? '#f43f5e' : '#fbbf24') : 'rgba(255, 255, 255, 0.4)',
        vx: isCrash ? (Math.random() - 0.5) * 14 : -(Math.random() * 6 + 4),
        vy: isCrash ? (Math.random() - 0.5) * 14 : (Math.random() - 0.5) * 2,
      });
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use current state from refs instead of closure
    const { status: currentStatus, multiplier: currentMultiplier } = stateRef.current;

    let { width, height } = dimensionsRef.current;
    if (width === 0 || height === 0) {
      updateDimensions();
      ({ width, height } = dimensionsRef.current);
      if (width === 0 || height === 0) {
        requestRef.current = requestAnimationFrame(draw);
        return;
      }
    }

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const isMobile = width < 640;

    const planeX = width / 2;
    const planeY = isMobile ? height * 0.28 : height * 0.40; 

    const progress = Math.max(0, currentMultiplier - 1);
    const speed = currentStatus === GameStatus.FLYING ? 7 + (progress * 9) : 0;
    
    offsetRef.current.x += speed;
    if (currentStatus === GameStatus.FLYING) {
      offsetRef.current.y += speed * 0.12;
    }

    drawGrid(ctx, width, height, offsetRef.current.x, offsetRef.current.y);

    if (offsetRef.current.x < width * 2.5) {
      drawRunway(ctx, width, height, offsetRef.current.x, planeY, isMobile);
    }

    if (currentStatus === GameStatus.FLYING && Math.random() > 0.2) {
      createParticle(planeX - 35, planeY);
    }

    particlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.025;
      if (p.life > 0) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2); 
        ctx.fill();
      }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    ctx.globalAlpha = 1;

    if (currentStatus !== GameStatus.CRASHED) {
      const vibration = currentStatus === GameStatus.BETTING ? Math.sin(Date.now() / 35) * 1.5 : 0;
      const rotation = currentStatus === GameStatus.FLYING ? -Math.min(22, progress * 12) : 0;
      drawPlane(ctx, planeX, planeY + vibration, rotation, isMobile);
    } else {
      if (particlesRef.current.length < 35) createParticle(planeX, planeY, true);
    }
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, offX: number, offY: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.lineWidth = 1;
    const spacing = width < 640 ? 55 : 120;
    
    const xShift = -(offX % spacing);
    const yShift = (offY % spacing);

    ctx.beginPath();
    for (let i = xShift; i < width + spacing; i += spacing) {
      ctx.moveTo(i, 0); ctx.lineTo(i, height);
    }
    for (let j = yShift; j < height + spacing; j += spacing) {
      ctx.moveTo(0, j); ctx.lineTo(width, j);
    }
    ctx.stroke();
  };

  const drawRunway = (ctx: CanvasRenderingContext2D, width: number, height: number, offX: number, planeY: number, isMobile: boolean) => {
    const runwayX = (width / 2) - offX;
    // A pista deve estar logo abaixo do avião. 35px em mobile é seguro.
    const runwayY = planeY + (isMobile ? 35 : 50); 
    
    // Sombra de profundidade para a pista
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(runwayX - 1200, runwayY + 5, 2400, 15);

    // Asfalto
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(runwayX - 1200, runwayY, 2400, 8);
    
    // Linha central
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([30, 30]);
    ctx.beginPath();
    ctx.moveTo(runwayX - 1200, runwayY + 4);
    ctx.lineTo(runwayX + 1200, runwayY + 4);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawPlane = (ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, isMobile: boolean) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    
    // Escala robusta para garantir que ele domina a área superior
    const scale = isMobile ? 1.35 : 1.6;
    ctx.scale(scale, scale);

    // Chama da Turbina (Efeito visual de propulsão)
    const pulse = 1 + Math.sin(Date.now() / 40) * 0.3;
    const grad = ctx.createRadialGradient(-32, 0, 0, -32, 0, 28 * pulse);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#fbbf24');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(-32, 0, 28 * pulse, 0, Math.PI * 2); ctx.fill();

    // Avião Red (Cor icônica)
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(244, 63, 94, 0.7)';
    ctx.fillStyle = '#f43f5e';
    
    // Corpo Fuselagem
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 11, 0, 0, Math.PI * 2); ctx.fill();
    // Asa Principal (Superior)
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-26, -34); ctx.lineTo(16, -4); ctx.fill();
    // Asa Principal (Inferior)
    ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-26, 34); ctx.lineTo(16, 4); ctx.fill();
    // Cauda Leme
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-46, -20); ctx.lineTo(-38, 0); ctx.fill();
    
    // Vidro Cockpit Escuro
    ctx.fillStyle = '#020617';
    ctx.beginPath(); ctx.ellipse(18, -2, 11, 6, 0.45, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  };

  useEffect(() => {
    // Only reset offsets when switching to BETTING
    if (status === GameStatus.BETTING) {
      offsetRef.current = { x: 0, y: 0 };
    }
  }, [status]);

  useEffect(() => {
    // Main continuous animation loop
    const tick = () => {
      draw();
      requestRef.current = requestAnimationFrame(tick);
    };
    
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // Run once on mount

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ display: 'block' }}
    />
  );
};

export default GameCanvas;

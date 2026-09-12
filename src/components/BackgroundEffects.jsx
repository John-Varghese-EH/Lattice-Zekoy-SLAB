import React, { useRef, useEffect, memo } from 'react';

export const Starfield = memo(function Starfield() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let stars = [];

    function init() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(140, Math.floor((canvas.width * canvas.height) / 7000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.1 + 0.15,
        baseOp: Math.random() * 0.45 + 0.05,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.2,
      }));
    }
    init();

    let running = true, frame = 0;
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = frame * 0.012;
      for (const s of stars) {
        const op = s.baseOp * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        // Using var(--ink) but with explicit RGB replacement is hard in canvas, 
        // we'll just use a subtle grey that works in both modes, or read computed style.
        // For simplicity, a neutral semi-transparent color that looks like stars.
        ctx.fillStyle = `rgba(150, 150, 150, ${op.toFixed(3)})`; 
        ctx.fill();
      }
      frame++;
      requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => init();
    window.addEventListener("resize", onResize);
    return () => { running = false; window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
});

export function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[600px] opacity-[0.06]"
        style={{ background: "radial-gradient(ellipse at top center, var(--accent) 0%, transparent 70%)" }}
      />
      {/* Grid texture with edge fade mask */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(circle at center, black 20%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 20%, transparent 90%)",
        }}
      />
    </div>
  );
}

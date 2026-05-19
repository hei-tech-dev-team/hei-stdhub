import { useEffect, useRef } from "react";

export default function JarvisScanAnimation({ onComplete, duration = 3000 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let startTime = Date.now();
    let running = true;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      if (!running) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;
      const maxRadius = Math.min(w, h) * 0.35;

      ctx.save();

      const scanAngle = progress * Math.PI * 6;
      const scanRadius = maxRadius * (0.3 + progress * 0.7);

      for (let ring = 0; ring < 3; ring++) {
        const ringRadius = scanRadius * (0.6 + ring * 0.2);
        const ringAlpha = (1 - progress) * (0.3 - ring * 0.08);

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 180, 255, ${ringAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const gradient = ctx.createConicalGradient
        ? null
        : ctx.createLinearGradient(
            centerX - scanRadius,
            centerY,
            centerX + scanRadius,
            centerY,
          );

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, scanRadius, scanAngle, scanAngle + Math.PI * 0.4);
      ctx.closePath();
      const scanGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, scanRadius);
      scanGrad.addColorStop(0, "rgba(0, 180, 255, 0.15)");
      scanGrad.addColorStop(0.5, "rgba(0, 120, 255, 0.08)");
      scanGrad.addColorStop(1, "rgba(0, 60, 200, 0)");
      ctx.fillStyle = scanGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, scanRadius, scanAngle, scanAngle + 0.05);
      ctx.strokeStyle = "rgba(0, 200, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i + scanAngle * 0.5;
        const tickInner = scanRadius * 0.85;
        const tickOuter = scanRadius * 0.95;
        ctx.beginPath();
        ctx.moveTo(
          centerX + Math.cos(angle) * tickInner,
          centerY + Math.sin(angle) * tickInner,
        );
        ctx.lineTo(
          centerX + Math.cos(angle) * tickOuter,
          centerY + Math.sin(angle) * tickOuter,
        );
        ctx.strokeStyle = `rgba(0, 180, 255, ${0.3 + Math.sin(elapsed * 0.003 + i) * 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const corePulse = 0.5 + Math.sin(elapsed * 0.005) * 0.3;
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
      coreGrad.addColorStop(0, `rgba(0, 220, 255, ${corePulse})`);
      coreGrad.addColorStop(0.5, "rgba(0, 150, 255, 0.2)");
      coreGrad.addColorStop(1, "rgba(0, 100, 255, 0)");
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const distToCenter = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
        const proximity = Math.max(0, 1 - distToCenter / scanRadius);
        const alpha = p.alpha * (0.3 + proximity * 0.7) * (1 - progress * 0.5);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 180, 255, ${alpha})`;
        ctx.fill();
      }

      const hexPoints = 6;
      const hexRadius = scanRadius * 1.1;
      ctx.beginPath();
      for (let i = 0; i <= hexPoints; i++) {
        const angle = (Math.PI * 2 / hexPoints) * i - Math.PI / 2 + scanAngle * 0.1;
        const x = centerX + Math.cos(angle) * hexRadius;
        const y = centerY + Math.sin(angle) * hexRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0, 180, 255, ${0.15 * (1 - progress * 0.5)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        running = false;
        if (onComplete) onComplete();
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1A33]/95 backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-lg max-h-lg"
        style={{ aspectRatio: "1" }}
      />
      <div className="absolute bottom-1/4 left-0 right-0 text-center">
        <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase animate-pulse">
          Verification d&apos;identite...
        </p>
      </div>
    </div>
  );
}

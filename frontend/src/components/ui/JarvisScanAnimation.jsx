import { useEffect, useRef, useCallback } from "react";

const NAVY = "#001948";
const NAVY_DARK = "#0A1A33";
const GOLD = "#DFA408";
const GOLD_LIGHT = "#F2C94C";
const GOLD_PREMIUM = "#D4AF37";
const GOLD_DARK = "#B8860B";

function goldRgba(alpha) {
  return `rgba(223, 164, 8, ${alpha})`;
}

function goldLightRgba(alpha) {
  return `rgba(242, 201, 76, ${alpha})`;
}

function goldPremiumRgba(alpha) {
  return `rgba(212, 175, 55, ${alpha})`;
}

function goldDarkRgba(alpha) {
  return `rgba(184, 134, 11, ${alpha})`;
}

function playJarvisAudio(duration) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.15;
    master.connect(ctx.destination);

    const now = ctx.currentTime;
    const dur = duration / 1000;

    const padOsc1 = ctx.createOscillator();
    padOsc1.type = "sine";
    padOsc1.frequency.setValueAtTime(80, now);
    padOsc1.frequency.linearRampToValueAtTime(120, now + dur);
    const padGain1 = ctx.createGain();
    padGain1.gain.setValueAtTime(0, now);
    padGain1.gain.linearRampToValueAtTime(0.3, now + 0.5);
    padGain1.gain.setValueAtTime(0.3, now + dur - 0.5);
    padGain1.gain.linearRampToValueAtTime(0, now + dur);
    padOsc1.connect(padGain1);
    padGain1.connect(master);
    padOsc1.start(now);
    padOsc1.stop(now + dur);

    const padOsc2 = ctx.createOscillator();
    padOsc2.type = "sine";
    padOsc2.frequency.setValueAtTime(160, now);
    padOsc2.frequency.linearRampToValueAtTime(200, now + dur);
    const padGain2 = ctx.createGain();
    padGain2.gain.setValueAtTime(0, now);
    padGain2.gain.linearRampToValueAtTime(0.15, now + 0.8);
    padGain2.gain.setValueAtTime(0.15, now + dur - 0.5);
    padGain2.gain.linearRampToValueAtTime(0, now + dur);
    padOsc2.connect(padGain2);
    padGain2.connect(master);
    padOsc2.start(now);
    padOsc2.stop(now + dur);

    const arpNotes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568];
    const arpInterval = dur / arpNotes.length;
    arpNotes.forEach((freq, i) => {
      const t = now + i * arpInterval;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + arpInterval * 0.9);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + arpInterval);
    });

    for (let i = 0; i < 6; i++) {
      const t = now + 0.3 + i * (dur * 0.12);
      const sweep = ctx.createOscillator();
      sweep.type = "sine";
      sweep.frequency.setValueAtTime(400, t);
      sweep.frequency.exponentialRampToValueAtTime(2000, t + 0.08);
      sweep.frequency.exponentialRampToValueAtTime(400, t + 0.15);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0, t);
      sg.gain.linearRampToValueAtTime(0.06, t + 0.01);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      sweep.connect(sg);
      sg.connect(master);
      sweep.start(t);
      sweep.stop(t + 0.2);
    }

    const noiseLen = 0.05;
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    for (let i = 0; i < 4; i++) {
      const t = now + 0.5 + i * (dur * 0.15);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.04, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
      const nf = ctx.createBiquadFilter();
      nf.type = "highpass";
      nf.frequency.value = 3000;
      src.connect(nf);
      nf.connect(ng);
      ng.connect(master);
      src.start(t);
    }

    const endOsc = ctx.createOscillator();
    endOsc.type = "sine";
    endOsc.frequency.setValueAtTime(1046.5, now + dur - 0.3);
    endOsc.frequency.linearRampToValueAtTime(1568, now + dur);
    const endGain = ctx.createGain();
    endGain.gain.setValueAtTime(0, now + dur - 0.3);
    endGain.gain.linearRampToValueAtTime(0.2, now + dur - 0.1);
    endGain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.5);
    endOsc.connect(endGain);
    endGain.connect(master);
    endOsc.start(now + dur - 0.3);
    endOsc.stop(now + dur + 0.5);

    return { ctx, master };
  } catch {
    return null;
  }
}

export default function JarvisScanAnimation({ onComplete, duration = 3500 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const audioRef = useRef(null);

  const handleComplete = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.ctx.close(); } catch {}
      audioRef.current = null;
    }
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let startTime = Date.now();
    let running = true;

    audioRef.current = playJarvisAudio(duration);

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.5 + 0.5,
      alpha: Math.random() * 0.6 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));

    const orbitingDots = Array.from({ length: 24 }, (_, i) => ({
      angle: (Math.PI * 2 / 24) * i,
      radius: 0,
      speed: 0.02 + Math.random() * 0.01,
      size: 1.5 + Math.random() * 1.5,
      layer: Math.floor(Math.random() * 3),
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
      const maxRadius = Math.min(w, h) * 0.38;

      ctx.save();

      const scanAngle = progress * Math.PI * 8;
      const scanRadius = maxRadius * (0.2 + progress * 0.8);

      const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 1.5);
      bgGrad.addColorStop(0, goldRgba(0.06 * progress));
      bgGrad.addColorStop(0.5, goldPremiumRgba(0.03 * progress));
      bgGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      for (let ring = 0; ring < 5; ring++) {
        const ringRadius = scanRadius * (0.4 + ring * 0.15);
        const ringAlpha = (1 - progress) * (0.25 - ring * 0.04);
        const dashLen = 4 + ring * 2;
        const gapLen = 8 + ring * 4;

        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = ring % 2 === 0 ? goldRgba(ringAlpha) : goldPremiumRgba(ringAlpha);
        ctx.lineWidth = 1;
        ctx.setLineDash([dashLen, gapLen]);
        ctx.lineDashOffset = elapsed * 0.02 * (ring % 2 === 0 ? 1 : -1);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (let layer = 0; layer < 3; layer++) {
        const layerRadius = scanRadius * (0.5 + layer * 0.2);
        orbitingDots
          .filter((d) => d.layer === layer)
          .forEach((dot) => {
            dot.angle += dot.speed * (layer % 2 === 0 ? 1 : -1);
            const x = centerX + Math.cos(dot.angle) * layerRadius;
            const y = centerY + Math.sin(dot.angle) * layerRadius;
            const pulse = 0.5 + Math.sin(elapsed * 0.005 + dot.angle) * 0.5;
            ctx.beginPath();
            ctx.arc(x, y, dot.size * pulse, 0, Math.PI * 2);
            ctx.fillStyle = layer === 0 ? goldLightRgba(0.6) : layer === 1 ? goldRgba(0.5) : goldDarkRgba(0.4);
            ctx.fill();
          });
      }

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, scanRadius, scanAngle, scanAngle + Math.PI * 0.35);
      ctx.closePath();
      const scanGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, scanRadius);
      scanGrad.addColorStop(0, goldLightRgba(0.25));
      scanGrad.addColorStop(0.3, goldRgba(0.12));
      scanGrad.addColorStop(0.7, goldPremiumRgba(0.05));
      scanGrad.addColorStop(1, goldRgba(0));
      ctx.fillStyle = scanGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const tipX = centerX + Math.cos(scanAngle) * scanRadius;
      const tipY = centerY + Math.sin(scanAngle) * scanRadius;
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = goldLightRgba(0.9);
      ctx.lineWidth = 2.5;
      ctx.shadowColor = goldLightRgba(0.5);
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fillStyle = goldLightRgba(1);
      ctx.shadowColor = goldLightRgba(0.8);
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 / 16) * i + scanAngle * 0.3;
        const tickInner = scanRadius * 0.88;
        const tickOuter = scanRadius * (i % 4 === 0 ? 1.0 : 0.95);
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * tickInner, centerY + Math.sin(angle) * tickInner);
        ctx.lineTo(centerX + Math.cos(angle) * tickOuter, centerY + Math.sin(angle) * tickOuter);
        ctx.strokeStyle = goldRgba(0.25 + Math.sin(elapsed * 0.004 + i) * 0.15);
        ctx.lineWidth = i % 4 === 0 ? 1.5 : 0.8;
        ctx.stroke();
      }

      const corePulse = 0.4 + Math.sin(elapsed * 0.006) * 0.3;
      const coreSize = 25 + progress * 15;
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
      coreGrad.addColorStop(0, goldLightRgba(corePulse));
      coreGrad.addColorStop(0.3, goldRgba(0.2));
      coreGrad.addColorStop(0.7, goldPremiumRgba(0.08));
      coreGrad.addColorStop(1, goldRgba(0));
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = goldLightRgba(0.4);
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      const innerRing = coreSize * 0.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRing, 0, Math.PI * 2);
      ctx.strokeStyle = goldLightRgba(0.3 + Math.sin(elapsed * 0.008) * 0.15);
      ctx.lineWidth = 1;
      ctx.stroke();

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const distToCenter = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
        const proximity = Math.max(0, 1 - distToCenter / scanRadius);
        const breathe = 0.5 + Math.sin(elapsed * 0.003 + p.phase) * 0.5;
        const alpha = p.alpha * (0.2 + proximity * 0.8) * breathe * (1 - progress * 0.3);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = goldRgba(alpha);
        ctx.fill();
      }

      for (let i = 0; i < 3; i++) {
        const hexRadius = scanRadius * (1.05 + i * 0.12);
        const hexPoints = 6;
        const rotation = scanAngle * 0.05 * (i % 2 === 0 ? 1 : -1);
        ctx.beginPath();
        for (let j = 0; j <= hexPoints; j++) {
          const angle = (Math.PI * 2 / hexPoints) * j - Math.PI / 2 + rotation;
          const x = centerX + Math.cos(angle) * hexRadius;
          const y = centerY + Math.sin(angle) * hexRadius;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = goldRgba(0.1 * (1 - progress * 0.4) * (1 - i * 0.3));
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      const outerDashed = scanRadius * 1.35;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerDashed, 0, Math.PI * 2);
      ctx.strokeStyle = goldRgba(0.06 * (1 - progress * 0.3));
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 12]);
      ctx.lineDashOffset = -elapsed * 0.01;
      ctx.stroke();
      ctx.setLineDash([]);

      if (progress > 0.7) {
        const flashAlpha = (progress - 0.7) / 0.3;
        const flashGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, scanRadius * 1.2);
        flashGrad.addColorStop(0, goldLightRgba(flashAlpha * 0.15));
        flashGrad.addColorStop(1, goldRgba(0));
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, scanRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        running = false;
        handleComplete();
      }
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      if (audioRef.current) {
        try { audioRef.current.ctx.close(); } catch {}
        audioRef.current = null;
      }
    };
  }, [duration, handleComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: `linear-gradient(160deg, ${NAVY_DARK} 0%, ${NAVY} 50%, ${NAVY_DARK} 100%)` }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl" style={{ background: goldRgba(0.06) }} />
        <div className="absolute top-1/4 -right-24 w-64 h-64 rounded-full blur-2xl" style={{ background: goldPremiumRgba(0.05) }} />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl" style={{ background: goldDarkRgba(0.04) }} />
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-lg max-h-lg relative z-10"
        style={{ aspectRatio: "1" }}
      />
      <div className="absolute bottom-1/4 left-0 right-0 text-center z-10">
        <p
          className="text-sm font-semibold tracking-widest uppercase animate-pulse"
          style={{ color: GOLD_LIGHT }}
        >
          Verification d&apos;identite...
        </p>
      </div>
    </div>
  );
}

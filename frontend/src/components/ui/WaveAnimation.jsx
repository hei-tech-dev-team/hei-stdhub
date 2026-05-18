export default function WaveAnimation() {
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: "60px" }}>
      {/* Neon glow base */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-8 rounded-full blur-2xl"
        style={{
          background: "radial-gradient(ellipse, rgba(212,175,55,0.2) 0%, transparent 70%)",
        }}
      />

      {/* Wave 1 - Front gold */}
      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "40px",
          animation: "wave-premium 8s ease-in-out infinite",
        }}
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wGold1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,175,55,0)" />
            <stop offset="20%" stopColor="rgba(212,175,55,0.6)" />
            <stop offset="50%" stopColor="rgba(255,215,0,0.8)" />
            <stop offset="80%" stopColor="rgba(212,175,55,0.6)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,20 Q180,0 360,20 T720,20 T1080,20 T1440,20 L1440,40 L0,40 Z"
          fill="url(#wGold1)"
        />
      </svg>

      {/* Wave 2 - Middle navy */}
      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "30px",
          animation: "wave-premium-reverse 12s ease-in-out infinite",
        }}
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wNavy1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,25,72,0)" />
            <stop offset="30%" stopColor="rgba(10,26,51,0.7)" />
            <stop offset="50%" stopColor="rgba(0,25,72,0.9)" />
            <stop offset="70%" stopColor="rgba(10,26,51,0.7)" />
            <stop offset="100%" stopColor="rgba(0,25,72,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,25 Q240,5 480,25 T960,25 T1440,25 L1440,40 L0,40 Z"
          fill="url(#wNavy1)"
        />
      </svg>

      {/* Wave 3 - Back gold subtle */}
      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "20px",
          animation: "wave-premium 10s ease-in-out infinite reverse",
        }}
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wGold2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,175,55,0)" />
            <stop offset="50%" stopColor="rgba(212,175,55,0.4)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,30 Q360,10 720,30 T1440,30 L1440,40 L0,40 Z"
          fill="url(#wGold2)"
        />
      </svg>

      {/* Neon line accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.5) 20%, rgba(255,215,0,0.7) 50%, rgba(212,175,55,0.5) 80%, transparent 100%)",
          boxShadow: "0 0 8px rgba(212,175,55,0.6), 0 0 16px rgba(212,175,55,0.3)",
        }}
      />
    </div>
  );
}

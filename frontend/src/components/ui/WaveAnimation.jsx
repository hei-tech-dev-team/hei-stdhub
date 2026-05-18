export default function WaveAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Ambient glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(ellipse, rgba(212,175,55,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Particles */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              left: `${15 + i * 15}%`,
              bottom: `${20 + (i % 4) * 10}%`,
              background: i % 2 === 0
                ? "rgba(212,175,55,0.6)"
                : "rgba(100,180,255,0.4)",
              boxShadow: i % 2 === 0
                ? "0 0 6px rgba(212,175,55,0.8)"
                : "0 0 6px rgba(100,180,255,0.6)",
              animation: `particle-float ${4 + i * 0.8}s ease-in-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        ))}
      </div>

      {/* 3D Wave layers */}
      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "100px",
          animation: "wave-3d 10s ease-in-out infinite",
          filter: "drop-shadow(0 0 8px rgba(212,175,55,0.3))",
        }}
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(212,175,55,0.7)" />
            <stop offset="30%" stopColor="rgba(212,175,55,0.5)" />
            <stop offset="70%" stopColor="rgba(184,134,11,0.4)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.6)" />
          </linearGradient>
        </defs>
        <path
          d="M0,50 C120,80 240,20 360,50 C480,80 600,20 720,50 C840,80 960,20 1080,50 C1200,80 1320,20 1440,50 L1440,100 L0,100 Z"
          fill="url(#waveGold)"
        />
      </svg>

      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "80px",
          animation: "wave-3d-reverse 14s ease-in-out infinite",
          filter: "drop-shadow(0 0 6px rgba(0,25,72,0.5))",
        }}
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveNavy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,25,72,0.8)" />
            <stop offset="50%" stopColor="rgba(10,26,51,0.6)" />
            <stop offset="100%" stopColor="rgba(0,25,72,0.8)" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 C180,30 360,90 540,60 C720,30 900,90 1080,60 C1260,30 1440,90 1440,60 L1440,100 L0,100 Z"
          fill="url(#waveNavy)"
        />
      </svg>

      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "60px",
          animation: "wave-3d 8s ease-in-out infinite reverse",
          filter: "drop-shadow(0 0 10px rgba(212,175,55,0.4))",
        }}
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGoldLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,175,55,0.4)" />
            <stop offset="25%" stopColor="rgba(255,215,0,0.3)" />
            <stop offset="50%" stopColor="rgba(212,175,55,0.5)" />
            <stop offset="75%" stopColor="rgba(255,215,0,0.3)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.4)" />
          </linearGradient>
        </defs>
        <path
          d="M0,40 C160,70 320,10 480,40 C640,70 800,10 960,40 C1120,70 1280,10 1440,40 L1440,100 L0,100 Z"
          fill="url(#waveGoldLight)"
        />
      </svg>

      {/* Neon edge highlight */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), rgba(100,180,255,0.4), rgba(212,175,55,0.6), transparent)",
          boxShadow: "0 0 8px rgba(212,175,55,0.5), 0 0 16px rgba(212,175,55,0.3)",
        }}
      />
    </div>
  );
}

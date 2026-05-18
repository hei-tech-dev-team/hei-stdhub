export default function WaveAnimation() {
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: "100px" }}>
      {/* Stargazing sky background */}
      <div className="absolute inset-0">
        {/* Stars layer 1 - tiny distant stars */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`s1-${i}`}
            className="absolute rounded-full"
            style={{
              width: "1px",
              height: "1px",
              left: `${(i * 5.3) % 100}%`,
              top: `${(i * 7.1 + 10) % 60}%`,
              background: "#fff",
              opacity: 0.3 + (i % 3) * 0.15,
              animation: `twinkle ${2 + (i % 4) * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
        {/* Stars layer 2 - medium stars */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`s2-${i}`}
            className="absolute rounded-full"
            style={{
              width: "2px",
              height: "2px",
              left: `${(i * 8.7 + 3) % 100}%`,
              top: `${(i * 5.3 + 5) % 50}%`,
              background: "rgba(212,175,55,0.8)",
              boxShadow: "0 0 4px rgba(212,175,55,0.6)",
              animation: `twinkle ${3 + (i % 3) * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.5 + 1}s`,
            }}
          />
        ))}
        {/* Stars layer 3 - bright accent stars */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`s3-${i}`}
            className="absolute rounded-full"
            style={{
              width: "3px",
              height: "3px",
              left: `${(i * 20 + 10) % 100}%`,
              top: `${(i * 12 + 8) % 40}%`,
              background: "#fff",
              boxShadow: "0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(212,175,55,0.4)",
              animation: `twinkle ${4 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.8 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Ambient glow */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Wave 1 - Front gold (biggest) */}
      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "80px",
          animation: "wave-premium 10s ease-in-out infinite",
        }}
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wGold1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,175,55,0)" />
            <stop offset="15%" stopColor="rgba(212,175,55,0.5)" />
            <stop offset="50%" stopColor="rgba(255,215,0,0.7)" />
            <stop offset="85%" stopColor="rgba(212,175,55,0.5)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,40 Q180,5 360,40 T720,40 T1080,40 T1440,40 L1440,80 L0,80 Z"
          fill="url(#wGold1)"
        />
      </svg>

      {/* Wave 2 - Middle navy */}
      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "60px",
          animation: "wave-premium-reverse 14s ease-in-out infinite",
        }}
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wNavy1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,25,72,0)" />
            <stop offset="25%" stopColor="rgba(10,26,51,0.6)" />
            <stop offset="50%" stopColor="rgba(0,25,72,0.8)" />
            <stop offset="75%" stopColor="rgba(10,26,51,0.6)" />
            <stop offset="100%" stopColor="rgba(0,25,72,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,50 Q240,15 480,50 T960,50 T1440,50 L1440,80 L0,80 Z"
          fill="url(#wNavy1)"
        />
      </svg>

      {/* Wave 3 - Back gold subtle */}
      <svg
        className="absolute bottom-0 left-0"
        style={{
          width: "200%",
          height: "40px",
          animation: "wave-premium 12s ease-in-out infinite reverse",
        }}
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wGold2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,175,55,0)" />
            <stop offset="50%" stopColor="rgba(212,175,55,0.35)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 Q360,25 720,60 T1440,60 L1440,80 L0,80 Z"
          fill="url(#wGold2)"
        />
      </svg>

      {/* Neon line accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.4) 15%, rgba(255,215,0,0.6) 50%, rgba(212,175,55,0.4) 85%, transparent 100%)",
          boxShadow: "0 0 12px rgba(212,175,55,0.5), 0 0 24px rgba(212,175,55,0.25)",
        }}
      />
    </div>
  );
}

export default function WaveAnimation() {
  return (
    <>
      {/* Full card star field background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Stars layer 1 - tiny distant stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={`s1-${i}`}
            className="absolute rounded-full"
            style={{
              width: "1px",
              height: "1px",
              left: `${(i * 3.4) % 100}%`,
              top: `${(i * 4.7) % 100}%`,
              background: "#fff",
              opacity: 0.2 + (i % 4) * 0.15,
              animation: `twinkle ${2 + (i % 5) * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
        {/* Stars layer 2 - medium gold stars */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`s2-${i}`}
            className="absolute rounded-full"
            style={{
              width: "2px",
              height: "2px",
              left: `${(i * 7.1 + 2) % 100}%`,
              top: `${(i * 6.3 + 5) % 100}%`,
              background: "rgba(212,175,55,0.9)",
              boxShadow: "0 0 6px rgba(212,175,55,0.5)",
              animation: `twinkle ${3 + (i % 4) * 0.6}s ease-in-out infinite`,
              animationDelay: `${i * 0.4 + 0.5}s`,
            }}
          />
        ))}
        {/* Stars layer 3 - bright accent stars */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`s3-${i}`}
            className="absolute rounded-full"
            style={{
              width: "3px",
              height: "3px",
              left: `${(i * 13 + 5) % 100}%`,
              top: `${(i * 11 + 8) % 100}%`,
              background: "#fff",
              boxShadow: "0 0 10px rgba(255,255,255,0.7), 0 0 20px rgba(212,175,55,0.3)",
              animation: `twinkle ${4 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.6 + 1}s`,
            }}
          />
        ))}

        {/* Shooting stars - always active, staggered */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`shoot-${i}`}
            className="absolute"
            style={{
              left: `${5 + i * 16}%`,
              top: `${3 + i * 6}%`,
              width: "2px",
              height: "2px",
              background: "#fff",
              borderRadius: "50%",
              boxShadow: "0 0 6px #fff, 0 0 12px rgba(212,175,55,0.6)",
              animation: `shooting-star ${2.5 + i * 0.3}s ease-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}

        {/* Ambient nebula glow */}
        <div
          className="absolute top-4 right-8 w-32 h-32 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)",
            animation: "nebula-pulse 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-16 left-12 w-24 h-24 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(100,180,255,0.06) 0%, transparent 70%)",
            animation: "nebula-pulse 10s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Bottom waves */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none z-10" style={{ height: "100px" }}>
        {/* Wave 1 - Front gold */}
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
    </>
  );
}

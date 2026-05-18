export default function WaveAnimation() {
  return (
    <>
      {/* Full card star field background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Stars layer 1 - tiny distant stars (dense) */}
        {[...Array(60)].map((_, i) => (
          <div
            key={`s1-${i}`}
            className="absolute rounded-full"
            style={{
              width: "1px",
              height: "1px",
              left: `${(i * 1.7) % 100}%`,
              top: `${(i * 2.8) % 100}%`,
              background: "#fff",
              opacity: 0.1 + (i % 6) * 0.1,
              animation: `twinkle ${1.5 + (i % 7) * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
        {/* Stars layer 2 - medium gold stars */}
        {[...Array(30)].map((_, i) => (
          <div
            key={`s2-${i}`}
            className="absolute rounded-full"
            style={{
              width: "2px",
              height: "2px",
              left: `${(i * 3.5 + 1) % 100}%`,
              top: `${(i * 4.2 + 2) % 100}%`,
              background: "rgba(212,175,55,0.9)",
              boxShadow: "0 0 6px rgba(212,175,55,0.5)",
              animation: `twinkle ${2.5 + (i % 6) * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.25 + 0.3}s`,
            }}
          />
        ))}
        {/* Stars layer 3 - bright accent stars */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`s3-${i}`}
            className="absolute rounded-full"
            style={{
              width: "3px",
              height: "3px",
              left: `${(i * 7.1 + 3) % 100}%`,
              top: `${(i * 8.3 + 4) % 100}%`,
              background: "#fff",
              boxShadow: "0 0 10px rgba(255,255,255,0.7), 0 0 20px rgba(212,175,55,0.3)",
              animation: `twinkle ${3.5 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.4 + 0.8}s`,
            }}
          />
        ))}

        {/* Shooting stars - head leads down-right, tail trails up-left */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`shoot-${i}`}
            style={{
              position: "absolute",
              left: `${5 + i * 15}%`,
              top: `${2 + i * 7}%`,
              animation: `shooting-star ${3 + i * 0.4}s ease-out infinite`,
              animationDelay: `${i * 0.85}s`,
            }}
          >
            {/* Head */}
            <div
              style={{
                position: "relative",
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%",
                boxShadow: "0 0 8px #fff, 0 0 16px rgba(212,175,55,0.9), 0 0 24px rgba(212,175,55,0.5)",
                zIndex: 2,
              }}
            />
            {/* Shooting star tail - points UP-LEFT (opposite of travel) */}
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: "2px",
                width: "100px",
                height: "2px",
                background: "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(212,175,55,0.6) 25%, rgba(212,175,55,0.15) 55%, transparent 100%)",
                transform: "rotate(-145deg)",
                transformOrigin: "left center",
                boxShadow: "0 0 8px rgba(212,175,55,0.4)",
                zIndex: 1,
              }}
            />
          </div>
        ))}

        {/* Nebula glow */}
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

      {/* Bottom waves with organic feel */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none z-10" style={{ height: "100px" }}>
        {/* Wave 1 - Front gold */}
        <svg
          className="absolute bottom-0 left-0"
          style={{
            width: "200%",
            height: "90px",
            animation: "wave-premium 11s ease-in-out infinite",
            filter: "drop-shadow(0 -2px 6px rgba(212,175,55,0.3))",
          }}
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wGold1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(212,175,55,0)" />
              <stop offset="10%" stopColor="rgba(212,175,55,0.4)" />
              <stop offset="30%" stopColor="rgba(255,215,0,0.6)" />
              <stop offset="50%" stopColor="rgba(212,175,55,0.7)" />
              <stop offset="70%" stopColor="rgba(255,215,0,0.6)" />
              <stop offset="90%" stopColor="rgba(212,175,55,0.4)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </linearGradient>
          </defs>
          <path
            d="M0,55 C120,35 240,75 360,55 C480,35 600,75 720,55 C840,35 960,75 1080,55 C1200,35 1320,75 1440,55 L1440,100 L0,100 Z"
            fill="url(#wGold1)"
          />
        </svg>

        {/* Wave 2 - Middle navy */}
        <svg
          className="absolute bottom-0 left-0"
          style={{
            width: "200%",
            height: "70px",
            animation: "wave-premium-reverse 15s ease-in-out infinite",
            filter: "drop-shadow(0 -2px 4px rgba(0,25,72,0.4))",
          }}
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wNavy1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,25,72,0)" />
              <stop offset="20%" stopColor="rgba(10,26,51,0.5)" />
              <stop offset="50%" stopColor="rgba(0,25,72,0.7)" />
              <stop offset="80%" stopColor="rgba(10,26,51,0.5)" />
              <stop offset="100%" stopColor="rgba(0,25,72,0)" />
            </linearGradient>
          </defs>
          <path
            d="M0,65 C180,45 360,85 540,65 C720,45 900,85 1080,65 C1260,45 1440,85 1440,65 L1440,100 L0,100 Z"
            fill="url(#wNavy1)"
          />
        </svg>

        {/* Wave 3 - Back gold subtle */}
        <svg
          className="absolute bottom-0 left-0"
          style={{
            width: "200%",
            height: "50px",
            animation: "wave-premium-alt 13s ease-in-out infinite",
            filter: "drop-shadow(0 -1px 4px rgba(212,175,55,0.2))",
          }}
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wGold2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(212,175,55,0)" />
              <stop offset="50%" stopColor="rgba(212,175,55,0.3)" />
              <stop offset="100%" stopColor="rgba(212,175,55,0)" />
            </linearGradient>
          </defs>
          <path
            d="M0,75 C240,55 480,95 720,75 C960,55 1200,95 1440,75 L1440,100 L0,100 Z"
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

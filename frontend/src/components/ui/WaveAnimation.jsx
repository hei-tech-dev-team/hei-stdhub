export default function WaveAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg
        className="absolute bottom-0 left-0 w-[200%] h-full"
        style={{ animation: "wave 8s ease-in-out infinite" }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,175,55,0.5)" />
            <stop offset="50%" stopColor="rgba(212,175,55,0.3)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.5)" />
          </linearGradient>
        </defs>
        <path
          d="M0,192L48,186.7C96,181,192,171,288,165.3C384,160,480,160,576,170.7C672,181,768,203,864,208C960,213,1056,203,1152,186.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="url(#wave1)"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-[200%] h-full"
        style={{ animation: "wave-slow 12s ease-in-out infinite" }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,25,72,0.6)" />
            <stop offset="50%" stopColor="rgba(0,25,72,0.4)" />
            <stop offset="100%" stopColor="rgba(0,25,72,0.6)" />
          </linearGradient>
        </defs>
        <path
          d="M0,256L48,245.3C96,235,192,213,288,208C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="url(#wave2)"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-[200%] h-full"
        style={{ animation: "wave-fast 6s ease-in-out infinite" }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wave3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,175,55,0.35)" />
            <stop offset="50%" stopColor="rgba(212,175,55,0.2)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.35)" />
          </linearGradient>
        </defs>
        <path
          d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,197.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="url(#wave3)"
        />
      </svg>
    </div>
  );
}

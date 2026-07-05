export default function TeapotError() {
  const customAnimation = `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes steamRise {
      0% { transform: translateY(0) scale(0.8); opacity: 0; }
      20% { opacity: 0.7; }
      100% { transform: translateY(-60px) scale(1.3); opacity: 0; }
    }
    @keyframes teapotGrump {
      0%, 100% { transform: rotate(0deg); }
      15% { transform: rotate(-2.5deg); }
      45% { transform: rotate(2deg); }
      70% { transform: rotate(-1deg); }
    }
    @keyframes browFurrow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(1.5px); }
    }
    @keyframes denyPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.92); }
    }
    @keyframes bubblePop {
      0%, 15% { opacity: 0; transform: translateY(6px) scale(0.8); }
      25%, 75% { opacity: 1; transform: translateY(0) scale(1); }
      90%, 100% { opacity: 0; transform: translateY(-4px) scale(0.9); }
    }
    @keyframes beggingBubble {
      0%, 50% { opacity: 0; transform: translateY(6px) scale(0.8); }
      60%, 85% { opacity: 1; transform: translateY(0) scale(1); }
      95%, 100% { opacity: 0; transform: translateY(-4px) scale(0.9); }
    }
    @keyframes cupTremble {
      0%, 100% { transform: translateX(0) rotate(0deg); }
      10% { transform: translateX(-1.5px) rotate(-1.5deg); }
      30% { transform: translateX(1.5px) rotate(1.5deg); }
      50% { transform: translateX(-1.5px) rotate(-1deg); }
      70% { transform: translateX(1.5px) rotate(1deg); }
      90% { transform: translateX(-1px) rotate(-0.5deg); }
    }
    @keyframes handleWiggle {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-8deg); }
    }
    .animate-float-item { animation: float 4s ease-in-out infinite; }
    .animate-float-delayed { animation: float 4s ease-in-out infinite; animation-delay: 2s; }
    .teapot-grump { animation: teapotGrump 3s ease-in-out infinite; transform-origin: 170px 200px; }
    .brow { animation: browFurrow 3s ease-in-out infinite; }
    .deny-mark { animation: denyPulse 1.4s ease-in-out infinite; }
    .bubble { animation: bubblePop 4s ease-in-out infinite; }
    .begging-bubble { animation: beggingBubble 4s ease-in-out infinite; }
    .cup-tremble { animation: cupTremble 0.5s linear infinite; transform-origin: 40px 190px; }
    .cup-handle { animation: handleWiggle 0.5s ease-in-out infinite; transform-origin: 64px 166px; }
    @media (prefers-reduced-motion: reduce) {
      .teapot-grump, .brow, .deny-mark, .bubble, .begging-bubble, .cup-tremble, .cup-handle, .steam-curl {
        animation: none !important;
      }
    }
  `;

  return (
    <section
      className="min-h-screen w-full bg-white flex items-center justify-center font-sans p-4 relative overflow-hidden select-none"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), 
                          linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      <style>{customAnimation}</style>

      <div className="absolute top-10 left-10 w-4 h-4 bg-navy rounded-full opacity-30 blur-[1px] animate-float-item" />
      <div className="absolute top-1/4 right-12 w-3 h-3 bg-gold rounded-full opacity-60 animate-float-delayed" />
      <div className="absolute bottom-12 left-12 w-3 h-3 bg-gold rounded-full opacity-50 animate-float-delayed" />
      <div className="absolute bottom-1/4 right-16 w-4 h-4 bg-navy rounded-full opacity-20 blur-[1px] animate-float-item" />

      <div className="absolute -bottom-20 -left-20 w-[350px] h-[350px] bg-gold/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl text-center z-10 flex flex-col items-center gap-4">
        <h1 className="text-[100px] sm:text-[140px] font-black text-gold leading-none tracking-tight filter drop-shadow-sm">
          418
        </h1>

        <div className="w-full flex justify-center -mt-2">
          <svg
            viewBox="0 0 340 260"
            xmlns="http://www.w3.org/2000/svg"
            className="h-[220px] sm:h-[300px] w-auto overflow-visible"
            aria-label="Théière grincheuse refusant de servir du café à une tasse suppliante"
          >
            <g className="bubble" style={{ transformOrigin: "170px 40px" }}>
              <rect x="90" y="10" width="160" height="34" rx="8" fill="#001F3F" />
              <polygon points="150,44 165,44 155,54" fill="#001F3F" />
              <text x="170" y="32" textAnchor="middle" fontSize="14" fontWeight="500" fill="#FFD700" fontFamily="sans-serif">
                Non. Jamais.
              </text>
            </g>

            <g style={{ opacity: 0.8 }}>
              <path
                className="steam-curl"
                style={{ animation: "steamRise 2.6s ease-out infinite", transformOrigin: "150px 75px" }}
                d="M150 75c-10-14 10-18 0-32c-8-12 6-16 2-26"
                fill="none"
                stroke="#0C447C"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                className="steam-curl"
                style={{ animation: "steamRise 2.6s ease-out infinite .9s", transformOrigin: "175px 71px" }}
                d="M175 71c-10-14 10-18 0-32c-8-12 6-16 2-26"
                fill="none"
                stroke="#0C447C"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                className="steam-curl"
                style={{ animation: "steamRise 2.6s ease-out infinite 1.8s", transformOrigin: "200px 75px" }}
                d="M200 75c-10-14 10-18 0-32c-8-12 6-16 2-26"
                fill="none"
                stroke="#0C447C"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>

            <g className="teapot-grump">
              <path
                d="M235 128h12a36 36 0 0 1 0 72h-12"
                fill="none"
                stroke="#FFD700"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M110 138h130v72a44 44 0 0 1-44 44h-42a44 44 0 0 1-44-44Z"
                fill="#001F3F"
              />
              <path
                d="M120 138v-24a20 20 0 0 1 20-20h70a20 20 0 0 1 20 20v24"
                fill="none"
                stroke="#001F3F"
                strokeWidth="8"
              />
              <circle cx="175" cy="88" r="12" fill="#FFD700" />
              
              <circle cx="163" cy="150" r="4" fill="#FFD700" />
              <circle cx="187" cy="150" r="4" fill="#FFD700" />
              <path className="brow" d="M154 138q9-8 18 0" fill="none" stroke="#FFD700" strokeWidth="4" strokeLinecap="round" />
              <path className="brow" d="M172 138q9-8 18 0" fill="none" stroke="#FFD700" strokeWidth="4" strokeLinecap="round" />
              <path d="M158 172q17 12 34 0" fill="none" stroke="#FFD700" strokeWidth="4" strokeLinecap="round" />
              
              <path
                d="M110 152 C 85 152, 72 162, 62 148 C 57 141, 52 144, 55 154 C 62 174, 85 186, 110 182 Z"
                fill="#001F3F"
              />
            </g>

            <g className="cup-tremble" style={{ transform: "translate(40px,150px)" }}>
              
              <g className="begging-bubble hidden sm:block" style={{ transformOrigin: "36px -10px" }}>
                <rect x="-45" y="-50" width="110" height="30" rx="6" fill="#5F5E5A" />
                <polygon points="30,-20 42,-20 36,-10" fill="#5F5E5A" />
                <text x="10" y="-30" textAnchor="middle" fontSize="12" fontWeight="500" fill="#fff" fontFamily="sans-serif">
                  s'il te plaît...
                </text>
              </g>

              <g className="begging-bubble sm:hidden" style={{ transformOrigin: "36px 90px" }}>
                <rect x="-15" y="90" width="110" height="30" rx="6" fill="#5F5E5A" />
                <polygon points="30,90 42,90 36,80" fill="#5F5E5A" />
                <text x="40" y="110" textAnchor="middle" fontSize="12" fontWeight="500" fill="#fff" fontFamily="sans-serif">
                  s'il te plaît...
                </text>
              </g>

              <path
                d="M14 6h44v54a18 18 0 0 1-18 18h-8a18 18 0 0 1-18-18Z"
                fill="none"
                stroke="#001F3F"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                className="cup-handle"
                d="M58 16h6a14 14 0 0 1 0 28h-6"
                fill="none"
                stroke="#001F3F"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line x1="20" y1="0" x2="20" y2="6" stroke="#001F3F" strokeWidth="4" strokeLinecap="round" />
              <line x1="36" y1="0" x2="36" y2="6" stroke="#001F3F" strokeWidth="4" strokeLinecap="round" />
              
              <g className="deny-mark">
                <line x1="6" y1="6" x2="58" y2="72" stroke="#E24B4A" strokeWidth="6" strokeLinecap="round" />
                <line x1="58" y1="6" x2="6" y2="72" stroke="#E24B4A" strokeWidth="6" strokeLinecap="round" />
              </g>
            </g>
          </svg>
        </div>

        <div className="flex flex-col gap-2 max-w-md">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Je suis une <span className="text-gold">théière</span>
          </h3>
          <p className="text-navy/70 text-xs sm:text-sm leading-relaxed font-medium px-4">
            Ce serveur est une théière et refuse catégoriquement de préparer du café. C'est un fait immuable défini par le RFC 2324.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full mt-2 px-4">
          <a
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gold text-navy hover:bg-navy hover:text-white transition-colors duration-300 font-bold text-sm rounded-lg shadow-md sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Retour à l'accueil
          </a>

          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gold bg-white text-gold hover:bg-gold hover:text-navy transition-colors duration-300 font-bold text-sm rounded-lg shadow-sm sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Page précédente
          </button>
        </div>
      </div>
    </section>
  );
}
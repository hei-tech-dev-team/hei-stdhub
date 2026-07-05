export default function ServerError() {
  const serverAnimation = `
    @keyframes flicker {
      0%,100%{opacity:1} 20%{opacity:.6} 40%{opacity:.9} 60%{opacity:.5} 80%{opacity:.8}
    }
    @keyframes smoke1 {
      0%{transform:translate(0px,0px) scale(0.3);opacity:.7}
      100%{transform:translate(-20px,-80px) scale(1.2);opacity:0}
    }
    @keyframes smoke2 {
      0%{transform:translate(0px,0px) scale(0.2);opacity:.6}
      100%{transform:translate(25px,-80px) scale(1.1);opacity:0}
    }
    @keyframes smoke3 {
      0%{transform:translate(0px,0px) scale(0.25);opacity:.65}
      100%{transform:translate(-10px,-80px) scale(1.0);opacity:0}
    }
    @keyframes blink {
      0%,48%{fill:#E24B4A} 49%,100%{fill:#444}
    }
    @keyframes shake {
      0%,100%{transform:translateX(0)} 10%{transform:translateX(-3px)} 20%{transform:translateX(3px)}
      30%{transform:translateX(-2px)} 40%{transform:translateX(2px)} 50%{transform:translateX(-1px)} 60%{transform:translateX(1px)}
    }
    @keyframes pulse-red {
      0%,100%{opacity:1} 50%{opacity:0.3}
    }
    @keyframes float-bolt {
      0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)}
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    .led-blink { animation: blink 1s step-end infinite; }
    .led-blink-2 { animation: blink 1s step-end infinite; animation-delay:.3s }
    .led-blink-3 { animation: blink 1.3s step-end infinite; animation-delay:.6s }
    .fire { animation: flicker 0.4s ease-in-out infinite; }
    .fire-2 { animation: flicker 0.3s ease-in-out infinite; animation-delay:.1s }
    .smoke-a { animation: smoke1 2s ease-out infinite; transform-origin: 330px 90px; }
    .smoke-b { animation: smoke2 2.4s ease-out infinite; animation-delay:.5s; transform-origin: 350px 85px; }
    .smoke-c { animation: smoke3 2.2s ease-out infinite; animation-delay:1s; transform-origin: 340px 88px; }
    .pulse-anim { animation: pulse-red 1.5s ease-in-out infinite; }
    .bolt-anim { animation: float-bolt 1.2s ease-in-out infinite; }
    .server-shake { animation: shake 2s ease-in-out infinite; animation-delay:0.5s; }
    .animate-float-item { animation: float 4s ease-in-out infinite; }
    .animate-float-delayed { animation: float 4s ease-in-out infinite; animation-delay: 2s; }
  `;

  return (
    <section
      className="min-h-screen w-full bg-white flex items-center justify-center font-sans p-4 relative overflow-hidden select-none"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      <style>{serverAnimation}</style>

      <div className="absolute top-10 left-10 w-4 h-4 bg-navy rounded-full opacity-30 blur-[1px] animate-float-item" />
      <div className="absolute top-1/4 right-12 w-3 h-3 bg-gold rounded-full opacity-40 animate-float-delayed" />
      <div className="absolute bottom-12 left-12 w-3 h-3 bg-gold rounded-full opacity-30 animate-float-delayed" />
      <div className="absolute bottom-1/4 right-16 w-4 h-4 bg-navy rounded-full opacity-20 blur-[1px] animate-float-item" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Ajout de flex-col et gap-6 pour créer l'espace global */}
      <div className="w-full max-w-3xl text-center z-10 flex flex-col items-center gap-6">

        <h1 className="text-[90px] sm:text-[120px] font-black text-navy leading-none relative">
          500
        </h1>

        <div className="w-full flex justify-center">
          <svg
            viewBox="0 0 680 320"
            xmlns="http://www.w3.org/2000/svg"
            className="h-[220px] sm:h-[320px] w-auto"
            aria-label="Serveur en panne"
          >
            <g className="server-shake">
              <rect x="270" y="110" width="140" height="180" rx="6" fill="#2C2C2A" stroke="#444441" strokeWidth="1.5" />
              <rect x="280" y="120" width="120" height="160" rx="4" fill="#3a3a38" />
              <rect x="288" y="130" width="104" height="18" rx="2" fill="#2C2C2A" stroke="#5F5E5A" strokeWidth="0.5" />
              <rect x="288" y="154" width="104" height="18" rx="2" fill="#2C2C2A" stroke="#5F5E5A" strokeWidth="0.5" />
              <rect x="288" y="178" width="104" height="18" rx="2" fill="#2C2C2A" stroke="#5F5E5A" strokeWidth="0.5" />
              <text x="340" y="143" textAnchor="middle" fill="#888780" fontSize="8" fontFamily="monospace">SSD-01</text>
              <text x="340" y="167" textAnchor="middle" fill="#888780" fontSize="8" fontFamily="monospace">SSD-02</text>
              <text x="340" y="191" textAnchor="middle" fill="#888780" fontSize="8" fontFamily="monospace">SSD-03</text>
              <circle cx="295" cy="139" r="3" className="led-blink" />
              <circle cx="295" cy="163" r="3" className="led-blink-2" />
              <circle cx="295" cy="187" r="3" className="led-blink-3" />
              <circle cx="340" cy="255" r="12" fill="#2C2C2A" stroke="#5F5E5A" strokeWidth="1" />
              <circle cx="340" cy="255" r="8" className="pulse-anim" fill="#E24B4A" />
              <text x="340" y="259" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="500">⏻</text>
              <rect x="355" y="248" width="14" height="8" rx="1" fill="#2C2C2A" stroke="#5F5E5A" strokeWidth="0.5" />
              <rect x="288" y="210" width="50" height="30" rx="2" fill="#2C2C2A" stroke="#5F5E5A" strokeWidth="0.5" />
              <line x1="298" y1="210" x2="298" y2="240" stroke="#444" strokeWidth="0.5" />
              <line x1="308" y1="210" x2="308" y2="240" stroke="#444" strokeWidth="0.5" />
              <line x1="318" y1="210" x2="318" y2="240" stroke="#444" strokeWidth="0.5" />
              <line x1="328" y1="210" x2="328" y2="240" stroke="#444" strokeWidth="0.5" />
              <line x1="288" y1="220" x2="338" y2="220" stroke="#444" strokeWidth="0.5" />
              <line x1="288" y1="230" x2="338" y2="230" stroke="#444" strokeWidth="0.5" />
              <rect x="295" y="290" width="90" height="10" rx="3" fill="#2C2C2A" stroke="#444441" strokeWidth="1" />
            </g>

            <g className="fire" style={{ transformOrigin: "333px 112px" }}>
              <ellipse cx="333" cy="108" rx="8" ry="12" fill="#EF9F27" opacity="0.9" />
              <ellipse cx="333" cy="104" rx="5" ry="8" fill="#FAC775" />
            </g>
            <g className="fire-2" style={{ transformOrigin: "348px 112px" }}>
              <ellipse cx="348" cy="108" rx="7" ry="10" fill="#E24B4A" opacity="0.85" />
              <ellipse cx="348" cy="105" rx="4" ry="6" fill="#EF9F27" />
            </g>
            <g className="fire" style={{ transformOrigin: "340px 112px", animationDelay: "0.15s" }}>
              <ellipse cx="340" cy="106" rx="5" ry="8" fill="#FAC775" opacity="0.9" />
            </g>

            <ellipse className="smoke-a" cx="330" cy="90" rx="14" ry="14" fill="#888780" opacity="0" />
            <ellipse className="smoke-b" cx="350" cy="85" rx="12" ry="12" fill="#B4B2A9" opacity="0" />
            <ellipse className="smoke-c" cx="340" cy="88" rx="10" ry="10" fill="#888780" opacity="0" />

            <rect x="390" y="115" width="180" height="90" rx="8" fill="#FCEBEB" stroke="#F09595" strokeWidth="1.5" />
            <polygon points="390,160 370,168 390,172" fill="#FCEBEB" stroke="#F09595" strokeWidth="1" strokeLinejoin="round" />
            <text x="480" y="145" textAnchor="middle" fill="#A32D2D" fontSize="13" fontWeight="500" fontFamily="monospace">ERROR 500</text>
            <text x="480" y="163" textAnchor="middle" fill="#791F1F" fontSize="10" fontFamily="monospace">Internal Server Error</text>
            <text x="480" y="178" textAnchor="middle" fill="#791F1F" fontSize="10" fontFamily="monospace">Segmentation fault (core</text>
            <text x="480" y="191" textAnchor="middle" fill="#791F1F" fontSize="10" fontFamily="monospace">dumped)</text>

            <g className="bolt-anim">
              <text x="232" y="195" textAnchor="middle" fontSize="32" fill="#EF9F27">⚡</text>
            </g>

            <ellipse cx="340" cy="308" rx="75" ry="8" fill="#2C2C2A" opacity="0.15" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <h3 className="text-3xl sm:text-4xl font-bold text-navy tracking-tight">
            Oups, le serveur a planté
          </h3>
          <p className="text-navy-dark/60 text-sm sm:text-base mb-4 font-medium">
            Une erreur interne s'est produite. Nos équipes sont sur le coup !
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="inline-block px-8 py-3 bg-navy text-white hover:bg-gold hover:text-navy transition-colors duration-300 font-bold text-sm rounded-sm shadow-sm"
            >
              Retourner à l'accueil
            </a>
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-8 py-3 border-2 border-navy text-navy hover:bg-navy hover:text-white transition-colors duration-300 font-bold text-sm rounded-sm"
            >
              Réessayer
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
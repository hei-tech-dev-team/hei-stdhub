export default function TeapotError() {
  const customAnimation = `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes steam {
      0%, 100% { transform: translateY(0) scale(0.9); opacity: 0.3; }
      50% { transform: translateY(-5px) scale(1.1); opacity: 0.8; }
    }
    .animate-float-item { animation: float 4s ease-in-out infinite; }
    .animate-float-delayed { animation: float 4s ease-in-out infinite; animation-delay: 2s; }
    .animate-steam { animation: steam 2s ease-in-out infinite; }
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

      <div className="w-full max-w-xl text-center z-10 flex flex-col items-center gap-6">
        
        <h1 className="text-[100px] sm:text-[140px] font-black text-gold leading-none tracking-tight filter drop-shadow-sm">
          418
        </h1>

        <div className="w-full flex flex-col items-center justify-center -mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" className="w-8 h-8 animate-steam opacity-60 mb-1">
            <path d="M6 6c.5-1.5 1.5-2.5 3-2.5M12 6c.5-1.5 1.5-2.5 3-2.5M18 6c.5-1.5 1.5-2.5 3-2.5" />
          </svg>
          
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#001F3F" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-24 h-24 text-navy"
          >
            <path d="M19 8h1a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-1" stroke="#FFD700" strokeWidth="2.5" />
            <path d="M3 11h16v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" fill="#001F3F" />
            <path d="M5 11V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            <circle cx="11" cy="5" r="1.5" fill="#FFD700" stroke="#FFD700" />
            <path d="M3 14H1.5A1.5 1.5 0 0 1 0 12.5v-1A1.5 1.5 0 0 1 1.5 10H3" />
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
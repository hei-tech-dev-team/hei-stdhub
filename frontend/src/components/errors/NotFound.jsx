export default function NotFound() {
  return (
    <section 
      className="min-h-screen w-full bg-white flex items-center justify-center font-sans p-4 relative overflow-hidden select-none"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), 
                          linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-float-item { animation: float 4s ease-in-out infinite; }
        .animate-float-delayed { animation: float 4s ease-in-out infinite; animation-delay: 2s; }
        .animate-ripple { animation: ripple 3s cubic-bezier(0.1, 0.8, 0.3, 1) infinite; }
        .animate-ripple-delayed { animation: ripple 3s cubic-bezier(0.1, 0.8, 0.3, 1) infinite; animation-delay: 1.5s; }
      `}</style>
      
      <div className="absolute top-10 left-10 w-4 h-4 bg-navy rounded-full opacity-30 blur-[1px] animate-float-item"></div>
      <div className="absolute top-1/4 right-12 w-3 h-3 bg-gold rounded-full opacity-40 animate-float-delayed"></div>
      <div className="absolute bottom-12 left-12 w-3 h-3 bg-gold rounded-full opacity-30 animate-float-delayed"></div>
      <div className="absolute bottom-1/4 right-16 w-4 h-4 bg-navy rounded-full opacity-20 blur-[1px] animate-float-item"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-3xl text-center z-10">
        
        <h1 className="text-[90px] sm:text-[120px] font-black text-navy leading-none z-0 relative">
          404
        </h1>

        <div className="w-full flex justify-center -mt-10 sm:-mt-16">
          <img 
            src="https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif" 
            alt="Animation Page Introuvable" 
            className="h-[250px] sm:h-[360px] object-contain"
          />
        </div>

        <div className="-mt-4 sm:-mt-8 relative z-10">
          <h3 className="text-3xl sm:text-4xl font-bold text-navy mb-2 tracking-tight">
            On dirait que vous êtes perdu
          </h3>
          
          <p className="text-navy-dark/60 text-sm sm:text-base mb-6 font-medium">
            La page que vous recherchez n'est pas disponible !
          </p>
     
          <a 
            href="/" 
            className="inline-block px-8 py-3 bg-navy text-white hover:bg-gold hover:text-navy transition-colors duration-300 font-bold text-sm rounded-sm shadow-sm"
          >
            Retourner à l'accueil
          </a>
        </div>

      </div>
    </section>
  );
}
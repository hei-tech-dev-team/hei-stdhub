import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWrench,
  faClock,
  faCheckCircle,
  faServer,
  faInfoCircle,
  faBell,
  faGamepad,
  faPlay
} from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect, useRef } from "react";

export default function Maintenance() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);


  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const dinoRef = useRef(null);
  const obstacleRef = useRef(null);
  const isJumpingRef = useRef(false);
  const scoreIntervalRef = useRef(null);

  const jump = () => {
    if (isJumpingRef.current || gameOver || !gameStarted) return;

    isJumpingRef.current = true;
    const dino = dinoRef.current;

    if (dino) {
      dino.style.transform = "translateY(-60px)";
      dino.style.transition = "transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)";

      setTimeout(() => {
        dino.style.transform = "translateY(0px)";
        dino.style.transition = "transform 0.22s cubic-bezier(0.5, 0, 0.75, 0)";
        setTimeout(() => {
          isJumpingRef.current = false;
        }, 220);
      }, 250);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!gameStarted || gameOver) {
          startGame();
        } else {
          jump();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, gameOver]);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    isJumpingRef.current = false;

    if (dinoRef.current) dinoRef.current.style.transform = "translateY(0px)";
    if (obstacleRef.current) {
      obstacleRef.current.style.animation = "none";
      void obstacleRef.current.offsetWidth;
      obstacleRef.current.style.animation = "moveObstacle 1.4s linear infinite";
    }

    if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
    scoreIntervalRef.current = setInterval(() => {
      setScore((prev) => prev + 1);
    }, 100);
  };

  useEffect(() => {
    let checkCollision;
    if (gameStarted && !gameOver) {
      checkCollision = setInterval(() => {
        const dino = dinoRef.current;
        const obstacle = obstacleRef.current;

        if (!dino || !obstacle) return;

        const dinoRect = dino.getBoundingClientRect();
        const obstacleRect = obstacle.getBoundingClientRect();

        if (
          obstacleRect.left < dinoRect.right - 10 &&
          obstacleRect.right > dinoRect.left + 10 &&
          dinoRect.bottom > obstacleRect.top + 6
        ) {
          setGameOver(true);
          clearInterval(scoreIntervalRef.current);
          obstacle.style.animationPlayState = "paused";
          setHighScore((prev) => (score > prev ? score : prev));
        }
      }, 30);
    }
    return () => clearInterval(checkCollision);
  }, [gameStarted, gameOver, score]);

  useEffect(() => {
    return () => clearInterval(scoreIntervalRef.current);
  }, []);

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center bg-surface p-4 relative overflow-hidden select-none"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), 
                          linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes moveObstacle {
          0% { transform: translateX(380px); }
          100% { transform: translateX(-40px); }
        }
        .animate-float-wrench { animation: float 4s ease-in-out infinite; }
        .animate-ripple { animation: ripple 3s cubic-bezier(0.1, 0.8, 0.3, 1) infinite; }
        .animate-ripple-delayed { animation: ripple 3s cubic-bezier(0.1, 0.8, 0.3, 1) infinite; animation-delay: 1.5s; }
      `}</style>

      {}
      <div className="absolute top-10 left-10 w-4 h-4 bg-navy rounded-full opacity-30 blur-[1px]"></div>
      <div className="absolute top-1/4 right-10 w-3 h-3 bg-gold rounded-full opacity-40"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] pointer-events-none"></div>

      {}
      <div className="text-center max-w-2xl z-10">
        
        {}
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center animate-float-wrench">
          <div className="absolute inset-0 bg-navy rounded-full animate-ripple pointer-events-none"></div>
          <div className="absolute inset-0 bg-navy rounded-full animate-ripple-delayed pointer-events-none"></div>
          
          <div className="relative w-20 h-20 rounded-full border-2 border-navy/20 bg-white shadow-xl flex items-center justify-center z-10">
            <FontAwesomeIcon icon={faWrench} className="text-navy text-3xl" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-navy-dark mb-4 tracking-tight">
          Maintenance en cours
        </h1>
        <p className="text-navy-dark/60 text-sm sm:text-base px-6 mb-10 leading-relaxed max-w-lg mx-auto">
          Nous effectuons actuellement une maintenance programmée pour améliorer nos services. 
          Serons de retour très prochainement.
        </p>

        {}
        <div className="bg-white rounded-3xl p-8 border border-contact shadow-card mb-8 max-w-sm mx-auto relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 mb-6">
            <FontAwesomeIcon icon={faClock} className="text-gold text-sm" />
            <h3 className="text-xs font-bold text-navy-dark/40 uppercase tracking-widest">Durée estimée</h3>
          </div>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex flex-col">
              <span className="text-6xl font-black text-navy tracking-tighter">--</span>
              <span className="text-[10px] font-bold text-navy-dark/30 uppercase mt-1">Heures</span>
            </div>
            <span className="text-4xl font-black text-gold mb-4">:</span>
            <div className="flex flex-col">
              <span className="text-6xl font-black text-navy tracking-tighter">--</span>
              <span className="text-[10px] font-bold text-navy-dark/30 uppercase mt-1">Minutes</span>
            </div>
          </div>

          <p className="text-xs font-semibold text-navy-dark/50">
            Retour prévu vers : <span className="text-navy">Indéterminé</span>
          </p>
        </div>

        {}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <div className="bg-white/50 backdrop-blur-sm px-4 py-3 rounded-2xl border border-contact flex items-center gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-gold text-sm" />
            <span className="text-[11px] font-bold text-navy-dark/70">Optimisation</span>
          </div>
          <div className="bg-white/50 backdrop-blur-sm px-4 py-3 rounded-2xl border border-contact flex items-center gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-gold text-sm" />
            <span className="text-[11px] font-bold text-navy-dark/70">Mise à jour</span>
          </div>
          <div className="bg-white/50 backdrop-blur-sm px-4 py-3 rounded-2xl border border-contact flex items-center gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-gold text-sm" />
            <span className="text-[11px] font-bold text-navy-dark/70">Nouveautés</span>
          </div>
        </div>

        {}
        <div className="bg-navy/5 border border-navy/10 rounded-2xl p-6 mb-[32px] flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faBell} className="text-navy text-sm" />
          </div>
          <p className="text-navy-dark text-sm font-semibold text-center sm:text-left">
            Vous serez alertés lorsque le site sera de nouveau en marche.
          </p>
        </div>

        {}
        <div className="bg-white rounded-2xl border border-contact p-4 w-full max-w-sm shadow-card mb-8 mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 text-navy font-bold text-xs">
              <FontAwesomeIcon icon={faGamepad} className="text-gold" />
              <span>Un peu de patience ?</span>
            </div>
            <div className="text-[11px] font-mono font-bold text-navy-dark/60">
              HI: <span className="text-gold mr-2">{highScore}</span> Score: <span>{score}</span>
            </div>
          </div>

          {}
          <div 
            onClick={jump}
            className="w-full h-24 bg-surface border border-contact rounded-xl relative overflow-hidden cursor-pointer"
          >
            {}
            {!gameStarted && (
              <div className="absolute inset-0 bg-navy/5 backdrop-blur-[1px] flex flex-col items-center justify-center z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  className="bg-navy hover:bg-navy-dark text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlay} className="text-[10px] ml-0.5 text-gold" />
                </button>
                <span className="text-[9px] font-bold text-navy-dark/40 mt-1.5">Cliquez ou Espace pour jouer</span>
              </div>
            )}

            {}
            {gameOver && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-20">
                <span className="text-xs font-black text-navy uppercase tracking-wider mb-1">Partie terminée</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  className="text-[9px] font-bold bg-gold text-navy px-2.5 py-1 rounded-md hover:bg-gold/80 transition-colors"
                >
                  Recommencer
                </button>
              </div>
            )}

            {}
            <div 
              ref={dinoRef}
              className="absolute left-6 bottom-0 w-5 h-6 bg-navy rounded-t-md transition-transform flex flex-col justify-between p-0.5"
              style={{ transform: "translateY(0px)" }}
            >
              <div className="w-1 h-1 bg-gold rounded-full self-end"></div>
              <div className="flex justify-between w-full px-0.5">
                <div className="w-0.5 h-0.5 bg-surface opacity-60 rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-surface opacity-60 rounded-full"></div>
              </div>
            </div>

            {}
            <div 
              ref={obstacleRef}
              className="absolute bottom-0 w-3.5 h-5 bg-gold rounded-t-sm"
              style={{ transform: "translateX(380px)" }}
            >
              <div className="w-1 h-2.5 bg-gold absolute left-[-2px] top-1 rounded-l-sm"></div>
            </div>

            {}
            <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-navy/10"></div>
          </div>
        </div>

        {}
        <div className="flex items-center justify-center gap-8 mb-10">
          <button 
            onClick={() => setIsStatusModalOpen(true)}
            className="flex items-center gap-2 text-xs font-bold text-navy-dark/50 hover:text-navy transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faServer} className="text-gold" />
            Page de statut
          </button>
        </div>

        {}
        <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-xl px-4 py-2 text-[10px] sm:text-xs text-navy-dark/80">
          <span className="font-bold text-navy">Note :</span> Merci pour votre patience pendant que nous améliorons votre expérience.
        </div>
      </div>

      {}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl border border-contact text-center relative">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faInfoCircle} className="text-navy text-lg" />
            </div>
            <h3 className="text-lg font-bold text-navy-dark mb-2">Statut du système</h3>
            <p className="text-navy-dark/60 text-sm mb-6">
              Tous nos systèmes sont en cours de mise à jour.
            </p>
            <div className="bg-surface border border-contact rounded-xl py-4 px-4 mb-6">
              <span className="text-[10px] uppercase font-bold text-navy-dark/40 tracking-wider block mb-1">Systèmes</span>
              <span className="text-base font-bold text-gold">Maintenance Globale</span>
            </div>
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="w-full bg-navy hover:bg-navy-dark text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
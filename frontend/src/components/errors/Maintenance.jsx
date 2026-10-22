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
      className="min-h-screen w-full flex flex-col items-center justify-center bg-surface p-4 select-none"
    >
      <style>{`
        @keyframes moveObstacle {
          0% { transform: translateX(380px); }
          100% { transform: translateX(-40px); }
        }
      `}</style>

      <div className="text-center max-w-2xl z-10">

        <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white border border-gray-100 flex items-center justify-center">
            <FontAwesomeIcon icon={faWrench} className="text-navy text-2xl" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-4 tracking-tight">
          Maintenance en cours
        </h1>
        <p className="text-gray-400 text-sm sm:text-base px-6 mb-10 leading-relaxed max-w-lg mx-auto">
          Nous effectuons actuellement une maintenance programmée pour améliorer nos services.
          Serons de retour très prochainement.
        </p>

        <div className="card rounded-2xl p-8 mb-8 max-w-sm mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <FontAwesomeIcon icon={faClock} className="text-gold text-sm" />
            <h3 className="text-[11px] font-medium text-navy/50 uppercase tracking-[0.1em]">Durée estimée</h3>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex flex-col">
              <span className="text-6xl font-bold text-navy tracking-tighter">--</span>
              <span className="text-[10px] font-medium text-navy/40 uppercase mt-1">Heures</span>
            </div>
            <span className="text-4xl font-bold text-navy/30 mb-4">:</span>
            <div className="flex flex-col">
              <span className="text-6xl font-bold text-navy tracking-tighter">--</span>
              <span className="text-[10px] font-medium text-navy/40 uppercase mt-1">Minutes</span>
            </div>
          </div>

          <p className="text-xs font-medium text-navy/50">
            Retour prévu vers : <span className="text-navy">Indéterminé</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 flex items-center gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-sm" />
            <span className="text-[11px] font-medium text-navy/70">Optimisation</span>
          </div>
          <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 flex items-center gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-sm" />
            <span className="text-[11px] font-medium text-navy/70">Mise à jour</span>
          </div>
          <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 flex items-center gap-3">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-sm" />
            <span className="text-[11px] font-medium text-navy/70">Nouveautés</span>
          </div>
        </div>

        <div className="bg-navy rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faBell} className="text-gold text-sm" />
          </div>
          <p className="text-white text-sm font-medium text-center sm:text-left">
            Vous serez alertés lorsque le site sera de nouveau en marche.
          </p>
        </div>

        <div className="card rounded-2xl p-4 w-full max-w-sm mb-8 mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 text-navy font-medium text-xs">
              <FontAwesomeIcon icon={faGamepad} className="text-gold" />
              <span>Un peu de patience ?</span>
            </div>
            <div className="text-[11px] font-medium text-navy/50">
              HI: <span className="text-navy mr-2">{highScore}</span> Score: <span>{score}</span>
            </div>
          </div>

          <div
            onClick={jump}
            className="w-full h-24 bg-surface border border-gray-100 rounded-xl relative overflow-hidden cursor-pointer"
          >
            {!gameStarted && (
              <div className="absolute inset-0 bg-surface/80 flex flex-col items-center justify-center z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  className="bg-navy hover:bg-navy-dark text-white rounded-full w-8 h-8 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faPlay} className="text-[10px] ml-0.5 text-gold" />
                </button>
                <span className="text-[9px] font-medium text-navy/40 mt-1.5">Cliquez ou Espace pour jouer</span>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-20">
                <span className="text-xs font-medium text-navy uppercase tracking-wider mb-1">Partie terminée</span>
                <button
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  className="text-[9px] font-medium bg-gold text-navy px-2.5 py-1 rounded-md hover:bg-gold/80 transition-colors"
                >
                  Recommencer
                </button>
              </div>
            )}

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

            <div
              ref={obstacleRef}
              className="absolute bottom-0 w-3.5 h-5 bg-gold rounded-t-sm"
              style={{ transform: "translateX(380px)" }}
            >
              <div className="w-1 h-2.5 bg-gold absolute left-[-2px] top-1 rounded-l-sm"></div>
            </div>

            <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-navy/10"></div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 mb-10">
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="flex items-center gap-2 text-xs font-medium text-navy/50 hover:text-navy transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faServer} className="text-gold" />
            Page de statut
          </button>
        </div>

        <div className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] sm:text-xs text-navy/70">
          <span className="font-medium text-navy">Note :</span> Merci pour votre patience pendant que nous améliorons votre expérience.
        </div>
      </div>

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-modal border border-gray-100 text-center relative">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faInfoCircle} className="text-navy text-lg" />
            </div>
            <h3 className="text-lg font-bold text-navy mb-2">Statut du système</h3>
            <p className="text-gray-400 text-sm mb-6">
              Tous nos systèmes sont en cours de mise à jour.
            </p>
            <div className="bg-surface border border-gray-100 rounded-xl py-4 px-4 mb-6">
              <span className="text-[10px] uppercase font-medium text-navy/40 tracking-wider block mb-1">Systèmes</span>
              <span className="text-base font-medium text-navy">Maintenance Globale</span>
            </div>
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="w-full bg-navy hover:bg-navy-dark text-white font-medium py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faUser,
  faCompass,
  faComments,
  faRocket,
  faArrowRight,
  faArrowLeft,
  faTimes,
  faCheck,
  faCamera,
  faLock,
  faSearch,
  faArchive,
  faFileAlt,
  faLightbulb,
  faStar,
} from "@fortawesome/free-solid-svg-icons";

const steps = [
  {
    icon: faGraduationCap,
    title: "Bienvenue sur HEI STDhub",
    subtitle: "Votre plateforme etudiante tout-en-un",
    description:
      "Accedez a vos cours, soumettez vos devoirs, discutez avec vos camarades et bien plus encore. Ce guide vous presente les fonctionnalites essentielles.",
    color: "from-navy to-navy-dark",
  },
  {
    icon: faUser,
    title: "Personnalisez votre profil",
    subtitle: "Votre identite sur la plateforme",
    description:
      "Modifiez votre photo de profil, votre pseudo et votre mot de passe depuis la page Mon Profil.",
    highlight: {
      label: "Aller a Mon Profil",
      path: "/profile",
    },
    tips: [
      { icon: faCamera, text: "Ajoutez une photo de profil" },
      { icon: faUser, text: "Choisissez un pseudo unique" },
      { icon: faLock, text: "Securisez votre compte" },
    ],
    color: "from-navy to-navy-dark",
  },
  {
    icon: faCompass,
    title: "Explorez l'application",
    subtitle: "Naviguez facilement",
    description:
      "Utilisez le menu lateral pour acceder a toutes les sections de l'application.",
    tips: [
      { icon: faArchive, text: "Archives — Consultez les cours par UE" },
      { icon: faFileAlt, text: "TD/Examen — Soumettez vos devoirs" },
      { icon: faLightbulb, text: "Suggestions — Proposez vos idees" },
    ],
    color: "from-navy to-navy-dark",
  },
  {
    icon: faComments,
    title: "Restez connecte",
    subtitle: "Communiquez avec votre classe",
    description:
      "Discutez en temps reel avec vos camarades et professeurs via le chat integre. Envoyez des messages prives ou participez a la discussion globale des etudiants HEI",
    tips: [
      { icon: faComments, text: "Messages globaux et prives" },
      { icon: faSearch, text: "Recherchez dans l'historique" },
      { icon: faCheck, text: "Notifications de lecture" },
    ],
    color: "from-navy to-navy-dark",
  },
  {
    icon: faRocket,
    title: "Pret a demarrer !",
    subtitle: "Vous connaissez l'essentiel",
    description:
      "Explorez les differentes sections a votre rythme. N'hesitez pas a consulter la page Mon Profil pour personnaliser votre experience.",
    color: "from-gold to-yellow-600",
  },
];

export default function OnboardingModal() {
  const { firstLogin, dismissOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const [closing, setClosing] = useState(false);

  const total = steps.length;
  const current = steps[step];

  const handleDismiss = useCallback(() => {
    setClosing(true);
    setTimeout(() => dismissOnboarding(), 300);
  }, [dismissOnboarding]);

  const goTo = useCallback(
    (nextStep) => {
      if (nextStep < 0 || nextStep >= total || nextStep === step) return;
      setAnimDir(nextStep > step ? "right" : "left");
      setTimeout(() => {
        setStep(nextStep);
        setAnimDir(null);
      }, 280);
    },
    [step, total],
  );

  const handleGoToProfile = (path) => {
    setClosing(true);
    setTimeout(() => {
      dismissOnboarding();
      window.location.href = path;
    }, 300);
  };

  if (!firstLogin) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style>{`
        @keyframes onb-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes onb-modal-in {
          from { opacity: 0; transform: scale(0.92) translateY(24px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes onb-modal-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.95) translateY(-12px); }
        }
        @keyframes onb-content-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-content-out-right {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(40px) scale(0.96); }
        }
        @keyframes onb-content-out-left {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(-40px) scale(0.96); }
        }
        @keyframes onb-content-in-right {
          from { opacity: 0; transform: translateX(-40px) scale(0.96); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes onb-content-in-left {
          from { opacity: 0; transform: translateX(40px) scale(0.96); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes onb-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(1deg); }
          66% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes onb-sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes onb-glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.2); }
        }
        .onb-overlay-in { animation: onb-overlay-in 0.5s ease-out forwards; }
        .onb-modal-in { animation: onb-modal-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .onb-modal-out { animation: onb-modal-out 0.3s cubic-bezier(0.55, 0, 1, 0.45) forwards; }
        .onb-content-in { animation: onb-content-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .onb-content-out-right { animation: onb-content-out-right 0.25s ease-in forwards; }
        .onb-content-out-left { animation: onb-content-out-left 0.25s ease-in forwards; }
        .onb-content-in-right { animation: onb-content-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .onb-content-in-left { animation: onb-content-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .onb-float { animation: onb-float 6s ease-in-out infinite; }
        .onb-sparkle { animation: onb-sparkle 2s ease-in-out infinite; }
        .onb-glow-pulse { animation: onb-glow-pulse 3s ease-in-out infinite; }
      `}</style>

      {/* Overlay with gradient mesh */}
      <div
        className={`absolute inset-0 ${closing ? "" : "onb-overlay-in"}`}
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(10,26,51,0.85) 0%, rgba(0,25,72,0.92) 50%, rgba(10,26,51,0.98) 100%)",
          backdropFilter: "blur(8px)",
        }}
      />

      {/* Floating decorative particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full onb-float"
            style={{
              width: `${4 + (i % 3) * 6}px`,
              height: `${4 + (i % 3) * 6}px`,
              background: i % 2 === 0
                ? "rgba(212, 175, 55, 0.25)"
                : "rgba(255, 255, 255, 0.12)",
              left: `${15 + i * 14}%`,
              top: `${20 + (i * 11) % 60}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${5 + i * 1.5}s`,
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg ${
          closing ? "onb-modal-out" : "onb-modal-in"
        }`}
      >
        <div
          className="rounded-3xl overflow-hidden onb-glow-pulse"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          {/* Decorative top gradient glow */}
          <div className={`h-1.5 bg-gradient-to-r ${current.color} opacity-80`} />

          {/* Content area */}
          <div className="px-8 pt-8 pb-2 relative min-h-[340px]">
            {/* Skip button */}
            {step < total - 1 && (
              <button
                onClick={handleDismiss}
                className="absolute top-6 right-6 text-white/40 hover:text-white/80 transition text-sm flex items-center gap-1.5 z-10"
              >
                Passer
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            )}

            {/* Animated content wrapper */}
            <div
              className={
                animDir === "right"
                  ? "onb-content-out-left"
                  : animDir === "left"
                    ? "onb-content-out-right"
                    : animDir === null
                      ? ""
                      : "onb-content-in"
              }
              key={step + (animDir ? "out" : "in")}
            >
              {!animDir && (
                <div
                  className={
                    animDir === null
                      ? "onb-content-in"
                      : ""
                  }
                >
                  {/* Step content */}
                  <StepContent
                    current={current}
                    step={step}
                    handleGoToProfile={handleGoToProfile}
                  />
                </div>
              )}
            </div>

            {/* Re-render on animation complete */}
            {animDir && (
              <div
                className={
                  animDir === "right"
                    ? "onb-content-in-right"
                    : "onb-content-in-left"
                }
              >
                <StepContent
                  current={current}
                  step={step}
                  handleGoToProfile={handleGoToProfile}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-6">
            {/* Dots */}
            <div className="flex justify-center gap-2.5 mb-5">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="relative group"
                >
                  <div
                    className={`rounded-full transition-all duration-500 ease-out ${
                      i === step
                        ? "bg-gold w-7 h-2"
                        : "bg-white/20 w-2 h-2 group-hover:bg-white/40"
                    }`}
                  />
                  {i === step && (
                    <div
                      className="absolute -inset-1 rounded-full bg-gold/30 blur-sm"
                      style={{ animation: "onb-sparkle 1.5s ease-in-out infinite" }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => goTo(step - 1)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm
                    flex items-center justify-center gap-2 transition-all duration-200
                    active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.8)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Retour
                </button>
              )}

              {step < total - 1 ? (
                <button
                  onClick={() => goTo(step + 1)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm
                    flex items-center justify-center gap-2 transition-all duration-200
                    active:scale-[0.98] ${step === 0 ? "" : ""}`}
                  style={{
                    background: step === 0
                      ? "linear-gradient(135deg, #D4AF37, #B8860B)"
                      : "rgba(255,255,255,0.1)",
                    border: step === 0
                      ? "none"
                      : "1px solid rgba(255,255,255,0.15)",
                    color: "white",
                  }}
                  onMouseEnter={(e) => {
                    if (step !== 0) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (step !== 0) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                    }
                  }}
                >
                  Suivant
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm
                    flex items-center justify-center gap-2 transition-all duration-200
                    active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                    color: "white",
                    boxShadow: "0 4px 20px rgba(212, 175, 55, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <FontAwesomeIcon icon={faRocket} />
                  C&apos;est parti !
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepContent({ current, step, handleGoToProfile }) {
  return (
    <div>
      {/* Icon */}
      <div className="flex justify-center mb-5">
        <div
          className="relative"
          style={{ animation: "onb-float 4s ease-in-out infinite" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg onb-glow-pulse"
            style={{
              background: step === 4
                ? "linear-gradient(135deg, #D4AF37, #B8860B)"
                : "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
              border: step === 4
                ? "none"
                : "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <FontAwesomeIcon
              icon={current.icon}
              className={`text-2xl ${step === 4 ? "text-white" : "text-gold"}`}
            />
          </div>
          {step === 0 && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold flex items-center justify-center"
              style={{ animation: "onb-sparkle 2s ease-in-out infinite" }}
            >
              <FontAwesomeIcon icon={faStar} className="text-white text-[10px]" />
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-center text-xl font-bold text-white mb-1">
        {current.title}
      </h2>
      {current.subtitle && (
        <p className="text-center text-gold font-semibold text-sm mb-4">
          {current.subtitle}
        </p>
      )}

      {/* Description */}
      <p className="text-white/60 text-sm text-center leading-relaxed mb-6">
        {current.description}
      </p>

      {/* Tips list */}
      {current.tips && (
        <div className="space-y-2.5 mb-6">
          {current.tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                animation: `onb-content-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + i * 0.1}s both`,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(212, 175, 55, 0.15)" }}
              >
                <FontAwesomeIcon
                  icon={tip.icon}
                  className="text-gold text-sm"
                />
              </div>
              <span className="text-white/80 text-sm font-medium">
                {tip.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Profile CTA */}
      {current.highlight && (
        <div className="flex justify-center mb-2">
          <button
            onClick={() => handleGoToProfile(current.highlight.path)}
            className="flex items-center gap-2 text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #B8860B)",
              color: "white",
              padding: "10px 24px",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(212, 175, 55, 0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <FontAwesomeIcon icon={faArrowRight} />
            {current.highlight.label}
          </button>
        </div>
      )}
    </div>
  );
}

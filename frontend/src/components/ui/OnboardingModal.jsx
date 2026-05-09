import { useState, useEffect, useCallback } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";

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
  const [direction, setDirection] = useState(0);
  const [animClass, setAnimClass] = useState("");

  const total = steps.length;
  const current = steps[step];

  const animate = useCallback((dir) => {
    setDirection(dir);
    setAnimClass(
      dir > 0 ? "animate-slide-out-left" : "animate-slide-out-right",
    );
    setTimeout(() => {
      setStep((s) => s + dir);
      setAnimClass(
        dir > 0 ? "animate-slide-in-right" : "animate-slide-in-left",
      );
    }, 200);
    setTimeout(() => setAnimClass(""), 400);
  }, []);

  const next = () => step < total - 1 && animate(1);
  const prev = () => step > 0 && animate(-1);

  const handleGoToProfile = (path) => {
    dismissOnboarding();
    window.location.href = path;
  };

  if (!firstLogin) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-60px); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(60px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.4); }
        }
        @keyframes bounce-gently {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-slide-in-right { animation: slideInRight 0.35s ease-out forwards; }
        .animate-slide-in-left { animation: slideInLeft 0.35s ease-out forwards; }
        .animate-slide-out-left { animation: slideOutLeft 0.2s ease-in forwards; }
        .animate-slide-out-right { animation: slideOutRight 0.2s ease-in forwards; }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-pulse-dot { animation: pulse-dot 1.5s ease-in-out infinite; }
        .animate-bounce-gently { animation: bounce-gently 2s ease-in-out infinite; }
      `}</style>

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {}}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`bg-white rounded-3xl shadow-modal w-full max-w-lg overflow-hidden ${animClass}`}
        >
          {/* Header gradient bar */}
          <div className={`h-2 bg-gradient-to-r ${current.color}`} />

          {/* Content area */}
          <div className="p-8 pt-6 relative min-h-[360px]">
            {/* Skip button */}
            {step < total - 1 && (
              <button
                onClick={dismissOnboarding}
                className="absolute top-6 right-6 text-gray-400 hover:text-navy transition text-sm flex items-center gap-1"
              >
                Passer <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            )}

            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-lg`}
              >
                <FontAwesomeIcon
                  icon={current.icon}
                  className="text-white text-2xl"
                />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-xl font-bold text-navy mb-1">
              {current.title}
            </h2>
            {current.subtitle && (
              <p className="text-center text-gold font-semibold text-sm mb-4">
                {current.subtitle}
              </p>
            )}

            {/* Description */}
            <p className="text-gray-500 text-sm text-center leading-relaxed mb-6">
              {current.description}
            </p>

            {/* Tips list */}
            {current.tips && (
              <div className="space-y-2.5 mb-6">
                {current.tips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-surface rounded-xl px-4 py-2.5"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon
                        icon={tip.icon}
                        className="text-navy text-sm"
                      />
                    </div>
                    <span className="text-navy text-sm font-medium">
                      {tip.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Profile CTA */}
            {current.highlight && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => handleGoToProfile(current.highlight.path)}
                  className="btn-primary flex items-center gap-2 animate-bounce-gently"
                >
                  <FontAwesomeIcon icon={faArrowRight} />
                  {current.highlight.label}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-6">
            {/* Dots */}
            <div className="flex justify-center gap-2 mb-5">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const dir = i > step ? 1 : -1;
                    setDirection(dir);
                    setAnimClass(
                      dir > 0
                        ? "animate-slide-out-left"
                        : "animate-slide-out-right",
                    );
                    setTimeout(() => {
                      setStep(i);
                      setAnimClass(
                        dir > 0
                          ? "animate-slide-in-right"
                          : "animate-slide-in-left",
                      );
                    }, 200);
                    setTimeout(() => setAnimClass(""), 400);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? "bg-navy w-6 animate-pulse-dot"
                      : "bg-contact hover:bg-navy/30"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex-1 py-2.5 rounded-xl border border-contact text-navy font-semibold text-sm
                             hover:bg-surface transition flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Retour
                </button>
              )}

              {step < total - 1 ? (
                <button
                  onClick={next}
                  className="flex-1 py-2.5 rounded-xl bg-navy text-white font-semibold text-sm
                             hover:bg-navy-dark transition flex items-center justify-center gap-2 shadow-md"
                >
                  Suivant
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </button>
              ) : (
                <button
                  onClick={dismissOnboarding}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold to-yellow-600 text-white
                             font-bold text-sm hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md"
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

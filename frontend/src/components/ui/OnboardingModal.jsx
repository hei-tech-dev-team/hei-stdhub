import { useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscribeToPush, isSubscribedToPush } from "../../push";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faUser,
  faCompass,
  faComments,
  faBell,
  faRocket,
  faArrowRight,
  faArrowLeft,
  faTimes,
  faCheck,
  faCamera,
  faLock,
  faSearch,
  faArchive,
  faLightbulb,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

const steps = [
  {
    icon: faGraduationCap,
    title: "Bienvenue sur HEI STDhub",
    subtitle: "Votre plateforme etudiante tout-en-un",
    description:
      "Accedez a vos cours, discutez avec vos camarades et bien plus encore. Ce guide vous presente les fonctionnalites essentielles.",
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
  },
  {
    icon: faCompass,
    title: "Explorez l'application",
    subtitle: "Naviguez facilement",
    description:
      "Utilisez le menu lateral pour acceder a toutes les sections de l'application.",
    tips: [
      { icon: faArchive, text: "Archives — Consultez les cours par UE" },
      { icon: faLightbulb, text: "Suggestions — Proposez vos idees" },
    ],
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
  },
  {
    key: "notifications",
    icon: faBell,
    title: "Activez les notifications",
    subtitle: "Ne manquez aucun evenement",
    description:
      "Soyez informe instantanement des nouveaux messages, actualites et rappels importants, meme lorsque l'application est fermee.",
  },
  {
    icon: faRocket,
    title: "Pret a demarrer !",
    subtitle: "Vous connaissez l'essentiel",
    description:
      "Explorez les differentes sections a votre rythme. N'hesitez pas a consulter la page Mon Profil pour personnaliser votre experience.",
  },
];

export default function OnboardingModal() {
  const { firstLogin, dismissOnboarding, setPushSubscribed } = useAuth();
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState(null);
  const [closing, setClosing] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

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

  const handleEnableNotifications = async () => {
    setNotifLoading(true);
    await subscribeToPush();
    const subscribed = await isSubscribedToPush();
    setPushSubscribed(subscribed);
    setNotifLoading(false);
    goTo(step + 1);
  };

  const handleSkipNotifications = () => {
    goTo(step + 1);
  };

  if (!firstLogin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes onb-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes onb-modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes onb-modal-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.97) translateY(-8px); }
        }
        @keyframes onb-content-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes onb-content-out-right {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(32px); }
        }
        @keyframes onb-content-out-left {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-32px); }
        }
        @keyframes onb-content-in-right {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes onb-content-in-left {
          from { opacity: 0; transform: translateX(32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .onb-overlay-in { animation: onb-overlay-in 0.4s ease-out forwards; }
        .onb-modal-in { animation: onb-modal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .onb-modal-out { animation: onb-modal-out 0.3s ease-in forwards; }
        .onb-content-in { animation: onb-content-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .onb-content-out-right { animation: onb-content-out-right 0.25s ease-in forwards; }
        .onb-content-out-left { animation: onb-content-out-left 0.25s ease-in forwards; }
        .onb-content-in-right { animation: onb-content-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .onb-content-in-left { animation: onb-content-in-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className={`absolute inset-0 bg-black/50 ${closing ? "" : "onb-overlay-in"}`} />

      <div className={`relative w-full max-w-lg ${closing ? "onb-modal-out" : "onb-modal-in"}`}>
        <div className="bg-white rounded-2xl shadow-modal border border-gray-100 overflow-hidden">
          {/* Content area */}
          <div className="px-7 pt-7 pb-2 relative min-h-[320px]">
            {step < total - 1 && (
              <button
                onClick={handleDismiss}
                className="absolute top-6 right-6 text-gray-400 hover:text-navy transition text-sm flex items-center gap-1.5 z-10"
              >
                Passer
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            )}

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
                <div className={animDir === null ? "onb-content-in" : ""}>
                  <StepContent
                    current={current}
                    step={step}
                    handleGoToProfile={handleGoToProfile}
                  />
                </div>
              )}
            </div>

            {animDir && (
              <div
                className={
                  animDir === "right" ? "onb-content-in-right" : "onb-content-in-left"
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
          <div className="px-7 pb-6">
            <div className="flex justify-center gap-2 mb-5">
              {Array.from({ length: total }).map((_, i) => (
                <button key={i} onClick={() => goTo(i)} aria-label={`Etape ${i + 1}`}>
                  <div
                    className={`rounded-full transition-all duration-300 ${
                      i === step ? "bg-navy w-7 h-2" : "bg-navy/15 w-2 h-2 hover:bg-navy/30"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => goTo(step - 1)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-navy border border-gray-200 hover:bg-surface transition-colors flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                  Retour
                </button>
              )}

              {current.key === "notifications" ? (
                <>
                  <button
                    onClick={handleSkipNotifications}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-navy border border-gray-200 hover:bg-surface transition-colors"
                  >
                    Non merci
                  </button>
                  <button
                    onClick={handleEnableNotifications}
                    disabled={notifLoading}
                    className="btn-primary flex-1"
                  >
                    {notifLoading ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faBell} />
                    )}
                    Activer
                  </button>
                </>
              ) : step < total - 1 ? (
                <button
                  onClick={() => goTo(step + 1)}
                  className="btn-primary flex-1"
                >
                  Suivant
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </button>
              ) : (
                <button onClick={handleDismiss} className="btn-primary flex-1">
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
  const isLast = step === steps.length - 1;

  return (
    <div>
      <div className="flex justify-center mb-5">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isLast ? "bg-gold" : "bg-navy"
          }`}
        >
          <FontAwesomeIcon
            icon={current.icon}
            className={`text-xl ${isLast ? "text-navy-dark" : "text-gold"}`}
          />
        </div>
      </div>

      <h2 className="text-center text-xl font-bold text-navy mb-1">{current.title}</h2>
      {current.subtitle && (
        <p className="text-center text-navy/50 text-sm mb-4">{current.subtitle}</p>
      )}

      <p className="text-gray-500 text-sm text-center leading-relaxed mb-6">
        {current.description}
      </p>

      {current.tips && (
        <div className="space-y-2 mb-6">
          {current.tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-surface px-4 py-2.5"
              style={{ animation: `onb-content-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + i * 0.1}s both` }}
            >
              <FontAwesomeIcon icon={tip.icon} className="text-navy/50 text-sm w-4 shrink-0" />
              <span className="text-navy text-sm font-medium">{tip.text}</span>
            </div>
          ))}
        </div>
      )}

      {current.highlight && (
        <div className="flex justify-center mb-2">
          <button
            onClick={() => handleGoToProfile(current.highlight.path)}
            className="btn-gold"
          >
            <FontAwesomeIcon icon={faArrowRight} />
            {current.highlight.label}
          </button>
        </div>
      )}
    </div>
  );
}

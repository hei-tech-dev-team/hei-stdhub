import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../../assets/logos";

/**
 * Shell uniforme des pages d'authentification (login, register,
 * forgot-password, reset-password) : fond navy, panneau marque à gauche
 * (titre Fraunces + accent or, carte à bordure or), panneau formulaire à
 * droite (logo mobile, titre Fraunces + filet or, contenu, pied de page).
 */
export default function AuthShell({
  headline,
  headlineAccent,
  sub,
  cardTitle,
  cardSub,
  title,
  subtitle,
  children,
  footer,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] flex items-center justify-center px-4 py-8 auth-page">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden flex min-h-[540px]">
          <div
            className="hidden lg:flex lg:w-2/5 relative flex-col justify-between p-10 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #0A1A33 0%, #001948 50%, #0A1A33 100%)",
            }}
          >
            <div className="absolute top-[-60px] left-[-60px] w-56 h-56 bg-white/10 rounded-full" />
            <div className="absolute top-[30%] right-[-80px] w-72 h-72 bg-white/8 rounded-full" />
            <div className="absolute bottom-[-40px] left-[20%] w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute bottom-[20%] left-[-30px] w-32 h-32 bg-white/12 rounded-full" />
            <div className="absolute top-[55%] right-[10%] w-20 h-20 bg-white/10 rounded-full" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <img
                  src={HEI_WHITE_LOGO}
                  alt="HEI"
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <div>
                <span className="text-white font-bold text-lg leading-none block">
                  HEI STDhub
                </span>
                <span className="text-white/60 text-xs">
                  Plateforme étudiante
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-white text-3xl font-bold leading-snug mb-3 font-fraunces">
                {headline}
                <br />
                <span className="text-gold-light">{headlineAccent}</span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">{sub}</p>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20 border-l-2 border-l-gold">
              <p className="text-white/80 text-xs font-medium">{cardTitle}</p>
              <p className="text-white/50 text-xs mt-0.5">{cardSub}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col px-8 sm:px-12 py-10 overflow-y-auto max-h-screen">
            <div className="m-auto w-full">
              <div className="flex lg:hidden items-center gap-2 mb-8">
                <img
                  src={HEI_BLUE_LOGO}
                  alt="HEI"
                  className="h-9 object-contain"
                />
                <span className="text-navy font-bold text-lg">HEI STDhub</span>
              </div>

              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-navy font-fraunces">
                  {title}
                </h1>
                <span className="block w-12 h-1 rounded-full bg-gold mt-3" />
                <div className="text-gray-400 text-sm mt-3">{subtitle}</div>
              </div>

              {children}

              {footer && <div className="auth-foot">{footer}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthBackLink({ to = "/login", children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
    >
      <ArrowLeft size={14} /> {children}
    </Link>
  );
}

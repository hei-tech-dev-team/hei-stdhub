import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../../assets/logos";

/**
 * Shell uniforme des pages d'authentification (login, register,
 * forgot-password, reset-password) : plein écran en deux volets — volet
 * marque navy plat (titre Fraunces + accent or, repère or à gauche) et
 * volet formulaire blanc (logo mobile, titre Fraunces avec point or,
 * contenu, pied de page). Aucun dégradé ni ornement : typographie,
 * aplats et espacement.
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
    <div className="min-h-screen bg-white flex auth-page">
      <aside className="hidden lg:flex lg:w-[42%] bg-navy relative flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <img
              src={HEI_WHITE_LOGO}
              alt="HEI"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
          <div>
            <span className="text-white font-bold text-[15px] leading-none block">
              HEI STDhub
            </span>
            <span className="text-white/40 text-[11px]">
              Plateforme étudiante
            </span>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-fraunces text-white text-[40px] xl:text-[48px] font-semibold leading-[1.08] tracking-[-0.01em]">
            {headline}
            <br />
            <span className="text-gold">{headlineAccent}</span>
          </h1>
          <p className="text-white/50 text-[15px] leading-relaxed mt-6">
            {sub}
          </p>
          <div className="mt-10 border-l-2 border-gold pl-5">
            <p className="text-white/75 text-sm font-medium">{cardTitle}</p>
            <p className="text-white/40 text-xs mt-1">{cardSub}</p>
          </div>
        </div>

        <p className="text-white/30 text-[11px] uppercase tracking-[0.2em]">
          HEI · Madagascar
        </p>
      </aside>

      <main className="flex-1 flex flex-col px-6 sm:px-10 xl:px-16 py-10 overflow-y-auto max-h-screen">
        <div className="m-auto w-full max-w-[400px]">
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <img
              src={HEI_BLUE_LOGO}
              alt="HEI"
              className="h-8 object-contain"
            />
            <span className="font-bold text-navy text-[15px] tracking-tight">
              HEI STDhub
            </span>
          </div>

          <header className="mb-8">
            <h2 className="font-fraunces text-[28px] sm:text-[32px] font-semibold text-navy leading-tight">
              {title}
              <span className="text-gold">.</span>
            </h2>
            <div className="text-gray-400 text-sm mt-2.5 leading-relaxed">
              {subtitle}
            </div>
          </header>

          {children}

          {footer && <div className="auth-foot">{footer}</div>}
        </div>
      </main>
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

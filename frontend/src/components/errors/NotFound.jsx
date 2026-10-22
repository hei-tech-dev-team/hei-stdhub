import STDHUB_LOGO from "../../assets/stdhub-logo-pwa.png";

export default function NotFound() {
  return (
    <section className="min-h-screen w-full bg-white flex items-center justify-center font-sans p-4 select-none">
      <div className="w-full max-w-md text-center">
        <img src={STDHUB_LOGO} alt="STDhub" className="w-14 h-14 object-contain mx-auto mb-6" />

        <h1 className="text-7xl sm:text-8xl font-bold text-navy leading-none tracking-tight">404</h1>

        <h3 className="text-xl sm:text-2xl font-bold text-navy mt-6 mb-2 tracking-tight">
          On dirait que vous êtes perdu
        </h3>
        <p className="text-gray-400 text-sm mb-8">
          La page que vous recherchez n'est pas disponible !
        </p>

        <a
          href="/"
          className="inline-block px-8 py-3 bg-navy text-white hover:bg-navy-dark transition-colors duration-200 font-medium text-sm rounded-xl"
        >
          Retourner à l'accueil
        </a>
      </div>
    </section>
  );
}

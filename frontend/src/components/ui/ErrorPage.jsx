import { RefreshCw, Home, AlertTriangle } from "lucide-react";

const ErrorPage = ({ 
  code = "503", 
  title = "Maintenance en cours", 
  message = "Le site est temporairement indisponible.", 
  estimatedTime = "30 minutes",
  showRetry = true 
}) => {
  const handleRefresh = () => window.location.reload();
  const handleGoHome = () => window.location.href = "/";

  return (
    <div className="min-h-screen bg-[#0A1428] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="glass-card rounded-3xl p-10 text-center border border-white/10 backdrop-blur-xl">
          <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-8">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
          </div>

          <h1 className="text-7xl font-bold text-white mb-2 tracking-tighter">{code}</h1>
          <h2 className="text-2xl font-semibold text-white mb-4">{title}</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">{message}</p>

          {estimatedTime && (
            <div className="inline-block bg-white/5 px-5 py-2 rounded-2xl text-sm text-amber-400 mb-8">
              Temps estimé : {estimatedTime}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {showRetry && (
              <button
                onClick={handleRefresh}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-all text-white py-3.5 rounded-2xl font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                Réessayer
              </button>
            )}
            
            <button
              onClick={handleGoHome}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 transition-all text-black py-3.5 rounded-2xl font-semibold"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
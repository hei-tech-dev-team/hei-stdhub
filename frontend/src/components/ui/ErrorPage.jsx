import { useEffect } from "react";
import { RefreshCw, Home, AlertTriangle, Bug } from "lucide-react";
import PropTypes from "prop-types";

/**
 * Reusable Error Page Component
 * Supports 404, 500, 503 (Maintenance) and future error codes
 */
const ErrorPage = ({
  code = "503",
  title = "Service Unavailable",
  message = "The service is temporarily unavailable.",
  estimatedTime = null,
  showRetry = true,
  showReportBug = false,
}) => {
  useEffect(() => {
    document.title = `${code} - HEI STDhub`;
  }, [code]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleReportBug = () => {
    window.open(
      "https://github.com/hei-tech-dev-team/hei-stdhub/issues/new",
      "_blank"
    );
  };

  // Dynamic icon and accent color based on error code
  const getErrorConfig = () => {
    switch (code) {
      case "404":
        return {
          icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
          accent: "amber",
        };
      case "500":
        return {
          icon: <Bug className="w-12 h-12 text-red-500" />,
          accent: "red",
        };
      default: // 503 Maintenance
        return {
          icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
          accent: "amber",
        };
    }
  };

  const { icon, accent } = getErrorConfig();

  return (
    <div className="min-h-screen bg-[#0A1428] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(at_center,#ffffff08_0%,transparent_70%)]" />

      <div className="max-w-md w-full relative z-10">
        <div className="glass-card rounded-3xl p-10 text-center border border-white/10 backdrop-blur-xl shadow-2xl">
          {/* Animated Icon */}
          <div
            className={`mx-auto w-20 h-20 bg-${accent}-500/10 rounded-2xl flex items-center justify-center mb-8 animate-pulse`}
          >
            {icon}
          </div>

          <h1 className="text-7xl font-bold text-white mb-2 tracking-tighter">
            {code}
          </h1>
          <h2 className="text-2xl font-semibold text-white mb-4">{title}</h2>

          <p className="text-gray-400 mb-8 leading-relaxed text-[15px]">
            {message}
          </p>

          {estimatedTime && (
            <div className="inline-block bg-white/5 px-5 py-2.5 rounded-2xl text-sm text-amber-400 mb-8 border border-white/10">
              ⏱️ Estimated time: <span className="font-medium">{estimatedTime}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {showRetry && (
              <button
                onClick={handleRefresh}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white py-3.5 rounded-2xl font-medium border border-white/10"
              >
                <RefreshCw className="w-5 h-5" />
                Retry
              </button>
            )}

            <button
              onClick={handleGoHome}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition-all text-black py-3.5 rounded-2xl font-semibold"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </button>
          </div>

          {showReportBug && (
            <button
              onClick={handleReportBug}
              className="mt-6 text-gray-500 hover:text-gray-400 text-sm flex items-center gap-1.5 mx-auto transition-colors"
            >
              <Bug className="w-4 h-4" />
              Report this issue
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-8">
          HEI STDhub © {new Date().getFullYear()} — Development Team
        </p>
      </div>
    </div>
  );
};

ErrorPage.propTypes = {
  code: PropTypes.string,
  title: PropTypes.string,
  message: PropTypes.string,
  estimatedTime: PropTypes.string,
  showRetry: PropTypes.bool,
  showReportBug: PropTypes.bool,
};

export default ErrorPage;
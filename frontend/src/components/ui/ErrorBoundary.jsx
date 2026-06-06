import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-500 text-2xl font-bold">!</span>
            </div>
            <h1 className="text-xl font-bold text-navy mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              L&apos;application a rencontre un probleme. Veuillez reessayer ou
              actualiser la page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-white transition"
                style={{
                  background: "linear-gradient(135deg, #0A1A33, #001948)",
                }}
              >
                Reessayer
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-2xl font-bold text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Actualiser
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

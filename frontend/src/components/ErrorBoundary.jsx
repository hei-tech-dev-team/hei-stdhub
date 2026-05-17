import React from "react";
import ErrorPage from "./ui/ErrorPage";

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 * and displays a graceful error page instead of crashing the app.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error("🚨 ErrorBoundary caught an error:", error, errorInfo);

    // TODO: In the future, send error to monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="500"
          title="Unexpected Error"
          message="Something went wrong while rendering the page. Please try refreshing."
          showRetry={true}
          showReportBug={true}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
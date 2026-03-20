import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    // Auto-recover for chunk loading errors (lazy import failures) — reload instead of re-render loop
    if (
      error.message?.includes("Loading chunk") ||
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Importing a module script failed")
    ) {
      console.warn("Chunk load error detected, reloading page...");
      window.location.reload();
      return;
    }
  }

  handleRetry = () => {
    this.setState((prev) => {
      // If errored too many times, do a full reload
      if (prev.errorCount >= 2) {
        window.location.reload();
        return prev;
      }
      return { hasError: false, errorCount: prev.errorCount + 1 };
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
          <div className="text-center space-y-4">
            <div className="text-4xl"></div>
            <h2 className="text-lg font-bold text-foreground">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-muted-foreground">يرجى إعادة المحاولة</p>
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 rounded-2xl gold-gradient text-white font-bold text-sm"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

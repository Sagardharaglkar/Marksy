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
    console.error("Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm w-full max-w-md px-8 py-10 flex flex-col items-center gap-5 text-center">
            <span className="text-3xl text-red-400">⚠</span>
            <div>
              <h1 className="font-head text-xl font-bold text-zinc-900 mb-1">Something went wrong</h1>
              <p className="text-sm text-zinc-500">An unexpected error occurred. Please refresh the page.</p>
            </div>
            {this.state.error && (
              <pre className="text-left text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 w-full overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-zinc-900 hover:bg-zinc-700 text-white font-mono text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

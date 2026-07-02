import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Global Error Boundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white px-4">
          <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-800/80 border border-red-500/30 shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-100">Something went wrong</h3>
              <p className="text-xs text-slate-400 font-mono bg-slate-950/40 p-3 rounded-lg text-left overflow-auto max-h-40 select-all leading-relaxed">
                {this.state.error?.message || 'An unexpected runtime error occurred.'}
              </p>
              <p className="text-sm text-slate-300">
                You can try recovering below without reloading the entire application.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-xl transition-all shadow-lg hover:shadow-teal-500/20 focus:outline-none active:scale-95"
              >
                Recover & Continue
              </button>
              <button
                onClick={() => typeof window !== 'undefined' && window.location.reload()}
                className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl transition-all border border-slate-600 focus:outline-none active:scale-95"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

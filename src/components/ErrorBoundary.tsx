import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application error caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && typeof parsed.error === 'string') {
          friendly = `Database access error (${parsed.operationType} on ${parsed.path || 'record'}): ${parsed.error}`;
        }
      } catch {
        // non-JSON error
      }

      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-neutral-200 rounded-xl p-8">
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-neutral-600 mb-6 leading-relaxed break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 text-sm font-medium text-white bg-[#111111] rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

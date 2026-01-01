/**
 * Error Boundary Component
 * Catches React errors and provides a user-friendly error UI with recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

// Helper to detect environment
const isDevelopment = () => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost');
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    console.error('ErrorBoundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const isDev = isDevelopment();

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Something went wrong</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                We're sorry, but something unexpected happened. Please try again or contact support if the issue persists.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error details (collapsible) - only in development */}
              {isDev && error && (
                <div className="border rounded-lg overflow-hidden">
                  <button
                    onClick={this.toggleDetails}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Bug className="w-4 h-4" />
                      Technical Details
                    </span>
                    {showDetails ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  
                  {showDetails && (
                    <div className="p-3 bg-gray-900 text-gray-100 overflow-auto max-h-48">
                      <p className="font-mono text-sm text-red-400 mb-2">
                        {error.name}: {error.message}
                      </p>
                      {errorInfo?.componentStack && (
                        <pre className="font-mono text-xs text-gray-400 whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </CardFooter>

            <div className="px-6 pb-4 text-center">
              <button
                onClick={this.handleReload}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Reload the page
              </button>
            </div>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * Functional wrapper for ErrorBoundary with hooks support
 */
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
};

/**
 * Hook to manually trigger error boundary
 */
export const useErrorHandler = () => {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
};

export default ErrorBoundary;

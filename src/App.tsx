/**
 * PSS Orange CRM - Main Application Component
 * Includes error boundary
 */

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { Loader2 } from "lucide-react";
import { verifyDatabaseIdentity } from "@/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/**
 * Loading spinner component
 */
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      <p className="text-gray-500">Loading...</p>
    </div>
  </div>
);

/**
 * Protected route wrapper - requires authentication
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.password_change_required) {
    return (
      <>
        {children}
        <ForcePasswordChange onPasswordChanged={() => window.location.reload()} />
      </>
    );
  }

  return <>{children}</>;
};

/**
 * Public route wrapper - redirects authenticated users
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Application routes
 */
const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/" element={<Index />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

/**
 * Main App component with all providers and error handling
 */
const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  useEffect(() => {
    verifyDatabaseIdentity()
      .then(() => {
        setIdentityVerified(true);
      })
      .catch((error) => {
        console.error('🚨 DATABASE IDENTITY VERIFICATION FAILED');
        setIdentityError(error.message);
      });
  }, []);

  if (identityError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="max-w-2xl bg-white rounded-lg shadow-lg p-8 border-2 border-red-500">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚨</span>
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-red-900 mb-4">
                Database Identity Verification Failed
              </h1>
              <pre className="bg-red-50 p-4 rounded text-sm text-red-800 whitespace-pre-wrap font-mono mb-4">
                {identityError}
              </pre>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-sm text-yellow-800 font-semibold mb-2">
                  ⚠️ Application Blocked for Safety
                </p>
                <p className="text-sm text-yellow-700">
                  This app will not operate on an unverified database to prevent data loss.
                  Follow the recovery steps above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!identityVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-gray-500">Verifying database identity...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AuthProvider>
                <PresenceProvider>
                  <AppProvider>
                    {showSplash && (
                      <SplashScreen onComplete={() => setShowSplash(false)} />
                    )}
                    <AppRoutes />
                  </AppProvider>
                </PresenceProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
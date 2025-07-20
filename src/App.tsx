import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  Routes,
  Route,
  useRoutes,
  useNavigate,
  useLocation,
} from "react-router-dom";

// Simple lazy loading without complex utilities
const Home = lazy(() => import("./components/home"));
const LoginPage = lazy(() => import("./components/auth/LoginPage"));
const PaymentsPage = lazy(() => import("./components/payments/PaymentsPage"));
const LandingPage = lazy(() => import("./components/LandingPage"));

// Simple loading component
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-500 animate-pulse" />
      <p className="text-white text-sm">جاري التحميل...</p>
    </div>
  </div>
);

// Component to handle initial routing logic
const InitialRouteHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleInitialRoute = () => {
      // Check if app is installed (PWA mode)
      const isInstalled = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

      // Check if user has visited landing page before
      const hasVisitedLanding = localStorage.getItem("hasVisitedLanding");

      // Check if user is already logged in
      const user = localStorage.getItem("user");
      let isLoggedIn = false;

      if (user) {
        try {
          const userData = JSON.parse(user);
          isLoggedIn = userData.loggedIn;
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("user");
        }
      }

      // If user is logged in, go to home
      if (isLoggedIn) {
        navigate("/home", { replace: true });
        setIsLoading(false);
        return;
      }

      // If app is installed, go directly to login
      if (isInstalled) {
        navigate("/login", { replace: true });
        setIsLoading(false);
        return;
      }

      // If first time visiting (browser), show landing page
      if (!hasVisitedLanding && location.pathname === "/") {
        navigate("/landing", { replace: true });
        setIsLoading(false);
        return;
      }

      // If already visited landing or direct URL access, go to login
      if (location.pathname === "/") {
        navigate("/login", { replace: true });
      }

      setIsLoading(false);
    };

    // Small delay to ensure proper initialization
    const timer = setTimeout(handleInitialRoute, 100);
    return () => clearTimeout(timer);
  }, [navigate, location.pathname]);

  if (isLoading) {
    return <PageLoader />;
  }

  return null;
};

function App() {
  // Try to render tempo routes if available
  let tempoRoutesElement = null;
  if (import.meta.env.VITE_TEMPO === "true") {
    try {
      const routes = require("tempo-routes").default || [];
      if (Array.isArray(routes) && routes.length > 0) {
        tempoRoutesElement = useRoutes(routes);
      }
    } catch (error) {
      // Silently handle tempo routes not being available
    }
  }

  // If tempo routes match, render them
  if (tempoRoutesElement) {
    return (
      <div className="min-h-screen bg-slate-900">{tempoRoutesElement}</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/payments" element={<PaymentsPage />} />

          {/* Tempo routes */}
          {import.meta.env.VITE_TEMPO === "true" && (
            <Route path="/tempobook/*" element={<div />} />
          )}

          {/* Default route with logic */}
          <Route path="/" element={<InitialRouteHandler />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;

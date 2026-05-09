import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireActivation?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireActivation = true 
}) => {
  const { user, loading, isOdooCustomer, isActivated, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-orange"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  // Admin check
  const isAdminPath = location.pathname.startsWith('/admin');
  if (isAdminPath && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (isAdmin) return <>{children}</>;

  // Customer checks
  if (requireActivation && !isActivated) {
    return <Navigate to="/pending-activation" replace />;
  }

  return <>{children}</>;
};

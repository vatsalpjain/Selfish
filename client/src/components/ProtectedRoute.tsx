import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-600 text-lg">Loading...</div>
            </div>
        );
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
}
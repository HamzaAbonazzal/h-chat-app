import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/common/Loader";

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  // ⭐ أثناء التحقق من التوكن، اعرض Loader
  if (loading) {
    return <Loader fullScreen />;
  }

  // ⭐ إذا لم يسجل دخوله، حوّله لصفحة الدخول
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
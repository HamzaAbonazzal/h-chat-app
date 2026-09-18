import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./ProtectedRoute";
import Loader from "../components/common/Loader";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const ChatPage = lazy(() => import("../pages/ChatPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader fullScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat/:conversationId?" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
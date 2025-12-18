import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import TrainingFundsRequest from "./pages/TrainingFundsRequest";

function AppRoutes() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    );
  }

  // If we get here without a user, the edge function should have redirected
  // This is just a fallback
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/training-funds-request" element={<TrainingFundsRequest />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  );
}

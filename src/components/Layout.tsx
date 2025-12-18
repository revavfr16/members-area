import { Link, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Layout() {
  const { user, isAdmin } = useUser();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-red-700 bg-red-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold tracking-tight hover:text-gray-200 transition-colors">
            Reva VFR 16 Members Area
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full ring-2 ring-slate-600"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="text-sm text-slate-100">{user?.name}</span>
              {isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                  Admin
                </span>
              )}
            </div>
            <a
              href="/.netlify/functions/logout"
              className="text-sm px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Sign out
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Outlet />
      </main>
    </div>
  );
}

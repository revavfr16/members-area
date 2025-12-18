import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface User {
  email: string;
  name: string;
  picture: string;
  sub: string;
  roles: string[];
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/.netlify/functions/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;
  const isAdmin = hasRole("admin");

  return (
    <UserContext.Provider value={{ user, loading, hasRole, isAdmin }}>
      {children}
    </UserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

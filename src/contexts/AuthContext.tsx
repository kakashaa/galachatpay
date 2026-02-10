import React, { createContext, useContext, useState, useEffect } from "react";

export interface GalaUser {
  id: number;
  uuid: string;
  name: string;
  phone: string;
  type_user: number;
  profile: {
    image: string;
    gender: number;
    birthday: string;
    age: number;
    country: string;
  };
  level: {
    receiver_level: number;
    sender_level: number;
    charger_level: number;
    receiver_num: number;
    sender_num: number;
    charger_num: number;
  };
  my_store: {
    coins: number;
    diamonds: number;
    usd: number;
  };
  vip: Record<string, unknown>;
  country: {
    id: number;
    name: string;
    flag: string;
  };
}

interface AuthContextType {
  user: GalaUser | null;
  setUser: (user: GalaUser | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GalaUser | null>(() => {
    const stored = localStorage.getItem("gala_user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("gala_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("gala_user");
    }
  }, [user]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("gala_user");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

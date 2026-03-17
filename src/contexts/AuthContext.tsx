import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserType } from "@/utils/userTypeResolver";

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
  salary?: number;
  agency_salary?: {
    amount_usd: number;
    cut: number;
    is_paid: number;
  };
  agency_accumulated_salary?: number;
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
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GalaUser | null>(() => {
    try {
      const stored = localStorage.getItem("gala_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      localStorage.removeItem("gala_user");
      return null;
    }
  });
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem("gala_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("gala_user");
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user?.uuid) return;
    const storedKey = localStorage.getItem("gala_session_key");
    if (!storedKey) return;
    try {
      const pw = atob(storedKey);
      const result = await supabase.functions.invoke("gala-login", {
        body: { uuid: user.uuid, password: pw },
      });
      const data = result.data;
      if (!data?.success || !data?.data) return;
      const apiUser = data.data;
      const levelData = typeof apiUser.level === "number"
        ? { receiver_level: apiUser.level, sender_level: 0, charger_level: 0, receiver_num: 0, sender_num: 0, charger_num: 0 }
        : {
            receiver_level: apiUser.level?.receiver_level || 0,
            sender_level: apiUser.level?.sender_level || 0,
            charger_level: apiUser.level?.charger_level || 0,
            receiver_num: apiUser.level?.receiver_num || 0,
            sender_num: apiUser.level?.sender_num || 0,
            charger_num: apiUser.level?.charger_num || 0,
          };
      const effectiveType = resolveUserType(apiUser.type_user, apiUser.agency);

      // Use functional updater to avoid stale closure
      setUser(prevUser => ({
        id: apiUser.id,
        uuid: apiUser.uuid,
        name: apiUser.name,
        phone: apiUser.phone || prevUser?.phone || "",
        type_user: effectiveType,
        profile: {
          image: apiUser.profile?.image || prevUser?.profile?.image || "",
          gender: apiUser.profile?.gender || apiUser.gender || prevUser?.profile?.gender || 0,
          birthday: apiUser.profile?.birthday || prevUser?.profile?.birthday || "",
          age: apiUser.profile?.age || prevUser?.profile?.age || 0,
          country: apiUser.country?.name || prevUser?.profile?.country || "",
        },
        level: levelData,
        my_store: {
          coins: apiUser.my_store?.coins ?? prevUser?.my_store?.coins ?? 0,
          diamonds: apiUser.my_store?.diamonds ?? prevUser?.my_store?.diamonds ?? 0,
          usd: apiUser.my_store?.usd ?? prevUser?.my_store?.usd ?? 0,
        },
        salary: apiUser.salary ?? prevUser?.salary,
        vip: apiUser.vip || prevUser?.vip || {},
        agency_salary: apiUser.agency_salary || prevUser?.agency_salary,
        agency_accumulated_salary: apiUser.agency_accumulated_salary ?? prevUser?.agency_accumulated_salary,
        country: {
          id: apiUser.country?.id ?? prevUser?.country?.id ?? 0,
          name: apiUser.country?.name || prevUser?.country?.name || "",
          flag: apiUser.country?.flag || prevUser?.country?.flag || "",
        },
      }));
    } catch {
      // silent
    }
  }, [user?.uuid]);

  // Auto-refresh every 3 minutes + on visibility change
  useEffect(() => {
    if (user?.uuid) {
      refreshTimerRef.current = setInterval(refreshUser, 3 * 60 * 1000);
      const handleVisible = () => {
        if (document.visibilityState === "visible") {
          refreshUser();
        }
      };
      document.addEventListener("visibilitychange", handleVisible);
      return () => {
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
        document.removeEventListener("visibilitychange", handleVisible);
      };
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [user?.uuid, refreshUser]);

  // Password verification - check every 30 seconds if password changed
  const verifyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verifyPassword = useCallback(async () => {
    if (!user?.uuid) return;
    const storedKey = localStorage.getItem("gala_session_key");
    if (!storedKey) return;
    
    try {
      const pw = atob(storedKey);
      const result = await supabase.functions.invoke("gala-login", {
        body: { uuid: user.uuid, password: pw },
      });
      const data = result.data;
      
      // If login fails (wrong password) and NOT blocked, force logout
      if (data && !data.success && !data.blocked) {
        console.log("Password changed, forcing logout");
        localStorage.removeItem("gala_session_key");
        localStorage.setItem("gala_force_logout_reason", "password_changed");
        logout();
      }
    } catch {
      // Network error - don't logout on connectivity issues
    }
  }, [user?.uuid]);

  useEffect(() => {
    if (user?.uuid) {
      verifyTimerRef.current = setInterval(verifyPassword, 30 * 1000);
      // Also verify on visibility change (when user comes back to app)
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          verifyPassword();
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        if (verifyTimerRef.current) clearInterval(verifyTimerRef.current);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }
    return () => {
      if (verifyTimerRef.current) clearInterval(verifyTimerRef.current);
    };
  }, [user?.uuid, verifyPassword]);

  const logout = () => {
    // Save current account to saved accounts list before clearing
    if (user) {
      try {
        const savedRaw = localStorage.getItem("gala_saved_accounts");
        const saved: Array<{ uuid: string; name: string; image: string }> = savedRaw ? JSON.parse(savedRaw) : [];
        const exists = saved.findIndex(a => a.uuid === user.uuid);
        const entry = { uuid: user.uuid, name: user.name, image: user.profile?.image || "" };
        if (exists >= 0) {
          saved[exists] = entry;
        } else {
          saved.unshift(entry);
        }
        // Keep max 5 accounts
        localStorage.setItem("gala_saved_accounts", JSON.stringify(saved.slice(0, 5)));
      } catch { /* ignore */ }
    }
    setUser(null);
    localStorage.removeItem("gala_user");
    localStorage.removeItem("gala_session_key");
    localStorage.removeItem("gala_avatar");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

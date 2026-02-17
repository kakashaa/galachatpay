import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BDUser {
  uuid: string;
  name: string;
  total_earnings: number;
  available_balance: number;
  supporters_count: number;
  hosts_count: number;
  agencies_count: number;
  supporters_charges: number;
  supporters_commission: number;
  hosts_salary_closed: number;
  hosts_bonus: number;
  agencies_hosts_closed: number;
  agencies_bonus: number;
  supporters: any[];
  hosts: any[];
  agencies: any[];
  withdrawals: any[];
}

interface BDContextType {
  bdUser: BDUser | null;
  loading: boolean;
  error: string;
  login: (uuid: string) => Promise<boolean>;
  register: (uuid: string, name: string) => Promise<{ success: boolean; error?: string }>;
  refreshDashboard: () => Promise<void>;
  addMember: (memberUuid: string, memberType: string) => Promise<{ success: boolean; error?: string; name?: string }>;
  sendInvitation: (memberUuid: string, memberType: string) => Promise<{ success: boolean; error?: string; name?: string }>;
  withdraw: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const BDContext = createContext<BDContextType | undefined>(undefined);

async function callApi(action: string, params: Record<string, string> = {}) {
  const { data, error } = await supabase.functions.invoke("bd-referral", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  return data;
}

export const BDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bdUser, setBdUser] = useState<BDUser | null>(() => {
    const stored = localStorage.getItem("bd_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const saveBdUser = (user: BDUser | null) => {
    setBdUser(user);
    if (user) localStorage.setItem("bd_user", JSON.stringify(user));
    else localStorage.removeItem("bd_user");
  };

  const login = useCallback(async (uuid: string): Promise<boolean> => {
    setLoading(true);
    setError("");
    try {
      const data = await callApi("dashboard", { uuid });
      if (!data?.success && !data?.ok) {
        setError(data?.error || "الحساب غير موجود");
        setLoading(false);
        return false;
      }
      // Map external API response (ok/bidi format) to our BDUser format
      const apiData = data?.data || data;
      const bidi = apiData?.bidi || {};
      const mapped: BDUser = {
        uuid,
        name: bidi.name || apiData?.name || uuid,
        total_earnings: bidi.total_earned || 0,
        available_balance: bidi.balance_coins || 0,
        supporters_count: apiData?.supporters?.count || 0,
        hosts_count: apiData?.hosts?.count || 0,
        agencies_count: apiData?.agencies?.count || 0,
        supporters_charges: apiData?.supporters?.total_commission || 0,
        supporters_commission: apiData?.supporters?.total_commission || 0,
        hosts_salary_closed: apiData?.hosts?.closed_count || 0,
        hosts_bonus: apiData?.hosts?.total_bonus || 0,
        agencies_hosts_closed: 0,
        agencies_bonus: apiData?.agencies?.total_bonus_coins || 0,
        supporters: apiData?.supporters?.list || [],
        hosts: apiData?.hosts?.list || [],
        agencies: apiData?.agencies?.list || [],
        withdrawals: apiData?.withdrawals || [],
      };
      saveBdUser(mapped);
      setLoading(false);
      return true;
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
      setLoading(false);
      return false;
    }
  }, []);

  const register = useCallback(async (uuid: string, name: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await callApi("register_bidi", { uuid, name });
      setLoading(false);
      if (!data?.success) return { success: false, error: data?.error || "فشل التسجيل" };
      return { success: true };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message };
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (!bdUser?.uuid) return;
    setLoading(true);
    try {
      const data = await callApi("dashboard", { uuid: bdUser.uuid });
      if (data?.success || data?.ok) {
        const apiData = data?.data || data;
        const bidi = apiData?.bidi || {};
        saveBdUser({
          uuid: bdUser.uuid,
          name: bidi.name || apiData?.name || bdUser.name,
          total_earnings: bidi.total_earned || 0,
          available_balance: bidi.balance_coins || 0,
          supporters_count: apiData?.supporters?.count || 0,
          hosts_count: apiData?.hosts?.count || 0,
          agencies_count: apiData?.agencies?.count || 0,
          supporters_charges: apiData?.supporters?.total_commission || 0,
          supporters_commission: apiData?.supporters?.total_commission || 0,
          hosts_salary_closed: apiData?.hosts?.closed_count || 0,
          hosts_bonus: apiData?.hosts?.total_bonus || 0,
          agencies_hosts_closed: 0,
          agencies_bonus: apiData?.agencies?.total_bonus_coins || 0,
          supporters: apiData?.supporters?.list || [],
          hosts: apiData?.hosts?.list || [],
          agencies: apiData?.agencies?.list || [],
          withdrawals: apiData?.withdrawals || [],
        });
      } else {
        // BD not found on server - clear local data
        saveBdUser(null);
        throw new Error("BD not found");
      }
    } catch (e) {
      setLoading(false);
      throw e;
    }
    setLoading(false);
  }, [bdUser?.uuid]);

  const addMember = useCallback(async (memberUuid: string, memberType: string) => {
    if (!bdUser?.uuid) return { success: false, error: "غير مسجل" };
    setLoading(true);
    try {
      const data = await callApi("add_member", {
        bidi_uuid: bdUser.uuid,
        member_uuid: memberUuid,
        member_type: memberType,
      });
      setLoading(false);
      if (!data?.success) return { success: false, error: data?.error || "فشل الإضافة" };
      return { success: true, name: data?.name };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message };
    }
  }, [bdUser?.uuid]);

  const withdraw = useCallback(async () => {
    if (!bdUser?.uuid) return { success: false, error: "غير مسجل" };
    setLoading(true);
    try {
      const data = await callApi("withdraw", { uuid: bdUser.uuid });
      setLoading(false);
      if (!data?.success) return { success: false, error: data?.error || "فشل السحب" };
      return { success: true };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message };
    }
  }, [bdUser?.uuid]);

  const sendInvitation = useCallback(async (memberUuid: string, memberType: string) => {
    if (!bdUser?.uuid) return { success: false, error: "غير مسجل" };
    setLoading(true);
    try {
      const data = await callApi("send_invitation", {
        bd_uuid: bdUser.uuid,
        bd_name: bdUser.name,
        bd_referral_code: "",
        member_uuid: memberUuid,
        member_type: memberType,
      });
      setLoading(false);
      if (!data?.success) return { success: false, error: data?.error || "فشل إرسال الدعوة" };
      return { success: true, name: data?.name };
    } catch (e: any) {
      setLoading(false);
      return { success: false, error: e.message };
    }
  }, [bdUser?.uuid, bdUser?.name]);

  const logout = useCallback(() => {
    saveBdUser(null);
  }, []);

  return (
    <BDContext.Provider value={{ bdUser, loading, error, login, register, refreshDashboard, addMember, sendInvitation, withdraw, logout }}>
      {children}
    </BDContext.Provider>
  );
};

export const useBD = () => {
  const ctx = useContext(BDContext);
  if (!ctx) throw new Error("useBD must be inside BDProvider");
  return ctx;
};

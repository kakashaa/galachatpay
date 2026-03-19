import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SupportMessage {
  id: string;
  session_id: string;
  sender_uuid: string;
  sender_name: string;
  sender_type: string;
  message: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

interface SupportSession {
  id: string;
  user_uuid: string;
  user_name: string;
  support_level: number;
  request_type?: string;
  assigned_admin?: string;
  assigned_admin_name?: string;
  status: string;
  escalation_level: number;
  room_name?: string;
  notes?: string;
  admin_note?: string;
  created_at: string;
  resolved_at?: string;
}

export function useSupportSession(sessionId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [session, setSession] = useState<SupportSession | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data } = await supabase
        .from("support_session_messages" as any)
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as any);
    } catch (err) {
      console.error("fetchMessages error:", err);
    }
  }, [sessionId]);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data } = await supabase
        .from("support_sessions" as any)
        .select("*")
        .eq("id", sessionId)
        .single();
      if (data) setSession(data as any);
    } catch (err) {
      console.error("fetchSession error:", err);
    }
  }, [sessionId]);

  // Initial load + polling
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    Promise.all([fetchMessages(), fetchSession()]).finally(() => setLoading(false));

    pollRef.current = setInterval(() => {
      fetchMessages();
      fetchSession();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, fetchMessages, fetchSession]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`support_session_${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_session_messages",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === (payload.new as any).id)) return prev;
          return [...prev, payload.new as SupportMessage];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "support_sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSession(payload.new as SupportSession);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const sendMessage = useCallback(async (
    senderUuid: string,
    senderName: string,
    senderType: string,
    message: string,
    attachmentUrl?: string
  ) => {
    if (!sessionId) return;
    await supabase.functions.invoke("support-system", {
      body: {
        action: "send_message",
        session_id: sessionId,
        sender_uuid: senderUuid,
        sender_name: senderName,
        sender_type: senderType,
        message,
        attachment_url: attachmentUrl,
      },
    });
  }, [sessionId]);

  return { messages, session, loading, sendMessage, refetch: fetchMessages };
}

export async function startSupportSession(params: {
  user_uuid: string;
  user_name: string;
  support_level: number;
  request_type?: string;
  notes?: string;
  file_url?: string;
  file_type?: string;
}): Promise<SupportSession | null> {
  const { data, error } = await supabase.functions.invoke("support-system", {
    body: { action: "start_session", ...params },
  });
  if (error) throw error;
  return data?.data || null;
}

export async function getOnDutyAdmin(roleType: string = "admin") {
  const { data } = await supabase.functions.invoke("support-system", {
    body: { action: "get_on_duty", role_type: roleType },
  });
  return data?.data || null;
}

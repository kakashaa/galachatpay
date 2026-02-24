import { useState, useEffect, useRef, useCallback } from "react";
import { Headphones, X, Send, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = "https://hola-chat.com/support-chat-api.php";

interface Message {
  id: number;
  message: string;
  sender_type: "user" | "admin" | "system";
  sender_name: string;
  created_at: string;
}

export default function FloatingSupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [chatKey, setChatKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState(false);
  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Start or resume chat
  const startChat = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setEnded(false);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "start",
          user_uuid: user.uuid,
          user_name: user.name,
          chat_type: "normal",
        }),
      });
      const data = await res.json();
      if (data.chat_key) {
        setChatKey(data.chat_key);
        lastIdRef.current = 0;
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to start chat:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send message
  const sendMessage = async () => {
    if (!chatKey || !input.trim() || !user) return;
    const text = input.trim();
    setInput("");
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: "send",
          chat_key: chatKey,
          message: text,
          sender_type: "user",
          sender_name: user.name,
        }),
      });
    } catch (e) {
      console.error("Failed to send:", e);
    }
  };

  // End chat
  const endChat = async () => {
    if (!chatKey) return;
    setEnding(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "end", chat_key: chatKey }),
      });
      setChatKey(null);
      setMessages([]);
      lastIdRef.current = 0;
      setEnded(true);
    } catch (e) {
      console.error("Failed to end chat:", e);
    } finally {
      setEnding(false);
    }
  };

  // Poll messages
  useEffect(() => {
    if (!chatKey || !open) return;
    const poll = async () => {
      try {
        const res = await fetch(
          `${API_URL}?action=messages&chat_key=${chatKey}&after_id=${lastIdRef.current}`
        );
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => [...prev, ...data.messages]);
          lastIdRef.current = data.messages[data.messages.length - 1].id;
        }
        // Check if chat was ended by admin
        if (data.status === "ended" || data.chat_status === "ended") {
          setChatKey(null);
          setEnded(true);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              message: "تم إنهاء المحادثة",
              sender_type: "system",
              sender_name: "النظام",
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [chatKey, open]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-start on open
  useEffect(() => {
    if (open && !chatKey && !ended && user) startChat();
  }, [open, chatKey, ended, user, startChat]);

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 left-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform animate-pulse"
          aria-label="الدعم الفني"
        >
          <Headphones size={26} />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-16 left-3 right-3 z-50 max-w-sm mx-auto flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: "min(480px, 70vh)" }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Headphones size={20} />
              <span className="font-bold text-sm">الدعم الفني</span>
            </div>
            <div className="flex items-center gap-1">
              {chatKey && (
                <button
                  onClick={endChat}
                  disabled={ending}
                  className="p-1.5 rounded-full hover:bg-white/20 transition"
                  title="إنهاء المحادثة"
                >
                  <LogOut size={18} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
            {loading && (
              <div className="text-center text-muted-foreground text-xs py-8">
                جاري الاتصال...
              </div>
            )}

            {ended && !chatKey && (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-muted-foreground text-sm">تم إنهاء المحادثة</p>
                <button
                  onClick={() => { setEnded(false); startChat(); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  محادثة جديدة
                </button>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.sender_type === "system") {
                return (
                  <div key={msg.id} className="text-center">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {msg.message}
                    </span>
                  </div>
                );
              }
              const isUser = msg.sender_type === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      isUser
                        ? "bg-green-600 text-white rounded-bl-sm"
                        : "bg-card border border-border text-foreground rounded-br-sm"
                    }`}
                  >
                    {!isUser && (
                      <div className="text-[10px] text-muted-foreground mb-0.5 font-medium">
                        {msg.sender_name}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {chatKey && (
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2 p-2 border-t border-border bg-card"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك..."
                className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus:border-primary transition"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

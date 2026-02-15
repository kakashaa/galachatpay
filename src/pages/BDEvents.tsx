import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle, User, ShieldAlert, Crown, Sparkles, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { userTypeLabels } from "@/utils/userTypeResolver";
import galaLogo from "@/assets/gala-logo.png";

const DEVICE_EVENT_KEY = "bd_event_device_registered";

/* ── countdown helper ── */
const useCountdown = (targetDate: string | null) => {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return time;
};

const pad = (n: number) => String(n).padStart(2, "0");

const BDEvents: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bdName, setBdName] = useState("");
  const [uuid, setUuid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const activeEvent = events.find((e) => e.id === selectedEvent) || events[0];
  const countdown = useCountdown(activeEvent?.event_date || null);

  useEffect(() => {
    const registered = localStorage.getItem(DEVICE_EVENT_KEY);
    if (registered) setDeviceBlocked(true);
    loadEvents();
  }, [code]);

  const loadEvents = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const { data: bdSettings } = await supabase
        .from("bd_commission_settings")
        .select("bd_uuid, bd_name")
        .eq("referral_code", code)
        .single();
      if (!bdSettings) { setLoading(false); return; }
      setBdName(bdSettings.bd_name);
      const { data: eventsData } = await supabase
        .from("bd_events")
        .select("*")
        .eq("bd_uuid", bdSettings.bd_uuid)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setEvents(eventsData || []);
      if (eventsData?.length) setSelectedEvent(eventsData[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    const memberUuid = uuid.trim();
    if (!memberUuid) { setError("أدخل آيدي حسابك في غلا لايف"); return; }
    if (!code) { setError("رمز غير صالح"); return; }
    setSubmitting(true); setError("");
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("bd-manage", {
        body: { action: "register_referral", referral_code: code, member_uuid: memberUuid },
      });
      if (invokeErr) throw invokeErr;
      if (data?.success) {
        if (selectedEvent) {
          const { data: bd } = await supabase.from("bd_commission_settings").select("bd_uuid").eq("referral_code", code).single();
          if (bd) await supabase.from("bd_event_registrations").insert({ event_id: selectedEvent, bd_uuid: bd.bd_uuid, user_uuid: memberUuid, user_name: data.data?.member_name || memberUuid, user_type: data.data?.type_user || 0 });
        }
        localStorage.setItem(DEVICE_EVENT_KEY, memberUuid);
        setResult(data.data);
        toast.success("تم التسجيل بنجاح!");
      } else { setError(data?.error || "فشل التسجيل"); }
    } catch (e: any) { setError(e.message || "خطأ في الاتصال"); }
    finally { setSubmitting(false); }
  };

  /* ── Device blocked ── */
  if (deviceBlocked) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center px-6 relative overflow-hidden" dir="rtl">
        <Stars />
        <div className="w-full max-w-sm space-y-6 text-center relative z-10">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <ShieldAlert className="w-16 h-16 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">تم التسجيل مسبقاً</h2>
          <p className="text-sm text-gray-400">تم تسجيل حساب من هذا الجهاز مسبقاً.</p>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (result) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center px-6 relative overflow-hidden" dir="rtl">
        <Stars />
        <div className="w-full max-w-sm space-y-6 text-center relative z-10">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-amber-300">تم تسجيلك بنجاح!</h2>
          <div className="bg-white/5 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-4 space-y-3 text-right">
            <InfoRow label="الاسم" value={result.member_name || uuid} />
            <InfoRow label="نوع الحساب" value={userTypeLabels[result.type_user] || "مستخدم عادي"} accent />
            <InfoRow label="BD" value={result.bd_name} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Main ── */
  return (
    <div className="min-h-screen bg-[#0a0a1a] relative overflow-hidden" dir="rtl">
      <Stars />

      {/* Golden gradient overlay */}
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-amber-900/30 via-amber-900/10 to-transparent pointer-events-none" />

      {/* Diagonal gold lines */}
      <div className="absolute top-0 left-1/4 w-px h-48 bg-gradient-to-b from-amber-500/40 to-transparent rotate-[30deg] origin-top" />
      <div className="absolute top-0 right-1/4 w-px h-48 bg-gradient-to-b from-amber-500/40 to-transparent -rotate-[30deg] origin-top" />

      <div className="relative z-10 flex flex-col items-center px-4 pt-8 pb-12">
        {/* Header */}
        <p className="text-amber-500/80 text-xs tracking-[0.3em] uppercase font-medium mb-1">
          BD EVENT
        </p>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 mb-1 text-center">
          {activeEvent?.title || "أحداث BD"}
        </h1>
        <p className="text-gray-400 text-sm mb-6">{bdName || "غلا لايف"}</p>

        {/* Crown circle */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full border-2 border-amber-500/40 flex items-center justify-center bg-gradient-to-b from-amber-900/20 to-transparent">
            <Crown className="w-16 h-16 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
          </div>
          {/* Decorative dots */}
          <span className="absolute top-2 left-1/2 w-2 h-2 rounded-full bg-red-400" />
          <span className="absolute bottom-8 left-4 w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="absolute bottom-8 right-4 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="absolute bottom-1 left-1/2 w-1 h-1 rounded-full bg-white/60" />
        </div>

        {/* Countdown timer */}
        {activeEvent?.event_date && (
          <div className="flex items-center gap-1.5 mb-8">
            <CountdownBox value={pad(countdown.days)[0]} />
            <CountdownBox value={pad(countdown.days)[1]} />
            <span className="text-gray-400 text-xs mx-1">Days</span>
            <CountdownBox value={pad(countdown.hours)[0]} />
            <CountdownBox value={pad(countdown.hours)[1]} />
            <span className="text-amber-400 text-lg font-bold">:</span>
            <CountdownBox value={pad(countdown.minutes)[0]} />
            <CountdownBox value={pad(countdown.minutes)[1]} />
            <span className="text-amber-400 text-lg font-bold">:</span>
            <CountdownBox value={pad(countdown.seconds)[0]} />
            <CountdownBox value={pad(countdown.seconds)[1]} />
          </div>
        )}

        {/* Event description */}
        {activeEvent?.description && (
          <p className="text-gray-300 text-sm text-center max-w-xs mb-6 leading-relaxed">
            {activeEvent.description}
          </p>
        )}

        {/* Events selector (if multiple) */}
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-amber-400 my-8" />
        ) : events.length > 1 && (
          <div className="w-full max-w-sm space-y-2 mb-6">
            <p className="text-xs text-gray-400 text-center mb-2">اختر الحدث</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    selectedEvent === ev.id
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/30"
                      : "bg-white/5 border border-white/10 text-gray-300 hover:border-amber-500/40"
                  }`}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Registration card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/5 backdrop-blur-md border border-amber-500/20 rounded-3xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">سجّل الآن للتعاون</h3>
              <p className="text-[11px] text-gray-400">أدخل آيدي حسابك في غلا لايف للانضمام</p>
            </div>

            <div className="space-y-3">
              <Input
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                placeholder="أدخل آيدي حسابك"
                className="text-center font-mono text-sm bg-black/30 border-white/10 text-white placeholder:text-gray-500 h-12 rounded-xl"
                dir="ltr"
              />

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={submitting || !uuid.trim()}
                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                تسجيل
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center gap-2">
          <img src={galaLogo} alt="Gala" className="w-6 h-6 rounded-lg" />
          <span className="text-[10px] text-gray-500">Gala Live • BD Partner</span>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const CountdownBox = ({ value }: { value: string }) => (
  <div className="w-9 h-11 rounded-lg bg-[#1a1a3a] border border-amber-500/20 flex items-center justify-center">
    <span className="text-amber-300 text-lg font-bold font-mono">{value}</span>
  </div>
);

const InfoRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-400">{label}</span>
    <span className={`font-bold ${accent ? "text-amber-400" : "text-white"}`}>{value}</span>
  </div>
);

const Stars = () => (
  <>
    {Array.from({ length: 30 }).map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white/40 animate-pulse"
        style={{
          width: `${Math.random() * 2 + 1}px`,
          height: `${Math.random() * 2 + 1}px`,
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${Math.random() * 2 + 2}s`,
        }}
      />
    ))}
  </>
);

export default BDEvents;

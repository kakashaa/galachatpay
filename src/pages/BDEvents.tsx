import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, CheckCircle, Loader2, AlertCircle, User, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { userTypeLabels } from "@/utils/userTypeResolver";
import galaLogo from "@/assets/gala-logo.png";

const DEVICE_EVENT_KEY = "bd_event_device_registered";

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

  useEffect(() => {
    const registered = localStorage.getItem(DEVICE_EVENT_KEY);
    if (registered) setDeviceBlocked(true);
    loadEvents();
  }, [code]);

  const loadEvents = async () => {
    if (!code) return;
    setLoading(true);
    try {
      // Get BD info from referral code
      const { data: bdSettings } = await supabase
        .from("bd_commission_settings")
        .select("bd_uuid, bd_name")
        .eq("referral_code", code)
        .single();

      if (!bdSettings) { setLoading(false); return; }
      setBdName(bdSettings.bd_name);

      // Get active events for this BD
      const { data: eventsData } = await supabase
        .from("bd_events")
        .select("*")
        .eq("bd_uuid", bdSettings.bd_uuid)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setEvents(eventsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const memberUuid = uuid.trim();
    if (!memberUuid) { setError("أدخل آيدي حسابك في غلا لايف"); return; }
    if (!code) { setError("رمز غير صالح"); return; }

    setSubmitting(true);
    setError("");
    try {
      // Register via BD referral system
      const { data, error: invokeErr } = await supabase.functions.invoke("bd-manage", {
        body: { action: "register_referral", referral_code: code, member_uuid: memberUuid },
      });
      if (invokeErr) throw invokeErr;

      if (data?.success) {
        // Also register in event if selected
        if (selectedEvent) {
          const bdSettings = await supabase
            .from("bd_commission_settings")
            .select("bd_uuid")
            .eq("referral_code", code)
            .single();

          if (bdSettings.data) {
            await supabase.from("bd_event_registrations").insert({
              event_id: selectedEvent,
              bd_uuid: bdSettings.data.bd_uuid,
              user_uuid: memberUuid,
              user_name: data.data?.member_name || memberUuid,
              user_type: data.data?.type_user || 0,
            });
          }
        }

        localStorage.setItem(DEVICE_EVENT_KEY, memberUuid);
        setResult(data.data);
        toast.success("تم التسجيل بنجاح!");
      } else {
        setError(data?.error || "فشل التسجيل");
      }
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  // Device blocked
  if (deviceBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم التسجيل مسبقاً</h2>
          <p className="text-sm text-muted-foreground">تم تسجيل حساب من هذا الجهاز مسبقاً.</p>
        </div>
      </div>
    );
  }

  // Success
  if (result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={galaLogo} alt="Gala" className="w-16 h-16 mx-auto rounded-2xl" />
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم تسجيلك بنجاح!</h2>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3 text-right">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-bold text-foreground">{result.member_name || uuid}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">نوع الحساب</span>
              <span className="font-bold text-primary">{userTypeLabels[result.type_user] || "مستخدم عادي"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BD</span>
              <span className="font-bold text-foreground">{result.bd_name}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">شكراً لتسجيلك في الحدث</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src={galaLogo} alt="Gala" className="w-14 h-14 mx-auto rounded-2xl" />
          <h1 className="text-xl font-bold text-foreground">أحداث {bdName || "BD"}</h1>
          <p className="text-xs text-muted-foreground">
            اختر حدثاً وأدخل آيدي حسابك للتسجيل والتعاون
          </p>
        </div>

        {/* Events list */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-2xl">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد أحداث حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
                className={`w-full text-right p-4 rounded-2xl border transition-all ${
                  selectedEvent === event.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedEvent === event.id ? "bg-primary/20" : "bg-muted/30"
                  }`}>
                    <Sparkles className={`w-5 h-5 ${selectedEvent === event.id ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                    )}
                    {event.event_date && (
                      <p className="text-[10px] text-primary mt-1">
                        📅 {new Date(event.event_date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  {selectedEvent === event.id && (
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Registration form */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-sm font-bold text-foreground text-center">
            أدخل آيدي حسابك للتسجيل
          </p>
          <div className="space-y-2">
            <Input
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              placeholder="أدخل آيدي حسابك في غلا لايف"
              className="text-center font-mono text-sm"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button onClick={handleRegister} disabled={submitting || !uuid.trim()} className="w-full gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            تسجيل
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BDEvents;

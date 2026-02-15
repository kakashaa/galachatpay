import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Loader2, CalendarDays, Users, ToggleLeft, ToggleRight } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BDEventManage: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");

  useEffect(() => {
    if (!authUser?.uuid) { navigate("/dashboard"); return; }
    loadEvents();
  }, [authUser?.uuid]);

  const loadEvents = async () => {
    if (!authUser?.uuid) return;
    setLoading(true);
    const { data } = await supabase
      .from("bd_events")
      .select("*, bd_event_registrations(count)")
      .eq("bd_uuid", authUser.uuid)
      .order("created_at", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  };

  const createEvent = async () => {
    if (!title.trim()) { toast.error("أدخل عنوان الحدث"); return; }
    if (!authUser?.uuid) return;
    setSaving(true);
    const { error } = await supabase.from("bd_events").insert({
      bd_uuid: authUser.uuid,
      bd_name: authUser.name || "",
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate || null,
    });
    if (error) { toast.error("فشل إنشاء الحدث"); }
    else {
      toast.success("تم إنشاء الحدث");
      setTitle(""); setDescription(""); setEventDate(""); setShowForm(false);
      loadEvents();
    }
    setSaving(false);
  };

  const toggleEvent = async (id: string, currentActive: boolean) => {
    await supabase.from("bd_events").update({ is_active: !currentActive }).eq("id", id);
    loadEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("bd_events").delete().eq("id", id);
    toast.success("تم حذف الحدث");
    loadEvents();
  };

  return (
    <MobileLayout showHeader headerTitle="إدارة الأحداث" onBack={() => navigate("/bd/info")}>
      <div className="px-4 py-4 space-y-4" dir="rtl">
        {/* Add event button */}
        <Button onClick={() => setShowForm(!showForm)} variant="outline" className="w-full gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "إلغاء" : "إضافة حدث جديد"}
        </Button>

        {/* Create form */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الحدث *"
              className="text-sm"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف الحدث (اختياري)"
              className="text-sm min-h-[60px]"
            />
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="text-sm"
            />
            <Button onClick={createEvent} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إنشاء
            </Button>
          </div>
        )}

        {/* Events list */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد أحداث بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const regCount = event.bd_event_registrations?.[0]?.count || 0;
              return (
                <div key={event.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleEvent(event.id, event.is_active)}
                      >
                        {event.is_active
                          ? <ToggleRight className="w-5 h-5 text-green-500" />
                          : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteEvent(event.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{regCount} مسجل</span>
                    </div>
                    {event.event_date && (
                      <span>📅 {new Date(event.event_date).toLocaleDateString("ar-EG")}</span>
                    )}
                    <span className={event.is_active ? "text-green-500" : "text-muted-foreground"}>
                      {event.is_active ? "نشط" : "متوقف"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default BDEventManage;

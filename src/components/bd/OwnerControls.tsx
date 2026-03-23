import React, { useState } from "react";
import { Shield, UserPlus, Percent, Snowflake, Ban, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfirmModal } from "@/hooks/use-confirm-modal";

interface OwnerControlsProps {
  /** "works" or "bd" system */
  system: "works" | "bd";
  /** works_id or bd_uuid depending on system */
  accountId: string;
  onRefresh: () => void;
}

type ActionType = "manual_add" | "edit_pct" | "freeze_member" | "freeze_user" | null;

const OwnerControls: React.FC<OwnerControlsProps> = ({ system, accountId, onRefresh }) => {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [action, setAction] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);

  // Manual add
  const [addUuid, setAddUuid] = useState("");
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<"supporter" | "agent">("supporter");
  const [addAgencyId, setAddAgencyId] = useState("");

  // Edit %
  const [editUuid, setEditUuid] = useState("");
  const [editPct, setEditPct] = useState("");

  // Freeze
  const [freezeUuid, setFreezeUuid] = useState("");

  const resetFields = () => {
    setAddUuid(""); setAddName(""); setAddType("supporter"); setAddAgencyId("");
    setEditUuid(""); setEditPct("");
    setFreezeUuid("");
  };

  const handleManualAdd = async () => {
    if (!addUuid.trim()) { toast.error("أدخل UUID"); return; }
    const ok = await confirm({
      title: "إضافة يدوية (Owner)",
      message: `إضافة ${addUuid} كـ ${addType === "supporter" ? "داعم" : "وكيل"} بدون تحقق؟`,
      danger: true,
      confirmText: "إضافة",
    });
    if (!ok) return;

    setLoading(true);
    try {
      if (system === "works") {
        const payload: Record<string, unknown> = {
          works_id: accountId,
          member_uuid: addUuid.trim(),
          member_name: addName.trim() || "عضو يدوي",
          member_type: addType,
          status: "active",
        };
        if (addType === "agent" && addAgencyId) payload.agency_id = addAgencyId.trim();
        await (supabase.from("works_members") as any).insert(payload);
      } else {
        // BD system also uses works_members now
        await (supabase.from("works_members") as any).insert({
          works_id: accountId,
          member_uuid: addUuid.trim(),
          member_name: addName.trim() || "عضو يدوي",
          member_type: addType,
          status: "active",
        });
      }
      toast.success("تمت الإضافة بنجاح");
      setAction(null);
      resetFields();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "العضو موجود بالفعل" : "فشلت الإضافة");
    }
    setLoading(false);
  };

  const handleEditPct = async () => {
    if (!editUuid.trim() || !editPct) { toast.error("أدخل البيانات"); return; }
    const pct = parseFloat(editPct);
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("نسبة غير صحيحة"); return; }
    const ok = await confirm({
      title: "تعديل النسبة (Owner)",
      message: `تغيير نسبة عمولة ${editUuid} إلى ${pct}%؟`,
      danger: false,
      confirmText: "تعديل",
    });
    if (!ok) return;

    setLoading(true);
    try {
      const table = system === "works" ? "works_members" : "works_members";
      const { error } = await (supabase.from(table) as any)
        .update({ custom_commission_pct: pct })
        .eq("member_uuid", editUuid.trim())
        .eq("works_id", accountId);
      if (error) throw error;
      toast.success(`تم تعديل النسبة إلى ${pct}%`);
      setAction(null);
      resetFields();
      onRefresh();
    } catch {
      toast.error("فشل التعديل");
    }
    setLoading(false);
  };

  const handleFreezeMember = async () => {
    if (!freezeUuid.trim()) { toast.error("أدخل UUID"); return; }
    const ok = await confirm({
      title: "تجميد عضو (Owner)",
      message: `تجميد كوينزات/حساب البيدي للعضو ${freezeUuid}؟\nلن يتمكن من السحب.`,
      danger: true,
      confirmText: "تجميد",
    });
    if (!ok) return;

    setLoading(true);
    try {
      if (system === "works") {
        await (supabase.from("works_members") as any)
          .update({ status: "frozen" })
          .eq("member_uuid", freezeUuid.trim())
          .eq("works_id", accountId);
      } else {
        await (supabase.from("works_members") as any)
          .update({ status: "frozen" })
          .eq("member_uuid", freezeUuid.trim())
          .eq("works_id", accountId);
      }
      toast.success("تم تجميد العضو");
      setAction(null);
      resetFields();
      onRefresh();
    } catch {
      toast.error("فشل التجميد");
    }
    setLoading(false);
  };

  const handleFreezeUser = async () => {
    if (!freezeUuid.trim()) { toast.error("أدخل UUID"); return; }
    const ok = await confirm({
      title: "تجميد حساب مستخدم (Owner)",
      message: `تجميد جميع خدمات المستخدم ${freezeUuid}؟\nلن يتمكن من استخدام أي خدمة.`,
      danger: true,
      confirmText: "تجميد الحساب",
    });
    if (!ok) return;

    setLoading(true);
    try {
      // Insert a service freeze record
      await supabase.from("manual_bans").insert({
        target_uuid: freezeUuid.trim(),
        ban_type: "service_freeze",
        banned_by: "naz",
        reason: "تجميد يدوي من المالك",
        duration_hours: 8760, // 1 year
        status: "active",
      });
      toast.success("تم تجميد حساب المستخدم");
      setAction(null);
      resetFields();
    } catch {
      toast.error("فشل التجميد");
    }
    setLoading(false);
  };

  const actions = [
    { id: "manual_add" as const, icon: UserPlus, label: "إضافة يدوية", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { id: "edit_pct" as const, icon: Percent, label: "تعديل النسبة", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { id: "freeze_member" as const, icon: Snowflake, label: "تجميد عضو", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { id: "freeze_user" as const, icon: Ban, label: "تجميد حساب", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  ];

  return (
    <>
      <div className="bg-card border border-amber-500/20 rounded-2xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">صلاحيات المالك</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => { setAction(a.id); resetFields(); }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.97] ${a.bg} ${a.color}`}
            >
              <a.icon className="w-4 h-4" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Add Dialog */}
      <Dialog open={action === "manual_add"} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent className="max-w-sm">
          <div className="p-4 space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-amber-400">إضافة يدوية (Owner)</p>
              <button onClick={() => setAction(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-[10px] text-muted-foreground">بدون تحقق من المستوى أو التاريخ</p>
            <div className="flex gap-2">
              <button onClick={() => setAddType("supporter")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${addType === "supporter" ? "bg-primary/20 text-primary border border-primary/20" : "bg-muted text-muted-foreground"}`}>
                داعم
              </button>
              <button onClick={() => setAddType("agent")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${addType === "agent" ? "bg-primary/20 text-primary border border-primary/20" : "bg-muted text-muted-foreground"}`}>
                وكيل
              </button>
            </div>
            <Input placeholder="UUID العضو" value={addUuid} onChange={e => setAddUuid(e.target.value)} dir="ltr" />
            <Input placeholder="اسم العضو (اختياري)" value={addName} onChange={e => setAddName(e.target.value)} />
            {addType === "agent" && (
              <Input placeholder="كود الوكالة (اختياري)" value={addAgencyId} onChange={e => setAddAgencyId(e.target.value)} dir="ltr" />
            )}
            <Button onClick={handleManualAdd} disabled={loading || !addUuid.trim()} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit % Dialog */}
      <Dialog open={action === "edit_pct"} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent className="max-w-sm">
          <div className="p-4 space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-blue-400">تعديل النسبة (Owner)</p>
              <button onClick={() => setAction(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <Input placeholder="UUID العضو" value={editUuid} onChange={e => setEditUuid(e.target.value)} dir="ltr" />
            <Input type="number" placeholder="النسبة الجديدة %" value={editPct} onChange={e => setEditPct(e.target.value)} dir="ltr" min="0" max="100" step="0.5" />
            <Button onClick={handleEditPct} disabled={loading || !editUuid.trim() || !editPct} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تعديل"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Freeze Member Dialog */}
      <Dialog open={action === "freeze_member"} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent className="max-w-sm">
          <div className="p-4 space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-amber-400">تجميد عضو (Owner)</p>
              <button onClick={() => setAction(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-[10px] text-muted-foreground">العضو لن يتمكن من السحب</p>
            <Input placeholder="UUID العضو" value={freezeUuid} onChange={e => setFreezeUuid(e.target.value)} dir="ltr" />
            <Button variant="destructive" onClick={handleFreezeMember} disabled={loading || !freezeUuid.trim()} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تجميد العضو"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Freeze User Dialog */}
      <Dialog open={action === "freeze_user"} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent className="max-w-sm">
          <div className="p-4 space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-red-400">تجميد حساب مستخدم (Owner)</p>
              <button onClick={() => setAction(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-[10px] text-muted-foreground">المستخدم لن يتمكن من استخدام أي خدمة</p>
            <Input placeholder="UUID المستخدم" value={freezeUuid} onChange={e => setFreezeUuid(e.target.value)} dir="ltr" />
            <Button variant="destructive" onClick={handleFreezeUser} disabled={loading || !freezeUuid.trim()} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تجميد الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
};

export default OwnerControls;

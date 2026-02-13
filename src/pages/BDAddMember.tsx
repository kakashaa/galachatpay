import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBD } from "@/contexts/BDContext";

const TYPE_LABELS: Record<string, string> = {
  supporter: "داعم",
  host: "مضيف",
  agency: "وكالة",
};

const BDAddMember: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberType = searchParams.get("type") || "supporter";
  const { addMember, loading, refreshDashboard } = useBD();

  const [uuid, setUuid] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAdd = async () => {
    if (!uuid.trim()) { setError("أدخل UUID العضو"); return; }
    setError("");
    setSuccess("");
    const res = await addMember(uuid.trim(), memberType);
    if (res.success) {
      setSuccess(`تم إضافة ${res.name || "العضو"} بنجاح كـ${TYPE_LABELS[memberType]}`);
      setUuid("");
      refreshDashboard();
    } else {
      setError(res.error || "فشلت الإضافة");
    }
  };

  return (
    <MobileLayout showHeader headerTitle={`إضافة ${TYPE_LABELS[memberType]}`} onBack={() => navigate("/bd/dashboard")}>
      <div className="px-5 py-6 space-y-5" dir="rtl">
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">إضافة {TYPE_LABELS[memberType]} جديد</p>
              <p className="text-[10px] text-muted-foreground">أدخل UUID الشخص لتسجيله تحت حسابك</p>
            </div>
          </div>

          <Input
            placeholder="UUID العضو"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            className="text-center text-sm"
            dir="ltr"
          />

          {/* Type selector */}
          <div className="flex gap-2">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => navigate(`/bd/add-member?type=${key}`, { replace: true })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  memberType === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20 text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-400 text-xs p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <Button onClick={handleAdd} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            إضافة
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default BDAddMember;

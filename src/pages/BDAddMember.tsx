import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Loader2, AlertCircle, CheckCircle, Users, Building2 } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBD } from "@/contexts/BDContext";

const TYPE_CONFIG = {
  supporter: { label: "داعم", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
  agency: { label: "وكالة", icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10" },
} as const;

const BDAddMember: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberType = (searchParams.get("type") || "supporter") as keyof typeof TYPE_CONFIG;
  const { addMember, loading, refreshDashboard } = useBD();
  const config = TYPE_CONFIG[memberType] || TYPE_CONFIG.supporter;

  const [uuid, setUuid] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAdd = async () => {
    if (!uuid.trim()) { setError("أدخل UUID العضو"); return; }
    setError("");
    setSuccess("");
    const res = await addMember(uuid.trim(), memberType);
    if (res.success) {
      setSuccess(`تم إضافة ${res.name || "العضو"} بنجاح كـ${config.label}`);
      setUuid("");
      refreshDashboard();
    } else {
      setError(res.error || "فشلت الإضافة");
    }
  };

  const Icon = config.icon;

  return (
    <MobileLayout showHeader headerTitle={`إضافة ${config.label}`} onBack={() => navigate("/bd/dashboard")}>
      <div className="px-5 py-6 space-y-5" dir="rtl">
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">إضافة {config.label} جديد</p>
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
            {(Object.entries(TYPE_CONFIG) as [string, typeof config][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => navigate(`/bd/add-member?type=${key}`, { replace: true })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  memberType === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/20 text-muted-foreground"
                }`}
              >
                {cfg.label}
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

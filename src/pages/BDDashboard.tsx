import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Mic, Building2, DollarSign, Plus, RefreshCw, Loader2, LogOut, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { useBD } from "@/contexts/BDContext";

const BDDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { bdUser, loading, refreshDashboard, logout } = useBD();
  const [earningsExpanded, setEarningsExpanded] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!bdUser) { navigate("/bd", { replace: true }); return; }
    refreshDashboard().catch(() => {
      // If refresh fails (BD not found on server), redirect to registration
      logout();
      navigate("/bd", { replace: true });
    });
  }, []);

  if (!bdUser) return null;

  const handleLogout = () => { logout(); navigate("/bd"); };

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  const categories = [
    {
      key: "supporters",
      title: "الداعمين",
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      count: bdUser.supporters_count || 0,
      stats: [
        { label: "شحنات الشهر", value: (bdUser.supporters_charges || 0).toLocaleString() },
        { label: "عمولة 2%", value: `$${(bdUser.supporters_commission || 0).toFixed(2)}` },
      ],
      items: bdUser.supporters || [],
      memberType: "supporter",
    },
    {
      key: "hosts",
      title: "المضيفين",
      icon: Mic,
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      count: bdUser.hosts_count || 0,
      stats: [
        { label: "سكروا الراتب", value: bdUser.hosts_salary_closed || 0 },
        { label: "مكافأة", value: `${((bdUser.hosts_salary_closed || 0) * 5000).toLocaleString()} كوينز` },
      ],
      items: bdUser.hosts || [],
      memberType: "host",
    },
    {
      key: "agencies",
      title: "الوكالات",
      icon: Building2,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      count: bdUser.agencies_count || 0,
      stats: [
        { label: "مضيفين سكروا", value: bdUser.agencies_hosts_closed || 0 },
        { label: "مكافأة", value: `$${(bdUser.agencies_bonus || 0).toFixed(2)}` },
      ],
      items: bdUser.agencies || [],
      memberType: "agency",
    },
  ];

  return (
    <MobileLayout showHeader headerTitle="لوحة البيدي" onBack={() => navigate("/")}>
      <div className="px-4 py-4 space-y-4" dir="rtl">
        {/* Header card */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{bdUser.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{bdUser.uuid}</p>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="icon" onClick={refreshDashboard} disabled={loading} className="h-8 w-8">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-destructive">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Total Earnings - expandable */}
            <button
              onClick={() => setEarningsExpanded(!earningsExpanded)}
              className="bg-primary/10 rounded-xl p-3 text-center transition-colors hover:bg-primary/15 relative"
            >
              <DollarSign className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-amber-400">${(bdUser.total_earnings || 0).toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">أرباح الشهر الحالي</p>
              <ChevronDown className={`w-3 h-3 text-muted-foreground mx-auto mt-1 transition-transform ${earningsExpanded ? "rotate-180" : ""}`} />
            </button>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-base font-bold text-green-400">${(bdUser.available_balance || 0).toFixed(2)}</p>
              <p className="text-[9px] text-muted-foreground">الرصيد المتاح</p>
            </div>
          </div>
        </div>

        {/* Earnings breakdown - categories inside earnings */}
        {earningsExpanded && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isCatExpanded = expandedCategory === cat.key;
              return (
                <div key={cat.key} className="glass-card overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className="w-full p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${cat.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${cat.color}`} />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{cat.title}</p>
                        <p className="text-[10px] text-muted-foreground">{cat.count} عضو</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bd/add-member?type=${cat.memberType}`);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      {isCatExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Stats */}
                  <div className="px-3 pb-2.5 flex gap-2">
                    {cat.stats.map((s, i) => (
                      <div key={i} className="flex-1 bg-muted/20 rounded-lg p-2 text-center">
                        <p className="text-xs font-bold text-foreground">{s.value}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Expanded member list */}
                  {isCatExpanded && cat.items.length > 0 && (
                    <div className="px-3 pb-3 space-y-2 max-h-60 overflow-y-auto">
                      {cat.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/10 rounded-lg border border-border/20">
                          <div>
                            <p className="text-xs font-bold text-foreground">{item.name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{item.uuid || item.member_uuid || "—"}</p>
                          </div>
                          <div className="text-left">
                            {item.performance !== undefined && <p className="text-[10px] text-primary">{item.performance}</p>}
                            {item.reward !== undefined && <p className="text-[10px] text-amber-400">${item.reward}</p>}
                            {item.created_at && <p className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("ar-EG")}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isCatExpanded && cat.items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center pb-3">لا يوجد أعضاء بعد</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Withdraw button */}
        <Button
          onClick={() => navigate("/bd/withdraw")}
          className="w-full gap-2 h-12 text-sm font-bold"
          variant="default"
        >
          <Wallet className="w-5 h-5" />
          صفحة السحب
        </Button>
      </div>
    </MobileLayout>
  );
};

export default BDDashboard;

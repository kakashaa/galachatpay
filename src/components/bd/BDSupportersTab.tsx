import React, { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Supporter {
  member_uuid: string;
  member_name: string;
  monthly_charges: number;
  current_month_commission: number;
  total_commission: number;
  is_active: boolean;
}

interface BDSupportersTabProps {
  supporters: Supporter[];
  commissionPct: number;
  salaryData?: Record<string, { charges: number; commission: number }>;
  salaryLoading?: boolean;
}

const BDSupportersTab: React.FC<BDSupportersTabProps> = ({ supporters, commissionPct, salaryData = {}, salaryLoading = false }) => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const filtered = supporters.filter(s => 
    s.member_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.member_uuid?.includes(search)
  );

  const totalLiveCommission = Object.values(salaryData).reduce((sum, d) => sum + d.commission, 0);
  const totalCharges = Object.values(salaryData).reduce((sum, d) => sum + d.charges, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
        <input
          type="text"
          placeholder="ابحث عن داعم بالاسم أو ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {/* Header Stats */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">❤️</span>
            <h3 className="text-sm font-bold text-foreground">الداعمين ({supporters.length})</h3>
          </div>
          {salaryLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.06] rounded-xl p-3 border border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">الداعمين</p>
            <span className="text-2xl font-extrabold text-foreground">{supporters.length}</span>
          </div>
          <div className="bg-cyan-500/8 rounded-xl p-3 border border-cyan-500/20 text-center">
            <p className="text-[10px] text-cyan-300 mb-1">إجمالي الشحن</p>
            <span className="text-lg font-extrabold text-cyan-400">{totalCharges.toLocaleString()}</span>
            <p className="text-[8px] text-muted-foreground">كوينز</p>
          </div>
          <div className="bg-emerald-500/8 rounded-xl p-3 border border-emerald-500/20 text-center">
            <p className="text-[10px] text-emerald-300 mb-1">عمولتك</p>
            <span className="text-lg font-extrabold text-emerald-400">{totalLiveCommission.toLocaleString()}</span>
            <p className="text-[8px] text-muted-foreground">كوينز</p>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground text-center mt-2">1$ = 7,500 كوينز • عمولة {commissionPct}%</p>
      </div>

      {/* Supporters List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">{search ? 'search_off' : 'group_off'}</span>
          <p className="text-sm text-muted-foreground">{search ? 'لا توجد نتائج' : 'لا يوجد داعمين حالياً'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((supporter) => {
            const liveSalary = salaryData[supporter.member_uuid];
            const charges = liveSalary?.charges || supporter.monthly_charges || 0;
            const commission = liveSalary?.commission || 0;
            const chargesUsd = charges / 7500;
            const isExpanded = expandedId === supporter.member_uuid;

            return (
              <div
                key={supporter.member_uuid}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-blue-500/30 transition-colors"
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm border border-blue-500/20">
                        {supporter.member_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground">{supporter.member_name || "مستخدم"}</h5>
                        <div className="flex items-center gap-1.5">
                          {supporter.is_active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                          <span className="text-[10px] text-muted-foreground font-mono">#{supporter.member_uuid}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/15">عمولة {commissionPct}%</span>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.04] rounded-xl p-2.5 border border-border/30">
                      <p className="text-[10px] text-muted-foreground mb-1">إجمالي الدخل</p>
                      <p className="text-lg font-extrabold text-amber-400">${chargesUsd.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">{charges.toLocaleString()} كوينز</p>
                    </div>
                    <div className="bg-emerald-500/5 rounded-xl p-2.5 border border-emerald-500/15">
                      <p className="text-[10px] text-emerald-300/80 mb-1">عمولتك</p>
                      <p className="text-lg font-extrabold text-emerald-400">{commission.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">كوينز (${(commission / 7500).toFixed(2)})</p>
                    </div>
                  </div>
                </div>

                {/* Expand Button */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : supporter.member_uuid)}
                  className="w-full flex items-center justify-center gap-1 py-2 bg-white/[0.02] border-t border-border/30 hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-[10px] font-bold text-muted-foreground">{isExpanded ? 'إخفاء التفاصيل' : 'المزيد'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/20 bg-white/[0.02]">
                    <div className="space-y-2 pt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">شحنات الشهر</span>
                        <span className="font-bold text-foreground">{charges.toLocaleString()} كوينز</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">بالدولار</span>
                        <span className="font-bold text-foreground">${chargesUsd.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-border/30" />
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">العمولة ({commissionPct}%)</span>
                        <span className="font-bold text-emerald-400">{commission.toLocaleString()} كوينز</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">بالدولار</span>
                        <span className="font-bold text-emerald-400">${(commission / 7500).toFixed(2)}</span>
                      </div>
                      {(supporter.total_commission || 0) > 0 && (
                        <>
                          <div className="h-px bg-border/30" />
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">إجمالي العمولة الكلية</span>
                            <span className="font-bold text-primary">${(supporter.total_commission || 0).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Note */}
      <div className="bg-card border border-border rounded-xl p-3 flex items-start gap-2">
        <span className="material-symbols-outlined text-primary text-base mt-0.5">info</span>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          العمولة {commissionPct}% من شحنات الداعم الشهرية. 1$ = 7,500 كوينز.
        </p>
      </div>
      <div className="h-4"></div>
    </div>
  );
};

export default BDSupportersTab;

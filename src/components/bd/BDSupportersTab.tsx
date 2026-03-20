import React from "react";
import { Loader2 } from "lucide-react";

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
  const [search, setSearch] = React.useState("");
  const filtered = supporters.filter(s => 
    s.member_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.member_uuid?.includes(search)
  );

  // Calculate totals from live API data
  const totalLiveCommission = Object.values(salaryData).reduce((sum, d) => sum + d.commission, 0);
  const totalLiveCommissionUsd = totalLiveCommission / 7500;
  const totalCharges = Object.values(salaryData).reduce((sum, d) => sum + d.charges, 0);

  return (
    <div className="space-y-5">
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
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-foreground">تتبع الداعمين</h3>
          {salaryLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <span className="text-[10px] text-muted-foreground">1$ = 7,500 عملة</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/5 rounded-xl p-3 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-1">الداعمين</p>
            <span className="text-2xl font-bold text-foreground">{supporters.length}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {supporters.filter(s => s.is_active).length} نشط
            </p>
          </div>
          <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">عمولة الشهر</p>
            <span className="text-xl font-bold text-primary">${totalLiveCommissionUsd.toFixed(2)}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ~{totalLiveCommission.toLocaleString()} عملة
            </p>
          </div>
          <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">إجمالي الشحن</p>
            <span className="text-xl font-bold text-blue-400">{totalCharges.toLocaleString()}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">عملة هذا الشهر</p>
          </div>
        </div>
      </div>

      {/* Supporters List */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">الداعمين النشطين</h4>
          <span className="text-[10px] text-muted-foreground">{filtered.length} داعم</span>
        </div>

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
              const commissionUsd = commission / 7500;
              const totalCommUSD = supporter.total_commission || 0;

              return (
                <div
                  key={supporter.member_uuid}
                  className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-colors"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-foreground font-bold text-sm border border-border">
                        {supporter.member_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground">{supporter.member_name || "مستخدم"}</h5>
                        <div className="flex items-center gap-1.5">
                          {supporter.is_active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          )}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{supporter.member_uuid || "------"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-lg font-bold text-primary">${commissionUsd.toFixed(2)}</span>
                      <p className="text-[9px] text-muted-foreground uppercase">عمولة {commissionPct}%</p>
                    </div>
                  </div>

                  {/* Charges + commission details */}
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">شحنات الشهر</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 coin-icon text-[8px]">$</div>
                          <span className="text-sm font-bold text-foreground">{charges.toLocaleString()}</span>
                          <span className="text-[9px] text-muted-foreground">عملة</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-muted-foreground mb-0.5">العمولة ({commissionPct}%)</p>
                        <span className="text-sm font-bold text-emerald-400">{commission.toLocaleString()} عملة</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-[9px] text-muted-foreground">بالدولار</span>
                      <span className="text-xs font-bold text-primary">${commissionUsd.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Total all-time */}
                  {totalCommUSD > 0 && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[10px] text-muted-foreground">إجمالي العمولة الكلية</span>
                      <span className="text-xs font-semibold text-emerald-400">${totalCommUSD.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Commission Logic Note */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">منطق العمولة</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            يتم احتساب العمولة بنسبة {commissionPct}% من إجمالي شحنات الداعم الشهرية. سعر الصرف: 1$ = 7,500 عملة. الصرف يدوي بطلب من البيدي.
          </p>
        </div>
      </div>

      <div className="h-4"></div>
    </div>
  );
};

export default BDSupportersTab;

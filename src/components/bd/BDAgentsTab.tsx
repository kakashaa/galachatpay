import React from "react";
import { Loader2 } from "lucide-react";

interface Agent {
  member_uuid: string;
  member_name: string;
  monthly_charges: number;
  current_month_commission: number;
  total_commission: number;
  is_active: boolean;
  agency_id?: string;
}

interface BDAgentsTabProps {
  agents: Agent[];
  commissionPct: number;
  salaryData?: Record<string, { salary: number; commission: number }>;
  salaryLoading?: boolean;
}

const BDAgentsTab: React.FC<BDAgentsTabProps> = ({ agents, commissionPct, salaryData = {}, salaryLoading = false }) => {
  const [search, setSearch] = React.useState("");
  const filtered = agents.filter(a => 
    a.member_name?.toLowerCase().includes(search.toLowerCase()) || 
    a.member_uuid?.includes(search)
  );

  // Calculate totals from live API data
  const totalLiveCommission = Object.values(salaryData).reduce((sum, d) => sum + d.commission, 0);
  const totalSalary = Object.values(salaryData).reduce((sum, d) => sum + d.salary, 0);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
        <input
          type="text"
          placeholder="ابحث عن وكالة بالاسم أو ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {/* Header Stats */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-foreground">الوكالات المرتبطة</h3>
          {salaryLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <span className="text-[10px] text-muted-foreground">1$ = 7,500 عملة</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/5 rounded-xl p-3 border border-border text-center">
            <p className="text-[10px] text-muted-foreground mb-1">الوكالات</p>
            <span className="text-2xl font-bold text-foreground">{agents.length}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {agents.filter(a => a.is_active).length} نشط
            </p>
          </div>
          <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">عمولة الشهر</p>
            <span className="text-xl font-bold text-emerald-400">${totalLiveCommission.toFixed(2)}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ~{(totalLiveCommission * 7500).toLocaleString()} عملة
            </p>
          </div>
          <div className="bg-purple-500/5 rounded-xl p-3 border border-purple-500/10 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">إجمالي الرواتب</p>
            <span className="text-xl font-bold text-purple-400">${totalSalary.toFixed(2)}</span>
            <p className="text-[10px] text-muted-foreground mt-0.5">هذا الشهر</p>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">قائمة الوكالات</h4>
          <span className="text-[10px] text-muted-foreground">{filtered.length} وكالة</span>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">{search ? 'search_off' : 'domain_disabled'}</span>
            <p className="text-sm text-muted-foreground">{search ? 'لا توجد نتائج' : 'لا يوجد وكالات حالياً'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((agent) => {
              const liveSalary = salaryData[agent.member_uuid];
              const agencySalary = liveSalary?.salary || 0;
              const commission = liveSalary?.commission || 0;
              const totalCommUSD = agent.total_commission || 0;

              return (
                <div
                  key={agent.member_uuid}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 transition-colors"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between p-4 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm border border-emerald-500/10">
                        {agent.member_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground">{agent.member_name || "وكالة"}</h5>
                        <div className="flex items-center gap-1.5">
                          {agent.is_active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          )}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{agent.member_uuid?.slice(-6) || "------"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] text-muted-foreground mb-0.5">راتب الوكالة</p>
                      <span className="text-base font-bold text-foreground">${agencySalary.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Commission row */}
                  <div className="bg-white/[0.02] border-t border-border/50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                          عمولة BD ({commissionPct}%)
                        </p>
                        <span className="text-lg font-bold text-emerald-400">${commission.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="w-3.5 h-3.5 coin-icon text-[8px]">$</div>
                        <span className="text-xs font-semibold text-yellow-400">
                          {(commission * 7500).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  {totalCommUSD > 0 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
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
            يتم احتساب العمولة بنسبة {commissionPct}% من راتب الوكالة الشهري. سعر الصرف: 1$ = 7,500 عملة. الصرف يدوي بطلب من البيدي.
          </p>
        </div>
      </div>

      <div className="h-4"></div>
    </div>
  );
};

export default BDAgentsTab;

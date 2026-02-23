import React from "react";

interface Agent {
  member_uuid: string;
  member_name: string;
  monthly_charges: number;
  current_month_commission: number;
  total_commission: number;
  is_active: boolean;
}

interface BDAgentsTabProps {
  agents: Agent[];
  commissionPct: number;
}

const BDAgentsTab: React.FC<BDAgentsTabProps> = ({ agents, commissionPct }) => {
  const totalSalaryCoins = agents.reduce((sum, a) => sum + (a.monthly_charges || 0), 0);
  const totalCommission = agents.reduce((sum, a) => sum + (a.current_month_commission || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="bg-[#1c1e2e] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-white">الوكالات المرتبطة</h3>
          <span className="text-[10px] text-slate-400">1$ = 7500 عملة</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-[10px] text-slate-400 mb-1">عدد الوكالات</p>
            <span className="text-2xl font-bold text-white">{agents.length}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {agents.filter(a => a.is_active).length} نشط
            </p>
          </div>
          <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 text-center">
            <p className="text-[10px] text-slate-400 mb-1">إجمالي العمولة</p>
            <span className="text-2xl font-bold text-emerald-400">${totalCommission.toFixed(2)}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              ~{(totalCommission * 7500).toLocaleString()} عملة
            </p>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">قائمة الوكالات</h4>
          <span className="text-[10px] text-slate-400">{agents.length} وكالة</span>
        </div>

        {agents.length === 0 ? (
          <div className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">domain_disabled</span>
            <p className="text-sm text-slate-400">لا يوجد وكالات حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => {
              const salaryCoins = agent.monthly_charges || 0;
              const salaryUSD = salaryCoins / 7500;
              const commUSD = agent.current_month_commission || 0;
              const totalCommUSD = agent.total_commission || 0;

              return (
                <div
                  key={agent.member_uuid}
                  className="bg-[#1c1e2e] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
                >
                  {/* Top row: avatar, name, salary */}
                  <div className="flex items-center justify-between p-4 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm border border-emerald-500/10">
                        {agent.member_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">{agent.member_name || "وكالة"}</h5>
                        <div className="flex items-center gap-1.5">
                          {agent.is_active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{agent.member_uuid?.slice(-6) || "------"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] text-slate-500 mb-0.5">راتب الوكالة</p>
                      <span className="text-base font-bold text-white">${salaryUSD.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Commission row */}
                  <div className="bg-white/[0.02] border-t border-white/5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                          BD COMMISSION ({commissionPct}%)
                        </p>
                        <span className="text-lg font-bold text-emerald-400">${commUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="w-3.5 h-3.5 coin-icon text-[8px]">$</div>
                        <span className="text-xs font-semibold text-yellow-400">
                          {(commUSD * 7500).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  {totalCommUSD > 0 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-500">إجمالي العمولة الكلية</span>
                      <span className="text-xs font-semibold text-emerald-400">${totalCommUSD.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-4"></div>
    </div>
  );
};

export default BDAgentsTab;

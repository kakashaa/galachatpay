import React from "react";

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
}

const BDSupportersTab: React.FC<BDSupportersTabProps> = ({ supporters, commissionPct }) => {
  const [search, setSearch] = React.useState("");
  const filtered = supporters.filter(s => 
    s.member_name?.toLowerCase().includes(search.toLowerCase()) || 
    s.member_uuid?.includes(search)
  );
  const totalCoins = supporters.reduce((sum, s) => sum + (s.monthly_charges || 0), 0);
  const totalCommission = supporters.reduce((sum, s) => sum + (s.current_month_commission || 0), 0);

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
        <input
          type="text"
          placeholder="ابحث عن داعم بالاسم أو ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1c1e2e] border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>
      {/* Header Stats */}
      <div className="bg-[#1c1e2e] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-white">تتبع الداعمين</h3>
          <span className="text-[10px] text-slate-400">1$ = 7500 عملة</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-[10px] text-slate-400 mb-1">إجمالي الداعمين</p>
            <span className="text-2xl font-bold text-white">{supporters.length}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {supporters.filter(s => s.is_active).length} نشط
            </p>
          </div>
          <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-center">
            <p className="text-[10px] text-slate-400 mb-1">إجمالي العمولة</p>
            <span className="text-2xl font-bold text-primary">${totalCommission.toFixed(2)}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              ~{(totalCommission * 7500).toLocaleString()} عملة
            </p>
          </div>
        </div>
      </div>

      {/* Supporters List */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">الداعمين النشطين</h4>
          <span className="text-[10px] text-slate-400">{filtered.length} داعم</span>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">{search ? 'search_off' : 'group_off'}</span>
            <p className="text-sm text-slate-400">{search ? 'لا توجد نتائج' : 'لا يوجد داعمين حالياً'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((supporter) => {
              const coins = supporter.monthly_charges || 0;
              const commUSD = supporter.current_month_commission || 0;
              const totalCommUSD = supporter.total_commission || 0;

              return (
                <div
                  key={supporter.member_uuid}
                  className="bg-[#1c1e2e] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
                >
                  {/* Top row: avatar, name, commission */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white font-bold text-sm border border-white/10">
                        {supporter.member_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">{supporter.member_name || "مستخدم"}</h5>
                        <div className="flex items-center gap-1.5">
                          {supporter.is_active && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{supporter.member_uuid?.slice(-6) || "------"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-lg font-bold text-primary">${commUSD.toFixed(2)}</span>
                      <p className="text-[9px] text-slate-500 uppercase">عمولة الشهر</p>
                    </div>
                  </div>

                  {/* Bottom row: coins and rate */}
                  <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-0.5">إجمالي الشحن (Coins)</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 coin-icon text-[8px]">$</div>
                          <span className="text-sm font-bold text-white">{coins.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-slate-400 mb-0.5">النسبة</p>
                        <span className="text-xs font-medium text-yellow-400">{commissionPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Total commission */}
                  {totalCommUSD > 0 && (
                    <div className="flex items-center justify-between mt-2 px-1">
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

      {/* Commission Logic Note */}
      <div className="bg-[#1c1e2e] border border-white/5 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-lg mt-0.5">info</span>
        <div>
          <p className="text-xs font-semibold text-white mb-1">منطق العمولة</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            يتم احتساب العمولة بنسبة ثابتة {commissionPct}% من إجمالي العملات المشحونة. سعر الصرف ثابت 1$ = 7,500 عملة.
          </p>
        </div>
      </div>

      <div className="h-4"></div>
    </div>
  );
};

export default BDSupportersTab;

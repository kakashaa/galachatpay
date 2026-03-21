import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { galaApi } from '@/services/galaApi';

/* ─── Types ─── */
interface DateFilter {
  range: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  customFrom: string;
  customTo: string;
}

const formatCompact = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

/* ─── Date helpers ─── */
function getDateRange(range: DateFilter['range'], customFrom?: string, customTo?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  switch (range) {
    case 'today': return { start: today, end: today };
    case 'yesterday': return { start: yesterday, end: yesterday };
    case 'week': return { start: weekAgo, end: today };
    case 'month': return { start: monthStart, end: today };
    case 'custom': return { start: customFrom || monthStart, end: customTo || today };
  }
}

/* ─── db-proxy API helpers ─── */
const DB_PROXY = "https://hola-chat.com/db-proxy.php?key=ghala2026proxy";

async function fetchGiftsSent(uuid: string, start: string, end: string) {
  const res = await fetch(`${DB_PROXY}&action=gifts-sent&uuid=${uuid}&start=${start}&end=${end}`);
  return await res.json();
}

async function fetchGiftsReceived(uuid: string, start: string, end: string) {
  const res = await fetch(`${DB_PROXY}&action=gifts-received&uuid=${uuid}&start=${start}&end=${end}`);
  return await res.json();
}

async function fetchCharges(uuid: string, start: string, end: string) {
  const res = await fetch(`${DB_PROXY}&action=charges-by-uuid&uuid=${uuid}&start=${start}&end=${end}`);
  return await res.json();
}

/* ─── Filter Pills ─── */
const FilterPills: React.FC<{ filter: DateFilter; onChange: (f: DateFilter) => void }> = ({ filter, onChange }) => {
  const options: { id: DateFilter['range']; label: string }[] = [
    { id: 'month', label: 'الشهر' },
    { id: 'today', label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'week', label: 'الأسبوع' },
    { id: 'custom', label: 'مخصص' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap" dir="rtl">
        {options.map((o) => (
          <button key={o.id} onClick={() => onChange({ ...filter, range: o.id })}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              filter.range === o.id
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                : 'bg-white/[0.04] text-white/40 border border-white/[0.06]'
            }`}>
            {o.label}
          </button>
        ))}
      </div>
      {filter.range === 'custom' && (
        <div className="flex gap-2 items-center" dir="rtl">
          <span className="text-[9px] text-white/30">من:</span>
          <input type="date" value={filter.customFrom}
            onChange={e => onChange({ ...filter, customFrom: e.target.value })}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[10px] text-white/70" />
          <span className="text-[9px] text-white/30">إلى:</span>
          <input type="date" value={filter.customTo}
            onChange={e => onChange({ ...filter, customTo: e.target.value })}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[10px] text-white/70" />
          <button onClick={() => onChange({ ...filter })}
            className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
            عرض
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══ MAIN ACCORDION ═══ */

interface UserDetailAccordionProps {
  uuid: string;
  section: 'charge' | 'support' | 'supporter' | 'salary';
  onClose: () => void;
  salaryData?: { salary?: number; deduction?: number; net_salary?: number };
  monthlyRecv?: number;
  totalRecv?: number;
  totalRecvUsd?: number;
  monthlySent?: number;
  totalSent?: number;
  totalSentUsd?: number;
}

const UserDetailAccordion: React.FC<UserDetailAccordionProps> = ({
  uuid, section, onClose, salaryData,
  monthlyRecv, totalRecv, totalRecvUsd,
  totalSent, totalSentUsd,
}) => {
  const [filter, setFilter] = useState<DateFilter>({ range: 'month', customFrom: '', customTo: '' });
  const [loading, setLoading] = useState(true);
  const [totalCoins, setTotalCoins] = useState(0);
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [salaryDetail, setSalaryDetail] = useState<any>(null);
  const [salaryMonths, setSalaryMonths] = useState<any[]>([]);

  const titles: Record<string, string> = {
    charge: 'تفاصيل الشحن',
    support: 'الكاريزما',
    supporter: 'الداعم',
    salary: 'تفاصيل الراتب',
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDataRows([]);
    setTotalCoins(0);
    setTotalUsd(0);
    setTotalRecords(0);

    try {
      if (section === 'salary') {
        if (salaryData && (salaryData.salary || salaryData.net_salary)) {
          setSalaryDetail(salaryData);
        } else {
          const data = await galaApi.checkSalary(uuid);
          setSalaryDetail({
            salary: data?.salary || data?.total || 0,
            deduction: data?.deduction || data?.spent || data?.used || 0,
            net_salary: data?.net_salary || data?.net || data?.remaining || data?.balance || 0,
            charges: data?.charges,
          });
        }
        try {
          const report = await galaApi.salaryReport(uuid);
          setSalaryMonths(report?.months || report?.history || []);
        } catch { /* ignore */ }
        setLoading(false);
        return;
      }

      const { start, end } = getDateRange(filter.range, filter.customFrom, filter.customTo);

      if (section === 'supporter') {
        const result = await fetchGiftsSent(uuid, start, end);
        setTotalCoins(result.total_coins || 0);
        setTotalUsd(result.total_usd || 0);
        setTotalRecords(result.total_records || 0);
        setDataRows(result.data || []);
      } else if (section === 'support') {
        const result = await fetchGiftsReceived(uuid, start, end);
        setTotalCoins(result.total_coins || 0);
        setTotalUsd(result.total_usd || 0);
        setTotalRecords(result.total_records || 0);
        setDataRows(result.data || []);
      } else if (section === 'charge') {
        const result = await fetchCharges(uuid, start, end);
        setTotalCoins(result.total_coins || 0);
        setTotalUsd(result.total_usd || 0);
        setTotalRecords(result.total_records || 0);
        setDataRows(result.data || []);
      }
    } catch (err) {
      console.error('Detail fetch error:', err);
    }
    setLoading(false);
  }, [uuid, section, filter, salaryData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="rounded-xl mt-2 p-3 space-y-3"
        style={{
          background: 'linear-gradient(160deg, rgba(15,18,35,0.95), rgba(10,12,28,0.98))',
          border: '1px solid rgba(195,165,110,0.15)',
        }}>
        {/* Header */}
        <div className="flex items-center justify-between" dir="rtl">
          <span className="text-[11px] font-bold text-amber-400">{titles[section]}</span>
          <button onClick={onClose} className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
            <X size={10} className="text-white/40" />
          </button>
        </div>

        {/* Date Filter (not for salary) */}
        {section !== 'salary' && <FilterPills filter={filter} onChange={setFilter} />}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400/40" />
            <span className="text-[10px] text-white/20">جاري التحميل...</span>
          </div>
        ) : (
          <>
            {/* ═══ SUPPORT / SUPPORTER / CHARGE — Summary ═══ */}
            {section !== 'salary' && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg px-2 py-2 text-center"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <p className="text-[8px] text-white/30">الكوينز</p>
                  <p className="text-xs font-black text-amber-400 tabular-nums">{formatCompact(totalCoins)}</p>
                </div>
                <div className="rounded-lg px-2 py-2 text-center"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <p className="text-[8px] text-white/30">بالدولار</p>
                  <p className="text-xs font-black text-emerald-400 tabular-nums">${totalUsd.toLocaleString()}</p>
                </div>
                <div className="rounded-lg px-2 py-2 text-center"
                  style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}>
                  <p className="text-[8px] text-white/30">العمليات</p>
                  <p className="text-xs font-black text-purple-400 tabular-nums">{totalRecords.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* ═══ All-time summary for support/supporter ═══ */}
            {(section === 'support' || section === 'supporter') && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)' }}>
                  <p className="text-[8px] text-white/25">الشهر الحالي (user-diamonds)</p>
                  <p className="text-[11px] font-black text-amber-400/70 tabular-nums">
                    {section === 'support'
                      ? (monthlyRecv ? formatCompact(monthlyRecv) : '—')
                      : '—'
                    }
                  </p>
                </div>
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.08)' }}>
                  <p className="text-[8px] text-white/25">الإجمالي الكلي</p>
                  <p className="text-[11px] font-black text-purple-400/70 tabular-nums">
                    {section === 'support'
                      ? (totalRecv ? `${formatCompact(totalRecv)} ($${totalRecvUsd?.toLocaleString()})` : '—')
                      : (totalSent ? `${formatCompact(totalSent)} ($${totalSentUsd?.toLocaleString()})` : '—')
                    }
                  </p>
                </div>
              </div>
            )}

            {/* ═══ Data Table ═══ */}
            {section !== 'salary' && dataRows.length > 0 && (
              <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                <table className="w-full text-[10px]" dir="rtl">
                  <thead className="sticky top-0">
                    <tr className="border-b border-white/[0.06]" style={{ background: 'rgba(15,18,35,0.98)' }}>
                      {section === 'charge' ? (
                        <>
                          <th className="py-1.5 px-1 text-right font-bold text-white/30">التاريخ</th>
                          <th className="py-1.5 px-1 text-right font-bold text-white/30">المبلغ</th>
                          <th className="py-1.5 px-1 text-right font-bold text-white/30">النوع</th>
                        </>
                      ) : (
                        <>
                          <th className="py-1.5 px-1 text-right font-bold text-white/30">التاريخ</th>
                          <th className="py-1.5 px-1 text-right font-bold text-white/30">الهدية</th>
                          <th className="py-1.5 px-1 text-right font-bold text-white/30">السعر</th>
                          <th className="py-1.5 px-1 text-right font-bold text-white/30">
                            {section === 'supporter' ? 'المستلم' : 'الداعم'}
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        {section === 'charge' ? (
                          <>
                            <td className="py-1.5 px-1 text-white/50 font-mono text-[9px]">
                              {row.created_at ? new Date(row.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '—'}
                            </td>
                            <td className="py-1.5 px-1 text-amber-400 font-bold tabular-nums">
                              {Number(row.amount || row.coins || 0).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-1 text-white/40">{row.type || row.source || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 px-1 text-white/50 font-mono text-[9px]">
                              {row.created_at ? new Date(row.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '—'}
                            </td>
                            <td className="py-1.5 px-1 text-white/60">{row.gift_name || '—'}</td>
                            <td className="py-1.5 px-1 text-amber-400 font-bold tabular-nums">
                              {Number(row.gift_price || 0).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-1 text-white/40 text-[9px]">
                              {section === 'supporter' ? (row.receiver || '—') : (row.sender || '—')}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* No data message */}
            {section !== 'salary' && dataRows.length === 0 && !loading && (
              <p className="text-[10px] text-white/20 text-center py-4">لا توجد بيانات لهذه الفترة</p>
            )}

            {/* ═══ SALARY ═══ */}
            {section === 'salary' && (
              <div className="space-y-2">
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <p className="text-[9px] text-white/30 mb-0.5">الراتب الكامل</p>
                  <p className="text-sm font-black text-amber-400 tabular-nums" dir="ltr">${salaryData?.salary || 0}</p>
                </div>
                {salaryDetail && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'الراتب', val: `$${salaryDetail.salary || 0}`, color: 'text-white' },
                        { label: 'المصروف', val: `$${salaryDetail.deduction || 0}`, color: 'text-red-400' },
                        { label: 'المتبقي', val: `$${salaryDetail.net_salary || 0}`, color: 'text-emerald-400' },
                      ].map(s => (
                        <div key={s.label} className="rounded-lg px-2 py-2 text-center"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-[9px] text-white/30">{s.label}</p>
                          <p className={`text-xs font-black tabular-nums ${s.color}`}>{s.val}</p>
                        </div>
                      ))}
                    </div>

                    {salaryDetail.charges && Array.isArray(salaryDetail.charges) && salaryDetail.charges.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-white/30 mb-1">سجل الصرف</p>
                        <div className="space-y-1">
                          {salaryDetail.charges.map((c: any, i: number) => (
                            <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="text-[10px] text-white/50 font-mono">
                                {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : c.date || '—'}
                              </span>
                              <span className="text-[10px] text-white/60 flex-1 text-center">{c.description || c.note || 'شحن كوينز'}</span>
                              <span className="text-[10px] font-bold text-amber-400 tabular-nums">${c.amount || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {salaryMonths.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-white/30 mb-1">الأشهر السابقة</p>
                        <div className="space-y-1">
                          {salaryMonths.map((m: any, i: number) => (
                            <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="text-[10px] text-white/50">{m.month || m.label || '—'}</span>
                              <span className="text-[10px] font-bold text-white/60 tabular-nums">${m.total || m.salary || 0}</span>
                              <span className="text-[9px] text-white/20">
                                {m.status === 'spent' ? 'مصروف بالكامل' : m.status || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default UserDetailAccordion;

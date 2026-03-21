import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Trophy } from 'lucide-react';
import { galaApi } from '@/services/galaApi';

/* ─── Types ─── */
interface DateFilter {
  range: 'total' | 'today' | 'week' | 'month' | 'custom';
  customFrom: string;
  customTo: string;
}

interface DetailRow {
  date: string;
  amount: number | string;
  label: string;
  extra?: string;
}

/* ─── parseExp: convert "4.3M" / "500K" → number ─── */
const parseExp = (exp: string | number): number => {
  const s = String(exp);
  if (s.endsWith("M")) return Math.round(parseFloat(s) * 1000000);
  if (s.endsWith("K")) return Math.round(parseFloat(s) * 1000);
  return Math.round(parseFloat(s)) || 0;
};

const formatCompact = (v: number): string => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
};

/* ─── Ranking API helper ─── */
const getToken = async (): Promise<string> => {
  const res = await fetch("https://galalivechat.com/api/auth/v3/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "social", platform: "facebook", platform_id: "4",
      device_id: "filter_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    }),
  });
  const data = await res.json();
  return data.auth_token;
};

const getRankingForUser = async (uuid: string, period: "today" | "week" | "month") => {
  const typeMap = { today: 1, week: 2, month: 3 };

  // الداعم (senders) — class 2
  const token1 = await getToken();
  const sentRes = await fetch("https://galalivechat.com/api/ranking", {
    method: "POST",
    headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
    body: JSON.stringify({ class: 2, type: typeMap[period] }),
  });
  const sentData = await sentRes.json();
  const allSenders = [...(sentData.data?.top || []), ...(sentData.data?.other || [])];
  const userSent = allSenders.find((u: any) => String(u.uuid) === String(uuid));

  // الكاريزما (receivers) — class 1
  const token2 = await getToken();
  const recvRes = await fetch("https://galalivechat.com/api/ranking", {
    method: "POST",
    headers: { Authorization: `Bearer ${token2}`, "Content-Type": "application/json" },
    body: JSON.stringify({ class: 1, type: typeMap[period] }),
  });
  const recvData = await recvRes.json();
  const allReceivers = [...(recvData.data?.top || []), ...(recvData.data?.other || [])];
  const userRecv = allReceivers.find((u: any) => String(u.uuid) === String(uuid));

  return {
    sent: userSent ? parseExp(userSent.exp) : null,
    received: userRecv ? parseExp(userRecv.exp) : null,
    sentRank: userSent ? allSenders.indexOf(userSent) + 1 : null,
    receivedRank: userRecv ? allReceivers.indexOf(userRecv) + 1 : null,
  };
};

/* ─── Date helpers (for charge section) ─── */
function getDateRange(range: string, customFrom?: string, customTo?: string) {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (range) {
    case 'today': return { from: fmt(now), to: fmt(now) };
    case 'week': {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      return { from: fmt(w), to: fmt(now) };
    }
    case 'month': {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(m), to: fmt(now) };
    }
    case 'custom':
      return { from: customFrom || fmt(now), to: customTo || fmt(now) };
    default:
      return { from: '2020-01-01', to: fmt(now) };
  }
}

/* ─── Filter Pills ─── */
const FilterPills: React.FC<{ filter: DateFilter; onChange: (f: DateFilter) => void; showCustom?: boolean }> = ({ filter, onChange, showCustom = true }) => {
  const options: { id: DateFilter['range']; label: string }[] = [
    { id: 'total', label: 'إجمالي' },
    { id: 'today', label: 'يومي' },
    { id: 'week', label: 'أسبوعي' },
    { id: 'month', label: 'شهري' },
    ...(showCustom ? [{ id: 'custom' as const, label: 'مخصص' }] : []),
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
    </div>
  );
};

/* ─── Detail Table ─── */
const DetailTable: React.FC<{ rows: DetailRow[]; cols: string[] }> = ({ rows, cols }) => {
  if (rows.length === 0) {
    return <p className="text-[10px] text-white/20 text-center py-4">لا توجد بيانات</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]" dir="rtl">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {cols.map(c => (
              <th key={c} className="py-1.5 px-1 text-right font-bold text-white/30">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="py-1.5 px-1 text-white/50 font-mono">{r.date}</td>
              <td className="py-1.5 px-1 text-white/70 font-bold tabular-nums">{r.amount}</td>
              <td className="py-1.5 px-1 text-white/40">{r.label}</td>
              {r.extra !== undefined && <td className="py-1.5 px-1 text-white/30">{r.extra}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─── Ranking Result Display ─── */
const RankingResult: React.FC<{
  value: number | null;
  rank: number | null;
  label: string;
  period: string;
}> = ({ value, rank, label, period }) => {
  const periodLabels: Record<string, string> = { today: 'اليوم', week: 'الأسبوع', month: 'الشهر' };
  if (value === null) {
    return (
      <div className="rounded-lg px-3 py-3 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[9px] text-white/30 mb-1">{label} — {periodLabels[period] || period}</p>
        <p className="text-[11px] text-white/25">ليس بأعلى 20 لهذه الفترة</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg px-3 py-3 text-center"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
      <p className="text-[9px] text-white/30 mb-1">{label} — {periodLabels[period] || period}</p>
      <p className="text-lg font-black text-amber-400 tabular-nums" dir="ltr">
        {formatCompact(value)} <span className="text-[9px] text-white/30">كوينز</span>
      </p>
      <p className="text-[8px] text-white/20">${(value / 7500).toFixed(0)}</p>
      {rank && (
        <div className="flex items-center justify-center gap-1 mt-1">
          <Trophy size={10} className="text-yellow-500" />
          <span className="text-[10px] font-bold text-yellow-400">#{rank}</span>
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
  monthlySent, totalSent, totalSentUsd,
}) => {
  const [filter, setFilter] = useState<DateFilter>({ range: 'total', customFrom: '', customTo: '' });
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [total, setTotal] = useState<string>('');
  const [salaryMonths, setSalaryMonths] = useState<any[]>([]);
  const [salaryDetail, setSalaryDetail] = useState<any>(null);

  // Ranking state
  const [rankingData, setRankingData] = useState<{
    sent: number | null; received: number | null;
    sentRank: number | null; receivedRank: number | null;
  } | null>(null);
  const [rankingError, setRankingError] = useState(false);

  const titles: Record<string, string> = {
    charge: 'تفاصيل الشحن',
    support: 'الكاريزما',
    supporter: 'الداعم',
    salary: 'تفاصيل الراتب',
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setRankingData(null);
    setRankingError(false);

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
        setTotal(`$${salaryData?.salary || 0}`);
        setLoading(false);
        return;
      }

      if (section === 'charge') {
        if (filter.range === 'total') {
          // Show totals only
          setRows([]);
          setTotal('');
          setLoading(false);
          return;
        }
        if (filter.range === 'custom') {
          setRows([]);
          setTotal('غير متاح حالياً');
          setLoading(false);
          return;
        }
        // Try charge report API
        const { from, to } = getDateRange(filter.range, filter.customFrom, filter.customTo);
        try {
          const data = await galaApi.chargesReport(uuid, from, to);
          const items = data?.charges || data?.data || [];
          const mapped: DetailRow[] = Array.isArray(items) ? items.map((c: any) => ({
            date: c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) + ' ' + new Date(c.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : c.date || '—',
            amount: `${(c.amount || c.coins || 0).toLocaleString()} كوينز`,
            label: c.type || c.source || 'تطبيق',
          })) : [];
          const totalCoins = Array.isArray(items) ? items.reduce((s: number, c: any) => s + (c.amount || c.coins || 0), 0) : 0;
          setTotal(totalCoins > 0 ? `${totalCoins.toLocaleString()} كوينز ($${(totalCoins / 7500).toFixed(0)})` : '');
          setRows(mapped);
        } catch {
          setRows([]);
          setTotal('غير متاح — يتطلب خادم وسيط');
        }
        setLoading(false);
        return;
      }

      // support / supporter sections
      if (filter.range === 'total') {
        // Show totals from user-diamonds (already passed as props)
        setRows([]);
        setTotal('');
        setLoading(false);
        return;
      }

      if (filter.range === 'custom') {
        setRows([]);
        setTotal('غير متاح حالياً');
        setLoading(false);
        return;
      }

      // Use ranking API for today/week/month
      try {
        const result = await getRankingForUser(uuid, filter.range as 'today' | 'week' | 'month');
        setRankingData(result);
      } catch (err) {
        console.error('Ranking fetch error:', err);
        setRankingError(true);
      }
    } catch (err) {
      console.error('Detail fetch error:', err);
      setRows([]);
      setTotal('—');
    }
    setLoading(false);
  }, [uuid, section, filter, salaryData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colHeaders: Record<string, string[]> = {
    charge: ['التاريخ', 'المبلغ', 'النوع'],
    support: [],
    supporter: [],
    salary: [],
  };

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
        {section !== 'salary' && (
          <FilterPills filter={filter} onChange={setFilter} showCustom={section === 'charge'} />
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400/40" />
          </div>
        ) : (
          <>
            {/* ═══ SUPPORT / SUPPORTER — total view ═══ */}
            {(section === 'support' || section === 'supporter') && filter.range === 'total' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <p className="text-[9px] text-white/30 mb-0.5">الشهر الحالي</p>
                  <p className="text-sm font-black text-amber-400 tabular-nums" dir="ltr">
                    {section === 'support'
                      ? (monthlyRecv ? formatCompact(monthlyRecv) : '—')
                      : (monthlySent ? formatCompact(monthlySent) : '—')
                    }
                  </p>
                  <p className="text-[8px] text-white/20">
                    {section === 'support'
                      ? (monthlyRecv ? `$${(monthlyRecv / 7500).toFixed(0)}` : '')
                      : (monthlySent ? `$${(monthlySent / 7500).toFixed(0)}` : '')
                    }
                  </p>
                </div>
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}>
                  <p className="text-[9px] text-white/30 mb-0.5">الإجمالي</p>
                  <p className="text-sm font-black text-purple-400 tabular-nums" dir="ltr">
                    {section === 'support'
                      ? (totalRecv ? formatCompact(totalRecv) : '—')
                      : (totalSent ? formatCompact(totalSent) : '—')
                    }
                  </p>
                  <p className="text-[8px] text-white/20">
                    {section === 'support'
                      ? (totalRecvUsd ? `$${totalRecvUsd.toLocaleString()}` : '')
                      : (totalSentUsd ? `$${totalSentUsd.toLocaleString()}` : '')
                    }
                  </p>
                </div>
              </div>
            )}

            {/* ═══ SUPPORT / SUPPORTER — ranking view (today/week/month) ═══ */}
            {(section === 'support' || section === 'supporter') && filter.range !== 'total' && filter.range !== 'custom' && (
              <>
                {rankingError ? (
                  <p className="text-[10px] text-red-400/60 text-center py-4">فشل جلب الترتيب</p>
                ) : rankingData ? (
                  <RankingResult
                    value={section === 'support' ? rankingData.received : rankingData.sent}
                    rank={section === 'support' ? rankingData.receivedRank : rankingData.sentRank}
                    label={section === 'support' ? 'الكاريزما' : 'الداعم'}
                    period={filter.range}
                  />
                ) : null}
              </>
            )}

            {/* ═══ SUPPORT / SUPPORTER — custom unavailable ═══ */}
            {(section === 'support' || section === 'supporter') && filter.range === 'custom' && (
              <p className="text-[10px] text-white/20 text-center py-4">غير متاح حالياً</p>
            )}

            {/* ═══ CHARGE — total view ═══ */}
            {section === 'charge' && filter.range === 'total' && (
              <div className="rounded-lg px-3 py-2 text-center"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <p className="text-[9px] text-white/30 mb-0.5">إجمالي الشحن (charger_exp)</p>
                <p className="text-sm font-black text-amber-400 tabular-nums" dir="ltr">
                  بيانات الإجمالي معروضة في البطاقة أعلاه
                </p>
              </div>
            )}

            {/* ═══ CHARGE — date filtered ═══ */}
            {section === 'charge' && filter.range !== 'total' && (
              <>
                {total && (
                  <div className="rounded-lg px-3 py-2 text-center"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                    <p className="text-[9px] text-white/30 mb-0.5">إجمالي الفترة</p>
                    <p className="text-sm font-black text-amber-400 tabular-nums" dir="ltr">{total}</p>
                  </div>
                )}
                <DetailTable rows={rows} cols={colHeaders[section]} />
              </>
            )}

            {/* ═══ SALARY ═══ */}
            {section === 'salary' && (
              <div className="space-y-2">
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <p className="text-[9px] text-white/30 mb-0.5">الراتب الكامل</p>
                  <p className="text-sm font-black text-amber-400 tabular-nums" dir="ltr">{total}</p>
                </div>
                {salaryDetail && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'الراتب', val: `$${salaryDetail.salary || salaryDetail.total || 0}`, color: 'text-white' },
                        { label: 'المصروف', val: `$${salaryDetail.deduction || salaryDetail.spent || salaryDetail.used || 0}`, color: 'text-red-400' },
                        { label: 'المتبقي', val: `$${salaryDetail.net_salary || salaryDetail.remaining || salaryDetail.balance || 0}`, color: 'text-emerald-400' },
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

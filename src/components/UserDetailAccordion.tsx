import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { galaApi } from '@/services/galaApi';

/* ─── Types ─── */
interface DateFilter {
  range: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  customFrom: string;
  customTo: string;
}

interface DetailRow {
  date: string;
  amount: number | string;
  label: string;
  extra?: string;
}

/* ─── Date helpers ─── */
function getDateRange(range: DateFilter['range'], customFrom?: string, customTo?: string) {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (range) {
    case 'today': return { from: fmt(now), to: fmt(now) };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
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
  }
}

/* ─── Filter Pills ─── */
const FilterPills: React.FC<{ filter: DateFilter; onChange: (f: DateFilter) => void }> = ({ filter, onChange }) => {
  const options: { id: DateFilter['range']; label: string }[] = [
    { id: 'today', label: 'اليوم' },
    { id: 'yesterday', label: 'أمس' },
    { id: 'week', label: 'الأسبوع' },
    { id: 'month', label: 'الشهر' },
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

/* ═══ MAIN ACCORDION SECTIONS ═══ */

interface UserDetailAccordionProps {
  uuid: string;
  section: 'charge' | 'support' | 'supporter' | 'salary';
  onClose: () => void;
}

const UserDetailAccordion: React.FC<UserDetailAccordionProps> = ({ uuid, section, onClose }) => {
  const [filter, setFilter] = useState<DateFilter>({ range: 'month', customFrom: '', customTo: '' });
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [total, setTotal] = useState<string>('');
  const [salaryMonths, setSalaryMonths] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [salaryDetail, setSalaryDetail] = useState<any>(null);

  const titles: Record<string, string> = {
    charge: 'تفاصيل الشحن',
    support: 'من دعمني',
    supporter: 'من دعمت',
    salary: 'تفاصيل الراتب',
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange(filter.range, filter.customFrom, filter.customTo);

    try {
      if (section === 'charge') {
        const data = await galaApi.chargesReport(uuid, from, to);
        const items = data?.charges || data?.data || [];
        const mapped: DetailRow[] = Array.isArray(items) ? items.map((c: any) => ({
          date: c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) + ' ' + new Date(c.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : c.date || '—',
          amount: `${(c.amount || c.coins || 0).toLocaleString()} كوينز`,
          label: c.type || c.source || 'تطبيق',
        })) : [];
        const totalCoins = Array.isArray(items) ? items.reduce((s: number, c: any) => s + (c.amount || c.coins || 0), 0) : 0;
        setTotal(`${totalCoins.toLocaleString()} كوينز ($${(totalCoins / 7500).toFixed(0)})`);
        setRows(mapped);
      } else if (section === 'support') {
        const data = await galaApi.giftLogs(uuid, 'receiver', from, to);
        const items = data?.gifts || data?.data || [];
        const mapped: DetailRow[] = Array.isArray(items) ? items.map((g: any) => ({
          date: g.created_at ? new Date(g.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : g.date || '—',
          amount: `${(g.amount || g.coins || 0).toLocaleString()}`,
          label: `${g.sender_name || g.name || 'مجهول'} (${g.sender_uuid || g.uuid || '—'})`,
        })) : [];
        const totalCoins = Array.isArray(items) ? items.reduce((s: number, g: any) => s + (g.amount || g.coins || 0), 0) : 0;
        setTotal(`${totalCoins.toLocaleString()} كوينز ($${(totalCoins / 7500).toFixed(0)})`);
        setRows(mapped);
      } else if (section === 'supporter') {
        const data = await galaApi.giftLogs(uuid, 'sender', from, to);
        const items = data?.gifts || data?.data || [];
        const mapped: DetailRow[] = Array.isArray(items) ? items.map((g: any) => ({
          date: g.created_at ? new Date(g.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : g.date || '—',
          amount: `${(g.amount || g.coins || 0).toLocaleString()}`,
          label: `${g.receiver_name || g.name || 'مجهول'} (${g.receiver_uuid || g.uuid || '—'})`,
        })) : [];
        const totalCoins = Array.isArray(items) ? items.reduce((s: number, g: any) => s + (g.amount || g.coins || 0), 0) : 0;
        setTotal(`${totalCoins.toLocaleString()} كوينز ($${(totalCoins / 7500).toFixed(0)})`);
        setRows(mapped);
      } else if (section === 'salary') {
        const data = await galaApi.checkSalary(uuid);
        setSalaryDetail(data);
        // Try to get salary report for history
        try {
          const report = await galaApi.salaryReport(uuid);
          setSalaryMonths(report?.months || report?.history || []);
        } catch { /* ignore */ }
        setTotal(`$${data?.salary || data?.total || 0}`);
      }
    } catch (err) {
      console.error('Detail fetch error:', err);
      setRows([]);
      setTotal('—');
    }
    setLoading(false);
  }, [uuid, section, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colHeaders: Record<string, string[]> = {
    charge: ['التاريخ', 'المبلغ', 'النوع'],
    support: ['التاريخ', 'المبلغ', 'الداعم'],
    supporter: ['التاريخ', 'المبلغ', 'المستلم'],
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
        {section !== 'salary' && <FilterPills filter={filter} onChange={setFilter} />}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400/40" />
          </div>
        ) : (
          <>
            {/* Total */}
            <div className="rounded-lg px-3 py-2 text-center"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <p className="text-[9px] text-white/30 mb-0.5">
                {section === 'charge' ? 'إجمالي الشحن' : section === 'support' ? 'إجمالي المستلم' : section === 'supporter' ? 'إجمالي المرسل' : 'الراتب الكامل'}
              </p>
              <p className="text-sm font-black text-amber-400 tabular-nums" dir="ltr">{total}</p>
            </div>

            {/* Table (charge/support/supporter) */}
            {section !== 'salary' && (
              <DetailTable rows={rows} cols={colHeaders[section]} />
            )}

            {/* Salary detail */}
            {section === 'salary' && salaryDetail && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'الراتب', val: `$${salaryDetail.salary || 0}` },
                    { label: 'المصروف', val: `$${salaryDetail.spent || salaryDetail.used || 0}` },
                    { label: 'المتبقي', val: `$${salaryDetail.remaining || salaryDetail.balance || 0}` },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg px-2 py-2 text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[9px] text-white/30">{s.label}</p>
                      <p className="text-xs font-black text-white tabular-nums">{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Salary charge history */}
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
                          <span className="text-[9px] text-emerald-400 mr-1">✅</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous months */}
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
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default UserDetailAccordion;

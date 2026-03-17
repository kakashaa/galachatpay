import React, { useState } from 'react';
import { Loader2, Crown, Hash, ShieldBan, Search, ScrollText, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const API = "https://galachat.site/project-z/api.php";
const ADMIN_KEY = "ghala2026owner";

interface Props {
  adminUsername: string;
}

const AdminManualActions: React.FC<Props> = ({ adminUsername }) => {
  const [activeAction, setActiveAction] = useState<'vip' | 'change_id' | 'ban' | 'user_search' | 'action_log' | null>(null);

  // VIP state
  const [vipUuid, setVipUuid] = useState('');
  const [vipLevel, setVipLevel] = useState('3');
  const [vipDuration, setVipDuration] = useState('30');
  const [vipLoading, setVipLoading] = useState(false);

  // Change ID state
  const [changeUuid, setChangeUuid] = useState('');
  const [newUuid, setNewUuid] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  // Ban state
  const [banUuid, setBanUuid] = useState('');
  const [banReason, setBanReason] = useState('promo');
  const [banCustomReason, setBanCustomReason] = useState('');
  const [banDuration, setBanDuration] = useState('24h');
  const [banLoading, setBanLoading] = useState(false);

  // User search state
  const [searchUuid, setSearchUuid] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Action log state
  const [logAdmin, setLogAdmin] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const apiPost = async (body: Record<string, any>) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_key: ADMIN_KEY, ...body }),
    });
    return res.json();
  };

  const apiGet = async (params: Record<string, string>) => {
    const url = new URL(API);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    return res.json();
  };

  const handleGiveVip = async () => {
    if (!vipUuid.trim()) { toast.error('أدخل UUID'); return; }
    setVipLoading(true);
    try {
      const data = await apiPost({
        action: 'admin_give_vip',
        uuid: vipUuid.trim(),
        level: parseInt(vipLevel),
        duration: vipDuration,
      });
      if (data.success) {
        toast.success('تم إعطاء VIP بنجاح');
        setVipUuid('');
      } else {
        toast.error(data.error || 'فشلت العملية');
      }
    } catch { toast.error('فشل الاتصال'); }
    setVipLoading(false);
  };

  const handleChangeId = async () => {
    if (!changeUuid.trim() || !newUuid.trim()) { toast.error('أدخل البيانات'); return; }
    setChangeLoading(true);
    try {
      const data = await apiPost({
        action: 'admin_change_uuid',
        uuid: changeUuid.trim(),
        new_uuid: newUuid.trim(),
      });
      if (data.success) {
        toast.success('تم تغيير الآيدي');
        setChangeUuid(''); setNewUuid('');
      } else {
        toast.error(data.error || 'فشلت العملية');
      }
    } catch { toast.error('فشل الاتصال'); }
    setChangeLoading(false);
  };

  const handleBan = async () => {
    if (!banUuid.trim()) { toast.error('أدخل UUID'); return; }
    const reason = banReason === 'other' ? banCustomReason : banReason;
    if (!reason.trim()) { toast.error('أدخل السبب'); return; }
    setBanLoading(true);
    try {
      const data = await apiPost({
        action: 'admin_ban_user',
        uuid: banUuid.trim(),
        reason,
        reason_type: banReason,
        duration: banDuration,
      });
      if (data.success) {
        toast.success('تم الحظر');
        setBanUuid(''); setBanCustomReason('');
      } else {
        toast.error(data.error || 'فشلت العملية');
      }
    } catch { toast.error('فشل الاتصال'); }
    setBanLoading(false);
  };

  const handleUserSearch = async () => {
    if (!searchUuid.trim()) return;
    setSearchLoading(true);
    setUserInfo(null);
    try {
      const data = await apiGet({
        action: 'admin_user_info',
        admin_key: ADMIN_KEY,
        uuid: searchUuid.trim(),
      });
      if (data.success) {
        setUserInfo(data);
      } else {
        toast.error(data.error || 'مستخدم غير موجود');
      }
    } catch { toast.error('فشل البحث'); }
    setSearchLoading(false);
  };

  const handleLoadLogs = async () => {
    setLogLoading(true);
    try {
      const params: Record<string, string> = {
        action: 'admin_action_log',
        admin_key: ADMIN_KEY,
        limit: '50',
      };
      if (logAdmin.trim()) params.admin = logAdmin.trim();
      const data = await apiGet(params);
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch { toast.error('فشل التحميل'); }
    setLogLoading(false);
  };

  const actions = [
    { key: 'vip' as const, label: 'إعطاء VIP', icon: <Crown className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { key: 'change_id' as const, label: 'تغيير آيدي', icon: <Hash className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { key: 'ban' as const, label: 'حظر مستخدم', icon: <ShieldBan className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10' },
    { key: 'user_search' as const, label: 'بحث مستخدم', icon: <Search className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { key: 'action_log' as const, label: 'سجل العمليات', icon: <ScrollText className="w-5 h-5" />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ];

  if (!activeAction) {
    return (
      <div className="grid grid-cols-2 gap-3" dir="rtl">
        {actions.map(a => (
          <button
            key={a.key}
            onClick={() => setActiveAction(a.key)}
            className={`${a.bg} border border-border/30 rounded-xl p-4 text-center hover:border-primary/30 transition-all active:scale-[0.97]`}
          >
            <div className={`${a.color} mx-auto mb-2`}>{a.icon}</div>
            <p className="text-sm font-bold text-foreground">{a.label}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <button onClick={() => setActiveAction(null)} className="text-xs text-primary font-bold flex items-center gap-1">
        ← رجوع للأدوات
      </button>

      {/* Give VIP */}
      {activeAction === 'vip' && (
        <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" /> إعطاء VIP
          </h3>
          <Input value={vipUuid} onChange={(e) => setVipUuid(e.target.value)} placeholder="UUID المستخدم" dir="ltr" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">المستوى</label>
              <select value={vipLevel} onChange={(e) => setVipLevel(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {[1,2,3,4,5,6].map(l => <option key={l} value={l}>VIP {l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">المدة</label>
              <select value={vipDuration} onChange={(e) => setVipDuration(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="7">7 أيام</option>
                <option value="30">30 يوم</option>
                <option value="90">90 يوم</option>
                <option value="365">سنة</option>
              </select>
            </div>
          </div>
          <Button className="w-full" onClick={handleGiveVip} disabled={vipLoading}>
            {vipLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Crown className="w-4 h-4 ml-2" />}
            إعطاء VIP
          </Button>
        </div>
      )}

      {/* Change ID */}
      {activeAction === 'change_id' && (
        <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Hash className="w-4 h-4 text-indigo-400" /> تغيير آيدي
          </h3>
          <Input value={changeUuid} onChange={(e) => setChangeUuid(e.target.value)} placeholder="UUID الحالي" dir="ltr" />
          <Input value={newUuid} onChange={(e) => setNewUuid(e.target.value)} placeholder="الآيدي الجديد" dir="ltr" />
          <Button className="w-full" onClick={handleChangeId} disabled={changeLoading}>
            {changeLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Hash className="w-4 h-4 ml-2" />}
            تغيير
          </Button>
        </div>
      )}

      {/* Ban User */}
      {activeAction === 'ban' && (
        <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldBan className="w-4 h-4 text-red-400" /> حظر مستخدم
          </h3>
          <Input value={banUuid} onChange={(e) => setBanUuid(e.target.value)} placeholder="UUID المستخدم" dir="ltr" />
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">السبب</label>
            <select value={banReason} onChange={(e) => setBanReason(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="promo">ترويج</option>
              <option value="abuse">سب</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          {banReason === 'other' && (
            <Textarea value={banCustomReason} onChange={(e) => setBanCustomReason(e.target.value)} placeholder="اكتب السبب..." rows={2} />
          )}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">المدة</label>
            <select value={banDuration} onChange={(e) => setBanDuration(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="3h">3 ساعات</option>
              <option value="24h">يوم</option>
              <option value="48h">يومين</option>
              <option value="168h">أسبوع</option>
              <option value="720h">شهر</option>
              <option value="8760h">سنة</option>
            </select>
          </div>
          <Button variant="destructive" className="w-full" onClick={handleBan} disabled={banLoading}>
            {banLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ShieldBan className="w-4 h-4 ml-2" />}
            حظر
          </Button>
        </div>
      )}

      {/* User Search */}
      {activeAction === 'user_search' && (
        <div className="space-y-3">
          <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" /> بحث مستخدم
            </h3>
            <div className="flex gap-2">
              <Input value={searchUuid} onChange={(e) => setSearchUuid(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUserSearch(); }}
                placeholder="UUID المستخدم" dir="ltr" className="flex-1" />
              <Button size="sm" onClick={handleUserSearch} disabled={searchLoading}>
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {userInfo && (
            <div className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{userInfo.name || 'غير معروف'}</p>
                  <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">{searchUuid}</p>
                </div>
              </div>
              {[
                { label: 'VIP', value: userInfo.vip || 'لا يوجد' },
                { label: 'الراتب', value: userInfo.salary || '-' },
                { label: 'الدعم', value: userInfo.support || '-' },
                { label: 'المستوى', value: userInfo.level || '-' },
                { label: 'الوكالة', value: userInfo.agency || 'لا يوجد' },
                { label: 'الحظر', value: userInfo.ban || 'غير محظور' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Log */}
      {activeAction === 'action_log' && (
        <div className="space-y-3">
          <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-violet-400" /> سجل العمليات
            </h3>
            <div className="flex gap-2">
              <Input value={logAdmin} onChange={(e) => setLogAdmin(e.target.value)} placeholder="فلتر باسم الأدمن (اختياري)" className="flex-1" />
              <Button size="sm" onClick={handleLoadLogs} disabled={logLoading}>
                {logLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تحميل'}
              </Button>
            </div>
          </div>

          {logs.map((log: any, i: number) => (
            <div key={i} className="bg-card border border-border/40 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{log.admin}</span>
                  <span className="text-xs font-bold text-foreground">{log.action}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{log.time}</span>
              </div>
              {log.details && (
                <p className="text-[11px] text-muted-foreground font-mono truncate" dir="ltr">{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminManualActions;

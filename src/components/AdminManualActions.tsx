import React, { useState, useRef } from 'react';
import { Loader2, Crown, Hash, ShieldBan, Search, ScrollText, User, Upload, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useConfirmModal } from '@/hooks/use-confirm-modal';

const API = "https://galachat.site/project-z/api.php";
const ADMIN_KEY = "ghala2026owner";

interface Props {
  adminUsername: string;
}

const AdminManualActions: React.FC<Props> = ({ adminUsername }) => {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [activeAction, setActiveAction] = useState<'vip' | 'change_id' | 'ban' | 'user_search' | 'action_log' | null>(null);

  // VIP
  const [vipUuid, setVipUuid] = useState('');
  const [vipLevel, setVipLevel] = useState('3');
  const [vipDuration, setVipDuration] = useState('30');
  const [vipLoading, setVipLoading] = useState(false);

  // Change ID
  const [changeUuid, setChangeUuid] = useState('');
  const [newUuid, setNewUuid] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  // Ban
  const [banUuid, setBanUuid] = useState('');
  const [banReason, setBanReason] = useState('promo');
  const [banCustomReason, setBanCustomReason] = useState('');
  const [banDuration, setBanDuration] = useState('24h');
  const [banType, setBanType] = useState<'normal' | 'device'>('normal');
  const [banImage, setBanImage] = useState<File | null>(null);
  const [banLoading, setBanLoading] = useState(false);
  const banFileRef = useRef<HTMLInputElement>(null);

  // User search
  const [searchUuid, setSearchUuid] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Action log
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGiveVip = async () => {
    if (!vipUuid.trim()) { toast.error('أدخل UUID'); return; }
    setVipLoading(true);
    try {
      const data = await apiPost({ action: 'admin_give_vip', uuid: vipUuid.trim(), level: parseInt(vipLevel), duration: vipDuration });
      if (data.success) { toast.success('تم إعطاء VIP بنجاح'); setVipUuid(''); }
      else toast.error(data.error || 'فشلت العملية');
    } catch { toast.error('فشل الاتصال'); }
    setVipLoading(false);
  };

  const handleChangeId = async () => {
    if (!changeUuid.trim() || !newUuid.trim()) { toast.error('أدخل البيانات'); return; }
    setChangeLoading(true);
    try {
      const data = await apiPost({ action: 'admin_change_uuid', uuid: changeUuid.trim(), new_uuid: newUuid.trim() });
      if (data.success) { toast.success('تم تغيير الآيدي'); setChangeUuid(''); setNewUuid(''); }
      else toast.error(data.error || 'فشلت العملية');
    } catch { toast.error('فشل الاتصال'); }
    setChangeLoading(false);
  };

  const handleBan = async () => {
    if (!banUuid.trim()) { toast.error('أدخل UUID'); return; }
    const reason = banReason === 'other' ? banCustomReason : banReason;
    if (!reason.trim()) { toast.error('أدخل السبب'); return; }
    setBanLoading(true);
    try {
      const effectiveBanType = banReason === 'promo' ? 'device' : banType;
      const hours = banReason === 'promo' ? 999999 : (banDuration === '3h' ? 3 : banDuration === '6h' ? 6 : banDuration === '12h' ? 12 : 24);

      const body: any = {
        action: 'admin_ban_user',
        uuid: banUuid.trim(),
        reason,
        reason_type: banReason,
        duration: banDuration,
        admin: adminUsername,
      };
      if (banImage) {
        body.image = await fileToBase64(banImage);
      }
      const data = await apiPost(body);

      // Execute actual ban on the server
      try {
        await fetch(
          `https://hola-chat.com/wares-api.php?key=ghala2026actions&action=ban-user-real&uuid=${banUuid.trim()}&reason=${encodeURIComponent(reason)}&hours=${hours}&ban_type=${effectiveBanType}`
        );
      } catch (e) { console.error("Real ban failed:", e); }

      if (data.success) { toast.success('تم الحظر'); setBanUuid(''); setBanCustomReason(''); setBanImage(null); }
      else toast.error(data.error || 'فشلت العملية');
    } catch { toast.error('فشل الاتصال'); }
    setBanLoading(false);
  };

  const handleUserSearch = async () => {
    if (!searchUuid.trim()) return;
    setSearchLoading(true);
    setUserInfo(null);
    try {
      const data = await apiGet({ action: 'admin_user_info', admin_key: ADMIN_KEY, uuid: searchUuid.trim() });
      if (data.success !== false) setUserInfo(data);
      else toast.error(data.error || 'مستخدم غير موجود');
    } catch { toast.error('فشل البحث'); }
    setSearchLoading(false);
  };

  const handleLoadLogs = async () => {
    setLogLoading(true);
    try {
      const params: Record<string, string> = { action: 'admin_action_log', admin_key: ADMIN_KEY, limit: '50' };
      if (logAdmin.trim()) params.admin = logAdmin.trim();
      const data = await apiGet(params);
      if (data.logs) setLogs(data.logs);
    } catch { toast.error('فشل التحميل'); }
    setLogLoading(false);
  };

  const actions = [
    { key: 'vip' as const, label: 'إعطاء VIP', icon: <Crown className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { key: 'change_id' as const, label: 'تغيير آيدي', icon: <Hash className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { key: 'ban' as const, label: 'حظر مستخدم', icon: <ShieldBan className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { key: 'user_search' as const, label: 'بحث مستخدم', icon: <Search className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { key: 'action_log' as const, label: 'سجل العمليات', icon: <ScrollText className="w-5 h-5" />, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  ];

  if (!activeAction) {
    return (
      <>
      <div className="grid grid-cols-2 gap-3" dir="rtl">
        {actions.map((a, i) => (
          <motion.button
            key={a.key}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setActiveAction(a.key)}
            className={`${a.bg} border rounded-xl p-4 text-center hover:scale-[1.02] transition-all active:scale-[0.97]`}
          >
            <div className={`${a.color} mx-auto mb-2 flex justify-center`}>{a.icon}</div>
            <p className="text-sm font-bold text-foreground">{a.label}</p>
          </motion.button>
        ))}
      </div>
      {ConfirmDialog}
      </>
    );
  }

  const selectClass = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4" dir="rtl">
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
              <select value={vipLevel} onChange={(e) => setVipLevel(e.target.value)} className={selectClass}>
                {[1,2,3,4,5,6].map(l => <option key={l} value={l}>VIP {l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">المدة</label>
              <select value={vipDuration} onChange={(e) => setVipDuration(e.target.value)} className={selectClass}>
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
          <Input value={newUuid} onChange={(e) => setNewUuid(e.target.value)} placeholder="UUID الجديد" dir="ltr" />
          <Button className="w-full" onClick={handleChangeId} disabled={changeLoading}>
            {changeLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Hash className="w-4 h-4 ml-2" />}
            تغيير
          </Button>
        </div>
      )}

      {/* Ban User */}
      {activeAction === 'ban' && (
        <div className="bg-card border border-border/40 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldBan className="w-4 h-4 text-red-400" /> حظر مستخدم
          </h3>

          {/* 1. UUID */}
          <Input value={banUuid} onChange={(e) => setBanUuid(e.target.value)} placeholder="UUID المستخدم" dir="ltr" />

          {/* 2. سبب الحظر */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-2 block font-bold">سبب الحظر</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'promo', label: 'ترويج', color: 'border-red-500 bg-red-500/10 text-red-300' },
                { value: 'insult', label: 'سب / إساءة', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-300' },
                { value: 'other', label: 'أخرى', color: 'border-orange-500 bg-orange-500/10 text-orange-300' },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setBanReason(r.value)}
                  className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all ${banReason === r.value ? r.color + ' ring-1 ring-offset-1 ring-offset-background' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {banReason === 'other' && (
            <Textarea value={banCustomReason} onChange={(e) => setBanCustomReason(e.target.value)} placeholder="اكتب السبب..." rows={2} />
          )}

          {/* 3. نوع الحظر */}
          {banReason !== 'promo' ? (
            <div>
              <label className="text-[11px] text-muted-foreground mb-2 block font-bold">نوع الحظر</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${banType === 'normal' ? 'border-primary bg-primary/10 text-foreground' : 'border-border/40 text-muted-foreground'}`}>
                  <input type="radio" name="banType" checked={banType === 'normal'} onChange={() => setBanType('normal')} className="sr-only" />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${banType === 'normal' ? 'border-primary' : 'border-muted-foreground/50'}`}>
                    {banType === 'normal' && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-xs font-bold">حساب فقط</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${banType === 'device' ? 'border-destructive bg-destructive/10 text-foreground' : 'border-border/40 text-muted-foreground'}`}>
                  <input type="radio" name="banType" checked={banType === 'device'} onChange={() => setBanType('device')} className="sr-only" />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${banType === 'device' ? 'border-destructive' : 'border-muted-foreground/50'}`}>
                    {banType === 'device' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                  </div>
                  <span className="text-xs font-bold">جهاز كامل</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
              <p className="text-xs text-red-400 font-bold">الترويج = حظر جهاز دائم تلقائي (999,999 ساعة)</p>
            </div>
          )}

          {/* 4. مدة الحظر */}
          {banReason !== 'promo' && (
            <div>
              <label className="text-[11px] text-muted-foreground mb-2 block font-bold">مدة الحظر</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: '3h', label: '3 ساعات' },
                  { value: '6h', label: '6 ساعات' },
                  { value: '12h', label: '12 ساعة' },
                  { value: '24h', label: '24 ساعة' },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setBanDuration(d.value)}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all ${banDuration === d.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. صورة إثبات */}
          <div>
            <input type="file" ref={banFileRef} className="hidden" accept="image/*,video/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size <= 10 * 1024 * 1024) setBanImage(f);
                else if (f) toast.error('الحد الأقصى 10MB');
              }}
            />
            <button
              onClick={() => banFileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10 text-muted-foreground text-xs hover:border-primary/30 transition-all"
            >
              {banImage ? (
                <><Image className="w-4 h-4 text-primary" /> {banImage.name}</>
              ) : (
                <><Upload className="w-4 h-4" /> رفع صورة أو فيديو إثبات (اختياري)</>
              )}
            </button>
          </div>

          {/* 6 & 7. أزرار التنفيذ وفك الحظر */}
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={async () => {
              if (!banUuid.trim()) { toast.error('أدخل UUID'); return; }
              const reason = banReason === 'other' ? banCustomReason : banReason;
              if (!reason.trim()) { toast.error('أدخل السبب'); return; }
              const ok = await confirm({ title: "تأكيد الحظر", message: `حظر UUID ${banUuid}؟`, danger: true, confirmText: "تنفيذ الحظر" });
              if (ok) handleBan();
            }} disabled={banLoading}>
              {banLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ShieldBan className="w-4 h-4 ml-2" />}
              تنفيذ الحظر
            </Button>
            <Button
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={async () => {
                if (!banUuid.trim()) { toast.error('أدخل UUID'); return; }
                const ok = await confirm({ title: "تأكيد فك الحظر", message: `فك الحظر عن UUID ${banUuid}؟`, danger: false, confirmText: "فك الحظر" });
                if (!ok) return;
                try {
                  await fetch(`https://hola-chat.com/wares-api.php?key=ghala2026actions&action=unban-user-real&uuid=${banUuid.trim()}`);
                  toast.success('تم فك الحظر!');
                } catch { toast.error('فشل فك الحظر'); }
              }}
            >
              فك الحظر
            </Button>
          </div>
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3 mb-3">
                {userInfo.avatar ? (
                  <img src={userInfo.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">{userInfo.name || 'غير معروف'}</p>
                  <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">{searchUuid}</p>
                </div>
                {userInfo.online && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold mr-auto">متصل</span>
                )}
              </div>
              {[
                { label: 'VIP', value: userInfo.vip_level ? `VIP ${userInfo.vip_level}` : 'لا يوجد' },
                { label: 'الراتب', value: userInfo.salary || '-' },
                { label: 'إرسال شهري', value: userInfo.monthly_sent || '-' },
                { label: 'استقبال شهري', value: userInfo.monthly_received || '-' },
                { label: 'مستوى الإرسال', value: userInfo.sender_level ?? '-' },
                { label: 'مستوى الاستقبال', value: userInfo.receiver_level ?? '-' },
                { label: 'الوكالة', value: userInfo.agency_id || 'لا يوجد' },
                { label: 'الحظر', value: userInfo.is_banned ? 'محظور' : 'غير محظور' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-xs font-bold ${item.label === 'الحظر' && userInfo.is_banned ? 'text-destructive' : 'text-foreground'}`}>{item.value}</span>
                </div>
              ))}
            </motion.div>
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
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border/40 rounded-xl p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{log.admin}</span>
                  <span className="text-xs font-bold text-foreground">{log.action}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{log.time}</span>
              </div>
              {log.uuid && <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">UUID: {log.uuid}</p>}
              {log.details && (
                <p className="text-[11px] text-muted-foreground truncate">{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AdminManualActions;

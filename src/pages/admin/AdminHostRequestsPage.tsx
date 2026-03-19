import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Loader2, Upload, Image, Send, CheckCircle, XCircle, Clock, ChevronDown, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AdminPageLayout from '@/components/AdminPageLayout';

const REQUEST_TYPES = [
  { id: 'change_id', label: 'تغيير آيدي', emoji: '🔑' },
  { id: 'room_bg', label: 'خلفية غرفة', emoji: '🖼️' },
  { id: 'custom_gift', label: 'هدية مخصصة', emoji: '🎁' },
  { id: 'other', label: 'طلب آخر', emoji: '📝' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'قيد المراجعة', color: 'text-amber-400', icon: Clock },
  approved: { label: 'مقبول', color: 'text-emerald-400', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'text-red-400', icon: XCircle },
};

const AdminHostRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const adminUsername = localStorage.getItem('admin_username') || '';
  const adminDisplayName = localStorage.getItem('admin_display_name') || adminUsername;
  const adminRole = localStorage.getItem('admin_role') || '';
  const isAdmin = adminRole === 'admin';
  const isSuperOrOwner = adminRole === 'super_admin' || adminRole === 'owner';

  // Form state (admin submission)
  const [userUuid, setUserUuid] = useState('');
  const [requestType, setRequestType] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Super admin list for assignment
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [showAdminPicker, setShowAdminPicker] = useState(false);

  // Incoming requests (for super admin)
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // My sent requests (for admin)
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    loadSuperAdmins();
    if (isSuperOrOwner) loadIncomingRequests();
    if (isAdmin) loadMyRequests();

    // Realtime
    const channel = supabase
      .channel('admin-host-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_host_requests' }, () => {
        if (isSuperOrOwner) loadIncomingRequests();
        if (isAdmin) loadMyRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadSuperAdmins = async () => {
    const { data } = await supabase
      .from('admin_accounts')
      .select('username, display_name, role, is_active')
      .eq('is_active', true)
      .in('role', ['super_admin', 'owner']);

    // Check who's on shift now
    const { data: shifts } = await supabase.from('admin_shifts').select('*').eq('is_active', true);
    const now = new Date();
    const saudiHour = (now.getUTCHours() + 3) % 24;
    const saudiMin = now.getUTCMinutes();
    const nowMins = saudiHour * 60 + saudiMin;

    const adminsWithShift = (data || []).map(a => {
      const shift = shifts?.find(s => s.admin_username === a.username);
      let onShift = false;
      if (shift) {
        const [sh, sm] = shift.shift_start.split(':').map(Number);
        const [eh, em] = shift.shift_end.split(':').map(Number);
        const startM = sh * 60 + sm;
        const endM = eh * 60 + em;
        onShift = endM > startM ? (nowMins >= startM && nowMins < endM) : (nowMins >= startM || nowMins < endM);
      }
      return { ...a, onShift };
    });

    setSuperAdmins(adminsWithShift);
  };

  const loadIncomingRequests = async () => {
    setLoadingRequests(true);
    const query = supabase
      .from('admin_host_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    // Super admins see requests assigned to them + unassigned
    if (adminRole === 'super_admin') {
      query.or(`assigned_to.eq.${adminUsername},assigned_to.is.null`);
    }

    const { data } = await query;
    setRequests((data as any[]) || []);
    setLoadingRequests(false);
  };

  const loadMyRequests = async () => {
    const { data } = await supabase
      .from('admin_host_requests')
      .select('*')
      .eq('submitted_by', adminUsername)
      .order('created_at', { ascending: false })
      .limit(30);
    setMyRequests((data as any[]) || []);
  };

  const handleSubmit = async () => {
    if (!userUuid.trim()) { toast.error('أدخل UUID المستخدم'); return; }
    if (!requestType) { toast.error('اختر نوع الطلب'); return; }
    if (!selectedAdmin) { toast.error('اختر السوبر أدمن'); return; }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const path = `host-requests/admin/${adminUsername}_${Date.now()}.${file.name.split('.').pop()}`;
        const { data: upData } = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type, upsert: true });
        if (upData) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      const selectedAdminInfo = superAdmins.find(a => a.username === selectedAdmin);

      const { error } = await supabase.from('admin_host_requests').insert({
        user_uuid: userUuid.trim(),
        request_type: requestType,
        notes: notes.trim() || null,
        image_url: imageUrl,
        submitted_by: adminUsername,
        submitted_by_name: adminDisplayName,
        assigned_to: selectedAdmin,
        assigned_to_name: selectedAdminInfo?.display_name || selectedAdmin,
      });

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_uuid: selectedAdmin,
        target: 'admin',
        title: '📋 طلب مضيفة جديد',
        body: `${adminDisplayName} أرسلت طلب (${REQUEST_TYPES.find(t => t.id === requestType)?.label}) للمستخدم ${userUuid.trim()}`,
        type: 'host_request',
      });

      toast.success('تم إرسال الطلب!');
      setUserUuid(''); setRequestType(''); setNotes(''); setFile(null); setSelectedAdmin('');
      if (isAdmin) loadMyRequests();
    } catch (err: any) {
      toast.error(err?.message || 'فشل الإرسال');
    }
    setSubmitting(false);
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected', reason?: string) => {
    const { error } = await supabase
      .from('admin_host_requests')
      .update({ status: action, reject_reason: reason || null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) { toast.error('فشل التحديث'); return; }

    const req = requests.find(r => r.id === id);
    if (req) {
      await supabase.from('notifications').insert({
        user_uuid: req.submitted_by,
        target: 'admin',
        title: action === 'approved' ? '✅ تم قبول طلبك' : '❌ تم رفض طلبك',
        body: action === 'approved'
          ? `طلب ${REQUEST_TYPES.find(t => t.id === req.request_type)?.label} للمستخدم ${req.user_uuid} تم قبوله`
          : `طلب ${REQUEST_TYPES.find(t => t.id === req.request_type)?.label} رُفض: ${reason || 'بدون سبب'}`,
        type: 'host_request_response',
      });
    }

    toast.success(action === 'approved' ? 'تم القبول' : 'تم الرفض');
    setRejectId(null); setRejectReason('');
    loadIncomingRequests();
  };

  return (
    <AdminPageLayout title="طلبات المضيفات" onBack={() => navigate('/admin/dashboard')}>
      <div className="space-y-5 pb-20" dir="rtl">

        {/* ─── Submit Form (for admins) ─── */}
        {(isAdmin || isSuperOrOwner) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-400" />
              إرسال طلب جديد
            </h3>

            <Input value={userUuid} onChange={(e) => setUserUuid(e.target.value)} placeholder="UUID المستخدم" dir="ltr" />

            {/* Request type */}
            <div className="grid grid-cols-2 gap-2">
              {REQUEST_TYPES.map(t => (
                <button key={t.id} onClick={() => setRequestType(t.id)}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${requestType === t.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border/30 text-muted-foreground'}`}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>

            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تعليق أو ملاحظات..." rows={2} />

            {/* File upload */}
            <input type="file" ref={fileRef} className="hidden" accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= 10 * 1024 * 1024) setFile(f); else if (f) toast.error('الحد 10MB'); }}
            />
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10 text-muted-foreground text-xs hover:border-primary/30 transition-all">
              {file ? <><Image className="w-4 h-4 text-primary" /> {file.name}</> : <><Upload className="w-4 h-4" /> رفع صورة (اختياري)</>}
            </button>

            {/* Super admin picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">أرسل إلى سوبر أدمن:</label>
              <div className="space-y-1.5">
                {superAdmins.map(a => (
                  <button key={a.username} onClick={() => setSelectedAdmin(a.username)}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all ${selectedAdmin === a.username ? 'border-primary bg-primary/10' : 'border-border/30'}`}>
                    <Circle className={`w-3 h-3 ${a.onShift ? 'text-emerald-400 fill-emerald-400' : 'text-muted-foreground/30'}`} />
                    <span className="text-xs font-bold flex-1">{a.display_name || a.username}</span>
                    {a.onShift && <span className="text-[9px] text-emerald-400 font-bold">مناوب</span>}
                    <span className="text-[9px] text-muted-foreground">{a.role === 'owner' ? 'مالك' : 'سوبر'}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
              إرسال الطلب
            </Button>
          </motion.div>
        )}

        {/* ─── Incoming Requests (for super admin / owner) ─── */}
        {isSuperOrOwner && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              📥 طلبات واردة
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </h3>

            {loadingRequests ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : requests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد طلبات</p>
            ) : (
              requests.map((req, i) => {
                const typeInfo = REQUEST_TYPES.find(t => t.id === req.request_type);
                const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusInfo.icon;
                return (
                  <motion.div key={req.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border/40 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{typeInfo?.emoji || '📋'}</span>
                        <span className="text-xs font-bold">{typeInfo?.label || req.request_type}</span>
                      </div>
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p>UUID: <span className="font-mono text-foreground" dir="ltr">{req.user_uuid}</span></p>
                      <p>من: <span className="text-foreground font-bold">{req.submitted_by_name}</span></p>
                      {req.notes && <p className="text-foreground">{req.notes}</p>}
                      <p className="text-[10px]">{new Date(req.created_at).toLocaleString('ar-EG')}</p>
                    </div>

                    {req.image_url && (
                      <img src={req.image_url} alt="" className="w-full max-h-40 object-contain rounded-xl bg-black/20" />
                    )}

                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => handleAction(req.id, 'approved')}>
                          <CheckCircle className="w-3.5 h-3.5 ml-1" /> قبول
                        </Button>
                        {rejectId === req.id ? (
                          <div className="flex-1 space-y-1.5">
                            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="سبب الرفض..." className="h-8 text-xs" />
                            <div className="flex gap-1">
                              <Button size="sm" variant="destructive" className="flex-1 h-7 text-[10px]" onClick={() => handleAction(req.id, 'rejected', rejectReason)}>
                                رفض
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setRejectId(null)}>إلغاء</Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={() => setRejectId(req.id)}>
                            <XCircle className="w-3.5 h-3.5 ml-1" /> رفض
                          </Button>
                        )}
                      </div>
                    )}

                    {req.status === 'rejected' && req.reject_reason && (
                      <p className="text-[10px] text-destructive bg-destructive/10 p-2 rounded-lg">سبب الرفض: {req.reject_reason}</p>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ─── My Sent Requests (for admin) ─── */}
        {isAdmin && myRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">📤 طلباتي المرسلة</h3>
            {myRequests.map((req, i) => {
              const typeInfo = REQUEST_TYPES.find(t => t.id === req.request_type);
              const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusInfo.icon;
              return (
                <motion.div key={req.id}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border/40 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{typeInfo?.emoji} {typeInfo?.label}</span>
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">UUID: {req.user_uuid} • إلى: {req.assigned_to_name}</p>
                  {req.status === 'rejected' && req.reject_reason && (
                    <p className="text-[10px] text-destructive">❌ {req.reject_reason}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default AdminHostRequestsPage;

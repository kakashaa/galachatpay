import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Loader2, Upload, Image, Send, CheckCircle, XCircle, Clock,
  Crown, Fingerprint, Frame, Gift, Paintbrush, Award, HelpCircle,
  Mic, ChevronLeft, Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AdminPageLayout from '@/components/AdminPageLayout';
import VoiceRecorder from '@/components/support/VoiceRecorder';

import { galaApi } from '@/services/galaApi';
import PageLoader from '@/components/PageLoader';

/* ─── Service Types ─── */
const REQUEST_TYPES = [
  { id: 'change_id', label: 'تغيير آيدي', icon: Fingerprint, color: '#a78bfa', gradient: 'from-violet-500 to-purple-600' },
  { id: 'vip', label: 'VIP', icon: Crown, color: '#f59e0b', gradient: 'from-amber-400 to-yellow-600' },
  { id: 'frame', label: 'إطار', icon: Frame, color: '#3b82f6', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'entry', label: 'دخولية', icon: Award, color: '#14b8a6', gradient: 'from-teal-400 to-cyan-600' },
  { id: 'room_bg', label: 'خلفية غرفة', icon: Paintbrush, color: '#ec4899', gradient: 'from-pink-500 to-rose-600' },
  { id: 'custom_gift', label: 'هدية مخصصة', icon: Gift, color: '#f43f5e', gradient: 'from-rose-500 to-red-600' },
  { id: 'badge', label: 'شارة', icon: Award, color: '#8b5cf6', gradient: 'from-purple-500 to-violet-600' },
  { id: 'other', label: 'طلب آخر', icon: HelpCircle, color: '#64748b', gradient: 'from-slate-400 to-slate-600' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'جديدة', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
  in_progress: { label: 'قيد التنفيذ', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Loader2 },
  approved: { label: 'منجز', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'text-red-400', bg: 'bg-red-500/10', icon: XCircle },
};

type TabKey = 'new' | 'submit' | 'in_progress' | 'done' | 'rejected';

const AdminHostRequestsPage: React.FC = () => {
  const adminUsername = localStorage.getItem('admin_username') || '';
  const adminDisplayName = localStorage.getItem('admin_display_name') || adminUsername;
  const adminRole = localStorage.getItem('admin_role') || '';
  const isRegularAdmin = adminRole === 'admin';
  const isSuperOrOwner = adminRole === 'super_admin' || adminRole === 'owner' || adminRole === 'moderator';
  

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('submit');

  // Form state
  const [userUuid, setUserUuid] = useState('');
  const [userPreview, setUserPreview] = useState<{ name: string; avatar: string } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [requestType, setRequestType] = useState('');
  const [notes, setNotes] = useState('');
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Super admin list
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState('');

  // Requests
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Reject
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadSuperAdmins();
    loadRequests();

    const channel = supabase
      .channel('admin-host-requests-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_host_requests' }, () => {
        loadRequests();
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
    }).sort((a, b) => (b.onShift ? 1 : 0) - (a.onShift ? 1 : 0));

    setSuperAdmins(adminsWithShift);
    // Auto-select on-duty
    const onDuty = adminsWithShift.find(a => a.onShift);
    if (onDuty) setSelectedAdmin(onDuty.username);
  };

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    let query = supabase
      .from('admin_host_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Role-based filtering
    if (isRegularAdmin) {
      query = query.eq('submitted_by', adminUsername);
    } else if (adminRole === 'super_admin' || adminRole === 'moderator') {
      query = query.or(`assigned_to.eq.${adminUsername},assigned_to.is.null,submitted_by.eq.${adminUsername}`);
    }
    // Owner sees all

    const { data } = await query;
    setRequests((data as any[]) || []);
    setLoadingRequests(false);
  }, [adminUsername, adminRole, isRegularAdmin]);

  // User lookup
  const lookupUser = useCallback(async (uuid: string) => {
    if (!uuid.trim()) { setUserPreview(null); return; }
    setLookingUp(true);
    try {
      const json = await galaApi.userDiamonds(uuid.trim()) as any;
      const d = json?.data?.[0];
      if (d?.name) {
        setUserPreview({ name: d.name, avatar: d.avatar || '' });
      } else {
        setUserPreview(null);
      }
    } catch {
      setUserPreview(null);
    }
    setLookingUp(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userUuid.trim().length >= 3) lookupUser(userUuid);
    }, 500);
    return () => clearTimeout(timer);
  }, [userUuid, lookupUser]);

  // Submit
  const handleSubmit = async () => {
    if (!userUuid.trim()) { toast.error('أدخل UUID المستخدم'); return; }
    if (!requestType) { toast.error('اختر نوع الطلب'); return; }
    if (!selectedAdmin) { toast.error('اختر المشرف'); return; }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const path = `host-requests/${adminUsername}_${Date.now()}.${file.name.split('.').pop()}`;
        const { data: upData } = await supabase.storage.from('attachments').upload(path, file, { contentType: file.type, upsert: true });
        if (upData) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      const selectedAdminInfo = superAdmins.find(a => a.username === selectedAdmin);
      const typeLabel = REQUEST_TYPES.find(t => t.id === requestType)?.label || requestType;

      const { error } = await supabase.from('admin_host_requests').insert({
        user_uuid: userUuid.trim(),
        request_type: requestType,
        notes: notes.trim() || null,
        image_url: imageUrl,
        submitted_by: adminUsername,
        submitted_by_name: adminDisplayName,
        assigned_to: selectedAdmin,
        assigned_to_name: selectedAdminInfo?.display_name || selectedAdmin,
      } as any);

      if (error) throw error;

      // WA notification to assigned admin
      if (selectedAdminInfo) {
        const { data: shift } = await supabase
          .from('admin_shifts')
          .select('phone_number')
          .eq('admin_username', selectedAdmin)
          .eq('is_active', true)
          .maybeSingle();

        if (shift?.phone_number) {
          const { sendWhatsAppNotification } = await import('@/utils/sendWhatsAppNotification');
          sendWhatsAppNotification(
            shift.phone_number,
            `غلا شات 💬\n\n📋 طلب مضيفة جديد!\nمن: ${adminDisplayName}\nالنوع: ${typeLabel}\nالمستخدم: ${userUuid.trim()}`
          ).catch(() => {});
        }
      }

      toast.success('تم إرسال الطلب ✅');
      setUserUuid(''); setRequestType(''); setNotes(''); setFile(null); setVoiceUrl(null); setUserPreview(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'فشل الإرسال');
    }
    setSubmitting(false);
  };

  // Actions
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await supabase.from('admin_host_requests').update({
      status: 'approved', updated_at: new Date().toISOString(),
    } as any).eq('id', id);

    const req = requests.find(r => r.id === id);
    if (req) {
      await supabase.from('admin_audit_log').insert({
        admin_username: adminUsername, admin_role: adminRole,
        action: 'host_request_approved',
        details: { request_id: id, user_uuid: req.user_uuid, type: req.request_type },
      });
    }

    toast.success('تم القبول ✅');
    setActionLoading(null);
    setSelectedRequest(null);
    loadRequests();
  };

  const handleReject = async (id: string, reason: string) => {
    if (!reason.trim()) { toast.error('أدخل سبب الرفض'); return; }
    setActionLoading(id);
    await supabase.from('admin_host_requests').update({
      status: 'rejected', reject_reason: reason, updated_at: new Date().toISOString(),
    } as any).eq('id', id);

    const req = requests.find(r => r.id === id);
    if (req) {
      // Notify submitter
      const { data: shift } = await supabase.from('admin_shifts')
        .select('phone_number')
        .eq('admin_username', req.submitted_by)
        .eq('is_active', true)
        .maybeSingle();
      if (shift?.phone_number) {
        const { sendWhatsAppNotification } = await import('@/utils/sendWhatsAppNotification');
        sendWhatsAppNotification(
          shift.phone_number,
          `غلا شات 💬\n\n❌ تم رفض طلبك\nالنوع: ${REQUEST_TYPES.find(t => t.id === req.request_type)?.label}\nالسبب: ${reason}`
        ).catch(() => {});
      }
    }

    toast.success('تم الرفض');
    setActionLoading(null);
    setRejectId(null);
    setRejectReason('');
    setSelectedRequest(null);
    loadRequests();
  };

  const handleAcceptProgress = async (id: string) => {
    setActionLoading(id);
    await supabase.from('admin_host_requests').update({
      status: 'in_progress', updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    toast.success('تم قبول الطلب — قيد التنفيذ');
    setActionLoading(null);
    loadRequests();
  };

  // Filter by tab
  const filteredRequests = requests.filter(r => {
    switch (activeTab) {
      case 'new': return r.status === 'pending';
      case 'in_progress': return r.status === 'in_progress';
      case 'done': return r.status === 'approved';
      case 'rejected': return r.status === 'rejected';
      default: return false;
    }
  });

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'submit', label: 'إرسال طلب' },
    { key: 'new', label: 'الجديدة', count: requests.filter(r => r.status === 'pending').length },
    { key: 'in_progress', label: 'قيد التنفيذ', count: requests.filter(r => r.status === 'in_progress').length },
    { key: 'done', label: 'المنجزة' },
    { key: 'rejected', label: 'المرفوضة' },
  ];

  if (loadingRequests && requests.length === 0) {
    return <AdminPageLayout title="طلبات المضيفات"><PageLoader message="جاري تحميل الطلبات..." /></AdminPageLayout>;
  }

  return (
    <AdminPageLayout title="طلبات المضيفات">
      <div className="space-y-4 pb-24" dir="rtl">

        {/* ─── Tabs ─── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-card border border-border/30 text-muted-foreground'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-destructive text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Submit Form Tab ─── */}
        <AnimatePresence mode="wait">
          {activeTab === 'submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* User UUID input */}
              <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  المستخدم
                </h3>
                <Input
                  value={userUuid}
                  onChange={(e) => setUserUuid(e.target.value)}
                  placeholder="أدخل UUID المستخدم"
                  dir="ltr"
                  className="font-mono"
                />
                {lookingUp && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> جاري البحث...
                  </div>
                )}
                {userPreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    <img
                      src={userPreview.avatar || '/placeholder.svg'}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-border"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                    <div>
                      <p className="text-sm font-bold text-foreground">{userPreview.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">#{userUuid.trim()}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-400 mr-auto" />
                  </motion.div>
                )}
              </div>

              {/* Service type */}
              <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-teal-400" />
                  نوع الخدمة
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {REQUEST_TYPES.map(t => {
                    const Icon = t.icon;
                    const isActive = requestType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setRequestType(t.id)}
                        className="flex flex-col items-center gap-1.5 py-2"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isActive ? `bg-gradient-to-br ${t.gradient} shadow-lg` : 'bg-muted/20 border border-border/30'
                          }`}
                        >
                          <Icon size={20} className={isActive ? 'text-white' : 'text-muted-foreground'} />
                        </div>
                        <span className={`text-[9px] font-bold text-center leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">التفاصيل</h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظة أو تعليق..."
                  rows={3}
                />

                {/* Voice */}
                <div className="flex items-center gap-2">
                  <VoiceRecorder
                    userUuid={adminUsername}
                    onVoiceSent={(url) => setVoiceUrl(url)}
                  />
                  {voiceUrl && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Mic className="w-3 h-3" /> تم التسجيل
                    </span>
                  )}
                </div>

                {/* Image */}
                <input
                  type="file"
                  ref={fileRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
                    else if (f) toast.error('الحد الأقصى 10MB');
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10 text-muted-foreground text-xs hover:border-primary/30 transition-all"
                >
                  {file ? (
                    <><Image className="w-4 h-4 text-primary" /> {file.name}</>
                  ) : (
                    <><Upload className="w-4 h-4" /> رفع صورة (اختياري)</>
                  )}
                </button>
              </div>

              {/* Assigned admin */}
              <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">إرسال إلى:</h3>
                <div className="space-y-1.5">
                  {superAdmins.map(a => (
                    <button
                      key={a.username}
                      onClick={() => setSelectedAdmin(a.username)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all ${
                        selectedAdmin === a.username
                          ? 'border-primary bg-primary/10'
                          : 'border-border/30 hover:border-border/50'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {(a.display_name || a.username).charAt(0).toUpperCase()}
                        </div>
                        {a.onShift && (
                          <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-foreground">{a.display_name || a.username}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-muted-foreground">
                            {a.role === 'owner' ? 'مالك' : 'مشرف'}
                          </span>
                          {a.onShift && (
                            <span className="text-[9px] text-emerald-400 font-bold">🟢 مناوب الحين</span>
                          )}
                        </div>
                      </div>
                      {selectedAdmin === a.username && <CheckCircle className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit button */}
              <Button className="w-full h-12 text-sm font-bold" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                إرسال الطلب
              </Button>
            </motion.div>
          )}

          {/* ─── Request Lists ─── */}
          {activeTab !== 'submit' && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
                </div>
              ) : (
                filteredRequests.map((req, i) => {
                  const typeInfo = REQUEST_TYPES.find(t => t.id === req.request_type);
                  const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusInfo.icon;
                  const TypeIcon = typeInfo?.icon || HelpCircle;

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedRequest(req)}
                      className="bg-card border border-border/40 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-border/60 transition-colors active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: `${typeInfo?.color || '#64748b'}15` }}
                          >
                            <TypeIcon size={16} style={{ color: typeInfo?.color || '#64748b' }} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground">{typeInfo?.label || req.request_type}</span>
                            <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">#{req.user_uuid}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                          </span>
                          <ChevronLeft className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>من: <span className="text-foreground font-bold">{req.submitted_by_name}</span></span>
                        <span>{new Date(req.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {req.notes && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{req.notes}</p>
                      )}
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Request Detail Sheet ─── */}
        <AnimatePresence>
          {selectedRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-end justify-center"
              onClick={() => setSelectedRequest(null)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-[448px] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border"
                dir="rtl"
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                </div>

                <div className="px-5 pb-8 space-y-4">
                  {(() => {
                    const req = selectedRequest;
                    const typeInfo = REQUEST_TYPES.find(t => t.id === req.request_type);
                    const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusInfo.icon;
                    const TypeIcon = typeInfo?.icon || HelpCircle;

                    return (
                      <>
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${typeInfo?.gradient || 'from-slate-400 to-slate-600'}`}
                          >
                            <TypeIcon size={22} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-foreground">{typeInfo?.label || req.request_type}</h3>
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between p-2.5 rounded-xl bg-muted/10">
                            <span className="text-muted-foreground">المستخدم:</span>
                            <span className="font-mono font-bold" dir="ltr">{req.user_uuid}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-muted/10">
                            <span className="text-muted-foreground">مرسل من:</span>
                            <span className="font-bold">{req.submitted_by_name}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-muted/10">
                            <span className="text-muted-foreground">مرسل إلى:</span>
                            <span className="font-bold">{req.assigned_to_name || '—'}</span>
                          </div>
                          <div className="flex justify-between p-2.5 rounded-xl bg-muted/10">
                            <span className="text-muted-foreground">التاريخ:</span>
                            <span>{new Date(req.created_at).toLocaleString('ar-EG')}</span>
                          </div>
                        </div>

                        {req.notes && (
                          <div className="p-3 rounded-xl bg-muted/10 border border-border/20">
                            <p className="text-[11px] text-muted-foreground mb-1">الملاحظات:</p>
                            <p className="text-xs text-foreground whitespace-pre-wrap">{req.notes}</p>
                          </div>
                        )}

                        {req.image_url && (
                          <img
                            src={req.image_url}
                            alt=""
                            className="w-full max-h-48 object-contain rounded-xl bg-black/20 border border-border/20"
                          />
                        )}

                        {req.status === 'rejected' && req.reject_reason && (
                          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                            <p className="text-[11px] text-destructive font-bold">سبب الرفض:</p>
                            <p className="text-xs text-destructive/80 mt-1">{req.reject_reason}</p>
                          </div>
                        )}

                        {/* Actions for pending requests */}
                        {req.status === 'pending' && isSuperOrOwner && (
                          <div className="space-y-2 pt-2">
                            <div className="flex gap-2">
                              <Button
                                className="flex-1 h-10"
                                onClick={() => handleAcceptProgress(req.id)}
                                disabled={actionLoading === req.id}
                              >
                                {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                                قبول
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1 h-10"
                                onClick={() => setRejectId(req.id)}
                                disabled={actionLoading === req.id}
                              >
                                <XCircle className="w-4 h-4 ml-1" /> رفض
                              </Button>
                            </div>

                            {rejectId === req.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-2"
                              >
                                <Input
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="سبب الرفض..."
                                  className="text-xs"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleReject(req.id, rejectReason)}
                                  >
                                    تأكيد الرفض
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setRejectId(null); setRejectReason(''); }}
                                  >
                                    إلغاء
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )}

                        {/* Mark as done for in_progress */}
                        {req.status === 'in_progress' && isSuperOrOwner && (
                          <Button
                            className="w-full h-10"
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === req.id}
                          >
                            {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                            تم التنفيذ ✅
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminPageLayout>
  );
};

export default AdminHostRequestsPage;

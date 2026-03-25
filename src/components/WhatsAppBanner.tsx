import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ArrowLeft, Check, Loader2, Send, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Send WA verification via direct fetch to project-z API (no proxy/edge function needed)
async function sendWaVerification(phone: string, message: string): Promise<void> {
  try {
    const response = await fetch('https://hola-chat.com/project-z/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'wa_notify',
        key: 'ghala2026owner',
        phone: phone,
        message: message,
      }).toString(),
    });
    const data = await response.json();
    console.log('WA verify result:', data);
  } catch (err) {
    console.error('WA verify error:', err);
  }
}
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface Props {
  userUuid: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const COUNTRIES = [
  // الدول العربية
  { flag: '🇾🇪', name: 'اليمن', code: '+967' },
  { flag: '🇸🇦', name: 'السعودية', code: '+966' },
  { flag: '🇮🇶', name: 'العراق', code: '+964' },
  { flag: '🇰🇼', name: 'الكويت', code: '+965' },
  { flag: '🇪🇬', name: 'مصر', code: '+20' },
  { flag: '🇩🇿', name: 'الجزائر', code: '+213' },
  { flag: '🇱🇧', name: 'لبنان', code: '+961' },
  { flag: '🇹🇳', name: 'تونس', code: '+216' },
  { flag: '🇦🇪', name: 'الإمارات', code: '+971' },
  { flag: '🇱🇾', name: 'ليبيا', code: '+218' },
  { flag: '🇸🇩', name: 'السودان', code: '+249' },
  { flag: '🇯🇴', name: 'الأردن', code: '+962' },
  { flag: '🇶🇦', name: 'قطر', code: '+974' },
  { flag: '🇧🇭', name: 'البحرين', code: '+973' },
  { flag: '🇸🇾', name: 'سوريا', code: '+963' },
  { flag: '🇲🇦', name: 'المغرب', code: '+212' },
  { flag: '🇴🇲', name: 'عمان', code: '+968' },
  { flag: '🇵🇸', name: 'فلسطين', code: '+970' },
  { flag: '🇲🇷', name: 'موريتانيا', code: '+222' },
  { flag: '🇩🇯', name: 'جيبوتي', code: '+253' },
  { flag: '🇸🇴', name: 'الصومال', code: '+252' },
  { flag: '🇰🇲', name: 'جزر القمر', code: '+269' },
  // دول إضافية
  { flag: '🇺🇸', name: 'أمريكا', code: '+1' },
  { flag: '🇬🇧', name: 'بريطانيا', code: '+44' },
  { flag: '🇫🇷', name: 'فرنسا', code: '+33' },
  { flag: '🇹🇷', name: 'تركيا', code: '+90' },
  { flag: '🇷🇺', name: 'روسيا', code: '+7' },
  { flag: '🇲🇾', name: 'ماليزيا', code: '+60' },
];

const DISMISS_KEY = 'wa_banner_dismiss';

export const shouldShowWhatsAppBanner = (): boolean => {
  const last = localStorage.getItem(DISMISS_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last) > 24 * 60 * 60 * 1000;
};

export const dismissWhatsAppBanner = () => {
  localStorage.setItem(DISMISS_KEY, Date.now().toString());
};

const WhatsAppBanner: React.FC<Props> = ({ userUuid, userName, onClose, onSuccess }) => {
  const [step, setStep] = useState<'banner' | 'country' | 'phone' | 'otp'>('banner');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const [sentCode, setSentCode] = useState('');

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const fullPhone = `${selectedCountry.code}${phone.replace(/^0+/, '')}`;

  const handleSendCode = async () => {
    if (!phone.trim() || phone.length < 6) {
      toast.error('أدخل رقم صحيح');
      return;
    }
    setSending(true);
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setSentCode(code);

      await supabase.from('whatsapp_verifications' as any).insert({
        user_uuid: userUuid,
        phone: fullPhone,
        code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        verified: false,
      } as any);

      await sendWaVerification(fullPhone, `غلا شات 💬\n\n🔐 رمز التحقق: ${code}\nلا تشاركه مع أحد`);

      setStep('otp');
      setResendTimer(60);
      setAttempts(0);
      toast.success('تم إرسال كود التحقق');
    } catch {
      toast.error('فشل إرسال الكود');
    }
    setSending(false);
  };

  const handleVerify = async (value: string) => {
    if (value.length !== 4) return;
    if (attempts >= 3) {
      toast.error('تجاوزت عدد المحاولات المسموحة');
      return;
    }

    setVerifying(true);
    setAttempts(a => a + 1);

    try {
      const { data } = await supabase
        .from('whatsapp_verifications' as any)
        .select('*')
        .eq('user_uuid', userUuid)
        .eq('phone', fullPhone)
        .eq('code', value)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!data || (data as any[]).length === 0) {
        toast.error('كود خاطئ أو منتهي الصلاحية');
        setOtpValue('');
        setVerifying(false);
        return;
      }

      // Mark as verified
      await supabase
        .from('whatsapp_verifications' as any)
        .update({ verified: true } as any)
        .eq('id', (data as any[])[0].id);

      // Check if phone is already linked to another account
      const { data: existing } = await supabase
        .from('user_whatsapp' as any)
        .select('user_uuid')
        .eq('phone_number', fullPhone)
        .eq('is_active', true)
        .neq('user_uuid', userUuid)
        .maybeSingle();

      if (existing) {
        toast.error('هذا الرقم مربوط بحساب آخر! فك الارتباط من الحساب الأول أو استخدم رقم مختلف');
        setOtpValue('');
        setVerifying(false);
        return;
      }

      // Save user whatsapp
      await supabase.from('user_whatsapp' as any).upsert({
        user_uuid: userUuid,
        phone_number: fullPhone,
        country_code: selectedCountry.code,
        verified_at: new Date().toISOString(),
        is_active: true,
      } as any, { onConflict: 'user_uuid' });

      // Send welcome message
      await sendWaVerification(fullPhone, `غلا شات 💬\n\n🎉 مرحباً ${userName}! تم تفعيل إشعارات غلا شات\nستصلك العروض والمسابقات مباشرة`);

      toast.success('✅ تم تسجيل رقمك بنجاح!');
      onSuccess();
    } catch {
      toast.error('حدث خطأ');
    }
    setVerifying(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    await handleSendCode();
  };

  const handleDismiss = () => {
    dismissWhatsAppBanner();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={(e) => { if (e.target === e.currentTarget && step === 'banner') handleDismiss(); }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          dir="rtl"
          style={{ background: '#0f1320', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* ─── Banner Step ─── */}
          {step === 'banner' && (
            <div className="p-6 text-center space-y-4">
              <button onClick={handleDismiss} className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X className="w-4 h-4 text-white/40" />
              </button>
              <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center" style={{ background: 'rgba(37,211,102,0.12)' }}>
                <span className="text-3xl">📱</span>
              </div>
              <h2 className="text-lg font-black text-white">سجّل رقم الواتساب</h2>
              <p className="text-sm text-white/50 leading-relaxed">واحصل على عروض حصرية! توصلك إشعارات العروض، المسابقات، والكوينز المجانية مباشرة على واتسابك</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('country')}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  سجّل الآن
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-white/40"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  لاحقاً
                </button>
              </div>
            </div>
          )}

          {/* ─── Country Step ─── */}
          {step === 'country' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep('banner')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
                <h3 className="text-sm font-black text-white flex-1 text-center">اختر بلدك</h3>
                <div className="w-8" />
              </div>
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {COUNTRIES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setSelectedCountry(c); setStep('phone'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
                    style={{
                      background: selectedCountry.code === c.code ? 'rgba(37,211,102,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedCountry.code === c.code ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <span className="text-sm font-bold text-white flex-1 text-right">{c.name}</span>
                    <span className="text-xs text-white/40 font-mono" dir="ltr">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Phone Step ─── */}
          {step === 'phone' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setStep('country')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
                <h3 className="text-sm font-black text-white flex-1 text-center">أدخل رقمك</h3>
                <div className="w-8" />
              </div>

              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => setStep('country')} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span className="text-xs text-white/60 font-mono" dir="ltr">{selectedCountry.code}</span>
                </button>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="رقم الهاتف"
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20 text-left"
                  dir="ltr"
                  autoFocus
                />
              </div>

              <button
                onClick={handleSendCode}
                disabled={sending || phone.length < 6}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال كود التحقق
              </button>
            </div>
          )}

          {/* ─── OTP Step ─── */}
          {step === 'otp' && (
            <div className="p-5 space-y-4 text-center">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setStep('phone')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <ArrowLeft className="w-4 h-4 text-white/60" />
                </button>
                <h3 className="text-sm font-black text-white flex-1 text-center">أدخل كود التحقق</h3>
                <div className="w-8" />
              </div>

              <p className="text-xs text-white/40">تم إرسال كود من 4 أرقام إلى</p>
              <p className="text-sm font-mono text-white/80" dir="ltr">{fullPhone}</p>

              <div className="flex justify-center py-4" dir="ltr">
                <InputOTP maxLength={4} value={otpValue} onChange={(v) => { setOtpValue(v); if (v.length === 4) handleVerify(v); }}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-14 h-14 text-xl" />
                    <InputOTPSlot index={1} className="w-14 h-14 text-xl" />
                    <InputOTPSlot index={2} className="w-14 h-14 text-xl" />
                    <InputOTPSlot index={3} className="w-14 h-14 text-xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {verifying && (
                <div className="flex items-center justify-center gap-2 text-xs text-white/40">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  جاري التحقق...
                </div>
              )}

              <p className="text-[10px] text-white/30">
                {attempts > 0 && `المحاولة ${attempts}/3`}
              </p>

              <button
                onClick={handleResend}
                disabled={resendTimer > 0}
                className="flex items-center gap-1.5 mx-auto text-xs font-bold disabled:opacity-30"
                style={{ color: '#25D366' }}
              >
                <RefreshCw className="w-3 h-3" />
                {resendTimer > 0 ? `إعادة إرسال (${resendTimer}ث)` : 'إعادة إرسال الكود'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WhatsAppBanner;

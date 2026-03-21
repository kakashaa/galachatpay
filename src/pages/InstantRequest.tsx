import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Zap, CheckCircle, AlertCircle, Loader2,
  Globe, UserCheck, Send, Wallet, User, Search, Coins, Phone,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { sendUserNotification } from "@/utils/sendUserNotification";
import SubmissionOverlay from "@/components/SubmissionOverlay";
import { supabase } from "@/integrations/supabase/client";
import { countries, isValidERC20Address, type CountryConfig, type PaymentMethod } from "@/data/salaryCountries";

const API = "https://galachat.site/project-z/api.php";
const COINS_PER_DOLLAR = 8500;

interface Transfer {
  reference_id: string;
  amount_usd: number;
  amount_coins: number;
  time: string;
  is_used: boolean;
  selectable: boolean;
}

interface SupporterInfo {
  name: string;
  avatar: string;
  uuid: string;
}

type Step = "transfers" | "supporter" | "details" | "confirm";

const InstantRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("transfers");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Step 1: Transfers
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Step 2: Supporter
  const [supporterUuid, setSupporterUuid] = useState("");
  const [supporterInfo, setSupporterInfo] = useState<SupporterInfo | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Step 3: Bank details
  const [fullName, setFullName] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [whatsappCode, setWhatsappCode] = useState("+966");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const selectedCountry: CountryConfig | undefined = countries.find((c) => c.id === selectedCountryId);
  const selectedMethod: PaymentMethod | undefined = selectedCountry?.methods.find((m) => m.id === selectedMethodId);
  const isNameValid = fullName.trim().length >= 2;
  const isAccountValid = (): boolean => {
    if (!selectedMethod || !accountInfo.trim()) return false;
    if (selectedMethod.requiresWallet) return isValidERC20Address(accountInfo);
    return accountInfo.trim().length >= 4;
  };

  // Auto-fetch transfers on mount
  useEffect(() => {
    if (!user) return;
    const fetchTransfers = async () => {
      setLoadingTransfers(true);
      try {
        const res = await fetch(`${API}?action=user_transfers&uuid=${user.uuid}`);
        const data = await res.json();
        const available = (data.transfers || []).filter((t: Transfer) => !t.is_used && t.selectable);
        setTransfers(available);
      } catch {
        setTransfers([]);
      } finally {
        setLoadingTransfers(false);
      }
    };
    fetchTransfers();
  }, [user?.uuid]);

  if (!user) {
    navigate("/");
    return null;
  }

  // Supporter UUID lookup
  const lookupSupporter = async () => {
    if (!supporterUuid.trim() || supporterUuid.trim() === user.uuid) {
      setLookupError(supporterUuid.trim() === user.uuid ? "لا يمكنك إدخال آيديك الشخصي" : "أدخل آيدي الداعم");
      return;
    }
    setLookingUp(true);
    setLookupError("");
    setSupporterInfo(null);
    try {
      const uid = supporterUuid.trim();

      // Method 1: admin-actions
      try {
        const r1 = await fetch(
          `https://18.219.229.240/website/admin-actions.php?key=ghala2026actions&action=user-info&uuid=${uid}`
        );
        const d1 = await r1.json();
        if (d1.ok && d1.data?.name) {
          setSupporterInfo({ name: d1.data.name, avatar: d1.data.avatar || "", uuid: uid });
          return;
        }
      } catch {}

      // Method 2: check-supporter
      try {
        const r2 = await fetch(
          `https://hola-chat.com/wares-api.php?key=ghala2026actions&action=check-supporter&uuid=${uid}`
        );
        const d2 = await r2.json();
        if (d2.data?.name) {
          setSupporterInfo({ name: d2.data.name, avatar: d2.data.avatar || "", uuid: uid });
          return;
        }
      } catch {}

      // Method 3: search API
      try {
        const r3 = await fetch(
          `https://galalivechat.com/api/search/all-users?q=${uid}`,
          { headers: { Authorization: "Bearer a6a6934df3dc4f8d99fbdf56a16d1cf05994039747ee7b76bf14383a3ee254a4" } }
        );
        const d3 = await r3.json();
        const users = d3.data || [];
        const match = users.find((u: any) => u.name?.includes(uid));
        if (match) {
          setSupporterInfo({ name: match.name.split(" - ")[0], avatar: "", uuid: uid });
          return;
        }
      } catch {}

      // Fallback: original API
      try {
        const res = await fetch(`${API}?action=user_info&uuid=${uid}`);
        const data = await res.json();
        if (data?.data?.name) {
          setSupporterInfo({ name: data.data.name, avatar: data.data.profile?.image || "", uuid: uid });
          return;
        }
      } catch {}

      setLookupError("لم يتم العثور على هذا الحساب");
    } catch {
      setLookupError("خطأ في البحث. حاول مرة أخرى");
    } finally {
      setLookingUp(false);
    }
  };

  const handleExitAttempt = () => {
    if (step !== "transfers" || selectedTransfer || supporterInfo) {
      setShowExitDialog(true);
    } else {
      navigate("/instant/banks");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTransfer || !supporterInfo) return;
    setLoading(true);
    setError("");
    try {
      // Save to local DB
      const { error: insertError } = await supabase.from("salary_requests").insert({
        user_uuid: user.uuid,
        user_name: user.name,
        user_phone: whatsappNumber ? `${whatsappCode}${whatsappNumber}` : (user.phone || ""),
        request_type: "instant",
        amount_usd: selectedTransfer.amount_usd,
        amount_coins: selectedTransfer.amount_coins,
        recipient_name: fullName,
        recipient_country: `${selectedCountry?.flag} ${selectedCountry?.name}`,
        payment_method: selectedMethod?.label || "",
        payment_details: JSON.stringify({
          account_number: accountInfo,
          whatsapp: whatsappNumber ? `${whatsappCode}${whatsappNumber}` : "",
          country: `${selectedCountry?.flag} ${selectedCountry?.name}`,
          bank: selectedMethod?.label || "",
          account_name: fullName,
        }),
        status: "pending",
        transfer_id: selectedTransfer.reference_id,
        target_uuid: supporterInfo.uuid,
        target_name: supporterInfo.name,
      } as any);

      if (insertError) {
        if (insertError.message?.includes("TRANSFER_ALREADY_USED") || insertError.code === "23505") {
          setError("هذه الحوالة تم استخدامها مسبقاً.");
        } else {
          setError("حدث خطأ في حفظ الطلب.");
        }
        setLoading(false);
        return;
      }

      const refId = `INS-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      // Send in-app notification
      try {
        await sendUserNotification(
          user.uuid,
          "✅ تم استلام طلب السحب الفوري",
          `المبلغ: $${selectedTransfer.amount_usd} — الداعم: ${supporterInfo.name} (UUID: ${supporterInfo.uuid}) — البنك: ${selectedMethod?.label || ""}`
        );
      } catch {}

      setRequestId(refId);
      setSubmitted(true);
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (submitted) {
    return (
      <MobileLayout showHeader headerTitle="السحب الفوري" onBack={() => navigate("/salary")}>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center space-y-3">
            <h2 className="text-lg font-bold text-foreground">تم إرسال طلب السحب الفوري</h2>
            <p className="text-sm text-muted-foreground">الكوينزات رايحة لحساب الداعم</p>
            <p className="text-sm text-muted-foreground">الأدمن بيتأكد ويرسل لك الفلوس + صورة الإيصال</p>
            {requestId && (
              <div className="mt-4 rounded-xl p-3 bg-muted/30 border border-border/20">
                <p className="text-[10px] text-muted-foreground mb-1">رقم المرجع</p>
                <p className="text-lg font-black text-primary font-mono tracking-wider">{requestId}</p>
              </div>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3 mt-8 w-full">
            <Button onClick={() => navigate("/my-requests")} variant="outline" className="flex-1 border-border/30 font-bold">طلباتي</Button>
            <Button onClick={() => navigate("/salary")} className="flex-1 gold-gradient text-primary-foreground font-bold">الرئيسية</Button>
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  const stepIndex = { transfers: 0, supporter: 1, details: 2, confirm: 3 };
  const stepLabels = ["الحوالة", "الداعم", "البنك", "التأكيد"];

  return (
    <MobileLayout showHeader headerTitle="طلب سحب فوري" onBack={handleExitAttempt}>
      <div className="px-5 py-4 space-y-5">
        {/* Progress */}
        <div className="flex gap-1.5">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1 transition-all ${stepIndex[step] >= i ? "gold-gradient" : "bg-muted/30"}`} />
              <span className={`text-[10px] ${stepIndex[step] >= i ? "text-primary font-bold" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* STEP 1: Auto-fetch transfers */}
        {step === "transfers" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> اختر الحوالة
              </h3>
              <p className="text-xs text-muted-foreground">الحوالات المتاحة التي حوّلتها لوكالة 10000</p>

              {loadingTransfers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/30 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-bold text-foreground">ما فيه حوالات متاحة</p>
                  <p className="text-xs text-muted-foreground">حوّل راتبك أولاً إلى وكالة <span className="font-bold text-primary" dir="ltr">10000</span> في غلا لايف</p>
                  <Button onClick={() => navigate("/salary")} variant="outline" className="border-border/30 font-bold">
                    رجوع للراتب
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {transfers.map((t) => (
                    <button
                      key={t.reference_id}
                      onClick={() => setSelectedTransfer(t)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                        selectedTransfer?.reference_id === t.reference_id
                          ? "border-primary bg-primary/10"
                          : "border-border/30 bg-muted/10 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedTransfer?.reference_id === t.reference_id ? "border-primary bg-primary" : "border-muted-foreground"
                          }`}>
                            {selectedTransfer?.reference_id === t.reference_id && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-mono font-bold text-muted-foreground">#{t.reference_id}</span>
                        </div>
                        <span className="text-lg font-black text-foreground" dir="ltr">${t.amount_usd}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{new Date(t.time).toLocaleDateString("ar")}</span>
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <Coins className="w-3.5 h-3.5" />
                          <span className="font-bold">{(t.amount_usd * COINS_PER_DOLLAR).toLocaleString()} كوينز</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
            {transfers.length > 0 && (
              <Button
                onClick={() => { setStep("supporter"); setError(""); }}
                disabled={!selectedTransfer}
                className="w-full gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40"
              >
                متابعة
              </Button>
            )}
          </>
        )}

        {/* STEP 2: Supporter Info */}
        {step === "supporter" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> مين الداعم؟
              </h3>
              <p className="text-xs text-muted-foreground">أدخل آيدي الداعم الي يبي يشتري الكوينزات</p>

              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={supporterUuid}
                  onChange={(e) => {
                    setSupporterUuid(e.target.value.replace(/\D/g, ""));
                    setSupporterInfo(null);
                    setLookupError("");
                  }}
                  placeholder="آيدي الداعم"
                  className="flex-1 bg-muted/20 border-border/30 text-right"
                  dir="rtl"
                />
                <Button
                  onClick={lookupSupporter}
                  disabled={lookingUp || !supporterUuid.trim()}
                  variant="outline"
                  className="border-border/30 px-3"
                >
                  {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {lookupError && (
                <p className="text-xs text-destructive">{lookupError}</p>
              )}

              {supporterInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                >
                  {supporterInfo.avatar ? (
                    <img src={supporterInfo.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-emerald-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{supporterInfo.name}</p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">UUID: {supporterInfo.uuid}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </motion.div>
              )}

              {/* Transfer summary */}
              {selectedTransfer && (
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">الحوالة</span>
                    <span className="font-bold text-foreground font-mono">#{selectedTransfer.reference_id}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">المبلغ</span>
                    <span className="font-bold text-foreground" dir="ltr">${selectedTransfer.amount_usd}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">الكوينزات للداعم</span>
                    <span className="font-bold text-amber-400">{(selectedTransfer.amount_usd * COINS_PER_DOLLAR).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep("transfers"); setError(""); }} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button
                onClick={() => { setStep("details"); setError(""); }}
                disabled={!supporterInfo}
                className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40"
              >
                متابعة
              </Button>
            </div>
          </>
        )}

        {/* STEP 3: Bank Details */}
        {step === "details" && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" /> وين تبي نحوّل لك الفلوس؟
              </h3>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="اسم المستلم (اسمك)"
                className="bg-muted/20 border-border/30 text-right"
                dir="rtl"
              />
              {fullName && !isNameValid && <p className="text-[11px] text-destructive">يرجى إدخال الاسم الكامل</p>}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> الدولة والبنك
              </h3>
              <Select value={selectedCountryId} onValueChange={(v) => { setSelectedCountryId(v); setSelectedMethodId(""); setAccountInfo(""); }}>
                <SelectTrigger className="bg-muted/20 border-border/30 text-right"><SelectValue placeholder="اختر الدولة" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2"><span>{c.flag}</span><span>{c.name}</span></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCountry && (
                <>
                  <Select value={selectedMethodId} onValueChange={(v) => { setSelectedMethodId(v); setAccountInfo(""); }}>
                    <SelectTrigger className="bg-muted/20 border-border/30 text-right"><SelectValue placeholder="اختر البنك" /></SelectTrigger>
                    <SelectContent>
                      {selectedCountry.methods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedMethod && (
                    <div className="space-y-2">
                      <Input
                        value={accountInfo}
                        onChange={(e) => setAccountInfo(e.target.value)}
                        placeholder={selectedMethod.placeholder || "رقم الحساب"}
                        className="bg-muted/20 border-border/30"
                        dir={selectedMethod.requiresWallet ? "ltr" : "rtl"}
                      />
                      {selectedMethod.requiresWallet && accountInfo && !isValidERC20Address(accountInfo) && (
                        <p className="text-[11px] text-destructive">عنوان المحفظة غير صحيح</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>

            {/* WhatsApp Number */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" /> رقم الواتساب (للإشعارات)
              </h3>
              <div className="flex gap-2">
                <Select value={whatsappCode} onValueChange={setWhatsappCode}>
                  <SelectTrigger className="bg-muted/20 border-border/30 w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+966">🇸🇦 +966</SelectItem>
                    <SelectItem value="+967">🇾🇪 +967</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+971">🇦🇪 +971</SelectItem>
                    <SelectItem value="+20">🇪🇬 +20</SelectItem>
                    <SelectItem value="+962">🇯🇴 +962</SelectItem>
                    <SelectItem value="+964">🇮🇶 +964</SelectItem>
                    <SelectItem value="+965">🇰🇼 +965</SelectItem>
                    <SelectItem value="+968">🇴🇲 +968</SelectItem>
                    <SelectItem value="+974">🇶🇦 +974</SelectItem>
                    <SelectItem value="+973">🇧🇭 +973</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="رقم الواتساب"
                  inputMode="numeric"
                  className="flex-1 bg-muted/20 border-border/30"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">بنرسل لك تحديثات الطلب على الواتساب</p>
            </motion.div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("supporter")} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button
                onClick={() => { setStep("confirm"); setError(""); }}
                disabled={!isNameValid || !selectedCountryId || !selectedMethodId || !isAccountValid()}
                className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40"
              >
                متابعة
              </Button>
            </div>
          </>
        )}

        {/* STEP 4: Confirm */}
        {step === "confirm" && selectedTransfer && supporterInfo && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> ملخص الطلب
              </h3>

              {/* Transfer info */}
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
                <p className="text-[10px] text-muted-foreground font-bold">الحوالة</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">الرقم</span>
                  <span className="font-bold text-foreground font-mono">#{selectedTransfer.reference_id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="font-bold text-foreground" dir="ltr">${selectedTransfer.amount_usd}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">الكوينزات</span>
                  <span className="font-bold text-amber-400">{(selectedTransfer.amount_usd * COINS_PER_DOLLAR).toLocaleString()} كوينز</span>
                </div>
              </div>

              {/* Supporter */}
              <div className="p-3 bg-violet-500/5 border border-violet-500/15 rounded-xl space-y-2">
                <p className="text-[10px] text-muted-foreground font-bold">الداعم (يستلم الكوينزات)</p>
                <div className="flex items-center gap-3">
                  {supporterInfo.avatar ? (
                    <img src={supporterInfo.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-violet-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-foreground">{supporterInfo.name}</p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">UUID: {supporterInfo.uuid}</p>
                  </div>
                </div>
              </div>

              {/* Recipient bank */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-2">
                <p className="text-[10px] text-muted-foreground font-bold">الفلوس تروح لك</p>
                {[
                  { label: "الاسم", value: fullName },
                  { label: "الدولة", value: `${selectedCountry?.flag} ${selectedCountry?.name}` },
                  { label: "البنك", value: selectedMethod?.label },
                  { label: "الحساب", value: accountInfo },
                ].filter(r => r.value).map((r, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-bold text-foreground" dir="auto">{r.value}</span>
                  </div>
                ))}
                {whatsappNumber && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">واتساب</span>
                    <span className="font-bold text-foreground font-mono" dir="ltr">{whatsappCode}{whatsappNumber}</span>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("details")} className="flex-1 h-12 border-border/30">رجوع</Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 gold-gradient text-primary-foreground font-bold h-12 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <><Send className="w-5 h-5 ml-2" /> تأكيد وإرسال</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Exit Confirmation */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="max-w-[90%] rounded-2xl bg-background border-border/30">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">هل متأكد من الخروج؟</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-sm">
              سيتم فقدان جميع البيانات المدخلة
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setShowExitDialog(false)} className="flex-1 h-11 border-border/30 font-bold">لا، متابعة</Button>
            <Button onClick={() => { setShowExitDialog(false); navigate("/instant/banks"); }} className="flex-1 h-11 bg-destructive text-destructive-foreground font-bold">نعم، خروج</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SubmissionOverlay
        visible={loading}
        title="جاري رفع طلب السحب الفوري"
        steps={[
          { label: "جاري التحقق من الحوالة...", completedLabel: "تم التحقق ✓", icon: <></> },
          { label: "جاري تسجيل الطلب...", completedLabel: "تم التسجيل ✓", icon: <></> },
          { label: "جاري إرسال الإشعار...", completedLabel: "تم الإرسال ✓", icon: <></> },
        ]}
      />
    </MobileLayout>
  );
};

export default InstantRequest;

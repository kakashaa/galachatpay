import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe, CheckCircle, AlertCircle, ChevronLeft, Copy, ChevronDown, ChevronUp, QrCode,
} from "lucide-react";
import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface BankAccount {
  name: string;
  nameArabic: string;
  accountHolder?: string;
  accountNumber?: string;
  iban?: string;
  tag?: string;
  email?: string;
  phoneNumber?: string;
  additionalInfo?: Record<string, string>;
  qrImage?: string;
}

const banksByCountry: Record<string, { name: string; flag: string; banks: BankAccount[] }> = {
  US: {
    name: "أمريكا", flag: "🇺🇸",
    banks: [
      { name: "CashApp", nameArabic: "كاش آب", tag: "$Galalive313", accountHolder: "Dobeee Soneee", qrImage: "/banks/cashapp-galalive313.jpeg" },
      { name: "CashApp", nameArabic: "كاش آب (حساب 2)", tag: "$cashalk1", accountHolder: "Gala live chat", qrImage: "/banks/cashapp-cashalk1.jpeg" },
      { name: "Zelle", nameArabic: "زيل", email: "ghalibali32@gmail.com", accountHolder: "ASSAF GHALIB", qrImage: "/banks/zelle-assaf.jpeg" },
      { name: "Zelle", nameArabic: "زيل (حساب 2)", accountHolder: "Hamza Ghalib", qrImage: "/banks/zelle-hamza.jpeg" },
      { name: "Chime", nameArabic: "تشايم", qrImage: "/banks/chime-qr.png" },
      { name: "Apple Pay", nameArabic: "آبل باي", phoneNumber: "7146844346", qrImage: "/banks/applepay-qr.jpeg" },
    ],
  },
  YE: {
    name: "اليمن", flag: "🇾🇪",
    banks: [
      { name: "Kuraimi SAR", nameArabic: "الكريمي - ريال سعودي", accountHolder: "حمزه علي حسين غالب", accountNumber: "3183733892", qrImage: "/banks/kuraimi-sar.jpeg" },
      { name: "Kuraimi USD", nameArabic: "الكريمي - دولار", accountHolder: "حمزه علي حسين غالب", accountNumber: "3183929703", qrImage: "/banks/kuraimi-usd.jpeg" },
      { name: "Kuraimi YER", nameArabic: "الكريمي - ريال يمني", accountHolder: "حمزه علي حسين غالب", accountNumber: "3183742708", qrImage: "/banks/kuraimi-yer.jpeg" },
      { name: "Jaib", nameArabic: "جيب", phoneNumber: "776168713", accountHolder: "حمزه علي حسين غالب", additionalInfo: { "الرقم البديل": "1542377" } },
    ],
  },
  SA: {
    name: "السعودية", flag: "🇸🇦",
    banks: [
      { name: "Al Rajhi Bank", nameArabic: "بنك الراجحي", accountHolder: "ASSAF ALI GHALIB", accountNumber: "618000010006080901670", iban: "SA67 8000 0618 6080 1090 1670", additionalInfo: { "كود السويفت": "RJHISARI" }, qrImage: "/banks/rajhi-qr.png" },
    ],
  },
};

const BankCard: React.FC<{ bank: BankAccount }> = ({ bank }) => {
  const [expanded, setExpanded] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { toast } = useToast();

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: `تم نسخ ${label}` });
  };

  const details: { label: string; value: string }[] = [];
  if (bank.accountHolder) details.push({ label: "صاحب الحساب", value: bank.accountHolder });
  if (bank.tag) details.push({ label: "التاق", value: bank.tag });
  if (bank.email) details.push({ label: "الإيميل", value: bank.email });
  if (bank.phoneNumber) details.push({ label: "رقم الجوال", value: bank.phoneNumber });
  if (bank.accountNumber) details.push({ label: "رقم الحساب", value: bank.accountNumber });
  if (bank.iban) details.push({ label: "آيبان", value: bank.iban });
  if (bank.additionalInfo) {
    Object.entries(bank.additionalInfo).forEach(([k, v]) => details.push({ label: k, value: v }));
  }

  return (
    <>
      <div className="glass-card overflow-hidden css-fade-up">
        <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{bank.nameArabic}</p>
              <p className="text-[10px] text-muted-foreground">{bank.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bank.qrImage && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowQR(true); }}
                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <QrCode className="w-4 h-4 text-primary" />
              </button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-2 css-expand">
            <div className="border-t border-border/20 pt-3 space-y-2">
              {details.map((d, i) => (
                <div key={i} className="flex justify-between items-center bg-muted/20 rounded-lg p-2.5">
                  <span className="text-[11px] text-muted-foreground">{d.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground" dir="ltr">{d.value}</span>
                    <button onClick={() => copyText(d.value, d.label)} className="p-1 rounded-lg hover:bg-muted/30">
                      <Copy className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {bank.qrImage && (
        <Dialog open={showQR} onOpenChange={setShowQR}>
          <DialogContent className="max-w-[340px] p-4 rounded-2xl">
            <div className="text-center space-y-3">
              <p className="font-bold text-foreground">{bank.nameArabic}</p>
              <img src={bank.qrImage} alt={`QR - ${bank.name}`} className="w-full rounded-xl" />
              {bank.accountHolder && <p className="text-xs text-muted-foreground">{bank.accountHolder}</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

const InstantBanks: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <MobileLayout showHeader headerTitle="حسابات الدفع" onBack={() => navigate("/instant")}>
      <div className="px-5 py-4 space-y-5 pb-32">
        <div className="glass-card p-4 css-fade-up">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-foreground mb-1 gradient-text">اختر دولة الداعم</h3>
              <p className="text-xs text-muted-foreground">اختر الدولة التي سيحوّل منها الداعم، ثم شارك معه تفاصيل الحساب المناسب</p>
            </div>
          </div>
        </div>

        <Tabs value={selectedCountry} onValueChange={setSelectedCountry} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/30 backdrop-blur-sm">
            {Object.entries(banksByCountry).map(([code, country]) => (
              <TabsTrigger key={code} value={code} className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl">
                <span className="text-2xl">{country.flag}</span>
                <span className="text-xs font-medium">{country.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(banksByCountry).map(([code, country]) => (
            <TabsContent key={code} value={code} className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground text-center mb-3">الحسابات المتاحة في {country.name} - اضغط لعرض التفاصيل</p>
              {country.banks.map((bank, index) => (
                <BankCard key={`${code}-${index}`} bank={bank} />
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl css-fade-up-d2">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-foreground text-sm mb-1">تنبيه مهم</h3>
              <p className="text-xs text-muted-foreground">تأكد من إرسال الداعم للإيصال بعد التحويل، ستحتاجه في الخطوة التالية</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setConfirmed(!confirmed)}
          className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
            confirmed ? "border-primary bg-primary/10" : "border-border/30 bg-muted/20 hover:border-primary/30"
          }`}
        >
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            confirmed ? "border-primary bg-primary" : "border-muted-foreground"
          }`}>
            {confirmed && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
          </div>
          <span className="font-medium text-foreground text-sm">نعم، الداعم حوّل الفلوس ولدي إيصال التحويل</span>
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-background/80 backdrop-blur-xl border-t border-border/30 z-50">
        <Button onClick={() => navigate("/instant/request")} disabled={!confirmed} className="w-full h-12 gold-gradient text-primary-foreground font-bold text-base disabled:opacity-40">
          متابعة رفع الطلب <ChevronLeft className="w-5 h-5 mr-1" />
        </Button>
      </div>
    </MobileLayout>
  );
};

export default InstantBanks;

// Shared constants for banks, countries, and conversion rates

export const COINS_PER_DOLLAR = 8500;

export const COUNTRIES = [
  {
    id: "sa", name: "السعودية",
    banks: [
      { id: "rajhi", label: "بنك الراجحي" },
      { id: "ahli", label: "بنك الأهلي" },
      { id: "stcpay", label: "stc pay" },
      { id: "sa_other", label: "أخرى" },
    ],
  },
  {
    id: "ye", name: "اليمن",
    banks: [
      { id: "jeeppay", label: "جيب (JeepPay)" },
      { id: "kuraimi", label: "كريمي" },
      { id: "ye_cash", label: "كاش (يدوي)" },
      { id: "ye_other", label: "أخرى" },
    ],
  },
  {
    id: "us", name: "أمريكا",
    banks: [
      { id: "zelle", label: "Zelle" },
      { id: "cashapp", label: "Cash App" },
      { id: "us_other", label: "أخرى" },
    ],
  },
  {
    id: "other", name: "أخرى",
    banks: [
      { id: "other_bank", label: "تحويل بنكي" },
      { id: "other_wallet", label: "محفظة إلكترونية" },
    ],
  },
];

export const BANK_LABELS: Record<string, string> = {
  rajhi: "بنك الراجحي",
  ahli: "بنك الأهلي",
  stcpay: "stc pay",
  jeeppay: "جيب (JeepPay)",
  kuraimi: "كريمي",
  ye_cash: "كاش",
  zelle: "Zelle",
  cashapp: "Cash App",
  agent: "حساب الوكيل",
  other_bank: "تحويل بنكي",
  other_wallet: "محفظة",
  sa_other: "أخرى",
  ye_other: "أخرى",
  us_other: "أخرى",
};

export const COUNTRY_LABELS: Record<string, string> = {
  sa: "السعودية",
  ye: "اليمن",
  us: "أمريكا",
  agent: "الوكيل",
  other: "أخرى",
};

export const BANK_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  rajhi: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", bar: "bg-emerald-500" },
  ahli: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20", bar: "bg-emerald-400" },
  stcpay: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20", bar: "bg-indigo-500" },
  jeeppay: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", bar: "bg-blue-500" },
  kuraimi: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", bar: "bg-purple-500" },
  ye_cash: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", bar: "bg-orange-500" },
  zelle: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", bar: "bg-violet-500" },
  cashapp: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20", bar: "bg-green-500" },
  agent: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", bar: "bg-slate-500" },
  other_bank: { bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border/20", bar: "bg-muted-foreground" },
  other_wallet: { bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border/20", bar: "bg-muted-foreground" },
  sa_other: { bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border/20", bar: "bg-muted-foreground" },
  ye_other: { bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border/20", bar: "bg-muted-foreground" },
  us_other: { bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border/20", bar: "bg-muted-foreground" },
};

const DEFAULT_BANK_COLOR = { bg: "bg-muted/10", text: "text-muted-foreground", border: "border-border/20", bar: "bg-muted-foreground" };

export const getBankColorByKey = (key: string) => BANK_COLORS[key] || DEFAULT_BANK_COLOR;

// Get bank country id from bank id
export const getBankCountry = (bankId: string): string => {
  for (const country of COUNTRIES) {
    if (country.banks.some(b => b.id === bankId)) return country.id;
  }
  return "other";
};

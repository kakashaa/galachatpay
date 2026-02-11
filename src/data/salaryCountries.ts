export interface PaymentMethod {
  id: string;
  label: string;
  requiresWallet?: boolean; // for USDT
  requiresIBAN?: boolean;
  requiresAccount?: boolean;
  placeholder?: string;
}

export interface CountryConfig {
  id: string;
  name: string;
  flag: string;
  methods: PaymentMethod[];
}

const USDT_ERC20: PaymentMethod = {
  id: "usdt_erc20",
  label: "USDT (ERC20)",
  requiresWallet: true,
  placeholder: "0x...",
};

const MONEYGRAM: PaymentMethod = {
  id: "moneygram",
  label: "MoneyGram",
  requiresAccount: true,
  placeholder: "الاسم الكامل كما في الهوية",
};

const WESTERN_UNION: PaymentMethod = {
  id: "western_union",
  label: "Western Union",
  requiresAccount: true,
  placeholder: "الاسم الكامل كما في الهوية",
};

export const countries: CountryConfig[] = [
  {
    id: "sa",
    name: "السعودية",
    flag: "🇸🇦",
    methods: [
      { id: "alrajhi", label: "الراجحي", requiresAccount: true, placeholder: "رقم الحساب أو IBAN" },
      { id: "stc_pay", label: "STC Pay", requiresAccount: true, placeholder: "رقم الجوال" },
      { id: "mada", label: "مدى", requiresAccount: true, placeholder: "رقم البطاقة" },
      { id: "alahli", label: "بنك الأهلي", requiresAccount: true, placeholder: "رقم الحساب أو IBAN" },
      { id: "alinma", label: "بنك الإنماء", requiresAccount: true, placeholder: "رقم الحساب أو IBAN" },
    ],
  },
  {
    id: "ye",
    name: "اليمن",
    flag: "🇾🇪",
    methods: [USDT_ERC20, MONEYGRAM, WESTERN_UNION],
  },
  {
    id: "eg",
    name: "مصر",
    flag: "🇪🇬",
    methods: [USDT_ERC20, MONEYGRAM, WESTERN_UNION],
  },
  {
    id: "dz",
    name: "الجزائر",
    flag: "🇩🇿",
    methods: [USDT_ERC20, MONEYGRAM, WESTERN_UNION],
  },
  {
    id: "tn",
    name: "تونس",
    flag: "🇹🇳",
    methods: [USDT_ERC20, MONEYGRAM, WESTERN_UNION],
  },
  {
    id: "ma",
    name: "المغرب",
    flag: "🇲🇦",
    methods: [USDT_ERC20, MONEYGRAM, WESTERN_UNION],
  },
  {
    id: "jo",
    name: "الأردن",
    flag: "🇯🇴",
    methods: [USDT_ERC20, MONEYGRAM, WESTERN_UNION],
  },
  {
    id: "om",
    name: "عُمان",
    flag: "🇴🇲",
    methods: [
      { id: "bank_muscat", label: "بنك مسقط", requiresAccount: true, placeholder: "رقم الحساب أو IBAN" },
      { id: "bank_dhofar", label: "بنك ظفار", requiresAccount: true, placeholder: "رقم الحساب أو IBAN" },
      USDT_ERC20,
      MONEYGRAM,
      WESTERN_UNION,
    ],
  },
  {
    id: "tr",
    name: "تركيا",
    flag: "🇹🇷",
    methods: [
      { id: "papara", label: "Papara", requiresAccount: true, placeholder: "رقم حساب Papara" },
      { id: "iban_tr", label: "تحويل بنكي (IBAN)", requiresIBAN: true, placeholder: "TR..." },
      USDT_ERC20,
    ],
  },
  {
    id: "gb",
    name: "بريطانيا",
    flag: "🇬🇧",
    methods: [
      { id: "iban_gb", label: "تحويل بنكي (IBAN)", requiresIBAN: true, placeholder: "GB..." },
      { id: "paypal_gb", label: "PayPal", requiresAccount: true, placeholder: "بريد PayPal الإلكتروني" },
      USDT_ERC20,
    ],
  },
  {
    id: "fr",
    name: "فرنسا",
    flag: "🇫🇷",
    methods: [
      { id: "iban_fr", label: "تحويل بنكي (IBAN)", requiresIBAN: true, placeholder: "FR..." },
      { id: "paypal_fr", label: "PayPal", requiresAccount: true, placeholder: "بريد PayPal الإلكتروني" },
      USDT_ERC20,
    ],
  },
  {
    id: "us",
    name: "أمريكا",
    flag: "🇺🇸",
    methods: [
      { id: "zelle", label: "Zelle", requiresAccount: true, placeholder: "رقم الجوال أو البريد الإلكتروني" },
      { id: "paypal_us", label: "PayPal", requiresAccount: true, placeholder: "بريد PayPal الإلكتروني" },
      { id: "cashapp", label: "CashApp", requiresAccount: true, placeholder: "$cashtag" },
      USDT_ERC20,
    ],
  },
  // Rupee countries
  {
    id: "in",
    name: "الهند",
    flag: "🇮🇳",
    methods: [
      { id: "upi", label: "UPI", requiresAccount: true, placeholder: "UPI ID" },
      MONEYGRAM,
      WESTERN_UNION,
      USDT_ERC20,
    ],
  },
  {
    id: "pk",
    name: "باكستان",
    flag: "🇵🇰",
    methods: [
      { id: "jazzcash", label: "JazzCash", requiresAccount: true, placeholder: "رقم الجوال" },
      { id: "easypaisa", label: "EasyPaisa", requiresAccount: true, placeholder: "رقم الجوال" },
      MONEYGRAM,
      WESTERN_UNION,
      USDT_ERC20,
    ],
  },
  {
    id: "bd",
    name: "بنغلاديش",
    flag: "🇧🇩",
    methods: [
      { id: "bkash", label: "bKash", requiresAccount: true, placeholder: "رقم الجوال" },
      MONEYGRAM,
      WESTERN_UNION,
      USDT_ERC20,
    ],
  },
  {
    id: "lk",
    name: "سريلانكا",
    flag: "🇱🇰",
    methods: [MONEYGRAM, WESTERN_UNION, USDT_ERC20],
  },
  {
    id: "np",
    name: "نيبال",
    flag: "🇳🇵",
    methods: [MONEYGRAM, WESTERN_UNION, USDT_ERC20],
  },
];

// Validate ERC20 wallet address: 0x followed by 40 hex characters
export const isValidERC20Address = (address: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
};

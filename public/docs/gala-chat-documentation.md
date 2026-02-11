# 📄 توثيق تطبيق غلا شات (Gala Chat)
## الإصدار: فبراير 2026

---

## 📌 نظرة عامة

تطبيق **غلا شات** هو واجهة ويب (Web App) مصممة كتطبيق موبايل، تعمل كوسيط بين المستخدمين وتطبيق **غلا لايف** الصوتي الأصلي. يتيح التطبيق للمستخدمين تقديم طلبات متنوعة (سحب رواتب، تغيير ID، طلب VIP، بلاغات، إلخ) وربطها بـ API غلا لايف.

- **الرابط المنشور:** https://galachatpay.lovable.app
- **التقنيات:** React + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **الباك إند:** Lovable Cloud (Supabase) + Edge Functions
- **اللغة:** عربية (RTL)

---

## 🏗️ هيكل الصفحات والمسارات (Routes)

| المسار | الصفحة | الوصف | متصل بـ API؟ |
|--------|--------|-------|-------------|
| `/` | Login | تسجيل الدخول بـ UUID + كلمة مرور | ✅ `gala-login` |
| `/dashboard` | Dashboard | الصفحة الرئيسية بعد الدخول | ❌ (بيانات من الجلسة) |
| `/salary` | SalaryWithdraw | سحب الراتب (شهري/فوري) | ✅ `gala-salary` |
| `/change-id` | ChangeId | تغيير ID المستخدم | ✅ `gala-request` |
| `/request-vip` | RequestVip | طلب VIP مجاني | ✅ `gala-request` |
| `/support` | QuickSupport | الدعم السريع (VIP 5+ فقط) | ❌ **بدون API** |
| `/gift` | GiftRequest | طلب هدية مخصصة/إطار/دخولية | ❌ **بدون API** |
| `/animated-photo` | AnimatedPhotoRequest | طلب صورة متحركة | ❌ **بدون API** |
| `/entry-request` | EntryRequest | طلب دخولية | ❌ **بدون API** |
| `/bd-request` | BDRequest | طلب توثيق BD | ❌ **بدون API** |
| `/bd-dashboard` | BDDashboard | لوحة BD | ❌ |
| `/report` | ReportPage | البلاغات والبند | ❌ (Supabase مباشر) |
| `/my-requests` | MyRequests | عرض طلباتي | ❌ |
| `/instant` | InstantIntro | مقدمة السحب الفوري | ❌ |
| `/instant/banks` | InstantBanks | بنوك السحب الفوري | ❌ |
| `/instant/request` | InstantRequest | طلب سحب فوري | ❌ |
| `/notifications` | Notifications | الإشعارات | ❌ (Supabase مباشر) |
| `/admin` | AdminLogin | دخول الأدمن | ❌ |
| `/admin/dashboard` | AdminDashboard | لوحة تحكم الأدمن | ❌ (Supabase مباشر) |

---

## 🔐 نظام المصادقة (Authentication)

### تسجيل الدخول
- المستخدم يدخل **UUID** (آيدي غلا لايف) + **كلمة المرور**
- يتم إرسالهما إلى Edge Function `gala-login` → API غلا لايف `auth/login/uuid`
- عند النجاح: بيانات المستخدم تُحفظ في `localStorage` وفي `AuthContext`

### بيانات المستخدم المحفوظة (GalaUser):
```typescript
{
  id: number,          // رقم المستخدم الداخلي
  uuid: string,        // آيدي غلا لايف
  name: string,        // اسم المستخدم
  phone: string,       // رقم الهاتف
  type_user: number,   // نوع المستخدم (0-6)
  profile: {
    image: string,     // صورة البروفايل
    gender: number,    // الجنس
    birthday: string,
    age: number,
    country: string
  },
  level: {
    receiver_level: number,  // مستوى المستقبل
    sender_level: number,    // مستوى المرسل
    charger_level: number,   // مستوى الشاحن
    receiver_num: number,
    sender_num: number,
    charger_num: number
  },
  my_store: {
    coins: number,     // الكوينز
    diamonds: number,  // الماسات
    usd: number        // الدولار
  },
  vip: {},             // معلومات VIP
  country: {
    id: number,
    name: string,
    flag: string       // رابط العلم
  }
}
```

### أنواع المستخدمين (type_user):
| الرقم | النوع |
|-------|------|
| 0, 1 | مستخدم عادي |
| 2 | مضيف |
| 3 | وكيل مضيفين |
| 4 | وكيل شحن |
| 5 | وكيل شحن ومضيفين |
| 6 | مضيف ووكيل شحن |

### نظام حماية تسجيل الدخول (Login Attempts):
- **5 محاولات خاطئة** → حظر 3 ساعات (تحذير أول)
- **5 محاولات أخرى** → حظر 10 ساعات (تحذير ثاني)
- **5 محاولات أخرى** → حظر دائم (يحتاج فك من الأدمن)
- تحذير يظهر عند بقاء محاولتين فقط

### تسجيل دخول سريع:
- حفظ آخر UUID ناجح في `localStorage`
- دعم البصمة/Face ID عبر Web Authentication API (`PublicKeyCredential`)

---

## ⚙️ Edge Functions (الباك إند)

### 1. `gala-login` — تسجيل الدخول
- **المسار:** `POST auth/login/uuid`
- **المدخلات:** `{ uuid, password }`
- **الوظيفة:** مصادقة المستخدم مع API غلا لايف + نظام حظر المحاولات
- **جدول قاعدة البيانات:** `login_attempts`

### 2. `gala-request` — طلبات عامة
- **المسار:** `POST request/create`
- **المدخلات:** `{ uuid, type, value }`
- **الاستخدامات:**
  - `type: "uuid"` → تغيير ID (value = ID الجديد)
  - `type: "vip"` → طلب VIP (value = رقم مستوى VIP)

### 3. `gala-salary` — التحقق من التحويل
- **المسار:** `POST transaction/check`
- **المدخلات:** `{ uuid, amount }`
- **الوظيفة:** التحقق من أن المستخدم حوّل المبلغ إلى حساب الوكالة (agency_id: 23)
- **الإرجاع:** المبلغ المؤكد + التاريخ

### 4. `gala-transactions` — معاملات شهرية
- **المسار:** `GET transactions/monthly`
- **الوظيفة:** جلب المعاملات الشهرية

### 5. `admin-manage` — إدارة الأدمن
- **الوظائف:**
  - إدارة الفيديوهات التعليمية (CRUD)
  - إدارة طلبات السحب (تحديث الحالة)
  - إدارة البلاغات (تحقق/رفض)
  - فك حظر الحسابات (`unblock_account`)

### مصادقة API غلا لايف (HMAC):
```
التوقيع = HMAC-SHA256(SECRET, METHOD + "api/newWebsite/" + ENDPOINT + TIMESTAMP + NONCE)
Headers: X-API-KEY, X-SIGNATURE, X-TIMESTAMP, X-NONCE
```

---

## 🗄️ قاعدة البيانات (جداول)

### 1. `login_attempts` — محاولات الدخول
| العمود | النوع | الوصف |
|--------|------|-------|
| target_uuid | text | آيدي المستخدم |
| failed_attempts | int | عدد المحاولات الفاشلة |
| block_count | int | عدد مرات الحظر |
| blocked_until | timestamp | نهاية فترة الحظر |
| is_permanently_blocked | bool | حظر دائم؟ |
| admin_unblocked_at | timestamp | تاريخ فك الحظر |

### 2. `salary_requests` — طلبات السحب
| العمود | النوع | الوصف |
|--------|------|-------|
| user_uuid | text | آيدي المستخدم |
| user_name | text | اسم المستخدم |
| request_type | text | شهري/فوري |
| amount_usd | number | المبلغ |
| amount_coins | number | الكوينز |
| recipient_name | text | الاسم الرباعي |
| recipient_country | text | الدولة |
| payment_method | text | طريقة الدفع |
| payment_details | text | تفاصيل الحساب |
| status | text | pending/approved/rejected |
| admin_note | text | ملاحظة الأدمن |
| transfer_image_url | text | صورة التحويل |

### 3. `ban_reports` — البلاغات
| العمود | النوع | الوصف |
|--------|------|-------|
| reporter_gala_id | text | آيدي المبلّغ |
| reported_user_id | text | آيدي المبلّغ عنه |
| ban_type | text | promotion/insult/defamation |
| description | text | وصف البلاغ |
| evidence_url | text | رابط الدليل |
| evidence_type | text | video/image |
| is_verified | bool | تم التحقق؟ |
| reward_amount | number | مبلغ المكافأة |
| reward_paid | bool | تم دفع المكافأة؟ |

### 4. `notifications` — الإشعارات
| العمود | النوع | الوصف |
|--------|------|-------|
| user_uuid | text | آيدي المستخدم (أو null للكل) |
| target | text | "all" أو UUID محدد |
| title | text | عنوان الإشعار |
| body | text | محتوى الإشعار |
| is_read | bool | تم القراءة؟ |

### 5. `video_tutorials` — فيديوهات تعليمية
| العمود | النوع | الوصف |
|--------|------|-------|
| title | text | عنوان الفيديو |
| video_url | text | رابط الفيديو |
| thumbnail_url | text | الصورة المصغرة |
| is_active | bool | نشط؟ |
| display_order | int | ترتيب العرض |

### 6. Storage Bucket: `attachments`
- عام (Public)
- يُستخدم لتخزين أدلة البلاغات (صور/فيديوهات)

---

## 🚨 الصفحات التي لا تتصل بـ API (تحتاج ربط)

هذه الصفحات تعمل بشكل محلي فقط (بدون حفظ حقيقي أو إرسال لـ API):

### 1. `/support` — الدعم السريع (QuickSupport)
- **الحالة:** يستخدم بيانات وهمية (Demo data) ثابتة
- **المطلوب:** ربطها ببيانات المستخدم الحقيقية من `AuthContext` + إرسال الطلب لـ API أو حفظه في قاعدة البيانات
- **ملاحظة:** الوصول محصور على VIP 5+ (مبرمج بقيمة ثابتة `userVipLevel = 5`)

### 2. `/gift` — طلب هدية (GiftRequest)
- **الحالة:** يستخدم بيانات وهمية ثابتة
- **المطلوب:** ربطها ببيانات المستخدم + حفظ الطلب في قاعدة البيانات أو إرسال لـ API
- **أنواع الهدايا:** هدية مخصصة، هدية دخولية، إطار

### 3. `/animated-photo` — صورة متحركة (AnimatedPhotoRequest)
- **الحالة:** تستخدم بيانات المستخدم من `AuthContext` ✅ لكن الإرسال وهمي
- **المطلوب:** حفظ الطلب في قاعدة البيانات

### 4. `/entry-request` — دخولية (EntryRequest)
- **الحالة:** تستخدم بيانات المستخدم من `AuthContext` ✅ لكن الإرسال وهمي
- **المطلوب:** حفظ الطلب في قاعدة البيانات

### 5. `/bd-request` — طلب BD (BDRequest)
- **الحالة:** يستخدم بيانات وهمية ثابتة + رفع ملف لا يتم حفظه
- **المطلوب:** ربطها ببيانات المستخدم + حفظ الطلب + رفع المرفق لـ Storage

---

## 🔑 المفاتيح والأسرار (Secrets)

| الاسم | الوصف |
|-------|------|
| `GALA_API_BASE_URL` | رابط API غلا لايف الأساسي |
| `GALA_API_KEY` | مفتاح API |
| `GALA_API_SECRET` | سر HMAC للتوقيع |
| `ADMIN_PASSWORD` | كلمة مرور الأدمن |
| `SUPABASE_URL` | رابط قاعدة البيانات |
| `SUPABASE_ANON_KEY` | مفتاح عام |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح إدارة كاملة |

---

## 📱 مكونات واجهة المستخدم (UI Components)

### المكونات المشتركة:
| المكون | الوظيفة |
|--------|--------|
| `MobileLayout` | الحاوية الرئيسية لجميع الصفحات |
| `BottomNav` | شريط التنقل السفلي |
| `MenuGrid` | شبكة الخدمات الرئيسية (9 أزرار) |
| `UserProfileCard` | بطاقة بيانات المستخدم |
| `MarqueeBanner` | شريط أخبار متحرك |
| `VideoStoryCircle` | دوائر الفيديوهات التعليمية |
| `LevelBars` | أشرطة المستويات |
| `IdFormatCarousel` | عرض صيغ ID المتاحة |
| `LoginInstructions` | تعليمات تسجيل الدخول |
| `PayoutPolicyDialog` | سياسة الدفع |

### خدمات القائمة الرئيسية:
| الخدمة | المسار | اللون |
|--------|--------|-------|
| سحب راتب | `/salary` | أخضر |
| الدعم السريع | `/support` | أزرق |
| تغيير الآيدي | `/change-id` | بنفسجي |
| طلب VIP | `/request-vip` | ذهبي |
| هدية مخصصة | `/gift` | وردي |
| دخولية | `/entry-request` | سماوي |
| صورة متحركة | `/animated-photo` | برتقالي |
| إطار | `/gift` | نيلي |
| توثيق BD | `/bd-request` | أحمر |

---

## 👨‍💼 لوحة الأدمن

### الوصول: `/admin` → كلمة مرور → `/admin/dashboard`

### التبويبات:
1. **الفيديوهات** — إضافة/تعديل/حذف فيديوهات تعليمية
2. **طلبات السحب** — مراجعة واعتماد/رفض طلبات الراتب
3. **البلاغات** — مراجعة والتحقق من البلاغات
4. **المحظورين** — عرض الحسابات المحظورة + فك الحظر

---

## 📋 تدفق سحب الراتب (أهم ميزة)

```
المستخدم يختار نوع السحب (شهري/فوري)
    ↓
يحوّل المبلغ لحساب الوكالة 10000 في غلا لايف
    ↓
يدخل المبلغ في التطبيق → يضغط "تأكيد التحويل"
    ↓
Edge Function `gala-salary` تتحقق من API غلا لايف
    ↓
المستخدم يملأ بيانات المستلم (اسم رباعي + دولة + طريقة دفع + تفاصيل)
    ↓
يتم حفظ الطلب في جدول `salary_requests` بحالة "pending"
    ↓
الأدمن يراجع ويوافق/يرفض من لوحة التحكم
```

### الدول وطرق الدفع المدعومة:
- مصر (فودافون كاش، إنستاباي، ...)
- العراق (زين كاش، آسيا حوالة، ...)
- سوريا (...)
- اليمن (...)
- الأردن (...)
- USDT (ERC-20)
- وغيرها...

---

## 🛡️ نظام البلاغات

### أنواع البلاغات:
| النوع | الوصف | الدليل المطلوب | المكافأة | المدة |
|-------|------|---------------|---------|------|
| ترويج | ترويج لتطبيق آخر | فيديو إجباري | 50,000 كوينز | دائم |
| شتم | إساءة لفظية | صورة أو فيديو | — | 24 ساعة |
| قذف | قذف أو تشهير | صورة أو فيديو | — | 24 ساعة |

### الخطوات:
1. إدخال آيدي المبلّغ
2. اختيار نوع البلاغ
3. إدخال آيدي المبلّغ عنه
4. رفع الدليل (صورة/فيديو)
5. كتابة الوصف (20 حرف على الأقل)
6. تأكيد وإرسال

---

## 📂 هيكل الملفات المهمة

```
src/
├── App.tsx                    # المسارات الرئيسية
├── contexts/AuthContext.tsx   # سياق المصادقة
├── pages/
│   ├── Login.tsx              # تسجيل الدخول ✅ API
│   ├── Dashboard.tsx          # الرئيسية
│   ├── SalaryWithdraw.tsx     # سحب الراتب ✅ API
│   ├── ChangeId.tsx           # تغيير ID ✅ API
│   ├── RequestVip.tsx         # طلب VIP ✅ API
│   ├── QuickSupport.tsx       # دعم سريع ❌ بدون API
│   ├── GiftRequest.tsx        # طلب هدية ❌ بدون API
│   ├── AnimatedPhotoRequest.tsx # صورة متحركة ❌ بدون API
│   ├── EntryRequest.tsx       # دخولية ❌ بدون API
│   ├── BDRequest.tsx          # طلب BD ❌ بدون API
│   ├── ReportPage.tsx         # البلاغات (Supabase مباشر)
│   ├── AdminDashboard.tsx     # لوحة الأدمن
│   └── ...
├── components/
│   ├── MenuGrid.tsx           # شبكة الخدمات
│   ├── UserProfileCard.tsx    # بطاقة المستخدم
│   ├── BottomNav.tsx          # التنقل السفلي
│   └── ...
├── data/
│   ├── idFormats.ts           # صيغ ID حسب المستوى
│   └── salaryCountries.ts     # الدول وطرق الدفع
└── hooks/
    ├── use-saved-requests.ts  # حفظ الطلبات محلياً
    └── use-webhook-notification.ts # إشعارات Webhook

supabase/functions/
├── _shared/hmac.ts            # مصادقة HMAC المشتركة
├── gala-login/index.ts        # تسجيل الدخول
├── gala-request/index.ts      # طلبات عامة (ID + VIP)
├── gala-salary/index.ts       # التحقق من التحويل
├── gala-transactions/index.ts # المعاملات الشهرية
└── admin-manage/index.ts      # إدارة الأدمن
```

---

## ⚠️ ملخص ما يحتاج عمل

### أولوية عالية (صفحات بدون باك إند):
1. **QuickSupport** — تستخدم بيانات وهمية، تحتاج ربط ببيانات المستخدم + حفظ الطلبات
2. **GiftRequest** — بيانات وهمية، تحتاج ربط + حفظ
3. **BDRequest** — بيانات وهمية، تحتاج ربط + رفع ملفات + حفظ

### أولوية متوسطة:
4. **AnimatedPhotoRequest** — بيانات المستخدم موجودة، تحتاج حفظ الطلب فقط
5. **EntryRequest** — بيانات المستخدم موجودة، تحتاج حفظ الطلب فقط

### تحسينات مقترحة:
- إضافة جدول `general_requests` لحفظ جميع الطلبات العامة (هدية، دخولية، صورة، BD، دعم)
- ربط صفحة الدعم السريع ببيانات VIP الحقيقية من بيانات المستخدم
- إضافة إشعارات عند تغيير حالة الطلبات

---

*تم إنشاء هذا التوثيق تلقائياً — فبراير 2026*

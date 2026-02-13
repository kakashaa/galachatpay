import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Gift, DollarSign, AlertTriangle, Trophy, Gem, ChevronDown, ChevronUp, Zap, Users } from "lucide-react";
import MobileLayout from "@/components/MobileLayout";


/* ─── Data ─── */
const hostTable = [
  { diamonds: "250,000", days: 10, hostSalary: 22, agencySalary: 4, vipPrize: "1-7 days", vehicle: 7 },
  { diamonds: "500,000", days: 10, hostSalary: 44, agencySalary: 8, vipPrize: "1-10 days", vehicle: 7 },
  { diamonds: "1,000,000", days: 10, hostSalary: 87, agencySalary: 16, vipPrize: "1-15 days", vehicle: 7 },
  { diamonds: "1,500,000", days: 10, hostSalary: 127, agencySalary: 24, vipPrize: "1-30 days", vehicle: 10 },
  { diamonds: "2,500,000", days: "-", hostSalary: 205, agencySalary: 40, vipPrize: "2-10 days", vehicle: 10 },
  { diamonds: "3,500,000", days: "-", hostSalary: 285, agencySalary: 56, vipPrize: "2-15 days", vehicle: 10 },
  { diamonds: "5,000,000", days: "-", hostSalary: 405, agencySalary: 80, vipPrize: "2-30 days", vehicle: 10 },
  { diamonds: "7,500,000", days: "-", hostSalary: 605, agencySalary: 120, vipPrize: "3-10 days", vehicle: 15 },
  { diamonds: "10,000,000", days: "-", hostSalary: 805, agencySalary: 160, vipPrize: "3-15 days", vehicle: 15 },
  { diamonds: "12,500,000", days: "-", hostSalary: 1005, agencySalary: 200, vipPrize: "3-30 days", vehicle: 15 },
  { diamonds: "15,000,000", days: "-", hostSalary: 1205, agencySalary: 240, vipPrize: "4-10 days", vehicle: 15 },
  { diamonds: "20,000,000", days: "-", hostSalary: 1550, agencySalary: 320, vipPrize: "4-15 days", vehicle: 20 },
  { diamonds: "25,000,000", days: "-", hostSalary: 1950, agencySalary: 400, vipPrize: "4-30 days", vehicle: 20 },
  { diamonds: "30,000,000", days: "-", hostSalary: 2333, agencySalary: 480, vipPrize: "4-30 days", vehicle: 20 },
  { diamonds: "35,000,000", days: "-", hostSalary: 2640, agencySalary: 560, vipPrize: "4-30 days", vehicle: 20 },
  { diamonds: "40,000,000", days: "-", hostSalary: 3120, agencySalary: 640, vipPrize: "4-30 days", vehicle: 20 },
  { diamonds: "50,000,000", days: "-", hostSalary: 3900, agencySalary: 750, vipPrize: "4-30 days", vehicle: 25 },
  { diamonds: "75,000,000", days: "-", hostSalary: 5800, agencySalary: 850, vipPrize: "5-10 days", vehicle: 25 },
  { diamonds: "100,000,000", days: "-", hostSalary: 7700, agencySalary: 1250, vipPrize: "5-15 days", vehicle: 25 },
  { diamonds: "125,000,000", days: "-", hostSalary: 9650, agencySalary: 1680, vipPrize: "5-30 days", vehicle: 30 },
  { diamonds: "150,000,000", days: "-", hostSalary: 11700, agencySalary: 2100, vipPrize: "5-30 days", vehicle: 30 },
  { diamonds: "200,000,000", days: "-", hostSalary: 15450, agencySalary: 2600, vipPrize: "5-30 days", vehicle: 30 },
];

const chargeTable = [
  { chargeUsd: 1000, chargeCoins: "8,500,000", bonusAgent: 100, bonusCoins: "850,000", total: "9,350,000" },
  { chargeUsd: 3000, chargeCoins: "25,500,000", bonusAgent: 360, bonusCoins: "3,060,000", total: "28,560,000" },
  { chargeUsd: 5000, chargeCoins: "42,500,000", bonusAgent: 750, bonusCoins: "6,375,000", total: "48,875,000" },
  { chargeUsd: 10000, chargeCoins: "85,000,000", bonusAgent: 1800, bonusCoins: "15,300,000", total: "100,300,000" },
  { chargeUsd: 15000, chargeCoins: "127,500,000", bonusAgent: 2800, bonusCoins: "23,800,000", total: "151,300,000" },
  { chargeUsd: 20000, chargeCoins: "170,000,000", bonusAgent: 4000, bonusCoins: "34,000,000", total: "204,000,000" },
];

const roomRewardTable = [
  { level: 1, target: "500,000", reward: "20,000" },
  { level: 2, target: "1,000,000", reward: "40,000" },
  { level: 3, target: "3,000,000", reward: "90,000" },
  { level: 4, target: "5,000,000", reward: "145,000" },
  { level: 5, target: "7,000,000", reward: "200,000" },
  { level: 6, target: "10,000,000", reward: "290,000" },
  { level: 7, target: "16,000,000", reward: "450,000" },
  { level: 8, target: "25,000,000", reward: "750,000" },
];

/* ─── Collapsible Section ─── */
const Section: React.FC<{ icon: React.ReactNode; title: string; color: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ icon, title, color, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between">
        <div className="flex items-center gap-3" dir="rtl">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-border/10 pt-3">{children}</div>}
    </div>
  );
};

const Rule: React.FC<{ num: string; title: string; desc: string }> = ({ num, title, desc }) => (
  <div className="flex items-start gap-2 mb-2.5" dir="rtl">
    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold mt-0.5">{num}</div>
    <div>
      <p className="text-xs font-bold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </div>
);

/* ─── Page ─── */
const PolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout showHeader headerTitle="سياسة التطبيق" onBack={() => navigate("/dashboard")}>
      <div className="px-4 py-4 space-y-3 pb-28">
        {/* ── Agency Rules ── */}
        <Section icon={<Building2 className="w-5 h-5 text-blue-400" />} title="فتح وإنشاء وكالة" color="bg-blue-500/15" defaultOpen>
          <div className="space-y-1" dir="rtl">
            <Rule num="1" title="شروط فتح وكالة جديدة:" desc="لفتح وكالة مضيفين يتطلب على الوكيل إحضار 3 داعمين و10 مستخدمين. لا مانع من فتح الوكالة إن لم يتوفر العدد إذا ضمن الوكيل فعالية وكالته وتحقيقها لتارجت المطلوب. يجب تعبئة: اسم الوكالة / رقم الهاتف / ID الوكيل / الاسم الحقيقي." />
            <Rule num="2" title="تقييم أداء الوكالة:" desc="يتم متابعة إحصائية الوكالة خلال شهر كامل. إذا لم تكن متفاعلة على المستوى المطلوب ولم تحقق تارجت 500$ على الأقل، يحق للإدارة إيقاف وسحب الوكالة تلقائياً." />
          </div>
        </Section>

        {/* ── Rewards ── */}
        <Section icon={<Gift className="w-5 h-5 text-pink-400" />} title="مكافآت واحتفالات" color="bg-pink-500/15">
          <div className="space-y-1" dir="rtl">
            <Rule num="3" title="حفل افتتاح الوكالة:" desc="عند عمل حفل افتتاح ودعم 8 ملايين كونز، يمنح الوكيل مليون كونز كمكافأة وVIP5 لمدة 7 أيام + بنر إعلاني." />
            <Rule num="4" title="مراكز التميز:" desc="إذا حققت الوكالة أحد المراكز الثلاثة الأوائل: بنر خاص + وسام التميز + VIP5 للوكيل (7 أيام) + VIP4 لـ3 مشرفين + VIP3 لـ8 مستخدمين فعالين." />
            <Rule num="5" title="مكافآت أول شهر:" desc="VIP4 للوكيل والداعمين (أسبوع) + VIP3 لـ5 مشرفين (أسبوع) + VIP2 لـ10 مستخدمين جدد." />
          </div>
        </Section>

        {/* ── Gifts & Support ── */}
        <Section icon={<Gem className="w-5 h-5 text-cyan-400" />} title="الهدايا والدعم" color="bg-cyan-500/15">
          <div className="space-y-1" dir="rtl">
            <Rule num="6" title="تحويل الهدايا:" desc="عند استلام المستخدم للهدايا داخل التطبيق يتم إضافة نفس القيمة إلى محفظة الوكالة تحت مسمى الألماس." />
            <Rule num="13" title="كأس الروم:" desc="يتم احتساب الدعم النازل بالوكالة في كأس الروم واستلام الوكيل لمكافأة بنسبة معينة أسبوعياً." />
            <Rule num="14" title="هدايا الحظ:" desc="يتم احتساب هدايا الحظ في تارجت المضيف بنسبة 10%." />
          </div>
        </Section>

        {/* ── Salary ── */}
        <Section icon={<DollarSign className="w-5 h-5 text-emerald-400" />} title="الرواتب والسحب" color="bg-emerald-500/15">
          <div className="space-y-1" dir="rtl">
            <Rule num="7" title="سعر الصرف:" desc="1$ = 7,500 كونز للمستخدم، و8,500 كونز لوكيل الشحن." />
            <Rule num="8" title="خصم عدم الإكمال:" desc="في حال عدم إكمال الأيام أو الساعات المطلوبة يتم خصم 20% من الراتب الشهري المستحق." />
            <Rule num="12" title="رفع الراتب:" desc="يقوم المضيف برفع راتبه لوكيل شحن معتمد من تاريخ 1 وحتى 5 من الشهر. على وكيل الشحن تسليمه الراتب في مدة أقصاها تاريخ 10." />
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 mt-2">
              <p className="text-[11px] text-primary font-bold mb-1">💡 طرق السحب المتاحة:</p>
              <p className="text-[10px] text-muted-foreground">• سحب شهري: متاح آخر يوم من الشهر فقط</p>
              <p className="text-[10px] text-muted-foreground">• سحب فوري: متاح دائماً عبر حسابات الدفع</p>
            </div>
          </div>
        </Section>

        {/* ── Leaving Agency ── */}
        <Section icon={<AlertTriangle className="w-5 h-5 text-amber-400" />} title="شروط النزول من الوكالة" color="bg-amber-500/15">
          <div className="space-y-1" dir="rtl">
            <Rule num="9" title="وجود رصيد مستحق:" desc="يمنع نهائياً تنزيل المستخدم من الوكالة إلا بعد تسوية الرصيد واستلامه لراتبه كاملاً." />
            <Rule num="10" title="بدون رصيد:" desc="يتم التنزيل في الفترة المسموحة فقط من تاريخ 1 وحتى 5 من نفس الشهر." />
            <Rule num="11" title="رفض التنزيل:" desc="لا يحق للوكيل رفض تنزيل أي مستخدم ليس لديه رصيد مستحق ولا إجباره على البقاء. في هذه الحالة تقوم الإدارة بتنزيله بعد إرفاق ما يؤيد ذلك." />
          </div>
        </Section>

        {/* ── Host & Agency Table ── */}
        <Section icon={<Trophy className="w-5 h-5 text-yellow-400" />} title="جدول الرواتب والتارجت" color="bg-yellow-500/15">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[9px]" dir="rtl">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="py-2 px-1.5 text-right text-muted-foreground font-bold">الألماس</th>
                  <th className="py-2 px-1.5 text-center text-muted-foreground font-bold">الأيام</th>
                  <th className="py-2 px-1.5 text-center text-emerald-400 font-bold">المضيف $</th>
                  <th className="py-2 px-1.5 text-center text-blue-400 font-bold">الوكالة $</th>
                  <th className="py-2 px-1.5 text-center text-amber-400 font-bold">VIP</th>
                  <th className="py-2 px-1.5 text-center text-purple-400 font-bold">🚗</th>
                </tr>
              </thead>
              <tbody>
                {hostTable.map((r, i) => (
                  <tr key={i} className={`border-b border-border/10 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                    <td className="py-1.5 px-1.5 text-right font-mono text-foreground">{r.diamonds}</td>
                    <td className="py-1.5 px-1.5 text-center text-muted-foreground">{r.days}</td>
                    <td className="py-1.5 px-1.5 text-center text-emerald-400 font-bold">${r.hostSalary}</td>
                    <td className="py-1.5 px-1.5 text-center text-blue-400">${r.agencySalary}</td>
                    <td className="py-1.5 px-1.5 text-center text-amber-400">{r.vipPrize}</td>
                    <td className="py-1.5 px-1.5 text-center text-purple-400">{r.vehicle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-1 bg-muted/10 rounded-xl p-3" dir="rtl">
            <p className="text-[10px] text-muted-foreground">• يسمح للمستخدم بإنشاء حساب مضيف واحد فقط</p>
            <p className="text-[10px] text-muted-foreground">• عند عدم استكمال الأيام يتم خصم 20% من إجمالي الراتب</p>
            <p className="text-[10px] text-muted-foreground">• المالك: ساعتين يوم واحد فعال</p>
            <p className="text-[10px] text-muted-foreground">• يمكن رفع الراتب لوكيل الشحن بنهاية الشهر الحالي فقط</p>
            <p className="text-[10px] text-muted-foreground">• سعر الشحن من جوجل: $1 = 7,000 كوينز | من وكيل الشحن: $1 = 8,500 كوينز</p>
            <p className="text-[10px] text-muted-foreground">• يتم تصفير الرصيد نهاية كل شهر حسب توقيت السعودية</p>
          </div>
        </Section>

        {/* ── Charge Agent Table ── */}
        <Section icon={<Zap className="w-5 h-5 text-orange-400" />} title="سياسة وكالات الشحن" color="bg-orange-500/15">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[9px]" dir="rtl">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="py-2 px-1.5 text-right text-muted-foreground font-bold">مبلغ الشحن $</th>
                  <th className="py-2 px-1.5 text-center text-muted-foreground font-bold">بالعملات</th>
                  <th className="py-2 px-1.5 text-center text-emerald-400 font-bold">بونص الوكيل $</th>
                  <th className="py-2 px-1.5 text-center text-amber-400 font-bold">بونص عملات</th>
                  <th className="py-2 px-1.5 text-center text-primary font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {chargeTable.map((r, i) => (
                  <tr key={i} className={`border-b border-border/10 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                    <td className="py-1.5 px-1.5 text-right font-mono text-foreground">${r.chargeUsd.toLocaleString()}</td>
                    <td className="py-1.5 px-1.5 text-center text-muted-foreground">{r.chargeCoins}</td>
                    <td className="py-1.5 px-1.5 text-center text-emerald-400 font-bold">${r.bonusAgent}</td>
                    <td className="py-1.5 px-1.5 text-center text-amber-400">{r.bonusCoins}</td>
                    <td className="py-1.5 px-1.5 text-center text-primary font-bold">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-1 bg-destructive/5 border border-destructive/15 rounded-xl p-3" dir="rtl">
            <p className="text-[10px] text-destructive font-bold">⚠️ ملاحظات هامة:</p>
            <p className="text-[10px] text-muted-foreground">• لا يمكن لوكلاء الشحن بيع أسعار صرف منخفضة أو مرتفعة جداً لتعطيل الخدمة</p>
            <p className="text-[10px] text-muted-foreground">• لا يمكن لوكلاء الشحن خداع المستخدمين، وعند اكتشاف ذلك سيتم إنهاء التعاون</p>
          </div>
        </Section>

        {/* ── Room Reward Table ── */}
        <Section icon={<Users className="w-5 h-5 text-indigo-400" />} title="قواعد مكافأة الغرفة" color="bg-indigo-500/15">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[10px]" dir="rtl">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="py-2 px-2 text-center text-muted-foreground font-bold">المستوى</th>
                  <th className="py-2 px-2 text-center text-muted-foreground font-bold">هدف العملات (أسبوع)</th>
                  <th className="py-2 px-2 text-center text-emerald-400 font-bold">مكافأة صاحب الغرفة</th>
                </tr>
              </thead>
              <tbody>
                {roomRewardTable.map((r, i) => (
                  <tr key={i} className={`border-b border-border/10 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                    <td className="py-1.5 px-2 text-center text-foreground font-bold">LV {r.level}</td>
                    <td className="py-1.5 px-2 text-center text-muted-foreground">{r.target}</td>
                    <td className="py-1.5 px-2 text-center text-emerald-400 font-bold">{r.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </MobileLayout>
  );
};

export default PolicyPage;

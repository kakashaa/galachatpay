import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertTriangle, CheckCircle2, Ban, Calendar } from "lucide-react";

interface PayoutPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PayoutPolicyDialog = ({ open, onOpenChange }: PayoutPolicyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto bg-card/95 backdrop-blur-xl border-primary/20 max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary justify-center">
            <FileText className="w-5 h-5" />
            سياسة السحب الشهري للراتب
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            يرجى قراءة الشروط والقواعد بعناية
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4" dir="rtl">
          <div className="space-y-4 text-right text-sm">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <h3 className="font-bold text-primary flex items-center gap-2 mb-2 justify-end">
                <span>هدف الخدمة</span>
                <CheckCircle2 className="w-4 h-4" />
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                خدمة السحب الشهري موجودة لمساعدتكم على استلام راتبكم بسرعة آخر يوم من الشهر (30 أو 31) حتى ما يتأخر عليكم الراتب.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <h3 className="font-bold text-warning flex items-center gap-2 mb-3 justify-end">
                <span>مهم جداً (قواعد الاستخدام)</span>
                <AlertTriangle className="w-4 h-4" />
              </h3>
              <div className="space-y-3">
                {[
                  { num: "1", title: "طلب واحد فقط لكل شهر:", desc: "يحق لكل مضيف/مضيفة تقديم/رفع الراتب مرة واحدة فقط في نفس الشهر." },
                  { num: "2", title: "ممنوع تقسيم الراتب على دفعتين:", desc: "رفع نصف الراتب ثم الرجوع ورفع النصف الثاني (أو إعادة الرفع مرة ثانية) غير مسموح." },
                  { num: "3", title: "موعد التقديم:", desc: "المطلوب من الجميع رفع الراتب في آخر يوم من الشهر (30 أو 31) فقط.", icon: <Calendar className="w-3 h-3" /> },
                  { num: "4", title: "سبب المنع:", desc: "التقسيم على مرتين يسبب علينا رسوم تحويل مرتين وبالتالي خسارة وتكاليف إضافية على النظام." },
                ].map((item) => (
                  <div key={item.num} className="flex items-start gap-2">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center text-warning text-xs font-bold">{item.num}</div>
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        {item.icon}
                        {item.title}
                      </p>
                      <p className="text-muted-foreground text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <h3 className="font-bold text-destructive flex items-center gap-2 mb-2 justify-end">
                <span>في حال مخالفة القواعد</span>
                <Ban className="w-4 h-4" />
              </h3>
              <ul className="space-y-2 text-muted-foreground text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>أي شخص يرفع راتبه مرتين في نفس الشهر أو يحاول "يقسم الراتب":</span>
                </li>
                <li className="flex items-start gap-2 mr-4">
                  <span className="text-destructive">-</span>
                  <span>لن يتم تحويل المبلغ في المرة الثانية كراتب</span>
                </li>
                <li className="flex items-start gap-2 mr-4">
                  <span className="text-destructive">-</span>
                  <span>ويتم احتسابه كوينز/نقاط حسب النظام</span>
                </li>
                <li className="flex items-start gap-2 mr-4">
                  <span className="text-destructive">-</span>
                  <span>وقد يتم إيقاف ميزة السحب عنه لاحقاً عند تكرار المخالفة</span>
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <h3 className="font-bold text-primary flex items-center gap-2 mb-2 justify-end">
                <span>ملاحظة احترام وتقدير</span>
                <span>💚</span>
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                الخدمة انعملت عشان راحتكم وتسريع استلام فلوسكم، فنتمنى الالتزام بالقواعد وتقدير الحل اللي وفرناه لكم.
              </p>
            </div>
          </div>
        </ScrollArea>

        <button
          onClick={() => onOpenChange(false)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
        >
          فهمت، أوافق على الشروط ✓
        </button>
      </DialogContent>
    </Dialog>
  );
};

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { galaApi } from "@/services/galaApi";

const VerifyPhone = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code") || "";
  const uuid = searchParams.get("uuid") || "";
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!code || !uuid) {
      setStatus("error");
      setMessage("رابط غير صالح");
      return;
    }

    const verify = async () => {
      try {
        const res: any = await galaApi.call("project-z", "otp_verify", { uuid, code });
        if (res?.success) {
          setStatus("success");
          setMessage("مبروك! تم توثيق حسابك بنجاح 🎉");
        } else {
          setStatus("error");
          setMessage(res?.error || "فشل التوثيق");
        }
      } catch {
        setStatus("error");
        setMessage("حدث خطأ — حاول مرة أخرى");
      }
    };

    verify();
  }, [code, uuid]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-sm w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h1 className="text-xl font-bold text-foreground">جاري التوثيق...</h1>
            <p className="text-sm text-muted-foreground">يتم التحقق من حسابك</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-foreground">تم التوثيق!</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">الحين بتوصلك جميع الإشعارات على واتساب</p>
            <button
              onClick={() => navigate("/salary")}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
            >
              الرجوع للتطبيق
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-foreground">فشل التوثيق</h1>
            <p className="text-sm text-red-400">{message}</p>
            <button
              onClick={() => navigate("/salary")}
              className="w-full py-3 rounded-xl bg-card border border-border/20 text-foreground font-bold text-sm"
            >
              الرجوع
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyPhone;

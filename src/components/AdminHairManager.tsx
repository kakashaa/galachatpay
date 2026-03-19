import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfirmModal } from "@/hooks/use-confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Eye, EyeOff, Save, X, Brain, CheckCircle, XCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface HairItem {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  star_cost?: number;
}

interface AdminHairManagerProps {
  adminSessionToken: string;
  adminUsername: string;
  readOnly?: boolean;
}

/** Render an SVGA file to a canvas and capture a frame as base64 PNG */
async function captureSvgaFrame(file: File): Promise<string> {
  const { Parser, Player } = await import("svga-web");

  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;
  canvas.style.display = "none";
  document.body.appendChild(canvas);

  try {
    const parser = new Parser();
    const arrayBuffer = await file.arrayBuffer();
    const svgaData = await parser.do(arrayBuffer);

    const player = new Player(canvas);
    player.set({ loop: 1, fillMode: "forwards" });
    await player.mount(svgaData);
    player.start();

    // Wait a bit for the first frame to render
    await new Promise(r => setTimeout(r, 300));
    player.pause();

    // Capture canvas as base64
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1] || "";

    player.destroy();
    return base64;
  } finally {
    document.body.removeChild(canvas);
  }
}

/** Send captured frame to AI for Arabic name extraction */
async function extractNameWithAI(imageBase64: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("extract-svga-name", {
    body: { image_base64: imageBase64 },
  });
  if (error) return "";
  return data?.name || "";
}

const AdminHairManager: React.FC<AdminHairManagerProps> = ({ adminSessionToken, adminUsername, readOnly = false }) => {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [hairs, setHairs] = useState<HairItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);


  const loadHairs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hairs")
      .select("*")
      .eq("is_deleted", false)
      .order("display_order", { ascending: true });
    if (!error) setHairs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadHairs(); }, [loadHairs]);

  const extractTitleFromFilename = (fileName: string): string => {
    let name = fileName.replace(/\.svga$/i, "");
    name = name.replace(/[-_]/g, " ").trim();
    const arabicMatch = name.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+/g);
    if (arabicMatch) {
      const arabicName = arabicMatch.join(" ").trim();
      if (arabicName.length > 0) return arabicName;
    }
    return name;
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allSvga = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".svga"));
    if (allSvga.length === 0) {
      toast.error("لا توجد ملفات SVGA");
      return;
    }

    // Filter out files containing "hawa"
    const hawaSkipped = allSvga.filter(f => /hawa/i.test(f.name));
    const afterHawaFilter = allSvga.filter(f => !/hawa/i.test(f.name));

    // Filter out duplicates
    const existingTitles = new Set(hairs.map(h => h.title.trim().toLowerCase()));
    const uploadSet = new Set<string>();
    const svgaFiles: File[] = [];
    let dupSkipped = 0;

    for (const file of afterHawaFilter) {
      const title = extractTitleFromFilename(file.name).toLowerCase();
      if (existingTitles.has(title) || uploadSet.has(title)) {
        dupSkipped++;
        continue;
      }
      uploadSet.add(title);
      svgaFiles.push(file);
    }

    if (hawaSkipped.length > 0) toast.info(`⏭ تم تخطي ${hawaSkipped.length} ملف يحتوي "hawa"`);
    if (dupSkipped > 0) toast.info(`⏭ تم تخطي ${dupSkipped} ملف مكرر`);

    if (svgaFiles.length === 0) {
      toast.warning("لا توجد ملفات جديدة للرفع بعد الفلترة");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadTotal(svgaFiles.length);
    setUploadCurrent(0);
    setUploadProgress(0);

    const currentMaxOrder = hairs.length > 0 ? Math.max(...hairs.map(h => h.display_order)) : 0;
    let successCount = 0;
    let failCount = 0;
    let aiExtracted = 0;

    for (let i = 0; i < svgaFiles.length; i++) {
      const file = svgaFiles[i];
      setUploadCurrent(i + 1);
      setUploadProgress(Math.round(((i + 1) / svgaFiles.length) * 100));

      try {
        // Step 1: Upload file
        setUploadStatus(`رفع ${i + 1}/${svgaFiles.length}`);
        const formData = new FormData();
        formData.append("session_token", adminSessionToken);
        formData.append("username", adminUsername);
        formData.append("file", file);

        const { data: uploadResult, error: uploadError } = await supabase.functions.invoke("admin-upload-video", {
          body: formData,
        });

        if (uploadError || !uploadResult?.url) {
          console.error("Upload failed:", uploadError, uploadResult);
          failCount++;
          continue;
        }

        // Step 2: Try AI name extraction if enabled
        let title = extractTitleFromFilename(file.name);

        if (aiEnabled) {
          try {
            setUploadStatus(`🧠 تحليل ${i + 1}/${svgaFiles.length}`);
            const base64 = await captureSvgaFrame(file);
            if (base64) {
              const aiName = await extractNameWithAI(base64);
              if (aiName && aiName !== "بدون_اسم" && aiName.length > 0) {
                title = aiName;
                aiExtracted++;
              }
            }
          } catch (aiErr) {
            // AI failed, fallback to filename
            console.warn("AI extraction failed, using filename:", aiErr);
          }
        }

        // Step 3: Insert record
        const { error: insertError } = await supabase.from("hairs").insert({
          title,
          file_url: uploadResult.url,
          display_order: currentMaxOrder + i + 1,
        });

        if (insertError) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadStatus("");

    if (successCount > 0) {
      const aiMsg = aiEnabled && aiExtracted > 0 ? ` (🧠 ${aiExtracted} اسم بالذكاء)` : "";
      toast.success(`تم رفع ${successCount} شعرة بنجاح${aiMsg}`);
    }
    if (failCount > 0) toast.error(`فشل رفع ${failCount} ملف`);

    e.target.value = "";
    loadHairs();
  };

  const toggleActive = async (hair: HairItem) => {
    const { error } = await supabase
      .from("hairs")
      .update({ is_active: !hair.is_active })
      .eq("id", hair.id);
    if (!error) {
      setHairs(prev => prev.map(h => h.id === hair.id ? { ...h, is_active: !h.is_active } : h));
      toast.success(hair.is_active ? "تم إخفاء الشعرة" : "تم تفعيل الشعرة");
    }
  };

  const deleteHair = async (id: string) => {
    const ok = await confirm({ title: "حذف الشعرة", message: "هل تريد حذف هذه الشعرة؟", danger: true, confirmText: "حذف" });
    if (!ok) return;
    const { error } = await supabase
      .from("hairs")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setHairs(prev => prev.filter(h => h.id !== id));
      toast.success("تم حذف الشعرة");
    }
  };

  const startEdit = (hair: HairItem) => {
    setEditingId(hair.id);
    setEditTitle(hair.title);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("hairs")
      .update({ title: editTitle })
      .eq("id", editingId);
    if (!error) {
      setHairs(prev => prev.map(h => h.id === editingId ? { ...h, title: editTitle } : h));
      setEditingId(null);
      toast.success("تم تحديث الاسم");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div key="hairs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Upload Section */}
      {!readOnly && (
      <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">رفع شعرات SVGA</h3>
          </div>
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              aiEnabled
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-muted/30 text-muted-foreground border border-border/30"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            {aiEnabled ? "AI مفعل" : "AI معطل"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {aiEnabled
            ? "🧠 الذكاء الاصطناعي سيستخرج الاسم العربي من داخل كل ملف SVGA تلقائياً"
            : "يمكنك اختيار أكثر من 100 ملف SVGA ورفعهم دفعة واحدة"}
        </p>

        <label className="block">
          <input
            type="file"
            accept=".svga"
            multiple
            onChange={handleBulkUpload}
            disabled={uploading}
            className="w-full text-sm file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 bg-muted/20 border border-border/30 rounded-lg p-1"
          />
        </label>

        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {uploadStatus || `جاري الرفع... ${uploadCurrent} / ${uploadTotal}`} ({uploadProgress}%)
            </p>
          </div>
        )}
      </div>
      )}

      {/* Stats */}
      <div className="bg-muted/20 rounded-xl p-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">إجمالي الشعرات</span>
        <span className="text-sm font-bold text-foreground">{hairs.length}</span>
      </div>

      {/* Hair Selections Management */}
      <HairSelectionsPanel hairs={hairs} readOnly={readOnly} />

      {/* Hair Items */}
      {hairs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Upload className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>لا توجد شعرات بعد. ارفع ملفات SVGA للبدء</p>
        </div>
      ) : (
        <div className="space-y-2">
          {hairs.map((hair, index) => (
            <div
              key={hair.id}
              className={`bg-card border border-border/40 rounded-xl p-3 flex items-center gap-3 ${!hair.is_active ? "opacity-50" : ""}`}
            >
              <span className="text-xs text-muted-foreground font-mono w-6 text-center">{index + 1}</span>

              <div className="flex-1 min-w-0">
                {editingId === hair.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={saveEdit} className="h-8 px-2">
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8 px-2">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm font-medium truncate cursor-pointer" onClick={() => startEdit(hair)}>
                    {hair.title || "بدون اسم"}
                  </p>
                )}
              </div>

              {!readOnly && <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(hair)} className="p-1.5 rounded-lg hover:bg-muted">
                  {hair.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => deleteHair(hair.id)} className="p-1.5 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
    {ConfirmDialog}
    </>
  );
};

// ============ Hair Selections Admin Panel ============

const HairSelectionsPanel: React.FC<{ hairs: HairItem[]; readOnly?: boolean }> = ({ hairs, readOnly = false }) => {
  const [selections, setSelections] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadSelections = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hair_selections")
      .select("*" as any)
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(100);
    setSelections((data as any) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (expanded) loadSelections();
  }, [expanded, loadSelections]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("hair_selections")
      .update({ status } as any)
      .eq("id", id);
    if (!error) {
      setSelections(prev => prev.filter(s => s.id !== id));
      toast.success(status === "approved" ? "تم قبول الطلب" : "تم رفض الطلب");
    }
  };

  const getHairTitle = (hairId: string) => {
    return hairs.find(h => h.id === hairId)?.title || hairId.slice(0, 8);
  };

  return (
    <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between text-sm font-bold text-foreground"
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          طلبات الشعرات
        </span>
        <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Filter */}
          <div className="flex gap-2">
            {(["pending", "approved", "rejected"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filter === f ? "bg-primary/15 text-primary" : "bg-muted/20 text-muted-foreground"
                }`}
              >
                {f === "pending" ? "معلقة" : f === "approved" ? "مقبولة" : "مرفوضة"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : selections.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">لا توجد طلبات</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selections.map((sel: any) => (
                <div key={sel.id} className="bg-muted/10 border border-border/20 rounded-lg p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{getHairTitle(sel.hair_id)}</p>
                    <p className="text-[10px] text-muted-foreground">UUID: {sel.user_uuid} · {sel.selection_week}</p>
                  </div>
                  {filter === "pending" && !readOnly && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleAction(sel.id, "approved")} className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </button>
                      <button onClick={() => handleAction(sel.id, "rejected")} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20">
                        <XCircle className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHairManager;

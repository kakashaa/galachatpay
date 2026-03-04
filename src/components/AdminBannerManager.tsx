import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Loader2, Eye, EyeOff, Upload, Image } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface Banner {
  id: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface Props {
  adminSessionToken: string;
  adminUsername: string;
  readOnly?: boolean;
}

const AdminBannerManager: React.FC<Props> = ({ adminSessionToken, adminUsername, readOnly }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addPreview, setAddPreview] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("banners")
      .select("*")
      .order("display_order", { ascending: true });
    setBanners((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadBanners(); }, [loadBanners]);

  const uploadImage = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `banners/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("attachments")
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) throw new Error("فشل رفع الصورة: " + error.message);
    const { data } = supabase.storage.from("attachments").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAddBanner = async () => {
    if (!addFile) { toast.error("يرجى اختيار صورة"); return; }
    setUploading(true);
    try {
      const url = await uploadImage(addFile);
      const { error } = await supabase.from("banners").insert({
        image_url: url,
        display_order: banners.length,
        is_active: true,
      } as any);
      if (error) throw error;
      toast.success("تم إضافة البنر بنجاح");
      setShowAdd(false); setAddFile(null); setAddPreview(null);
      loadBanners();
    } catch (err: any) { toast.error(err?.message || "فشل الإضافة"); }
    finally { setUploading(false); }
  };

  const toggleActive = async (banner: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !banner.is_active } as any)
      .eq("id", banner.id);
    if (error) { toast.error("فشل التحديث"); return; }
    toast.success(banner.is_active ? "تم تعطيل البنر" : "تم تفعيل البنر");
    loadBanners();
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    const { error } = await supabase.from("banners").delete().eq("id", deleteDialog);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم حذف البنر بنجاح");
    setDeleteDialog(null);
    loadBanners();
  };

  const handleEdit = async () => {
    if (!editDialog || !editFile) { toast.error("يرجى اختيار صورة جديدة"); return; }
    setUploading(true);
    try {
      const url = await uploadImage(editFile);
      const { error } = await supabase
        .from("banners")
        .update({ image_url: url, updated_at: new Date().toISOString() } as any)
        .eq("id", editDialog);
      if (error) throw error;
      toast.success("تم تعديل البنر بنجاح");
      setEditDialog(null); setEditFile(null); setEditPreview(null);
      loadBanners();
    } catch (err: any) { toast.error(err?.message || "فشل التعديل"); }
    finally { setUploading(false); }
  };

  const handleFileSelect = (file: File, type: "add" | "edit") => {
    const url = URL.createObjectURL(file);
    if (type === "add") { setAddFile(file); setAddPreview(url); }
    else { setEditFile(file); setEditPreview(url); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Add button */}
      {!readOnly && (
        <Button onClick={() => setShowAdd(true)} className="w-full gap-2" variant="outline">
          <Plus className="w-4 h-4" /> إضافة بنر
        </Button>
      )}

      {/* Banner list */}
      {banners.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Image className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>لا توجد بنرات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-card border border-border/40 rounded-xl overflow-hidden">
              <img
                src={banner.image_url}
                alt="Banner"
                className="w-full h-32 object-cover"
              />
              <div className="p-3 flex items-center justify-between" dir="rtl">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={banner.is_active}
                    onCheckedChange={() => !readOnly && toggleActive(banner)}
                    disabled={readOnly}
                  />
                  <span className={`text-xs font-bold ${banner.is_active ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {banner.is_active ? "مفعّل" : "معطّل"}
                  </span>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditDialog(banner.id); setEditFile(null); setEditPreview(null); }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteDialog(banner.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة بنر جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {addPreview ? (
              <img src={addPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">اختر صورة البنر</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "add")}
                />
              </label>
            )}
            {addPreview && (
              <Button variant="outline" size="sm" onClick={() => { setAddFile(null); setAddPreview(null); }}>
                تغيير الصورة
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAddBanner} disabled={uploading || !addFile} className="gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent className="max-w-xs text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا البنر؟</p>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={handleDelete}>نعم، احذف</Button>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(o) => !o && setEditDialog(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل البنر</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">هل تريد تغيير الصورة؟</p>
          <div className="space-y-4">
            {editPreview ? (
              <img src={editPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">اختر صورة جديدة</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "edit")}
                />
              </label>
            )}
            {editPreview && (
              <Button variant="outline" size="sm" onClick={() => { setEditFile(null); setEditPreview(null); }}>
                تغيير الصورة
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} disabled={uploading || !editFile} className="gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              تأكيد التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminBannerManager;

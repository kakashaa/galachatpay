import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/utils/compressImage";

interface UploadOptions {
  file: File;
  bucket: string;
  path: string;
  userUuid: string;
}

export async function secureUpload({ file, bucket, path, userUuid }: UploadOptions): Promise<string> {
  // Compress image files before uploading
  const processedFile = await compressImage(file, 1200, 1200, 0.7);

  const formData = new FormData();
  formData.append("file", processedFile);
  formData.append("bucket", bucket);
  formData.append("path", path);
  formData.append("user_uuid", userUuid);

  const { data, error } = await supabase.functions.invoke("secure-upload", {
    body: formData,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.url;
}

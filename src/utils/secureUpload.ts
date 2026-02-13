import { supabase } from "@/integrations/supabase/client";

interface UploadOptions {
  file: File;
  bucket: string;
  path: string;
  userUuid: string;
}

export async function secureUpload({ file, bucket, path, userUuid }: UploadOptions): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
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

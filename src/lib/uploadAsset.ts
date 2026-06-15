/**
 * Upload a file to the school-assets bucket via server-side API
 * (avoids Supabase storage RLS which blocks client uploads).
 */
export async function uploadAsset(file: File, path: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("path", path);
  const res = await fetch("/api/admin/upload-asset", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.publicUrl as string;
}

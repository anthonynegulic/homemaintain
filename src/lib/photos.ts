import { getSupabase } from "./supabase";

const MAX_EDGE = 1600;

/** Shrink phone photos before upload: long edge 1600px, JPEG. Falls back to the original file. */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Uploads to the private bucket and returns the storage path. */
export async function uploadPhoto(householdId: string, file: File): Promise<string> {
  const blob = await downscale(file);
  const path = `${householdId}/${crypto.randomUUID()}.jpg`;
  const { error } = await getSupabase().storage.from("photos").upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw error;
  return path;
}

const cache = new Map<string, Promise<string>>();

/** Signed URLs are cached for the session (valid for 6 hours). */
export function photoUrl(path: string): Promise<string> {
  let p = cache.get(path);
  if (!p) {
    p = getSupabase()
      .storage.from("photos")
      .createSignedUrl(path, 6 * 3600)
      .then(({ data, error }) => {
        if (error || !data) throw error ?? new Error("No URL");
        return data.signedUrl;
      });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p;
}

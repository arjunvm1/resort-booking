import { supabase } from "../supabase"

export function validateRoomPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size)
    throw new Error("Choose JPEG, PNG, or WebP photos.")
  if (file.size > 5 * 1024 * 1024) throw new Error("Each room photo must be 5 MB or smaller.")
}

export async function storeRoomImage(file: File): Promise<string> {
  validateRoomPhoto(file)
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type]
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`
  const filePath = `listings/${fileName}`
  const bucket = "listing-images"
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type })
  if (error) {
    if (/fetch|network|load failed/i.test(error.message)) {
      const hostname = new URL(import.meta.env.VITE_SUPABASE_URL).hostname
      throw new Error(
        `Cannot reach Supabase (${hostname}). Check the Project URL in your Supabase dashboard and confirm the project is active. Update resort-booking/.env and restart Vite if the URL changed.`,
      )
    }
    throw new Error(`Image upload failed: ${error.message}`)
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

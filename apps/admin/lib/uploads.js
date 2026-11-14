import { apiFetch, apiUpload } from "@/lib/api";

/** The image types the API actually accepts (it checks the file's bytes —
 * see apps/api/src/lib/file-type.js). Used as every file picker's `accept`
 * so the picker never offers a file the server will reject. No SVG: it can
 * carry scripts. */
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

let configPromise = null;
function uploadConfig() {
  if (!configPromise) {
    configPromise = apiFetch("/api/files/upload/config").catch((err) => {
      configPromise = null;
      throw err;
    });
  }
  return configPromise;
}

/**
 * Sends one file to the storage a signature from the API names: a PUT for
 * Azure Blob, a form POST for ImageKit/Cloudinary. Returns the provider's id
 * for the file. `onProgress(percent)` is optional.
 */
export function sendSigned(signed, file, fallbackName, onProgress) {
  const put = signed.method === "PUT";
  let body = file;
  if (!put) {
    body = new FormData();
    for (const [key, value] of Object.entries(signed.fields)) body.append(key, value);
    if (signed.storage === "imagekit") body.append("fileName", file.name || fallbackName);
    body.append(signed.fileField, file);
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(put ? "PUT" : "POST", signed.uploadUrl);
    for (const [key, value] of Object.entries(signed.headers || {})) xhr.setRequestHeader(key, value);
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let json = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(json?.message || json?.error?.message || "Upload failed. Please try again."));
      resolve(put ? signed.providerFileId : signed.storage === "imagekit" ? json?.fileId : json?.public_id);
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(body);
  });
}

/**
 * Signs and sends a file; when the main storage refuses it (full, down) and
 * a backup storage is set up, tries the backup. Returns { storage, providerFileId }.
 */
export async function sendWithFallback(signPath, file, fallbackName, onProgress) {
  const mime = file.type || "";
  const signed = await apiFetch(signPath, { method: "POST", body: { mime } });
  try {
    return { storage: signed.storage, providerFileId: await sendSigned(signed, file, fallbackName, onProgress), signed };
  } catch (err) {
    let backup = null;
    try {
      backup = await apiFetch(signPath, { method: "POST", body: { mime, fallback: true } });
    } catch {
      throw err;
    }
    return { storage: backup.storage, providerFileId: await sendSigned(backup, file, fallbackName, onProgress), signed: backup };
  }
}

/**
 * Uploads an image to the store's Files library and returns the File row.
 * With a storage service configured (Azure Blob, ImageKit, Cloudinary) the
 * browser sends the file straight to it using a signature from the API,
 * then the API checks and records it; otherwise the file goes through the
 * API as before.
 */
export async function uploadImage(file) {
  const config = await uploadConfig();
  if (!config.direct) return (await apiUpload("/api/files/upload", file)).file;
  if (file.size > config.maxBytes) throw new Error("File is too large (max 8MB).");

  const { storage, providerFileId } = await sendWithFallback("/api/files/upload/sign", file, "image");
  const done = await apiFetch("/api/files/upload/complete", { method: "POST", body: { providerFileId, storage, name: file.name } });
  return done.file;
}

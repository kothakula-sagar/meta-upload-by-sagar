const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
const FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || "meta-upload";

export async function uploadImage(file, onProgress = () => {}) {
  if (!file) throw new Error("Please select an image.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Maximum image size is 10 MB.");

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env.");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  if (FOLDER) formData.append("folder", FOLDER);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Cloudinary upload failed."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data);
        else reject(new Error(data?.error?.message || "Cloudinary rejected the image."));
      } catch { reject(new Error("Invalid Cloudinary response.")); }
    };
    xhr.send(formData);
  });
}

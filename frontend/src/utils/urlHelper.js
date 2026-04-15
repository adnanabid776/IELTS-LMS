/**
 * Resolves the full URL for an image.
 * If the URL is absolute (Cloudinary), it returns it as is.
 * If the URL is relative (starts with /uploads), it prepends the backend base URL.
 * @param {string} url - The image URL or relative path.
 * @returns {string} - The corrected full URL.
 */
export const resolveImageUrl = (url) => {
  if (!url) return "";
  
  // If it's already an absolute URL (Cloudinary, external), return it
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  // Get backend base URL from environment variable
  // VITE_API_URL is expected to be something like http://localhost:5000/api
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const baseUrl = apiUrl.replace("/api", "");
  
  // If it starts with /uploads or uploads/, clean it up and prepend base URL
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  
  if (cleanPath.startsWith("/uploads")) {
    return `${baseUrl}${cleanPath}`;
  }
  
  return url;
};

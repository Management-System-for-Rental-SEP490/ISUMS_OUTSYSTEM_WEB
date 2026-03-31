import axios from "axios";
import { toast } from "react-toastify";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

/**
 * Chỉ toast lỗi 500 khi caller không tự xử lý UI lỗi.
 * Truyền config `{ silent500: true }` trong axios request để tắt toast.
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 500 && !error.config?.silent500) {
      console.error("Server error:", error.response.data);
      toast.error("Lỗi máy chủ, vui lòng thử lại sau.");
    }
    return Promise.reject(error);
  }
);

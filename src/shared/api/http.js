import axios from "axios";
import { toast } from "react-toastify";
import i18n from "../../i18n";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

/**
 * Chỉ toast lỗi 500 khi caller không tự xử lý UI lỗi.
 * Truyền config `{ silent500: true }` trong axios request để tắt toast.
 *
 * The toast copy follows the active locale (vi / en / ja) — resolved at
 * the moment the error fires, not import time.
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 500 && !error.config?.silent500) {
      console.error("Server error:", error.response.data);
      toast.error(i18n.t("errors.server"));
    }
    return Promise.reject(error);
  }
);

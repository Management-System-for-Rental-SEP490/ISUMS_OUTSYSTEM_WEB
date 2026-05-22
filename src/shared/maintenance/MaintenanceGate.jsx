import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const POLL_INTERVAL_MS = 30_000;
const STATUS_ENDPOINT =
  (typeof window !== "undefined" && window.__OCRS_API__) ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://api.isums.pro";

function formatDateTime(iso, lang) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "vi-VN",
      { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function MaintenancePage({ status, lang }) {
  const severity = status.severity || "INFO";
  const palette = {
    INFO: { bg: "#eaf3fb", border: "#9bc4e6", color: "#1d3a5f" },
    WARNING: { bg: "#fdf3e3", border: "#e8b96a", color: "#6a4400" },
    CRITICAL: { bg: "#fbe6e6", border: "#d97070", color: "#7a1d1d" },
  }[severity];

  const title =
    (lang === "ja" && status.titleJa) ||
    (lang === "en" && status.titleEn) ||
    status.titleVi;
  const message =
    (lang === "ja" && status.messageJa) ||
    (lang === "en" && status.messageEn) ||
    status.messageVi;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem", background: "#f7fafc", fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        maxWidth: 560, width: "100%", padding: "2.5rem 2rem",
        background: "#fff", border: `2px solid ${palette.border}`, borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
      }}>
        <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🛠️</div>
        <h1 style={{
          textAlign: "center", marginBottom: 16, color: palette.color, fontSize: 24
        }}>{title}</h1>
        <p style={{
          fontSize: 16, lineHeight: 1.6, color: "#333", whiteSpace: "pre-wrap",
          background: palette.bg, padding: "1rem", borderRadius: 8, marginBottom: 20
        }}>{message}</p>
        {status.scheduledEnd && (
          <p style={{ textAlign: "center", color: "#666", marginBottom: 12 }}>
            ⏰ {lang === "en" ? "Estimated back at: " : lang === "ja" ? "復旧予定: " : "Dự kiến hoạt động lại lúc: "}
            <strong>{formatDateTime(status.scheduledEnd, lang)}</strong>
          </p>
        )}
        {(status.contactEmail || status.contactPhone) && (
          <div style={{
            borderTop: "1px solid #eee", paddingTop: 16, marginTop: 16, fontSize: 14, color: "#555"
          }}>
            <div style={{ marginBottom: 4 }}>
              {lang === "en" ? "Need help?" : lang === "ja" ? "お問い合わせ" : "Liên hệ khẩn cấp:"}
            </div>
            {status.contactEmail && <div>📧 <a href={`mailto:${status.contactEmail}`}>{status.contactEmail}</a></div>}
            {status.contactPhone && <div>📞 <a href={`tel:${status.contactPhone}`}>{status.contactPhone}</a></div>}
          </div>
        )}
      </div>
    </div>
  );
}

export function MaintenanceGate({ children }) {
  const { i18n } = useTranslation();
  const [status, setStatus] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch(`${STATUS_ENDPOINT}/api/system/maintenance/status`, {
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        const data = j?.data ?? j;
        const enabled = data?.enabled === true
          && (data?.scope === "TENANT_PORTAL" || data?.scope === "ALL");
        setStatus(enabled ? data : null);
      } catch {
        if (cancelled) return;
        setStatus(null);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (!checked) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#999" }}>Đang tải...</div>;
  }
  if (status) {
    return <MaintenancePage status={status} lang={i18n.language?.startsWith("ja") ? "ja" : i18n.language?.startsWith("en") ? "en" : "vi"} />;
  }
  return children;
}

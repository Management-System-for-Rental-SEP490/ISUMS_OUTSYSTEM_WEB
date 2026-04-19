import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { toast } from "react-toastify";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { getContractPdfUrl, uploadCccd } from "../services/contract.api";
import CccdModal from "../../../components/CccdModal";

// Worker setup cho react-pdf v10
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function ContractConfirmPage() {
  const { contractId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  // Fetch presigned PDF URL từ API
  const [pdfUrl, setPdfUrl] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  // PDF render state
  const [numPages, setNumPages] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  // CCCD state
  const [cccdOpen, setCccdOpen] = useState(false);
  const [cccdDone, setCccdDone] = useState(false);

  // Fetch PDF URL khi mount
  useEffect(() => {
    if (!contractId || !token) {
      setFetchError("Đường dẫn không hợp lệ.");
      setFetchLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchPdfUrl() {
      try {
        const res = await getContractPdfUrl(contractId, token);
        if (cancelled) return;
        const url = res?.data?.data;
        if (!url) throw new Error("Không lấy được link PDF.");
        setPdfUrl(url);
        setPdfRendering(true);
      } catch (err) {
        if (!cancelled)
          setFetchError(
            err?.response?.data?.message ||
              err?.message ||
              "Không thể tải hợp đồng.",
          );
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    }
    fetchPdfUrl();
    return () => {
      cancelled = true;
    };
  }, [contractId, token]);

  // Đo chiều rộng container để PDF fit đúng
  const containerRef = useCallback((node) => {
    if (node) setContainerWidth(node.getBoundingClientRect().width);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfRendering(false);
  };

  const onDocumentLoadError = (err) => {
    setPdfError(err?.message || "Không thể hiển thị file hợp đồng.");
    setPdfRendering(false);
  };

  const handleCccdConfirm = async (frontImage, backImage) => {
    await uploadCccd(contractId, token, frontImage, backImage);
    setCccdDone(true);
    setCccdOpen(false);
    toast.success("Xác minh CCCD thành công! Hợp đồng đã sẵn sàng để ký.");
  };

  // ── Loading / Error toàn trang ──────────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-slate-500">
        <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        <span className="text-sm">Đang tải hợp đồng...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="px-6 py-4 rounded-lg bg-white shadow text-center text-red-500 text-sm">
          {fetchError}
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-4xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-[11px] font-bold tracking-wide">
                HĐ
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
                Xem trước hợp đồng
              </div>
              <div className="text-sm font-semibold text-slate-800 truncate">
                Vui lòng đọc kỹ trước khi xác nhận
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cccdDone && (
              <span className="hidden md:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Đã xác minh
              </span>
            )}
            <button
              onClick={() => setCccdOpen(true)}
              disabled={cccdDone}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs md:text-sm font-semibold shadow-sm transition-all active:scale-95",
                cccdDone
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-blue-600 hover:bg-blue-700 text-white",
              ].join(" ")}
            >
              {cccdDone ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Đã xác minh CCCD
                </>
              ) : (
                "Xác nhận & Tải CCCD"
              )}
            </button>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <main className="grow flex flex-col items-center py-6 px-4 overflow-y-auto">
        {/* Width probe - invisible div để đo containerWidth */}
        <div ref={containerRef} className="w-full max-w-4xl" />

        {/* Đang render PDF */}
        {pdfRendering && (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            Đang hiển thị hợp đồng...
          </div>
        )}

        {pdfError && (
          <div className="flex items-center justify-center h-64 text-red-500 text-sm px-4 text-center">
            {pdfError}
          </div>
        )}

        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="flex flex-col items-center gap-4 w-full max-w-4xl"
          >
            {Array.from({ length: numPages ?? 0 }, (_, i) => (
              <div
                key={i + 1}
                className="w-full bg-white rounded-lg shadow-md overflow-hidden"
              >
                <Page
                  pageNumber={i + 1}
                  width={containerWidth || undefined}
                  renderAnnotationLayer
                  renderTextLayer
                />
              </div>
            ))}
          </Document>
        )}

        {numPages && numPages > 1 && (
          <p className="mt-2 text-xs text-slate-400">{numPages} trang</p>
        )}

        {/* Nút xác nhận dưới cùng */}
        {!cccdDone && numPages && (
          <button
            onClick={() => setCccdOpen(true)}
            className="mt-6 mb-4 inline-flex items-center gap-2 px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"
              />
            </svg>
            Tôi đã đọc và muốn xác nhận CCCD
          </button>
        )}

        {cccdDone && (
          <div className="mt-6 mb-4 flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-sm">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Đã xác minh CCCD — Hợp đồng sẽ gửi về để chủ nhà ký trước.
          </div>
        )}
      </main>

      <CccdModal
        open={cccdOpen}
        onClose={() => setCccdOpen(false)}
        onConfirm={handleCccdConfirm}
      />
    </div>
  );
}

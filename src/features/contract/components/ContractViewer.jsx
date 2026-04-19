import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { A4_WIDTH_PX, A4_HEIGHT_PX } from "../utils/signatureUtils";
import DragSignatureBox from "./DragSignatureBox";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function ContractViewer({
  scrollAreaRef,
  contractContentRef,
  pdfUrl,
  totalPages,
  numPdfPages,
  onPdfLoad,
  a4Scale,
  placementMode,
  signLoading,
  signatureBoxPosition,
  setSignatureBoxPosition,
  boxPxSize,
  currentPlacement,
  signatureImage,
  signerName,
}) {
  return (
    <div
      ref={scrollAreaRef}
      className="pdf-scroll-area grow overflow-y-auto bg-slate-200 py-8 px-5"
      style={{
        backgroundImage:
          "radial-gradient(circle at 60% 20%, #dbeafe22 0%, transparent 60%)",
      }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Hint banner */}
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded-full px-4 py-2 shadow-sm ring-1 ring-slate-200">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shrink-0 ring-2 ring-emerald-100" />
          Vui lòng kiểm tra kỹ nội dung trước khi thực hiện ký số
        </div>

        {/* ── PDF page area ── */}
        <div
          style={{
            width: (A4_WIDTH_PX + 40) * a4Scale,
            height: (totalPages * A4_HEIGHT_PX + 40) * a4Scale,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div
            className="bg-white shadow-2xl ring-1 ring-black/5 rounded-2xl"
            style={{
              padding: "20px 20px",
              transform: `scale(${a4Scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <div
              ref={contractContentRef}
              className="relative"
              style={{
                width: A4_WIDTH_PX,
                minHeight: totalPages * A4_HEIGHT_PX,
              }}
            >
              {pdfUrl && (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => onPdfLoad(numPages)}
                  loading={
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
                      Đang tải hợp đồng...
                    </div>
                  }
                >
                  {Array.from({ length: numPdfPages ?? 0 }, (_, i) => (
                    <div
                      key={i + 1}
                      className="relative"
                      style={{
                        pointerEvents: placementMode ? "none" : "auto",
                        // Thiết lập z-index giảm dần để bóng của trang trên có thể phủ xuống trang dưới
                        zIndex: (numPdfPages ?? 0) - i,
                      }}
                    >
                      <Page
                        pageNumber={i + 1}
                        width={A4_WIDTH_PX}
                        renderAnnotationLayer
                        renderTextLayer
                      />

                      {/* Phần UI tách trang dạng Absolute để không làm thay đổi chiều cao tổng của layout */}
                      {i < numPdfPages - 1 && (
                        <div className="absolute bottom-0 left-0 w-full flex justify-center pointer-events-none z-10">
                          {/* Đường line mờ và viền bóng đổ tạo cảm giác giấy xếp chồng */}
                          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-slate-300 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"></div>

                          {/* Nút Badge hiển thị chuyển trang (tuỳ chọn - giúp UI xịn hơn) */}
                          <div className="absolute translate-y-1/2 bg-slate-50 text-slate-400 text-[10px] font-medium px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1">
                            <svg
                              className="w-3 h-3 text-slate-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 13l-7 7-7-7m14-8l-7 7-7-7"
                              />
                            </svg>
                            Trang {i + 1}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </Document>
              )}

              {placementMode && (
                <DragSignatureBox
                  containerRef={contractContentRef}
                  position={signatureBoxPosition}
                  setPosition={setSignatureBoxPosition}
                  disabled={signLoading}
                  signatureImage={signatureImage}
                  signerName={signerName}
                  boxW={boxPxSize.w}
                  boxH={boxPxSize.h}
                  currentPage={currentPlacement.signingPage}
                  totalPages={totalPages}
                  currentPosition={currentPlacement.signingPosition}
                  scale={a4Scale}
                />
              )}
            </div>
          </div>
        </div>

        {/* Placement info bar */}
        {placementMode && (
          <div
            className="text-xs text-slate-600 bg-white rounded-xl px-4 py-2.5 shadow-sm ring-1 ring-slate-200 flex items-center gap-2"
            style={{ width: 794 }}
          >
            <span className="text-slate-400">Trang</span>
            <span className="font-semibold text-blue-700">
              {currentPlacement.signingPage}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">Tọa độ PDF (pt)</span>
            <span className="font-mono text-slate-500">
              {currentPlacement.signingPosition}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 text-slate-400 text-xs py-2">
          <span className="inline-block w-10 border-t border-slate-300" />
          Hết nội dung hợp đồng
          <span className="inline-block w-10 border-t border-slate-300" />
        </div>
      </div>
    </div>
  );
}

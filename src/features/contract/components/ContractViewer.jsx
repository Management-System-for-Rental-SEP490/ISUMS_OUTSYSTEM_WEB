import { A4_WIDTH_PX, A4_HEIGHT_PX } from "../utils/signatureUtils";
import DragSignatureBox from "./DragSignatureBox";

export default function ContractViewer({
  scrollAreaRef,
  contractContentRef,
  iframeRef,
  html,
  iframeHeight,
  totalPages,
  a4Scale,
  placementMode,
  signLoading,
  signatureBoxPosition,
  setSignatureBoxPosition,
  boxPxSize,
  currentPlacement,
  signatureImage,
  signerName,
  onIframeLoad,
}) {
  return (
    <div
      ref={scrollAreaRef}
      className="pdf-scroll-area flex-grow overflow-y-auto bg-slate-200 py-8 px-5"
      style={{ backgroundImage: "radial-gradient(circle at 60% 20%, #dbeafe22 0%, transparent 60%)" }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Hint banner */}
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white rounded-full px-4 py-2 shadow-sm ring-1 ring-slate-200">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shrink-0 ring-2 ring-emerald-100" />
          Vui lòng kiểm tra kỹ nội dung trước khi thực hiện ký số
        </div>

        {/* ── A4 contract page ── */}
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
              {html && (
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  title="contract-preview"
                  onLoad={onIframeLoad}
                  scrolling="no"
                  style={{
                    width: "100%",
                    height: iframeHeight,
                    border: "none",
                    display: "block",
                    pointerEvents: placementMode ? "none" : "auto",
                  }}
                />
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
            <span className="font-semibold text-blue-700">{currentPlacement.signingPage}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">Tọa độ PDF (pt)</span>
            <span className="font-mono text-slate-500">{currentPlacement.signingPosition}</span>
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

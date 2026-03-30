import { useRef, useState } from "react";

/** Xoay ảnh bằng canvas và trả về File mới đã rotate */
async function rotateImageFile(file, degrees) {
  if (degrees === 0) return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const rad = (degrees * Math.PI) / 180;
  const swap = degrees % 180 !== 0;
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => resolve(new File([blob], file.name, { type: file.type })),
      file.type,
    ),
  );
}

function ImageUploadBox({ label, preview, rotation, onSelect, onRotate }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div
        onClick={() => !preview && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center w-full h-52 rounded-xl transition-colors overflow-hidden",
          preview
            ? "border-2 border-teal-400 bg-white"
            : "border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer",
        ].join(" ")}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            {/* Checkmark badge */}
            <span className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-green-500 shadow z-10">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {/* Nút xoay ảnh */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRotate(); }}
              title="Xoay ảnh 90°"
              className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 border border-gray-200 shadow text-xs font-medium text-gray-600 hover:bg-white hover:text-teal-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Xoay
            </button>
            {/* Nút đổi ảnh */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              title="Chọn ảnh khác"
              className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 border border-gray-200 shadow text-xs font-medium text-gray-600 hover:bg-white hover:text-blue-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Đổi ảnh
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 select-none px-4 text-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15l-5-5L5 21" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Nhấn hoặc kéo ảnh vào đây</span>
            <span className="text-xs text-gray-400">Định dạng hỗ trợ: JPG, PNG, tối đa 5MB</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleChange} />
      </div>
    </div>
  );
}

export default function CccdModal({ open, onClose, onConfirm, stepIndicator }) {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [frontRotation, setFrontRotation] = useState(0);
  const [backRotation, setBackRotation] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSelect = (side, file) => {
    const url = URL.createObjectURL(file);
    if (side === "front") {
      setFrontFile(file);
      setFrontPreview(url);
      setFrontRotation(0);
    } else {
      setBackFile(file);
      setBackPreview(url);
      setBackRotation(0);
    }
  };

  const handleSubmit = async () => {
    if (!frontFile || !backFile) return;
    setLoading(true);
    try {
      const [rotatedFront, rotatedBack] = await Promise.all([
        rotateImageFile(frontFile, frontRotation),
        rotateImageFile(backFile, backRotation),
      ]);
      await onConfirm(rotatedFront, rotatedBack);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setFrontRotation(0);
    setBackRotation(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-9999 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {stepIndicator && (
          <div className="px-8 pt-6 pb-5 border-b border-gray-100">
            {stepIndicator}
          </div>
        )}
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#1a3d52]">
              Xác minh danh tính (CCCD)
            </h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              Vui lòng tải lên ảnh mặt trước và mặt sau Căn cước công dân để
              xác minh danh tính trước khi ký hợp đồng.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="ml-4 mt-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload boxes */}
        <div className="px-6 pt-3 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadBox
              label="Mặt trước CCCD"
              preview={frontPreview}
              rotation={frontRotation}
              onSelect={(f) => handleSelect("front", f)}
              onRotate={() => setFrontRotation((r) => (r + 90) % 360)}
            />
            <ImageUploadBox
              label="Mặt sau CCCD"
              preview={backPreview}
              rotation={backRotation}
              onSelect={(f) => handleSelect("back", f)}
              onRotate={() => setBackRotation((r) => (r + 90) % 360)}
            />
          </div>
        </div>

        {/* Tips */}
        <div className="mx-6 mb-5 rounded-xl bg-slate-50 border border-slate-200 p-4 flex gap-3">
          <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 10-2 0v1a1 1 0 102 0V6zm-1 3a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z" />
          </svg>
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">Lưu ý khi chụp ảnh:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Ảnh chụp cần rõ nét, không bị lóa sáng hay mất góc.</li>
              <li>Thông tin trên thẻ phải còn thời hạn sử dụng.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!frontFile || !backFile || loading}
            onClick={handleSubmit}
            className="px-7 py-2.5 rounded-full text-sm font-semibold bg-[#1a3d52] text-white hover:bg-[#15324a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang tải lên..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

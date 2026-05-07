  import React, { useRef, useState, useCallback, useEffect } from "react";
  import { useTranslation } from "react-i18next";
  import TermsModal from "./TermsModal";

  /** 1: Chỉ văn bản | 2: Văn bản và hình ảnh | 3: Chỉ hình ảnh */
  export const SIGNATURE_DISPLAY_MODE = {
    TEXT_ONLY: 1,
    TEXT_AND_IMAGE: 2,
    IMAGE_ONLY: 3,
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /** Trim viền trắng xung quanh chữ ký, thêm padding nhỏ, trả về dataURL */
  function trimWhitespace(dataUrl, padding = 12) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
        let top = height, left = width, right = 0, bottom = 0;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
            // pixel không phải trắng/trong suốt
            if (a > 20 && !(r > 240 && g > 240 && b > 240)) {
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        }

        // Không tìm thấy nét vẽ nào → trả nguyên ảnh gốc
        if (top > bottom || left > right) {
          resolve(dataUrl);
          return;
        }

        const cropW = right - left + 1 + padding * 2;
        const cropH = bottom - top + 1 + padding * 2;
        const out = document.createElement("canvas");
        out.width = cropW;
        out.height = cropH;
        const octx = out.getContext("2d");
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, cropW, cropH);
        octx.drawImage(c, left - padding, top - padding, cropW, cropH, 0, 0, cropW, cropH);
        resolve(out.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
  }

  function DraggableLayer({
    id,
    src,
    pos,
    setPos,
    size,
    boxRef,
    disabled,
    label,
  }) {
    const { t } = useTranslation("common");
    const dragging = useRef(false);
    const start = useRef({ x: 0, y: 0, px: 0, py: 0 });

    const onPointerDown = (e) => {
      if (disabled) return;
      dragging.current = true;
      const rect = boxRef.current?.getBoundingClientRect();
      start.current = {
        x: e.clientX,
        y: e.clientY,
        px: pos.x,
        py: pos.y,
        bw: rect?.width ?? 0,
        bh: rect?.height ?? 0,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!dragging.current || disabled) return;
      const rect = boxRef.current?.getBoundingClientRect();
      const bw = rect?.width ?? start.current.bw;
      const bh = rect?.height ?? start.current.bh;

      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;

      const nextX = clamp(start.current.px + dx, 0, Math.max(0, bw - size.w));
      const nextY = clamp(start.current.py + dy, 0, Math.max(0, bh - size.h));
      setPos({ x: nextX, y: nextY });
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    if (!src) return null;

    return (
      <div
        className={`absolute select-none ${disabled ? "cursor-default" : "cursor-move"}`}
        style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={src}
          alt={label || id}
          className="w-full h-full object-contain bg-white/70 rounded-md border border-slate-200"
          draggable={false}
        />
        {!disabled && (
          <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded shadow">
            {t("signModal.previewDragHint")}
          </div>
        )}
      </div>
    );
  }

  function SignaturePreviewModal({
    open,
    onClose,
    onConfirm,
    loading,
    mode,
    drawnSignature,
    uploadedImage,
    previewBoxRef,
    logoPos,
    setLogoPos,
    sigPos,
    setSigPos,
    logoSize,
    sigSize,
    finalSignatureImage,
    onBuildImage,
    onReset,
  }) {
    const { t } = useTranslation("common");
    useEffect(() => {
      if (!open) return;
      onBuildImage?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const canDragLogo = mode === 2 || mode === 3;
    const canDragSig = mode === 1 || mode === 2;

    return (
      <div className="fixed inset-0 z-[10000] bg-black/55 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between bg-white/95 backdrop-blur">
            <div>
              <h3 className="font-semibold text-gray-900 text-base md:text-lg">
                {t("signModal.previewSignature")}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("signModal.previewHint")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black disabled:opacity-50"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div
              ref={previewBoxRef}
              className="relative w-full bg-white rounded-xl border border-slate-200 overflow-hidden"
              style={{ height: 220 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />

              <DraggableLayer
                id="logo"
                src={uploadedImage}
                pos={logoPos}
                setPos={(p) => {
                  setLogoPos(p);
                  onBuildImage?.();
                }}
                size={logoSize}
                boxRef={previewBoxRef}
                disabled={!canDragLogo}
                label={t("signModal.previewImageLabel")}
              />

              <DraggableLayer
                id="signature"
                src={drawnSignature}
                pos={sigPos}
                setPos={(p) => {
                  setSigPos(p);
                  onBuildImage?.();
                }}
                size={sigSize}
                boxRef={previewBoxRef}
                disabled={!canDragSig}
                label={t("signModal.previewSigLabel")}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between">
              <button
                type="button"
                onClick={() => {
                  onReset?.();
                  onBuildImage?.();
                }}
                className="text-xs md:text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                disabled={loading}
              >
                {t("signModal.previewReset")}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs md:text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                  disabled={loading}
                >
                  {t("signModal.previewAdjust")}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="text-xs md:text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? t("signModal.processing") : t("signModal.previewAgree")}
                </button>
              </div>
            </div>

            {finalSignatureImage && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  {t("signModal.previewFinal")}
                </div>
                <img
                  src={finalSignatureImage}
                  alt={t("signModal.previewSigLabel")}
                  className="max-h-44 w-auto rounded-md border bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  export default function SignModal({
    open,
    onClose,
    onSubmit,
    loading,
    contractName,
    initialStep = 1,
    onResendOtp,
    stepIndicator,
    processCode,
  }) {
    const { t } = useTranslation("common");
    const [step, setStep] = useState(1);
    const [signatureDisplayMode, setSignatureDisplayMode] = useState(1);

    const [drawnSignature, setDrawnSignature] = useState(null);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [finalSignatureImage, setFinalSignatureImage] = useState(null);

    const [reason, setReason] = useState("");
    const [confirmTerms, setConfirmTerms] = useState(false);
    const [otp, setOtp] = useState("");
    const [remainingSeconds, setRemainingSeconds] = useState(null);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    const [logoPos, setLogoPos] = useState({ x: 10, y: 55 });
    const [sigPos, setSigPos] = useState({ x: 260, y: 35 });

    const [logoSize] = useState({ w: 400, h: 140 });
    const [sigSize] = useState({ w: 400, h: 140 });

    const canvasRef = useRef(null);
    const isDrawing = useRef(false);
    const previewBoxRef = useRef(null);

    const handleUploadChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);
    };

    useEffect(() => {
      if (!open) return;

      setStep(initialStep);
      setSignatureDisplayMode(1);
      setDrawnSignature(null);
      setUploadedImage(null);
      setFinalSignatureImage(null);
      setPreviewOpen(false);
      setReason("");
      setConfirmTerms(false);
      setOtp("");
      setRemainingSeconds(initialStep === 2 ? 5 * 60 : null);

      setLogoPos({ x: 10, y: 55 });
      setSigPos({ x: 260, y: 35 });
    }, [open, initialStep]);

    const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setDrawnSignature(null);
    }, []);

    useEffect(() => {
      if (!open) return;
      if (signatureDisplayMode !== 1 && signatureDisplayMode !== 2) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY,
        };
      };

      const start = (e) => {
        e.preventDefault();
        isDrawing.current = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e) => {
        e.preventDefault();
        if (!isDrawing.current) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      };

      const end = () => {
        isDrawing.current = false;
        setDrawnSignature(canvas.toDataURL("image/png"));
      };

      canvas.addEventListener("mousedown", start);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", end);
      canvas.addEventListener("mouseleave", end);
      canvas.addEventListener("touchstart", start, { passive: false });
      canvas.addEventListener("touchmove", draw, { passive: false });
      canvas.addEventListener("touchend", end);

      return () => {
        canvas.removeEventListener("mousedown", start);
        canvas.removeEventListener("mousemove", draw);
        canvas.removeEventListener("mouseup", end);
        canvas.removeEventListener("mouseleave", end);
        canvas.removeEventListener("touchstart", start);
        canvas.removeEventListener("touchmove", draw);
        canvas.removeEventListener("touchend", end);
      };
    }, [open, signatureDisplayMode]);

    const needDraw = signatureDisplayMode === 1 || signatureDisplayMode === 2;
    const needUpload = signatureDisplayMode === 2 || signatureDisplayMode === 3;

    const isValidStep1 =
      confirmTerms &&
      (!needDraw || !!drawnSignature) &&
      (!needUpload || !!uploadedImage);

    const isValidStep2 = /^\d{6}$/.test(otp) && (remainingSeconds ?? 1) > 0;

    const optionCardClass = (value) =>
      [
        "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm cursor-pointer transition-colors",
        signatureDisplayMode === value
          ? "border-blue-500 bg-blue-50/60"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ");

    const getPreviewBoxSize = () => {
      const el = previewBoxRef.current;
      if (!el) return { w: 680, h: 220 };
      const r = el.getBoundingClientRect();
      return {
        w: Math.max(320, Math.round(r.width)),
        h: Math.max(160, Math.round(r.height)),
      };
    };

    const resetPreviewLayout = useCallback(() => {
      const { w: boxW, h: boxH } = getPreviewBoxSize();

      if (signatureDisplayMode === 2) {
        setLogoPos({ x: 10, y: Math.round((boxH - logoSize.h) / 2) });
        setSigPos({
          x: Math.max(10, boxW - sigSize.w - 10),
          y: Math.round((boxH - sigSize.h) / 2),
        });
      } else if (signatureDisplayMode === 1) {
        setSigPos({
          x: Math.round((boxW - sigSize.w) / 2),
          y: Math.round((boxH - sigSize.h) / 2),
        });
      } else {
        setLogoPos({
          x: Math.round((boxW - logoSize.w) / 2),
          y: Math.round((boxH - logoSize.h) / 2),
        });
      }
    }, [logoSize.h, logoSize.w, sigSize.h, sigSize.w, signatureDisplayMode]);

    const buildFinalSignatureImage = useCallback(async () => {
      const { w: boxW, h: boxH } = getPreviewBoxSize();

      const canvas = document.createElement("canvas");
      canvas.width = boxW;
      canvas.height = boxH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, boxW, boxH);

      const trimmedSig = drawnSignature
        ? await trimWhitespace(drawnSignature)
        : null;

      if (signatureDisplayMode === 1) {
        const sigImg = await loadImage(trimmedSig);
        ctx.drawImage(sigImg, sigPos.x, sigPos.y, sigSize.w, sigSize.h);
      } else if (signatureDisplayMode === 3) {
        const logoImg = await loadImage(uploadedImage);
        ctx.drawImage(logoImg, logoPos.x, logoPos.y, logoSize.w, logoSize.h);
      } else {
        const [logoImg, sigImg] = await Promise.all([
          loadImage(uploadedImage),
          loadImage(trimmedSig),
        ]);
        ctx.drawImage(logoImg, logoPos.x, logoPos.y, logoSize.w, logoSize.h);
        ctx.drawImage(sigImg, sigPos.x, sigPos.y, sigSize.w, sigSize.h);
      }

      const out = canvas.toDataURL("image/png");
      setFinalSignatureImage(out);
      return out;
    }, [
      drawnSignature,
      uploadedImage,
      logoPos.x,
      logoPos.y,
      logoSize.h,
      logoSize.w,
      sigPos.x,
      sigPos.y,
      sigSize.h,
      sigSize.w,
      signatureDisplayMode,
    ]);

    const openPreview = () => {
      if (!isValidStep1) return;
      resetPreviewLayout();
      setPreviewOpen(true);

      setTimeout(() => {
        buildFinalSignatureImage().catch(() => {});
      }, 0);
    };

    const handlePreviewConfirm = async () => {
      if (!isValidStep1) return;
      const img = await buildFinalSignatureImage();

      const payload = {
        signatureDisplayMode,
        signatureImage: img,
        reason: reason.trim() || null,
        confirmTermsConditions: confirmTerms,
      };

      onSubmit(payload, null, () => {
        setPreviewOpen(false);
        setStep(2);
        setRemainingSeconds(5 * 60);
      });
    };

    const handleStep2Submit = () => {
      if (!isValidStep2) return;
      onSubmit(null, { otp }, () => {});
    };

    useEffect(() => {
      if (!open || step !== 2 || remainingSeconds == null) return;
      if (remainingSeconds <= 0) return;

      const id = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev == null || prev <= 1) {
            clearInterval(id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(id);
    }, [open, step, remainingSeconds]);

    useEffect(() => {
      if (!open) return;

      setFinalSignatureImage(null);
      setPreviewOpen(false);

      if (signatureDisplayMode === 1) setUploadedImage(null);
      if (signatureDisplayMode === 3) setDrawnSignature(null);
    }, [signatureDisplayMode, open]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
          {stepIndicator && (
            <div className="px-8 pt-6 pb-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              {stepIndicator}
            </div>
          )}
          <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur">
            <h3 className="font-semibold text-gray-900 text-base md:text-lg">
              {step === 1 ? t("signModal.stepTitle1") : t("signModal.stepTitle2")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black disabled:opacity-50"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-5">
            {step === 1 ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  {contractName
                    ? t("signModal.step1IntroWithContract", { contractName })
                    : t("signModal.step1Intro") + "."}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-2">
                      {t("signModal.displayMode")}
                    </label>
                    <div className="flex flex-col gap-2.5">
                      <label className={optionCardClass(1)}>
                        <input
                          type="radio"
                          name="signatureDisplayMode"
                          value={1}
                          checked={signatureDisplayMode === 1}
                          onChange={() => setSignatureDisplayMode(1)}
                          className="h-4 w-4 text-blue-600 border-slate-300"
                        />
                        <span className="text-gray-800">{t("signModal.displayModeOption1")}</span>
                      </label>

                      <label className={optionCardClass(2)}>
                        <input
                          type="radio"
                          name="signatureDisplayMode"
                          value={2}
                          checked={signatureDisplayMode === 2}
                          onChange={() => setSignatureDisplayMode(2)}
                          className="h-4 w-4 text-blue-600 border-slate-300"
                        />
                        <span className="text-gray-800">
                          {t("signModal.displayModeOption2")}
                        </span>
                      </label>

                      <label className={optionCardClass(3)}>
                        <input
                          type="radio"
                          name="signatureDisplayMode"
                          value={3}
                          checked={signatureDisplayMode === 3}
                          onChange={() => setSignatureDisplayMode(3)}
                          className="h-4 w-4 text-blue-600 border-slate-300"
                        />
                        <span className="text-gray-800">{t("signModal.displayModeOption3")}</span>
                      </label>
                    </div>
                  </div>

                  {(signatureDisplayMode === 1 || signatureDisplayMode === 2) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        {t("signModal.drawSignature")}
                      </label>
                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <canvas
                          ref={canvasRef}
                          width={800}
                          height={300}
                          className="w-full touch-none"
                          style={{
                            width: "100%",
                            height: "300px",
                            cursor: "crosshair",
                          }}
                        />
                        <div className="flex items-center justify-between px-3 py-1.5">
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-xs md:text-sm text-gray-500 hover:text-red-600"
                          >
                            {t("signModal.drawClear")}
                          </button>
                          {drawnSignature ? (
                            <span className="text-xs text-emerald-600 font-medium">
                              {t("signModal.drawPresent")}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {t("signModal.drawAbsent")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(signatureDisplayMode === 2 || signatureDisplayMode === 3) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">
                        {signatureDisplayMode === 2
                          ? t("signModal.imageLogo")
                          : t("signModal.imageOnly")}
                      </label>
                      <p className="text-xs text-gray-600 mb-2">
                        {signatureDisplayMode === 2
                          ? t("signModal.imageHintMode2")
                          : t("signModal.imageHintMode3")}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadChange}
                        className="block w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-xs file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                      />
                      {uploadedImage && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            {t("signModal.imagePreviewLabel")}
                          </p>
                          <img
                            src={uploadedImage}
                            alt={t("signModal.imageSelectedAlt")}
                            className="max-h-32 border rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <label className="flex items-start gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={confirmTerms}
                      onChange={(e) => setConfirmTerms(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700 leading-relaxed">
                      {t("signModal.termsPart1")}{" "}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTerms(true); }}
                        className="text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0 font-inherit"
                      >
                        {t("signModal.termsLink")}
                      </button>{" "}
                      {t("signModal.termsPart2")}
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex gap-2 justify-end">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {t("actions.cancelLong")}
                  </button>
                  <button
                    onClick={openPreview}
                    disabled={!isValidStep1 || loading}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? t("signModal.processing") : t("signModal.previewSignature")}
                  </button>
                </div>

                <SignaturePreviewModal
                  open={previewOpen}
                  onClose={() => setPreviewOpen(false)}
                  onConfirm={handlePreviewConfirm}
                  loading={loading}
                  mode={signatureDisplayMode}
                  drawnSignature={drawnSignature}
                  uploadedImage={uploadedImage}
                  previewBoxRef={previewBoxRef}
                  logoPos={logoPos}
                  setLogoPos={setLogoPos}
                  sigPos={sigPos}
                  setSigPos={setSigPos}
                  logoSize={logoSize}
                  sigSize={sigSize}
                  finalSignatureImage={finalSignatureImage}
                  onBuildImage={() => buildFinalSignatureImage().catch(() => {})}
                  onReset={resetPreviewLayout}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {t("signModal.otpIntro")}
                </p>

                {typeof remainingSeconds === "number" && (
                  <div className="mb-3 text-sm text-gray-700 flex items-baseline gap-2 flex-wrap">
                    {remainingSeconds > 0 ? (
                      <span className="font-semibold">
                        {t("signModal.otpMinuteSecond", {
                          minutes: String(Math.floor(remainingSeconds / 60)).padStart(2, "0"),
                          seconds: String(remainingSeconds % 60).padStart(2, "0"),
                        })}
                      </span>
                    ) : (
                      <>
                        <span className="text-red-500 font-medium">
                          {t("signModal.otpExpired")}
                        </span>
                        {onResendOtp && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              onResendOtp(() => setRemainingSeconds(5 * 60))
                            }
                            className="ml-1 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {loading ? t("signModal.otpSending") : t("signModal.otpResend")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                <input
                  value={otp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(v);
                  }}
                  inputMode="numeric"
                  autoFocus
                  placeholder="______"
                  className="w-full text-center tracking-[0.6em] text-2xl font-semibold border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                />

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
                  >
                    {t("signModal.otpBack")}
                  </button>
                  <button
                    onClick={handleStep2Submit}
                    disabled={!isValidStep2 || loading}
                    className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? t("signModal.otpSigning") : t("signModal.otpComplete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <TermsModal
          open={showTerms}
          onClose={() => setShowTerms(false)}
          processCode={processCode}
        />
      </div>
    );
  }

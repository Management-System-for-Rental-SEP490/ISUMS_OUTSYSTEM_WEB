import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import TermsModal from "./TermsModal";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  onReject,
  title,
  confirmLabel,
  cancelLabel,
  stepIndicator,
  processCode,
}) {
  const { t } = useTranslation("common");
  // Resolve defaults lazily inside the component so i18n is live. Callers
  // that pass explicit title/label props still win.
  const resolvedTitle = title ?? t("confirmModal.title");
  const resolvedConfirmLabel = confirmLabel ?? t("confirmModal.confirmLabel");
  const resolvedCancelLabel = cancelLabel ?? t("actions.cancelLong");

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      await onReject(rejectReason.trim());
      setShowRejectBox(false);
      setRejectReason("");
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {stepIndicator && (
          <div className="px-8 pt-6 pb-5 border-b border-gray-100">
            {stepIndicator}
          </div>
        )}
        <div className="px-6 py-4 flex items-center justify-between border-b bg-white/95 backdrop-blur">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            {resolvedTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-50 transition-colors"
            disabled={loading || rejectLoading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-800 font-medium">
              {t("confirmModal.agreePrompt")}
            </p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
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

          {showRejectBox && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">
                {t("confirmModal.rejectPromptTitle")}
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder={t("confirmModal.rejectPlaceholder")}
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                disabled={rejectLoading}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowRejectBox(false); setRejectReason(""); }}
                  disabled={rejectLoading}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-60"
                >
                  {t("confirmModal.rejectBack")}
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  disabled={!rejectReason.trim() || rejectLoading}
                  className="px-4 py-1.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {rejectLoading ? t("confirmModal.rejectSubmitting") : t("confirmModal.rejectSubmit")}
                </button>
              </div>
            </div>
          )}

          {!showRejectBox && (
            <div className="text-center pt-2">
              <p className="text-sm font-semibold text-red-500">
                {t("confirmModal.hintContinue")}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex gap-4 justify-end border-t bg-gray-50/60">
          {!showRejectBox && onReject && (
            <button
              type="button"
              onClick={() => setShowRejectBox(true)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
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
                  d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"
                />
              </svg>
              {t("confirmModal.rejectButton")}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={loading || rejectLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-60"
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
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {resolvedCancelLabel}
          </button>

          <button
            type="button"
            disabled={!checked || loading}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              t("confirmModal.processing")
            ) : (
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
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {resolvedConfirmLabel}
              </>
            )}
          </button>
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

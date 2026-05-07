import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getOutSystemContract } from "../features/contract/services/contract.api";

export default function TermsModal({ open, onClose, processCode }) {
  const { t } = useTranslation("common");
  const [tab, setTab] = useState("contract");
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !processCode || tab !== "contract" || html != null) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getOutSystemContract(processCode);
        if (!cancelled) setHtml(res?.data?.data?.html ?? "");
      } catch {
        if (!cancelled) setError(t("termsModal.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, processCode, tab, html, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/55 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b bg-white/95 backdrop-blur">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            {t("termsModal.title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label={t("termsModal.close")}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b bg-gray-50">
          <button
            type="button"
            onClick={() => setTab("contract")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "contract"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("termsModal.tabContract")}
          </button>
          <button
            type="button"
            onClick={() => setTab("platform")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "platform"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("termsModal.tabPlatform")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "contract" ? (
            <ContractTab loading={loading} error={error} html={html} t={t} />
          ) : (
            <PlatformTab t={t} />
          )}
        </div>

        <div className="px-6 py-4 flex justify-end border-t bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            {t("termsModal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContractTab({ loading, error, html, t }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-600">
        {t("termsModal.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-red-600">
        {error}
      </div>
    );
  }
  if (!html) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        {t("termsModal.loadError")}
      </div>
    );
  }
  return (
    <div
      className="prose prose-sm max-w-none text-gray-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function PlatformTab({ t }) {
  return (
    <div className="space-y-3 text-sm text-gray-800 leading-relaxed">
      <p className="font-medium">{t("termsModal.platformIntro")}</p>
      <ol className="list-decimal pl-5 space-y-2">
        <li>{t("termsModal.platformItem1")}</li>
        <li>{t("termsModal.platformItem2")}</li>
        <li>{t("termsModal.platformItem3")}</li>
        <li>{t("termsModal.platformItem4")}</li>
        <li>{t("termsModal.platformItem5")}</li>
      </ol>
    </div>
  );
}

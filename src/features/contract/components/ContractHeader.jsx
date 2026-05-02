import { useTranslation } from "react-i18next";

export default function ContractHeader({
  contractName,
  downloadUrl,
  placementMode,
  isReadyToSign,
  signLoading,
  processCode,
  currentPlacement,
  onConfirm,
}) {
  const { t } = useTranslation("common");
  const statusLabel = downloadUrl
    ? t("contractHeader.signed")
    : placementMode
      ? t("contractHeader.adjustingPosition")
      : t("contractHeader.waitingSign");

  const buttonLabel = downloadUrl
    ? t("contractHeader.download")
    : placementMode
      ? t("contractHeader.confirmPositionAndOtp")
      : isReadyToSign
        ? t("contractHeader.sign")
        : t("contractHeader.confirmAndSign");

  const statusColor = downloadUrl
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : placementMode
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";

  const statusDot = downloadUrl
    ? "bg-emerald-400"
    : placementMode
      ? "bg-blue-400 animate-pulse"
      : "bg-amber-400 animate-pulse";

  return (
    <header className="sticky top-0 z-10 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: icon + contract name */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/hcmc_logo_circle.png"
            alt="Logo"
            className="w-9 h-9 rounded-full object-contain shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">
              {t("contractHeader.contractElectronic")}
            </div>
            <div className="text-sm font-semibold text-slate-800 truncate">
              {contractName || t("contract.previewTitle")}
            </div>
          </div>
        </div>

        {/* Right: status + placement coords + button */}
        <div className="flex items-center gap-3">
          <div
            className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ring-1 ${statusColor}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`} />
            {statusLabel}
          </div>

          {placementMode && (
            <div className="hidden lg:block text-[11px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md ring-1 ring-slate-200">
              {t("contractHeader.pagePos", {
                page: currentPlacement.signingPage,
                position: currentPlacement.signingPosition,
              })}
            </div>
          )}

          <button
            onClick={onConfirm}
            disabled={signLoading || (!downloadUrl && !processCode)}
            className={`inline-flex items-center justify-center rounded-full px-5 md:px-6 py-2 text-xs md:text-sm font-semibold shadow-sm transition-all active:scale-95
              ${downloadUrl ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
              ${signLoading || (!downloadUrl && !processCode) ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </header>
  );
}

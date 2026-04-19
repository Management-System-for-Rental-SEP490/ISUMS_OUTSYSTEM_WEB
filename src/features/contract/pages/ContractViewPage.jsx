import { useState } from "react";
import { ClipLoader } from "react-spinners";

import { useMagicLinkParam } from "../hooks/useMagicLinkParam";
import { useEContract } from "../hooks/useEContract";
import { useA4Scale } from "../hooks/useA4Scale";
import { useSignaturePlacement } from "../hooks/useSignaturePlacement";
import { useContractSign } from "../hooks/useContractSign";

import ConfirmModal from "../../../components/ConfirmModal";
import SignModal from "../../../components/SignModal";
import StepIndicator from "../../../components/StepIndicator";
import ContractHeader from "../components/ContractHeader";
import ContractViewer from "../components/ContractViewer";

export function ContractViewPage() {
  const { processCode } = useMagicLinkParam();
  const { pdfUrl, contractInfo, signingCtx, loading, error } = useEContract(processCode);
  const { a4Scale, scrollAreaRef } = useA4Scale();

  const [placementMode, setPlacementMode] = useState(false);
  const [numPdfPages, setNumPdfPages] = useState(null);

  const placement = useSignaturePlacement({
    a4Scale,
    scrollAreaRef,
    placementMode,
  });

  const handlePdfLoad = (n) => {
    setNumPdfPages(n);
    placement.setTotalPages(n);
  };

  const signing = useContractSign({
    processCode,
    signingCtx,
    currentPlacement: placement.currentPlacement,
    initDragPosition: placement.initDragPosition,
    placementMode,
    setPlacementMode,
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={50} color="#123abc" loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="px-6 py-4 rounded-lg bg-white shadow text-center text-red-500 text-sm md:text-base">
          {error}
        </div>
      </div>
    );
  }

  const stepIndicatorEl = signing.currentStep > 0 ? (
    <StepIndicator
      currentStep={signing.currentStep}
      onGoToStep={signing.goToStep}
    />
  ) : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <ConfirmModal
        open={signing.confirmOpen}
        onClose={() => signing.setConfirmOpen(false)}
        onConfirm={signing.handleConfirmAgree}
        onReject={signing.handleReject}
        stepIndicator={stepIndicatorEl}
      />
      <SignModal
        open={signing.signOpen}
        loading={signing.signLoading}
        initialStep={signing.initialStep}
        onClose={() => {
          if (signing.signLoading) return;
          signing.setSignOpen(false);
        }}
        onSubmit={signing.handleSignSubmit}
        contractName={contractInfo?.documentNo}
        onResendOtp={signing.handleResendOtp}
        stepIndicator={stepIndicatorEl}
      />

      <ContractHeader
        contractName={contractInfo?.documentNo}
        downloadUrl={signing.downloadUrl}
        placementMode={placementMode}
        isReadyToSign={signing.isReadyToSign}
        signLoading={signing.signLoading}
        processCode={processCode}
        currentPlacement={placement.currentPlacement}
        onConfirm={signing.handleConfirm}
      />

      {/* Step indicator floating bar — chỉ hiện khi placement mode */}
      {placementMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-lg border border-slate-200 px-6 py-4 w-120 max-w-[calc(100vw-2rem)]">
          <StepIndicator
            currentStep={signing.currentStep}
            onGoToStep={signing.goToStep}
          />
        </div>
      )}

      <main
        className="grow flex overflow-hidden"
        style={{ height: "calc(100vh - 57px)" }}
      >
        <ContractViewer
          scrollAreaRef={scrollAreaRef}
          contractContentRef={placement.contractContentRef}
          pdfUrl={pdfUrl}
          totalPages={placement.totalPages}
          numPdfPages={numPdfPages}
          onPdfLoad={handlePdfLoad}
          a4Scale={a4Scale}
          placementMode={placementMode}
          signLoading={signing.signLoading}
          signatureBoxPosition={placement.signatureBoxPosition}
          setSignatureBoxPosition={placement.setSignatureBoxPosition}
          boxPxSize={placement.boxPxSize}
          currentPlacement={placement.currentPlacement}
          signatureImage={signing.signPayloadRef.current?.signatureImage}
          signerName={
            contractInfo?.signerName ??
            contractInfo?.fullName ??
            contractInfo?.participantName ??
            ""
          }
        />
      </main>
    </div>
  );
}

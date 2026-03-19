import { useState } from "react";
import { ClipLoader } from "react-spinners";

import { useMagicLinkParam } from "../hooks/useMagicLinkParam";
import { useEContract } from "../hooks/useEContract";
import { useA4Scale } from "../hooks/useA4Scale";
import { useSignaturePlacement } from "../hooks/useSignaturePlacement";
import { useContractSign } from "../hooks/useContractSign";

import ConfirmModal from "../../../components/ConfirmModal";
import SignModal from "../../../components/SignModal";
import ContractHeader from "../components/ContractHeader";
import ContractViewer from "../components/ContractViewer";

export function ContractViewPage() {
  const { processCode } = useMagicLinkParam();
  const { html, contractInfo, loading, error } = useEContract(processCode);
  const { a4Scale, scrollAreaRef } = useA4Scale();

  // placementMode sống ở page vì nó kết nối cả hai hooks bên dưới
  const [placementMode, setPlacementMode] = useState(false);

  const placement = useSignaturePlacement({
    a4Scale,
    scrollAreaRef,
    html,
    placementMode,
  });

  const signing = useContractSign({
    processCode,
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <ConfirmModal
        open={signing.confirmOpen}
        onClose={() => signing.setConfirmOpen(false)}
        onConfirm={signing.handleConfirmAgree}
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
        contractName={contractInfo?.name}
        onResendOtp={signing.handleResendOtp}
      />

      <ContractHeader
        contractName={contractInfo?.name}
        downloadUrl={signing.downloadUrl}
        placementMode={placementMode}
        isReadyToSign={signing.isReadyToSign}
        signLoading={signing.signLoading}
        processCode={processCode}
        currentPlacement={placement.currentPlacement}
        onConfirm={signing.handleConfirm}
      />

      <main
        className="flex-grow flex overflow-hidden"
        style={{ height: "calc(100vh - 57px)" }}
      >
        <ContractViewer
          scrollAreaRef={scrollAreaRef}
          contractContentRef={placement.contractContentRef}
          iframeRef={placement.iframeRef}
          html={html}
          iframeHeight={placement.iframeHeight}
          totalPages={placement.totalPages}
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
          onIframeLoad={placement.handleIframeLoad}
        />
      </main>
    </div>
  );
}

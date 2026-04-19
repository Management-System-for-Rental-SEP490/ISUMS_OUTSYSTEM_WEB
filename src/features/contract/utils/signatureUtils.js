// ─── Kích thước box chữ ký (đơn vị: PDF points) ──────────────────────────────
export const BOX_W_PT = 200;
export const BOX_H_PT = 120;

// ─── Kích thước box hiển thị trên màn hình (đơn vị: pixel) ───────────────────
export const BOX_W_PX = 200;
export const BOX_H_PX = 120;

// Kích thước trang PDF gốc (Portrait A4, đơn vị: points)
export const PDF_PAGE_W_PT = 595.275;
export const PDF_PAGE_H_PT = 841.875;

// Tỉ lệ chiều cao / chiều rộng A4
export const A4_SCALE = PDF_PAGE_H_PT / PDF_PAGE_W_PT; // ≈ 1.4142
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

// ─── Vị trí ký mặc định (PDF points, origin bottom-left) ─────────────────────
export const DEFAULT_SIGN_POSITIONS = {
  PARTY_A: { signingPage: 3, signingPosition: "87,140,287,260" },
  PARTY_B: { signingPage: 3, signingPosition: "343,140,543,260" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "llx,lly,urx,ury" string → object */
export function parseRect(position) {
  const parts = String(position || "")
    .split(",")
    .map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return { llx: 0, lly: 0, urx: BOX_W_PT, ury: BOX_H_PT };
  }
  const [llx, lly, urx, ury] = parts;
  return { llx, lly, urx, ury };
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Chuyển đổi PDF points → pixel position cho drag box. */
export function ptToPixel(containerEl, ptPosition, _totalPages, signingPage, pageHOverridePx) {
  const rect = parseRect(ptPosition);
  const containerW = containerEl?.clientWidth ?? PDF_PAGE_W_PT;
  const scale = containerW / PDF_PAGE_W_PT;
  const pageH_px = pageHOverridePx ?? containerW * A4_SCALE;

  const pageOffset = (signingPage - 1) * pageH_px;
  const boxTopInPage = (PDF_PAGE_H_PT - rect.ury) * scale;

  return {
    x: rect.llx * scale,
    y: pageOffset + boxTopInPage,
    w: (rect.urx - rect.llx) * scale,
    h: (rect.ury - rect.lly) * scale,
  };
}

/** Chuyển đổi pixel drag position → PDF points. */
export function pixelToPt(containerEl, pixelPos, totalPages, boxH, pageHOverridePx) {
  const containerW = containerEl?.clientWidth ?? PDF_PAGE_W_PT;
  const scale = containerW / PDF_PAGE_W_PT;
  const pageH_px = pageHOverridePx ?? containerW * A4_SCALE;

  const actualBoxH = boxH ?? BOX_H_PX;
  const boxCenterY = pixelPos.y + actualBoxH / 2;
  const pageIndex = clamp(
    Math.floor(pageH_px > 0 ? boxCenterY / pageH_px : 0) + 1,
    1,
    totalPages,
  );

  const pageTopY = (pageIndex - 1) * pageH_px;
  const localTopY = pixelPos.y - pageTopY;

  const llx_pt = Math.round(clamp(pixelPos.x / scale, 0, PDF_PAGE_W_PT));
  const urx_pt = Math.round(llx_pt + BOX_W_PT);
  const ury_pt = Math.round(clamp((pageH_px - localTopY) / scale, 0, PDF_PAGE_H_PT));
  const lly_pt = Math.round(Math.max(0, ury_pt - BOX_H_PT));

  return {
    signingPage: pageIndex,
    signingPosition: `${llx_pt},${lly_pt},${urx_pt},${ury_pt}`,
  };
}

export function getDownloadUrlFromSignResponse(res) {
  const data = res?.data?.data ?? res?.data ?? res;
  return data?.downloadUrl || data?.downloadURL || data?.download_url || null;
}

export function getSignContextFromResponse(res) {
  const data = res?.data?.data ?? res?.data ?? res;
  return {
    accessToken: data?.accessToken,
    processId: data?.processId ?? data?.process_id,
    signerRole: data?.signerRole ?? data?.signer_role ?? null,
    signingPage: data?.pageSign,
    signingPosition: data?.position ?? data?.signing_position ?? null,
  };
}

export function getDefaultPosition(signerRole) {
  const role = signerRole?.toUpperCase();
  return DEFAULT_SIGN_POSITIONS[role] ?? DEFAULT_SIGN_POSITIONS.PARTY_A;
}

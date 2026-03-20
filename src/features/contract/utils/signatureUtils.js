// ─── Hệ tọa độ VNPT (landscape): dùng cho chuyển đổi tọa độ ký ─────────────
// VNPT sử dụng tọa độ landscape: width=752pt, height=595pt
// (a,b) = góc dưới trái, (c,d) = góc trên phải
export const VNPT_PAGE_W_PT = 752;
export const VNPT_PAGE_H_PT = 595;

// Kích thước ô chữ ký mặc định (pt) — khớp với default VNPT
export const SIG_W_PT = 170;
export const SIG_H_PT = 90;

// Ước tính chiều cao 1 trang PDF khi render trong iframe wrapper (px)
export const ESTIMATED_PAGE_HEIGHT_PX = 900;

// ─── Hằng số hiển thị (A4 display) ─────────────────────────────────────────
// Tỉ lệ chiều cao / chiều rộng A4 (dùng cho layout, không liên quan tọa độ ký)
export const A4_SCALE = 841.875 / 595.275; // ≈ 1.4142
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

// ─── Vị trí ký mặc định (VNPT points, origin bottom-left) ──────────────────
export const DEFAULT_SIGN_POSITIONS = {
  PARTY_A: { signingPage: 3, signingPosition: "87,140,257,230" },
  PARTY_B: { signingPage: 3, signingPosition: "343,140,513,230" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "llx,lly,urx,ury" string → object */
export function parseRect(position) {
  const parts = String(position || "")
    .split(",")
    .map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return { llx: 0, lly: 0, urx: SIG_W_PT, ury: SIG_H_PT };
  }
  const [llx, lly, urx, ury] = parts;
  return { llx, lly, urx, ury };
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Chuyển đổi VNPT points → pixel position cho drag box.
 * Hàm ngược của pixelToPt — dùng khi khởi tạo vị trí box từ API response.
 */
export function ptToPixel(containerEl, ptPosition, _totalPages, signingPage) {
  const rect = parseRect(ptPosition);
  const containerW = containerEl?.clientWidth ?? A4_WIDTH_PX;
  const pageH_px = ESTIMATED_PAGE_HEIGHT_PX;

  const scaleX = containerW / VNPT_PAGE_W_PT;
  const scaleY = pageH_px / VNPT_PAGE_H_PT;

  const pageOffset = (signingPage - 1) * pageH_px;
  const yInPage = (VNPT_PAGE_H_PT - rect.ury) * scaleY;

  return {
    x: rect.llx * scaleX,
    y: pageOffset + yInPage,
    w: (rect.urx - rect.llx) * scaleX,
    h: (rect.ury - rect.lly) * scaleY,
  };
}

/**
 * Chuyển đổi pixel drag position → VNPT points.
 * Logic copy từ admin DragSignatureBox toSigningPosition().
 * VNPT format: "llx,lly,urx,ury" — gốc tọa độ ở góc dưới-trái trang.
 */
export function pixelToPt(containerEl, pixelPos, totalPages, boxH) {
  const containerW = containerEl?.clientWidth ?? A4_WIDTH_PX;
  const pageH_px = ESTIMATED_PAGE_HEIGHT_PX;

  // Xác định trang dựa trên tâm box
  const actualBoxH = boxH ?? Math.round((SIG_H_PT * pageH_px) / VNPT_PAGE_H_PT);
  const boxCenterY = pixelPos.y + actualBoxH / 2;
  const pageIndex = clamp(
    Math.floor(pageH_px > 0 ? boxCenterY / pageH_px : 0) + 1,
    1,
    totalPages,
  );

  // Tọa độ Y trong trang hiện tại
  const pageOffsetY = (pageIndex - 1) * pageH_px;
  const yInPage = pixelPos.y - pageOffsetY;

  // Scale px → pt (admin formula)
  const scaleX = VNPT_PAGE_W_PT / containerW;
  const scaleY = VNPT_PAGE_H_PT / pageH_px;

  // Clamp llx so urx stays within page
  const llx = Math.round(
    clamp(pixelPos.x * scaleX, 0, VNPT_PAGE_W_PT - SIG_W_PT),
  );
  const urx = Math.round(llx + SIG_W_PT);

  // VNPT Y gốc ở đáy → đảo ngược
  // Clamp ury >= SIG_H_PT để lly = ury - 90 không bao giờ âm
  const ury = Math.round(
    clamp(VNPT_PAGE_H_PT - yInPage * scaleY, SIG_H_PT, VNPT_PAGE_H_PT),
  );
  const lly = Math.round(ury - SIG_H_PT);

  return {
    signingPage: pageIndex,
    signingPosition: `${llx - 106},${lly - 53},${urx - 106},${ury - 53}`,
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

export type AmountResult =
  | { ok: true; amount: number; method: "EMV_TAG_54"; confidence: 1; meta?: any }
  | { ok: false; reason: string; method: "EMV_TAG_54" | "OCR" | "NONE"; candidates?: number[]; meta?: any };

export function extractAmountFromQrText(qrText: string | null): AmountResult {
  if (!qrText) return { ok: false, reason: "No QR found", method: "NONE" };

  // EMVCo payload ส่วนใหญ่เป็นตัวเลขล้วน (TLV)
  if (!/^\d+$/.test(qrText)) {
    return { ok: false, reason: "QR is not EMV TLV numeric", method: "EMV_TAG_54", meta: { qrText } };
  }

  const tlv = parseEmvTlv(qrText);

  // Tag 54 = Transaction Amount (สำคัญ: เอาจาก tag นี้เท่านั้น)
  const amountStr = tlv["54"];
  if (!amountStr) {
    return { ok: false, reason: "EMV payload has no tag 54 (amount not embedded)", method: "EMV_TAG_54", meta: { tags: Object.keys(tlv) } };
  }

  // บาง payload เก็บ "500.00" หรือ "500"
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Invalid amount in tag 54", method: "EMV_TAG_54", meta: { amountStr } };
  }

  return { ok: true, amount, method: "EMV_TAG_54", confidence: 1, meta: { amountStr } };
}

/** EMV TLV parser: [tag2][len2][value...] */
function parseEmvTlv(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;

  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    const len = Number(lenStr);

    if (!Number.isFinite(len) || len < 0) break;
    const start = i + 4;
    const end = start + len;
    if (end > payload.length) break;

    out[tag] = payload.slice(start, end);
    i = end;
  }

  return out;
}

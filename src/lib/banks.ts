/**
 * Vietnamese bank BIN → display name.
 *
 * PayOS returns the receiving account's `bin` (the 6-digit Napas bank
 * identifier) but not a human-readable bank name, and "chuyển tới BIN 970422"
 * means nothing to a customer about to move money. Only the mapping is needed —
 * the QR itself already carries the routing information.
 */
const BANK_NAMES: Record<string, string> = {
  "970405": "Agribank",
  "970415": "VietinBank",
  "970418": "BIDV",
  "970436": "Vietcombank",
  "970422": "MB Bank",
  "970407": "Techcombank",
  "970416": "ACB",
  "970432": "VPBank",
  "970423": "TPBank",
  "970403": "Sacombank",
  "970437": "HDBank",
  "970443": "SHB",
  "970441": "VIB",
  "970426": "MSB",
  "970431": "Eximbank",
  "970429": "SCB",
  "970448": "OCB",
  "970454": "VietCapital Bank",
  "970406": "DongA Bank",
  "970409": "BacA Bank",
  "970412": "PVcomBank",
  "970414": "Oceanbank",
  "970419": "NCB",
  "970421": "VRB",
  "970424": "Shinhan Bank",
  "970425": "ABBANK",
  "970427": "VietABank",
  "970428": "NamA Bank",
  "970430": "PGBank",
  "970433": "VietBank",
  "970438": "BaoViet Bank",
  "970439": "PublicBank",
  "970440": "SeABank",
  "970442": "HongLeong Bank",
  "970446": "COOPBANK",
  "970449": "LienVietPostBank",
  "970452": "KienLongBank",
  "970457": "Woori Bank",
  "970458": "United Overseas Bank",
  "546034": "CAKE by VPBank",
  "546035": "Ubank by VPBank",
  "963388": "Timo",
  "971011": "Viettel Money",
  "971005": "ViettelPay",
};

/** Human-readable bank name for a Napas BIN; falls back to the BIN itself. */
export function bankName(bin: string | null | undefined): string {
  if (!bin) return "Ngân hàng";
  return BANK_NAMES[bin] ?? `Ngân hàng (BIN ${bin})`;
}

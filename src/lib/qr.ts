import QRCode from "qrcode";

/**
 * Render PayOS's VietQR payload into an inline SVG, on the server.
 *
 * PayOS returns `qrCode` as a raw EMVCo/VietQR string (bank BIN, account,
 * amount, transfer content) — not an image. Rasterising it here rather than in
 * the browser keeps the QR library out of the client bundle and means the
 * markup arrives ready to paint, with no request to any third-party image
 * service (which would leak the account number and order description).
 *
 * Error-correction level M is what banking apps expect: enough redundancy to
 * scan off a phone screen without inflating the module count.
 */
export async function renderQrSvg(payload: string): Promise<string> {
  const svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  return (
    svg
      // The XML prolog is invalid inside an HTML document.
      .replace(/^<\?xml[^>]*\?>\s*/i, "")
      // Drop the fixed pixel size so the SVG fills its container — but ONLY on
      // the root tag. The QR modules are drawn as <path> elements whose own
      // attributes must survive untouched.
      .replace(/<svg\b[^>]*>/i, (openTag) =>
        openTag
          .replace(/\s(?:width|height)="[^"]*"/gi, "")
          .replace(/^<svg\b/i, '<svg preserveAspectRatio="xMidYMid meet"'),
      )
  );
}

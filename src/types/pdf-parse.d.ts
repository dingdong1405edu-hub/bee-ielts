/**
 * Minimal typings for `pdf-parse`. The package ships no types, and we import its
 * inner lib path (`pdf-parse/lib/pdf-parse.js`) directly to skip the debug
 * self-test the package index runs when `module.parent` is falsy (which throws
 * ENOENT in a bundled/serverless context).
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdfParse;
}

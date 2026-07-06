/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // pdf-parse (used to read teacher-uploaded đề PDFs) bundles an old pdfjs
    // that breaks when webpack bundles it into the server output. Keep it as a
    // runtime require from node_modules so PDF text extraction works in prod.
    serverComponentsExternalPackages: ["pdf-parse"],
  },
  async rewrites() {
    return [
      // The homepage (index.html) references its images as /public/textures/*.
      // Next serves the public/ folder at the root, so map /public/* → /* and
      // keep index.html byte-for-byte unchanged.
      { source: "/public/:path*", destination: "/:path*" },
      // Its skill cards link to *.html — point them at the real app routes.
      { source: "/listening.html", destination: "/listening" },
      { source: "/reading.html", destination: "/reading" },
      { source: "/speaking.html", destination: "/speaking" },
      { source: "/writing.html", destination: "/writing" },
    ];
  },
};

export default nextConfig;

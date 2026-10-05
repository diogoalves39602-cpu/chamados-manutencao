import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A foto chega já comprimida (~0,5 MB), mas aceita até 3 MB + margem do multipart.
      // Fica abaixo do limite de corpo das funções da Vercel (4,5 MB) e do Netlify (6 MB).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

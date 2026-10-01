import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Este proyecto vive dentro de un repositorio con la web al lado:
  // así Next.js no se confunde con el package-lock.json de la raíz.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  async redirects() {
    return [{ source: '/', destination: '/app', permanent: false }];
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { nextRuntime, webpack }) => {
    if (nextRuntime === "edge") {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /publik-sdk/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;

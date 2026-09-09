import type { NextConfig } from "next";

/**
 * Permanent redirects for URLs that already existed before R0.
 * `/compare` and the six placeholder products are gone; they point at the two
 * catalog entry points so nothing indexed lands on a 404.
 */
const goneToCharters = [
  "/compare",
  "/tours/charter-atardecer-privado",
  "/tours/yate-completo-taboga",
  "/tours/charter-premium-las-perlas",
];

const goneToTours = [
  "/tours/travesia-al-atardecer",
  "/tours/escape-a-taboga",
  "/tours/expedicion-a-las-perlas",
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...goneToCharters.map((source) => ({
        source,
        destination: "/charters",
        permanent: true,
      })),
      ...goneToTours.map((source) => ({
        source,
        destination: "/tours",
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;

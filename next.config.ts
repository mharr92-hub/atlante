import type { NextConfig } from "next";

/**
 * Permanent redirects for URLs that already existed before R0.
 * `/compare` and the six placeholder products are gone; they point at the
 * catalog entry points so nothing indexed lands on a 404. Since R2 the old
 * comparator has a real destination: `/charters/comparar` (PRD 5.1).
 */
const goneToCharters = [
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
      { source: "/compare", destination: "/charters/comparar", permanent: true },
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

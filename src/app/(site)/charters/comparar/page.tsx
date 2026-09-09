import type { Metadata } from "next";
import { Suspense } from "react";
import CompareTable from "@/components/charters/CompareTable";
import { getVessels } from "@/lib/vessels";

export const metadata: Metadata = {
  title: "Comparar naves",
  description:
    "Compara hasta cuatro naves lado a lado: capacidad, precio por 4, 8 y 12 horas, precio por persona para tu grupo, qué incluye, apartado y política de cancelación.",
  alternates: { canonical: "/charters/comparar" },
};

export default async function CompararPage() {
  const vessels = await getVessels();

  return (
    <div style={{ paddingTop: 90 }}>
      <Suspense fallback={<div className="section section-ivory" />}>
        <CompareTable vessels={vessels} />
      </Suspense>
    </div>
  );
}

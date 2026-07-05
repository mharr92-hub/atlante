import type { Metadata } from "next";
import Link from "next/link";
import CompareTable from "@/components/tour/CompareTable";

export const metadata: Metadata = {
  title: "Comparar tours y charters",
  description:
    "Compara lado a lado los tours y charters de Atlante del Pacifico: precio, duracion, capacidad y que incluye cada experiencia.",
};

export default function ComparePage() {
  return (
    <section className="section section-ivory" style={{ paddingTop: 140 }}>
      <div className="section-inner">
        <Link href="/#travesias" className="back-link">
          ← Tours
        </Link>
        <div className="section-heading">
          <p className="eyebrow">Atlante</p>
          <h2>Comparar experiencias</h2>
        </div>
        <CompareTable />
      </div>
    </section>
  );
}

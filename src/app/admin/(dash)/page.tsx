import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { getTour } from "@/content/tours";

export default async function AdminHome() {
  const [pending, confirmed, paidAgg, recent] = await Promise.all([
    db.booking.count({ where: { status: "pending" } }),
    db.booking.count({ where: { status: "confirmed" } }),
    db.booking.aggregate({ _sum: { totalPrice: true }, where: { paymentStatus: "paid" } }),
    db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const revenue = Number(paidAgg._sum.totalPrice ?? 0);

  return (
    <div>
      <h1 className="admin-h1">Resumen</h1>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-num">{pending}</span>
          <span className="stat-label">Solicitudes pendientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{confirmed}</span>
          <span className="stat-label">Reservas confirmadas</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{money(revenue)}</span>
          <span className="stat-label">Ingresos cobrados</span>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Reservas recientes</h2>
          <Link href="/admin/bookings" className="admin-link">Ver todas →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="admin-empty">Aun no hay reservas. Se registran cuando un cliente solicita una fecha.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Experiencia</th>
                <th>Fecha</th>
                <th>Invitados</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id}>
                  <td>{b.customerName}</td>
                  <td>{getTour(b.tourSlug)?.name.es ?? b.tourSlug}</td>
                  <td>{b.bookingDate.toISOString().slice(0, 10)}</td>
                  <td>{b.guestCount}</td>
                  <td>{money(Number(b.totalPrice))}</td>
                  <td>
                    <span className={`pill pill-${b.status}`}>{b.status}</span>{" "}
                    <span className={`pill pill-${b.paymentStatus}`}>{b.paymentStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

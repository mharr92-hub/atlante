import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { getTour } from "@/content/tours";
import { confirmAction, markPaidAction, cancelAction } from "@/app/admin/actions";

export default async function AdminBookings() {
  const bookings = await db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div>
      <h1 className="admin-h1">Reservas</h1>
      <div className="admin-panel">
        {bookings.length === 0 ? (
          <p className="admin-empty">No hay reservas todavia.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Experiencia</th>
                  <th>Fecha</th>
                  <th>Pax</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.customerName}</td>
                    <td className="admin-muted">
                      {b.customerEmail}
                      {b.customerPhone ? <><br />{b.customerPhone}</> : null}
                    </td>
                    <td>{getTour(b.tourSlug)?.name.es ?? b.tourSlug}</td>
                    <td>
                      {b.bookingDate.toISOString().slice(0, 10)}
                      {b.timeSlot ? ` · ${b.timeSlot}` : ""}
                    </td>
                    <td>{b.guestCount}</td>
                    <td>{money(Number(b.totalPrice))}</td>
                    <td>
                      <span className={`pill pill-${b.status}`}>{b.status}</span>
                      <br />
                      <span className={`pill pill-${b.paymentStatus}`}>{b.paymentStatus}</span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {b.status !== "confirmed" && b.status !== "cancelled" ? (
                          <form action={confirmAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <button className="btn-sm btn-confirm">Confirmar</button>
                          </form>
                        ) : null}
                        {b.paymentStatus !== "paid" && b.status !== "cancelled" ? (
                          <form action={markPaidAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="method" value="cash" />
                            <button className="btn-sm btn-paid">Marcar pagado</button>
                          </form>
                        ) : null}
                        {b.status !== "cancelled" ? (
                          <form action={cancelAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <button className="btn-sm btn-cancel">Cancelar</button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

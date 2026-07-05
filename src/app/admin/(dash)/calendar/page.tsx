import { db } from "@/lib/db";
import { tours, getTour } from "@/content/tours";
import { blockSlotAction, openSlotAction, createSlotAction } from "@/app/admin/actions";

export default async function AdminCalendar() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const slots = await db.availabilitySlot.findMany({
    where: { date: { gte: today }, archivedAt: null },
    orderBy: [{ date: "asc" }, { tourSlug: "asc" }],
    take: 300,
  });

  return (
    <div>
      <h1 className="admin-h1">Disponibilidad</h1>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Crear / abrir fecha</h2>
        </div>
        <form action={createSlotAction} className="slot-form">
          <select name="tourSlug" required>
            {tours.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name.es}
              </option>
            ))}
          </select>
          <input type="date" name="date" required />
          <input type="text" name="timeSlot" placeholder="09:00" defaultValue="09:00" />
          <input type="number" name="capacity" min={1} defaultValue={12} title="Capacidad" />
          <button className="btn-sm btn-confirm" type="submit">Crear fecha</button>
        </form>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Proximas fechas ({slots.length})</h2>
        </div>
        {slots.length === 0 ? (
          <p className="admin-empty">
            No hay fechas abiertas. Crea una arriba, o corre <code>npm run db:seed</code> para
            abrir 60 dias por experiencia.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Experiencia</th>
                  <th>Capacidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id}>
                    <td>{s.date.toISOString().slice(0, 10)}</td>
                    <td>{s.timeSlot ?? "—"}</td>
                    <td>{getTour(s.tourSlug)?.name.es ?? s.tourSlug}</td>
                    <td>
                      {s.capacityRemaining}/{s.capacity}
                    </td>
                    <td>
                      <span className={`pill pill-${s.status}`}>{s.status}</span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {s.status === "available" ? (
                          <form action={blockSlotAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <button className="btn-sm btn-cancel">Bloquear</button>
                          </form>
                        ) : (
                          <form action={openSlotAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <button className="btn-sm btn-confirm">Abrir</button>
                          </form>
                        )}
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

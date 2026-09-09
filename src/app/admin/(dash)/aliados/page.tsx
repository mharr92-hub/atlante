import { getDb } from "@/lib/db";
import { PARTNER_STATUSES } from "@/lib/partner-applications";
import {
  deletePartnerApplicationAction,
  setPartnerStatusAction,
} from "@/app/admin/vessel-actions";

/**
 * `/admin/aliados` (bloque 4.3): las solicitudes que llegan de
 * `/aliados/registro`, para revisarlas antes de publicar ninguna ficha.
 */
const KIND_LABEL: Record<string, string> = {
  operator: "Operador de charter",
  hotel: "Hotel o concierge",
  agency: "Agencia o DMC",
};

const NEXT_STATUS: Record<string, string[]> = {
  new: ["reviewing", "rejected"],
  reviewing: ["approved", "rejected"],
  approved: ["reviewing"],
  rejected: ["reviewing"],
};

function photoList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export default async function AdminAliados() {
  const db = getDb();

  if (!db) {
    return (
      <div>
        <h1 className="admin-h1">Aliados</h1>
        <div className="admin-panel">
          <p className="admin-empty">
            Sin base de datos: falta <code>DATABASE_URL</code>. Las solicitudes de{" "}
            <code>/aliados/registro</code> no se están guardando; el formulario ofrece cerrar por
            WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  let applications: Awaited<ReturnType<typeof db.partnerApplication.findMany>> = [];
  let failed = false;
  try {
    applications = await db.partnerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    failed = true;
  }

  return (
    <div>
      <h1 className="admin-h1">Aliados</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          Estados: {PARTNER_STATUSES.join(" → ")}. Una solicitud aprobada no publica nada por sí
          sola: la ficha se crea a mano en <code>/admin/naves</code> con los datos verificados.
        </p>
      </div>

      <div className="admin-panel">
        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : applications.length === 0 ? (
          <p className="admin-empty">No hay solicitudes todavía.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Solicitante</th>
                  <th>Embarcación</th>
                  <th>Mensaje</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => {
                  const photos = photoList(application.photos);
                  return (
                    <tr key={application.id}>
                      <td>{application.createdAt.toISOString().slice(0, 10)}</td>
                      <td>{KIND_LABEL[application.kind] ?? application.kind}</td>
                      <td>
                        {application.name}
                        <br />
                        <span className="admin-muted">
                          {application.whatsapp || "—"}
                          <br />
                          {application.email || "—"}
                          {application.zone ? (
                            <>
                              <br />
                              zona: {application.zone}
                            </>
                          ) : null}
                        </span>
                      </td>
                      <td>
                        {application.vesselName || "—"}
                        {application.capacity ? (
                          <>
                            <br />
                            <span className="admin-muted">{application.capacity} pax</span>
                          </>
                        ) : null}
                        {photos.length > 0 ? (
                          <>
                            <br />
                            <span className="admin-muted">{photos.length} foto(s)</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <span className="admin-muted">{application.message || "—"}</span>
                      </td>
                      <td>
                        <span className={`pill pill-${application.status === "approved" ? "paid" : application.status === "rejected" ? "lost" : "created"}`}>
                          {application.status}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          {application.whatsapp ? (
                            <a
                              className="btn-sm btn-confirm"
                              href={`https://wa.me/${application.whatsapp.replace(/\D+/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          ) : null}
                          {(NEXT_STATUS[application.status] ?? []).map((status) => (
                            <form action={setPartnerStatusAction} key={status}>
                              <input type="hidden" name="id" value={application.id} />
                              <input type="hidden" name="status" value={status} />
                              <button className="btn-sm" type="submit">
                                {status}
                              </button>
                            </form>
                          ))}
                          <form action={deletePartnerApplicationAction}>
                            <input type="hidden" name="id" value={application.id} />
                            <button className="btn-sm btn-cancel" type="submit">
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

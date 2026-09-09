import Link from "next/link";
import CopyField from "@/components/admin/CopyField";
import { site } from "@/config/site";
import { getDb } from "@/lib/db";
import { PARTNER_STATUSES } from "@/lib/partner-applications";
import {
  partnerInviteUrl,
  RESELLER_KIND_LABEL,
  RESELLER_KINDS,
  type ResellerKind,
} from "@/lib/partner-codes";
import {
  approvePartnerApplicationAction,
  deletePartnerApplicationAction,
  deleteResellerAction,
  saveResellerAction,
  setPartnerStatusAction,
  toggleResellerAction,
} from "@/app/admin/partner-actions";

/**
 * `/admin/aliados` (bloques 4.3 y 5.1): los códigos de aliado que ya existen y
 * las solicitudes que llegan de `/aliados/registro`.
 *
 * El código viaja en el enlace de invitación, se guarda 30 días en la cookie
 * `atl_partner` y termina en `Lead.partnerCode`. Pacific Experience no lo ve
 * nunca: a PEX le llega `ref=ATLANTE` y el reparto se calcula en
 * `/admin/comisiones`.
 */
const APPLICATION_KIND_LABEL: Record<string, string> = {
  operator: "Operador de charter",
  hotel: "Hotel o concierge",
  agency: "Agencia o DMC",
  organizer: "Organizador de eventos",
};

/** Estados a los que se puede pasar sin aprobar (aprobar tiene su propia acción). */
const NEXT_STATUS: Record<string, string[]> = {
  new: ["reviewing", "rejected"],
  reviewing: ["rejected"],
  approved: ["reviewing"],
  rejected: ["reviewing"],
};

const CAN_APPROVE = new Set(["new", "reviewing", "rejected"]);

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
            Sin base de datos: falta <code>DATABASE_URL</code>. Ni los códigos de aliado ni las
            solicitudes de <code>/aliados/registro</code> se están guardando; el formulario público
            ofrece cerrar por WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  let resellers: Awaited<ReturnType<typeof db.reseller.findMany>> = [];
  let applications: Awaited<ReturnType<typeof db.partnerApplication.findMany>> = [];
  let failed = false;
  try {
    [resellers, applications] = await Promise.all([
      db.reseller.findMany({ orderBy: [{ active: "desc" }, { referralCode: "asc" }], take: 500 }),
      db.partnerApplication.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    ]);
  } catch {
    failed = true;
  }

  return (
    <div>
      <h1 className="admin-h1">Aliados</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          Un aliado recomienda Atlante con su enlace de invitación
          (<code>?partner=CODE</code>). El código queda 30 días en el navegador, viaja en el lead y
          se reparte en{" "}
          <Link className="admin-link" href="/admin/comisiones">
            Comisiones
          </Link>
          . A Pacific Experience siempre le llega <code>ref=ATLANTE</code>: el código del aliado no
          sale de Atlante.
        </p>
      </div>

      {/* ------------------------------------------------ códigos de aliado -- */}
      <div className="admin-panel">
        <h2>Códigos de aliado</h2>
        {failed ? (
          <p className="admin-empty">
            No se pudo leer la base de datos. Revisa <code>DATABASE_URL</code>.
          </p>
        ) : resellers.length === 0 ? (
          <p className="admin-empty">
            No hay códigos todavía. Crea el primero abajo: el enlace de invitación aparece en la
            tabla, listo para copiar.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Aliado</th>
                  <th>Contacto</th>
                  <th>Comisión</th>
                  <th>Enlace de invitación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((reseller) => {
                  const percent = Number(reseller.commissionPercent ?? 0);
                  return (
                    <tr key={reseller.id}>
                      <td>
                        <code>{reseller.referralCode}</code>
                      </td>
                      <td>
                        {reseller.name}
                        <br />
                        <span className="admin-muted">
                          {APPLICATION_KIND_LABEL[reseller.kind] ?? reseller.kind}
                        </span>
                        {reseller.notes ? (
                          <>
                            <br />
                            <span className="admin-muted">{reseller.notes}</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <span className="admin-muted">
                          {reseller.whatsapp || "—"}
                          <br />
                          {reseller.email}
                        </span>
                      </td>
                      <td>
                        {percent > 0 ? (
                          `${percent} %`
                        ) : (
                          <span className="admin-warn-inline">sin fijar</span>
                        )}
                      </td>
                      <td>
                        <CopyField value={partnerInviteUrl(reseller.referralCode, site.url)} />
                      </td>
                      <td>
                        <span className={`pill pill-${reseller.active ? "paid" : "lost"}`}>
                          {reseller.active ? "activo" : "inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <form action={toggleResellerAction}>
                            <input
                              type="hidden"
                              name="referralCode"
                              value={reseller.referralCode}
                            />
                            {reseller.active ? null : (
                              <input type="hidden" name="active" value="on" />
                            )}
                            <button className="btn-sm" type="submit">
                              {reseller.active ? "Desactivar" : "Activar"}
                            </button>
                          </form>
                          <form action={deleteResellerAction}>
                            <input
                              type="hidden"
                              name="referralCode"
                              value={reseller.referralCode}
                            />
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

      <div className="admin-panel">
        <h2>Nuevo código</h2>
        <p className="admin-empty" style={{ marginTop: 0 }}>
          El código se guarda siempre en MAYÚSCULAS y es único. Escribir un código que ya existe
          edita ese aliado. Sin porcentaje, el reparto sale en 0: fíjalo cuando el acuerdo esté
          cerrado.
        </p>
        <form action={saveResellerAction}>
          <div className="admin-form-grid">
            <label>
              Código
              <input
                type="text"
                name="referralCode"
                required
                placeholder="HOTELX"
                style={{ textTransform: "uppercase" }}
              />
            </label>
            <label>
              Nombre del aliado
              <input type="text" name="name" required placeholder="Hotel X" />
            </label>
            <label>
              Tipo
              <select name="kind" defaultValue="hotel">
                {RESELLER_KINDS.map((kind: ResellerKind) => (
                  <option key={kind} value={kind}>
                    {RESELLER_KIND_LABEL[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Correo (único)
              <input type="email" name="email" required />
            </label>
            <label>
              WhatsApp (sólo dígitos)
              <input type="text" name="whatsapp" inputMode="numeric" />
            </label>
            <label>
              Comisión del aliado (%)
              <input
                type="number"
                name="commissionPercent"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
              />
            </label>
          </div>
          <label>
            Notas internas
            <textarea name="notes" rows={2} />
          </label>
          <div className="admin-checks">
            <label>
              <input type="checkbox" name="active" defaultChecked />
              Activo
            </label>
          </div>
          <button className="btn-sm btn-confirm" type="submit">
            Guardar aliado
          </button>
        </form>
      </div>

      {/* ---------------------------------------------------- solicitudes --- */}
      <div className="admin-panel">
        <h2>Solicitudes</h2>
        <p className="admin-empty" style={{ marginTop: 0 }}>
          Estados: {PARTNER_STATUSES.join(" → ")}. Aprobar crea la ficha que toca — un operador de
          charter pasa a <code>/admin/operadores</code> y un hotel, una agencia o un organizador
          reciben un código de aliado con 0 % hasta que fijes el reparto. Aprobar{" "}
          <strong>no publica nada</strong>: la nave se crea a mano en <code>/admin/naves</code> con
          los datos verificados.
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
                      <td>{APPLICATION_KIND_LABEL[application.kind] ?? application.kind}</td>
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
                          {CAN_APPROVE.has(application.status) ? (
                            <form action={approvePartnerApplicationAction}>
                              <input type="hidden" name="id" value={application.id} />
                              <button className="btn-sm btn-confirm" type="submit">
                                Aprobar
                              </button>
                            </form>
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

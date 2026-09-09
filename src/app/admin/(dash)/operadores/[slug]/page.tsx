import Link from "next/link";
import { notFound } from "next/navigation";
import { defaultCommissionPct } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { rowToOperator } from "@/lib/vessels";
import { operatorSealVisible } from "@/lib/vessel-pricing";
import { saveOperatorAction } from "@/app/admin/vessel-actions";

/**
 * Edición de un operador (bloque 4.3). El checklist de verificación —licencia
 * AMP, seguro vigente y contrato firmado— es lo único que enciende el sello
 * público, y sólo junto con la casilla "verificado".
 */
function isoDay(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function AdminOperadorEdit({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  if (!db) notFound();

  let operator: Awaited<ReturnType<typeof db.operator.findUnique>> = null;
  try {
    operator = await db.operator.findUnique({ where: { slug } });
  } catch {
    operator = null;
  }
  if (!operator) notFound();

  const seal = operatorSealVisible(rowToOperator(operator));

  return (
    <div>
      <h1 className="admin-h1">{operator.name}</h1>

      <div className="admin-panel">
        <p className="admin-empty" style={{ margin: 0 }}>
          <Link className="admin-link" href="/admin/operadores">
            ← Volver a operadores
          </Link>{" "}
          · <code>{operator.slug}</code> ·{" "}
          {seal ? (
            "el sello «Operador verificado» se está mostrando en público."
          ) : (
            <span className="admin-warn">
              El sello NO se muestra: hacen falta licencia AMP, seguro vigente, contrato firmado y
              la casilla &quot;verificado&quot;.
            </span>
          )}
        </p>
      </div>

      <form action={saveOperatorAction}>
        <input type="hidden" name="slug" value={operator.slug} />

        <div className="admin-panel">
          <h2>Datos</h2>
          <div className="admin-form-grid">
            <label>
              Nombre
              <input type="text" name="name" required defaultValue={operator.name} />
            </label>
            <label>
              WhatsApp (sólo dígitos)
              <input
                type="text"
                name="whatsapp"
                inputMode="numeric"
                defaultValue={operator.whatsapp ?? ""}
              />
            </label>
            <label>
              Correo
              <input type="email" name="email" defaultValue={operator.email ?? ""} />
            </label>
            <label>
              Comisión de Atlante (%) — interna, vacío usa {defaultCommissionPct()} %
              <input
                type="number"
                name="commissionPct"
                step="0.01"
                min="0"
                max="100"
                defaultValue={
                  operator.commissionPct === null ? "" : String(Number(operator.commissionPct))
                }
              />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Checklist de verificación</h2>
          <div className="admin-form-grid">
            <label>
              Licencia AMP
              <input type="text" name="ampLicense" defaultValue={operator.ampLicense ?? ""} />
            </label>
            <label>
              Seguro vigente hasta
              <input
                type="date"
                name="insuranceUntil"
                defaultValue={isoDay(operator.insuranceUntil)}
              />
            </label>
            <label>
              Contrato firmado el
              <input
                type="date"
                name="contractSignedAt"
                defaultValue={isoDay(operator.contractSignedAt)}
              />
            </label>
          </div>
          <div className="admin-checks">
            <label>
              <input type="checkbox" name="verified" defaultChecked={operator.verified} />
              Verificado (con los tres de arriba, enciende el sello público)
            </label>
            <label>
              <input type="checkbox" name="active" defaultChecked={operator.active} />
              Activo
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <button className="btn-sm btn-confirm" type="submit">
            Guardar operador
          </button>
        </div>
      </form>
    </div>
  );
}

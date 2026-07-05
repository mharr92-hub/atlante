import { redirect } from "next/navigation";
import { isAuthed, adminConfigured } from "@/lib/auth";
import { loginAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthed()) redirect("/admin");
  const { error } = await searchParams;
  const configured = adminConfigured();

  return (
    <div className="admin-login">
      <form action={loginAction} className="admin-login-card">
        <div className="admin-brand" style={{ justifyContent: "center", marginBottom: 8 }}>
          <span className="brand-mark">A</span> Atlante · Admin
        </div>
        {!configured ? (
          <p className="admin-empty" style={{ textAlign: "center" }}>
            Configura <code>ADMIN_PASSWORD</code> y <code>AUTH_SECRET</code> en el entorno para
            habilitar el acceso.
          </p>
        ) : null}
        {error ? <p className="admin-error">Contrasena incorrecta.</p> : null}
        <label>
          Contrasena
          <input type="password" name="password" autoFocus required disabled={!configured} />
        </label>
        <button className="button button-primary" type="submit" disabled={!configured}>
          Entrar
        </button>
      </form>
    </div>
  );
}

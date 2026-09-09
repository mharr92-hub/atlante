import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/admin/actions";

// Admin reads live DB state on every request — never prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-brand">
          <span className="brand-mark">A</span> Atlante · Admin
        </div>
        <nav>
          <Link href="/admin">Resumen</Link>
          <Link href="/admin/leads">Leads</Link>
          <Link href="/admin/catalogo">Catálogo</Link>
          <Link href="/admin/naves">Naves</Link>
          <Link href="/admin/operadores">Operadores</Link>
          <Link href="/admin/aliados">Aliados</Link>
          <Link href="/admin/comisiones">Comisiones</Link>
        </nav>
        <form action={logoutAction} className="admin-logout">
          <button type="submit">Cerrar sesion</button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

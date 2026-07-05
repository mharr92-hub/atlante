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
          <Link href="/admin/bookings">Reservas</Link>
          <Link href="/admin/calendar">Disponibilidad</Link>
        </nav>
        <form action={logoutAction} className="admin-logout">
          <button type="submit">Cerrar sesion</button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

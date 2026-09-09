"use server";

import { redirect } from "next/navigation";
import { checkPassword, setSession, clearSession } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!checkPassword(password)) redirect("/admin/login?error=1");
  await setSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearSession();
  redirect("/admin/login");
}

import { NextResponse } from "next/server";

/**
 * Lead / email-capture endpoint (Phase 1 stub).
 * Phase 2 will persist to the DB and enqueue a discount-code email (Resend).
 * For now it validates and logs so the popup flow works end-to-end.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    // TODO(Phase 2): save to DB + send discount email via Resend.
    console.log("[lead]", { email, source: body.source ?? "unknown", locale: body.locale });
    return NextResponse.json({ ok: true, code: "ATLANTE10" });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
}

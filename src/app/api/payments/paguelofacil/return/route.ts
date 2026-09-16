import { NextResponse } from "next/server";
import {
  amountsMatch,
  appOrigin,
  extractPfHints,
  verifyPagueloFacilTransaction,
} from "@/lib/paguelofacil";
import {
  getCharterLeadById,
  markCharterDepositPaid,
} from "@/lib/charter-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function graciasPath(slug: string, token: string, failed = false): string {
  const qs = new URLSearchParams({ token });
  if (failed) qs.set("pago", "fallido");
  return `/reservar/${slug}/gracias?${qs.toString()}`;
}

function redirectTo(origin: string, path: string) {
  return NextResponse.redirect(`${origin}${path}`);
}

/**
 * Public GET RETURN_URL — PagueloFácil redirects the customer here.
 * Browser params are hints only; payment is confirmed via MerchantTransactions.
 */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const url = new URL(req.url);
  const hints = extractPfHints(Object.fromEntries(url.searchParams.entries()));

  try {
    const lead = hints.parm1 ? await getCharterLeadById(hints.parm1) : null;
    const slug = lead?.slug ?? "";
    const token = lead?.confirmationToken ?? "";

    if (!lead || !slug) {
      return redirectTo(origin, "/charters");
    }

    if (lead.paymentStatus === "paid") {
      return redirectTo(origin, graciasPath(slug, token));
    }

    if (!hints.oper) {
      return redirectTo(origin, graciasPath(slug, token, true));
    }

    const verified = await verifyPagueloFacilTransaction(hints.oper);
    if (!verified.ok) {
      return redirectTo(origin, graciasPath(slug, token, true));
    }

    const expected = Number(lead.depositAmount);
    if (!amountsMatch(expected, verified.amount)) {
      console.error("[pf-return] amount mismatch", {
        expected,
        actual: verified.amount,
        id: lead.id,
      });
      return redirectTo(origin, graciasPath(slug, token, true));
    }
    if (verified.parm1 && verified.parm1 !== lead.id) {
      return redirectTo(origin, graciasPath(slug, token, true));
    }

    await markCharterDepositPaid({
      id: lead.id,
      oper: verified.oper,
      expectedDeposit: expected,
    });

    return redirectTo(origin, graciasPath(slug, token));
  } catch (err) {
    console.error("[pf-return]", err);
    return redirectTo(origin, "/charters");
  }
}

import { NextResponse } from "next/server";
import {
  amountsMatch,
  extractPfHints,
  verifyPagueloFacilTransaction,
} from "@/lib/paguelofacil";
import {
  getCharterLeadById,
  markCharterDepositPaid,
} from "@/lib/charter-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parsePayload(req: Request): Promise<Record<string, unknown>> {
  const url = new URL(req.url);
  const fromQuery = Object.fromEntries(url.searchParams.entries());
  const ct = req.headers.get("content-type") ?? "";
  const text = await req.text();
  if (!text) return fromQuery;

  if (ct.includes("application/json")) {
    try {
      return { ...fromQuery, ...(JSON.parse(text) as Record<string, unknown>) };
    } catch {
      return fromQuery;
    }
  }

  try {
    return { ...fromQuery, ...(JSON.parse(text) as Record<string, unknown>) };
  } catch {
    const params = new URLSearchParams(text);
    return { ...fromQuery, ...Object.fromEntries(params.entries()) };
  }
}

/**
 * Public POST webhook — PagueloFácil dashboard "Notificaciones".
 * Payload is HINTS ONLY. Always ACK 200 so PF does not retry-storm.
 * Confirm via MerchantTransactions S2S before any state change.
 */
export async function POST(req: Request) {
  try {
    const body = await parsePayload(req);
    const hints = extractPfHints(body);
    if (!hints.oper || !hints.parm1) {
      return NextResponse.json({ received: true });
    }

    const lead = await getCharterLeadById(hints.parm1);
    if (!lead) return NextResponse.json({ received: true });
    if (lead.paymentStatus === "paid") return NextResponse.json({ received: true });

    const verified = await verifyPagueloFacilTransaction(hints.oper);
    if (!verified.ok) return NextResponse.json({ received: true });

    const expected = Number(lead.depositAmount);
    if (!amountsMatch(expected, verified.amount)) {
      console.error("[pf-webhook] amount mismatch", {
        expected,
        actual: verified.amount,
        id: lead.id,
      });
      return NextResponse.json({ received: true });
    }
    if (verified.parm1 && verified.parm1 !== lead.id) {
      return NextResponse.json({ received: true });
    }

    await markCharterDepositPaid({
      id: lead.id,
      oper: verified.oper,
      expectedDeposit: expected,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[pf-webhook]", err);
    return NextResponse.json({ received: true });
  }
}

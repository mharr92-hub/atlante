import "server-only";
import { cookies } from "next/headers";
import { LANDING_COOKIE, PARTNER_COOKIE, UTM_COOKIE } from "@/proxy";

/** Lo que `src/proxy.ts` guardó en la primera visita. */
export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  partnerCode?: string;
  landingPath?: string;
}

function decode(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw).slice(0, 200) || undefined;
  } catch {
    return undefined;
  }
}

export async function readAttribution(): Promise<Attribution> {
  const store = await cookies();
  const out: Attribution = {
    partnerCode: decode(store.get(PARTNER_COOKIE)?.value),
    landingPath: decode(store.get(LANDING_COOKIE)?.value),
  };

  const utmRaw = decode(store.get(UTM_COOKIE)?.value);
  if (utmRaw) {
    try {
      const utm = JSON.parse(utmRaw) as Record<string, unknown>;
      if (typeof utm.source === "string") out.utmSource = utm.source.slice(0, 100);
      if (typeof utm.medium === "string") out.utmMedium = utm.medium.slice(0, 100);
      if (typeof utm.campaign === "string") out.utmCampaign = utm.campaign.slice(0, 100);
    } catch {
      // Cookie manipulada: se ignora, no rompe el lead.
    }
  }

  return out;
}

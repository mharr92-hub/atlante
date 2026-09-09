"use client";

import type { Badge } from "@/content/catalog";
import { useLocale } from "@/lib/locale-context";
import { t, type DictKey } from "@/lib/i18n";

const KEY: Record<Badge, DictKey> = {
  family: "badge_family",
  adventure: "badge_adventure",
  romantic: "badge_romantic",
  celebration: "badge_celebration",
  snorkel: "badge_snorkel",
  group: "badge_group",
  evening: "badge_evening",
};

export default function Badges({ badges }: { badges?: Badge[] }) {
  const { locale } = useLocale();
  if (!badges || badges.length === 0) return null;
  return (
    <div className="badge-row">
      {badges.map((b) => (
        <span key={b} className="badge">
          {t(KEY[b], locale)}
        </span>
      ))}
    </div>
  );
}

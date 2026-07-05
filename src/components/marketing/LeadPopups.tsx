"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

/**
 * Combined email-capture + exit-intent popup.
 * - Opens after 18s on the page, OR on exit-intent (mouse leaves toward the top).
 * - Shows once per browser (localStorage flag) so it isn't annoying.
 * - Submits to /api/lead (a stub that just logs until Phase 2 email wiring).
 */
const SEEN_KEY = "lead_popup_seen";

export default function LeadPopups() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (dismissed) return;

    const show = () => {
      setOpen(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
      cleanup();
    };

    const timer = window.setTimeout(show, 18000);
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };
    document.addEventListener("mouseout", onLeave);

    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onLeave);
    }
    return cleanup;
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setDone(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "popup", locale }),
      });
    } catch {
      /* non-blocking */
    }
  }

  if (!open) return null;

  return (
    <div className="popup-backdrop" onClick={() => setOpen(false)}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="popup-close"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow" style={{ color: "var(--bronze)" }}>
          Atlante
        </p>
        {done ? (
          <>
            <h3>{t("popup_thanks", locale)}</h3>
            <p style={{ color: "rgba(10,36,33,.7)" }}>
              {locale === "es" ? "Codigo: " : "Code: "}
              <strong>ATLANTE10</strong>
            </p>
          </>
        ) : (
          <>
            <h3>{t("popup_title", locale)}</h3>
            <p style={{ color: "rgba(10,36,33,.7)" }}>{t("popup_body", locale)}</p>
            <form className="popup-form" onSubmit={submit}>
              <input
                type="email"
                required
                placeholder={t("popup_placeholder", locale)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="button button-primary" type="submit">
                {t("popup_cta", locale)}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

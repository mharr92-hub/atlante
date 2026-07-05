"use client";

import { site, whatsappUrl } from "@/config/site";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function ContactSection() {
  const { locale } = useLocale();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => (data.get(k) as string) || "";
    const lines = [
      site.whatsapp.defaultMessage,
      get("name") && `${t("form_name", locale)}: ${get("name")}`,
      get("phone") && `${t("form_phone", locale)}: ${get("phone")}`,
      get("email") && `${t("form_email", locale)}: ${get("email")}`,
      get("date") && `${t("form_date", locale)}: ${get("date")}`,
      get("group") && `${t("form_group", locale)}: ${get("group")}`,
      get("message") && `${t("form_message", locale)} ${get("message")}`,
    ].filter(Boolean) as string[];
    window.open(whatsappUrl(lines.join("\n")), "_blank", "noopener,noreferrer");
  }

  return (
    <section id="contacto" className="section contact-section">
      <div className="section-inner split">
        <div>
          <p className="eyebrow">{t("contact_eyebrow", locale)}</p>
          <h2>{t("contact_title", locale)}</h2>
          <p style={{ color: "rgba(248,243,232,.8)" }}>{t("contact_body", locale)}</p>
          <div className="contact-lines">
            <a href={whatsappUrl()} target="_blank" rel="noreferrer">
              WhatsApp: {site.whatsapp.display}
            </a>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <span>{site.location}</span>
          </div>
        </div>
        <form className="contact-card" onSubmit={onSubmit}>
          <label>
            {t("form_name", locale)}
            <input name="name" autoComplete="name" placeholder={t("form_name", locale)} />
          </label>
          <label>
            {t("form_phone", locale)}
            <input name="phone" autoComplete="tel" placeholder="+507 6123 4567" />
          </label>
          <label>
            {t("form_email", locale)}
            <input name="email" type="email" autoComplete="email" placeholder="tu@email.com" />
          </label>
          <label>
            {t("form_date", locale)}
            <input name="date" type="date" />
          </label>
          <label>
            {t("form_group", locale)}
            <input name="group" placeholder={locale === "es" ? "8 invitados, celebracion" : "8 guests, celebration"} />
          </label>
          <label>
            {t("form_message", locale)}
            <textarea name="message" rows={5} placeholder="Taboga, Las Perlas, atardecer..." />
          </label>
          <button className="button button-primary" type="submit">
            {t("form_submit", locale)}
          </button>
        </form>
      </div>
    </section>
  );
}

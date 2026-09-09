"use client";

import { useState } from "react";

/**
 * Un texto largo (el enlace de invitación de un aliado) con botón "Copiar".
 *
 * Mismo camino que la pantalla `/listo`: `navigator.clipboard` y, si el
 * navegador no da permiso, un `<input>` invisible con `execCommand`.
 */
export default function CopyField({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      const input = document.createElement("input");
      input.value = value;
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        setCopied(false);
      }
      document.body.removeChild(input);
    }
  }

  return (
    <div className="admin-copy">
      <code>{value}</code>
      <button className="btn-sm" type="button" onClick={copy}>
        {copied ? "Copiado" : label}
      </button>
    </div>
  );
}

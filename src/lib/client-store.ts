"use client";

import { useSyncExternalStore } from "react";

/**
 * Lee un valor que sólo existe en el navegador (cookie, sessionStorage) sin
 * `setState` dentro de un efecto — que es exactamente lo que
 * `react-hooks/set-state-in-effect` prohíbe y lo que provoca renders en
 * cascada.
 *
 * El valor debe ser una cadena: `useSyncExternalStore` compara por identidad y
 * un objeto nuevo en cada lectura haría un bucle infinito. Si hace falta un
 * objeto, se parsea después con `useMemo`.
 */
const noopSubscribe = () => () => {};

export function useClientString(read: () => string | null): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return read();
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/** Valor de una cookie del navegador, ya decodificado. */
export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  const raw = match.slice(name.length + 1);
  if (!raw.includes("%")) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

import { expect, test, type Page } from "@playwright/test";

/**
 * El camino que da de comer (bloque 6.3): alguien entra a `/reservar/tour-bahia`,
 * hace los tres clics y termina en Pacific Experience **con `ref=ATLANTE`**.
 *
 * Es el criterio A4 del PRD y el único e2e del proyecto: si esto se rompe, se
 * rompe la comisión. Corre en modo puente y sin base de datos, así que también
 * cubre el A5 (el handoff no se bloquea si no hay `DATABASE_URL`).
 *
 * La salida a PEX se intercepta: la prueba comprueba la URL a la que el
 * navegador iba, sin llegar a pedirle nada al sitio del operador.
 */

const PEX = /pacificexperience\.lat/;

/** Corta la salida a PEX y devuelve la URL a la que el navegador se iba. */
async function stubPex(page: Page): Promise<() => string | null> {
  let visited: string | null = null;
  await page.route(PEX, async (route) => {
    visited = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>stub de Pacific Experience</body></html>",
    });
  });
  return () => visited;
}

async function completeFunnel(page: Page) {
  await page.goto("/reservar/tour-bahia");

  // Paso 1 · la experiencia
  await expect(page.getByText("Paso 1 de 3")).toBeVisible();
  await page.getByRole("button", { name: "Elegir fecha" }).click();

  // Paso 2 · fecha, horario y pasajeros
  await expect(page.getByText("Paso 2 de 3")).toBeVisible();
  const day = page.locator("button.cal-day:not([disabled])").first();
  await expect(day).toBeVisible();
  await day.click();

  const slot = page.locator("button.slot-option:not([disabled])").first();
  if (await slot.count()) await slot.click();

  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // Paso 3 · datos y consentimiento
  await expect(page.getByText("Paso 3 de 3")).toBeVisible();
  await page.locator('input[name="name"]').fill("Ana Prueba");
  await page.locator('input[name="phone"]').fill("61234567");
  await page.locator('input[name="email"]').fill("ana.prueba@example.com");
  await page.locator(".consent input[type=checkbox]").check();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
}

test("el funnel del tour de la bahía llega a /listo y sale a PEX con ref=ATLANTE", async ({
  page,
}) => {
  const visitedPex = await stubPex(page);

  await completeFunnel(page);

  // La pantalla de salto, con el código visible para pegar en el checkout.
  await page.waitForURL(/\/reservar\/tour-bahia\/listo/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Te llevamos a Pacific Experience",
  );
  await expect(page.getByText("ATLANTE", { exact: true }).first()).toBeVisible();

  // El salto: automático a los 3 s, pero aquí se fuerza con el botón.
  await page.getByRole("button", { name: /Ir ahora/ }).click();
  await page.waitForURL(PEX);

  const destination = page.url();
  expect(destination).toContain("ref=ATLANTE");
  expect(destination).toContain("utm_source=atlante");
  // Regla 7: nunca datos personales en la URL.
  expect(destination).not.toMatch(/name=|email=|phone=|nombre=|correo=|telefono=/);
  expect(visitedPex()).toContain("ref=ATLANTE");
});

test("sin completar el funnel, /listo sigue saliendo a PEX con ref=ATLANTE", async ({
  page,
}) => {
  // Entrada directa a la pantalla de salto (recarga, pestaña nueva): no hay
  // `sessionStorage`, así que manda el destino de respaldo. El `ref` no se
  // pierde nunca.
  await stubPex(page);
  await page.goto("/reservar/tour-bahia/listo");

  await page.getByRole("button", { name: /Ir ahora/ }).click();
  await page.waitForURL(PEX);
  expect(page.url()).toContain("ref=ATLANTE");
});

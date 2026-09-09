import { defineConfig, devices } from "@playwright/test";

/**
 * E2E mínimo del bloque 6.3.
 *
 * Corre contra el build de producción (`next start`), no contra `next dev`, y en
 * viewport móvil: es donde el PRD pide la verificación (regla 14) y donde vive
 * la mayoría del tráfico.
 *
 * No necesita `DATABASE_URL`: el funnel en modo puente tiene que llegar a PEX
 * con `ref=ATLANTE` aunque no haya base de datos (regla 9), y eso es justo lo
 * que la prueba comprueba.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // Chromium (el `Pixel 5` de Playwright) con el viewport de 390 px que fija
    // la regla 14. Un solo navegador: en CI basta para el camino crítico y no
    // hay que descargar WebKit ni Firefox.
    {
      name: "movil",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

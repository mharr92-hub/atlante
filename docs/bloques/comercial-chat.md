# Comercial y contenido (NO lo ejecuta el script: son prompts para sesiones de chat con Claude)

Estos trabajos no son código. Cuando quieras hacerlos, abre una sesión de chat en el proyecto "atlante del pacific" y pega el prompt correspondiente. Cada uno produce entregables en tabla copiable.

## 8.1 Prospección de operadores de charter (T56)

> Con base en `02-PRD-atlante-v2.md` (sección 6, alianzas) arma una lista de 20 operadores de charter, yates, lanchas y veleros en Ciudad de Panamá, Amador, Taboga y Las Perlas que NO sean Pacific Experience, con: nombre, tipo de embarcación, capacidad, zona, WhatsApp/Instagram/web, precio público si lo publican, y fuente. Marca NO ENCONTRADO donde falte. Luego redacta el mensaje de primer contacto por WhatsApp (ES) para ofrecerles ficha en Atlante con comisión "según acuerdo" y el enlace a `/aliados`.

## 8.2 Hoteles, concierges y agencias (T56)

> Reutiliza la base de ~62 prospectos B2B ya compilada para PEX (agencias y DMC) y arma la versión para Atlante: mensaje de presentación del código de aliado (`?partner=CODE`), qué gana el hotel, y un calendario de 4 semanas de seguimiento. Tabla: prospecto, contacto, canal, fecha de envío, estado.

## 8.3 Guías de contenido (T59) — 2 por mes

> Escribe la guía "Ferry o charter a Taboga: cuál conviene según tu grupo" (ES, 900–1200 palabras) usando SOLO los precios y horarios del catálogo de Atlante (`docs/PRD-atlante-v2.md` 5.6/5.7), con una tabla comparativa y CTAs a `/tours/ferry-taboga` y `/charters`. Sin usar la palabra "Sunset". Después la versión EN. Repetir con: "Cuánto cuesta un yate por persona en Panamá" y "Mejor mes para ir a Las Perlas" (esta última sin datos climáticos inventados: solo lo que el catálogo y PEX publican).

## 8.4 Reparto de Ads Atlante vs PEX (T60)

> Diseña el plan de Google Ads y Meta para Atlante de modo que no compita con PEX: Atlante puja por términos de comparación y charter ("alquiler de yate Panamá precios", "mejores charters Panamá", "comparar tours Taboga", "yate para cumpleaños Panamá", "charter Las Perlas"); PEX se queda con marca + producto ("ferry Taboga", "tour bahía"). Entrega: tabla de campañas, grupos de anuncios, palabras clave, negativas cruzadas, presupuesto inicial sugerido (en blanco para que Mark lo fije) y la audiencia de remarketing "redirect_to_pex sin purchase".

## 8.5 Google Business Profile (T61)

> Explica en 10 líneas si conviene crear un perfil de Google Business para Atlante teniendo en cuenta que PEX ya tiene uno en Marina Flamenco y que Google prohíbe perfiles duplicados del mismo negocio en la misma dirección. Si conviene, checklist de creación con categoría, dirección/área de servicio y qué NO poner.

## 8.6 Sesión de PEX (X1–X9)

> Pega `docs/bloques/anexo-PEX.md` en la sesión de código de PEX con este encabezado: "Implementa X1–X5 (P0) en la rama feature/atlante-attribution del repo de PEX, sin merge ni deploy. Los secretos PEX_HANDOFF_SECRET y PEX_WEBHOOK_SECRET los defino yo; deja placeholders en .env.example".
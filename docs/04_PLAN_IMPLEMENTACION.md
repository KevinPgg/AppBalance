# Plan de Implementación — AppBalance ☕ (PWA)

De código a app instalada en el iPhone de Kevin y su novia, **como PWA** (sin tiendas, sin EAS, sin Mac).

> **Cambio de rumbo (2 jul 2026):** se descarta la ruta nativa (EAS Build + App Store/Play). La app es personal para 2 personas; una PWA evita el Apple Developer Program (USD 99/año) y la revisión de tiendas. Si en el futuro se abre a más usuarios o se necesita push del SO, se puede reevaluar volver a nativo.

---

## 1. Entornos

| Entorno | Uso |
|---|---|
| **Local web** | `npm run web` (Expo dev server). Desarrollo diario en el navegador. |
| **Build local** | `npx expo export -p web` → `dist/`. Para probar la PWA real (SW, manifest) con `npx serve dist`. |
| **Producción** | **Vercel** (deploy del `dist`). URL pública `https://appbalance-*.vercel.app`. |

Variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) en `.env` local y en **Environment Variables de Vercel**. El prefijo `EXPO_PUBLIC_` las incrusta en tiempo de build; la `anon key` es pública por diseño (la protección real es RLS, no ocultarla). **Nunca** subir `.env` al repo.

---

## 2. Backend (Supabase)

- Postgres gestionado + Auth + Storage (fotos de facturas, fase 5).
- **RLS activado** en todas las tablas: política `user_id = auth.uid()`. Es la única barrera real, porque la `anon key` viaja en el bundle de la PWA.
- Migraciones versionadas en `supabase/migrations/`; se corren manualmente en el **SQL Editor** de Supabase. Pendientes de aplicar: `0006_fix_fe_ambiguous.sql`, `0007_categorias_iconos.sql`.
- Auth email/contraseña. **Confirmar que "Confirm email" esté apagado** o el `signUp` pedirá confirmación por correo y bloqueará el primer ingreso.
- **Tier gratuito** suficiente (500 MB DB sobran para datos int/string de 2 usuarios).

---

## 3. Build y estructura PWA

Piezas que hacen la app instalable (ya creadas):

- `public/manifest.json` — nombre, íconos, `display: standalone`, colores de la paleta.
- `public/icons/` — 192, 512, maskable y apple-touch-icon.
- `app/+html.tsx` — HTML raíz de Expo Router: `<link rel="manifest">`, meta de Apple (`apple-mobile-web-app-capable`, etc.) y registro del service worker.
- `public/sw.js` — service worker *network-first*; **nunca cachea Supabase** (`*.supabase.co` siempre va a red) para no servir balances viejos. Solo cachea el shell estático.
- `vercel.json` — `buildCommand: expo export -p web`, `outputDirectory: dist`, rewrites SPA.

Dependencias web necesarias: **`react-native-web`** (imprescindible; sin ella el export falla) y `react-dom`.

```bash
npm run web                 # desarrollo
npx expo export -p web      # genera dist/ (index.html + _expo/ + public/)
npx serve dist              # prueba local de la PWA (SW, manifest)
```

---

## 4. Deploy en Vercel (ruta GitHub)

1. Subir el repo a GitHub. Confirmar que `.gitignore` incluye `.env`.
2. Vercel → **Add New → Project** → importar el repo (lee `vercel.json`).
3. **Antes de Deploy**, añadir en *Environment Variables*: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy → URL pública.

Alternativa CLI: `npm i -g vercel`, `vercel`, y `vercel env add` para las variables.

---

## 5. Instalación en iOS

Instrucciones exactas para la usuaria (si no, no queda bien instalada):

1. Abrir la URL **en Safari** (Chrome iOS **no** instala PWAs).
2. Botón **Compartir** → **"Añadir a pantalla de inicio"**.
3. Se crea el ícono café; abre a pantalla completa como app.

Expectativa honesta: es React Native Web, no una app del App Store — el scroll y las animaciones no se sienten 100% nativos, pero para registrar consumos e ingresos es plenamente usable.

---

## 6. Notificaciones

- **Avisos in-app** (tabla `notifications` + `AlertsBanner`), recalculados al abrir Inicio. No dependen del SO.
- **Web Push** en iOS es posible solo si la PWA está **instalada** (iOS 16.4+); queda como mejora futura opcional, no en el alcance actual.
- Sin APNs/FCM ni Edge Functions con cron por ahora.

---

## 7. OCR de facturas (fase 5, opcional)

Igual que antes: **necesita servidor**, no se hace en el dispositivo.

```
PWA: foto (input file / expo-image-picker web) → sube a Storage 'receipts'
  → Edge Function /ocr con la URL firmada → parsea monto/comercio/ítems/impuestos
  → devuelve JSON → la PWA prellena el formulario (editable) → usuario confirma
```

Opciones: servicio gestionado (Google Vision / Textract / Mindee) para validar valor; open source (Tesseract) si el volumen lo justifica. Decisión aplazada a fase 5.

---

## 8. Mantenimiento

- **Deploys instantáneos:** cada push a GitHub redepliega en Vercel; el usuario solo recarga la PWA (no hay revisión de tienda). El service worker se auto-actualiza (`skipWaiting` + `clients.claim`).
- Backups de Postgres los provee Supabase (verificar retención).
- Monitoreo de errores opcional: **Sentry** (SDK web).
- **Nota de entorno de desarrollo:** no editar/instalar dependencias de este repo desde el shell Linux del asistente; corrompe el `node_modules`/fuentes vía el mount. Instalar y compilar siempre desde Windows.

---

## 9. Costos (arranque)

| Concepto | Costo |
|---|---|
| Hosting (Vercel) | **Gratis** (Hobby) |
| Supabase | **Gratis** (tier free) |
| Dominio propio (opcional) | ~USD 10/año si se quiere una URL bonita |
| Apple Developer | **No aplica** (PWA, sin App Store) |
| OCR (fase 5) | Variable, por imagen (solo si se implementa) |

**Costo mínimo para tener la app en manos de las dos usuarias: USD 0.** El único gasto opcional es un dominio.

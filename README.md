# seviyummy app

Proyecto independiente de la galería pública. Esta primera base contiene el acceso privado con Supabase y una pantalla inicial de estudio para continuar con el panel de obras.

## Configuración local

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Editá `.env.local` con:

- `VITE_SUPABASE_URL`: URL del proyecto.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: clave pública publishable/anon.

Nunca uses `service_role` o una secret key en este frontend.

## Supabase Auth

En Supabase Auth > URL Configuration agregá la URL local y la URL final de GitHub Pages. Para registro con confirmación por email, dejá Email provider habilitado.

## GitHub Pages

El workflow de `.github/workflows/deploy.yml` construye y publica `dist`. En GitHub, activá Pages con fuente **GitHub Actions** y agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como repository variables o secrets de Actions.

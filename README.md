# seviyummy app

Galería pública y estudio privado de Seviyummy. La galería no incluye obras de prueba: solo muestra registros publicados desde Supabase.

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

1. Ejecutá `supabase/schema.sql` desde el SQL Editor.
2. Si `schema.sql` ya se había aplicado antes de habilitar la búsqueda por tags ocultos, ejecutá una sola vez `supabase/search-hidden-tags.sql` en el SQL Editor. No agregues el esquema `private` a los esquemas expuestos de la Data API.
3. En **Authentication > Users**, creá el usuario administrador. El frontend no ofrece registro público.
4. En **Authentication > URL Configuration**, agregá la URL local y `https://seviyummy.art/` como Site URL/redirect permitido.
5. La carpeta `artworks` se crea en Storage con políticas para que cada usuario autenticado solo pueda modificar sus propios archivos.

El admin está en `/admin.html` y permite subir, publicar/ocultar, editar nombre y tags, reemplazar la imagen y eliminar obras. Los tags internos no aparecen en la galería pública.

## GitHub Pages

El workflow de `.github/workflows/deploy.yml` construye y publica `dist`. En GitHub, activá Pages con fuente **GitHub Actions** y agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como repository variables o secrets de Actions.

## Integraciones preparadas

La aplicación está preparada para separar las credenciales por destino:

- Frontend: solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. La publishable/anon key puede llegar al navegador; nunca uses `service_role`, una secret key ni una contraseña de usuario en una variable `VITE_*`.
- Cloudflare Pages: el workflow manual `.github/workflows/deploy-cloudflare.yml` usa `CLOUDFLARE_API_TOKEN` como GitHub Actions secret y `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_PAGES_PROJECT` como variables de Actions. No se escriben en el código ni en `.env`.
- GitHub: el workflow usa el `GITHUB_TOKEN` automático de Actions; no hace falta crear un PAT para construir o publicar. Si más adelante se necesita otro acceso, agregalo como Actions secret y no como variable de frontend.

Antes de conectar servicios ejecutá `npm run check:secrets` y confirmá que el resultado sea limpio. Los valores reales deben cargarse en `.env.local` o en la configuración de GitHub Actions/Cloudflare, nunca commitearse.

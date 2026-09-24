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
2. En **Authentication > Users**, creá el usuario administrador. El frontend no ofrece registro público.
3. En **Authentication > URL Configuration**, agregá la URL local y `https://seviyummy.art/` como Site URL/redirect permitido.
4. La carpeta `artworks` se crea en Storage con políticas para que cada usuario autenticado solo pueda modificar sus propios archivos.

El admin está en `/admin.html` y permite subir, publicar/ocultar, editar nombre y tags, reemplazar la imagen y eliminar obras. Los tags internos no aparecen en la galería pública.

## GitHub Pages

El workflow de `.github/workflows/deploy.yml` construye y publica `dist`. En GitHub, activá Pages con fuente **GitHub Actions** y agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como repository variables o secrets de Actions.

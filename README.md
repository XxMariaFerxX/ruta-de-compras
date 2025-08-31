# Ruta de Compras V2 (React + Vite + Supabase)

Aplicación web para crear tiendas, mapear productos y generar rutas de compra óptimas usando la API de Gemini.

## Stack
- React 18 + Vite
- Supabase (Auth, DB, RLS)
- Gemini API (optimización de ruta)
- CSS clásico (colores heredados)

## Variables de entorno (.env)
Crea `.env` (o usa `.env.local`) en la raíz con:
```
VITE_SUPABASE_URL=TU_URL
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_GEMINI_API_KEY=TU_API_KEY
VITE_ROUTE_MODEL=gemini-2.0-flash
```

## Instalación
```
npm install
npm run dev
```

## Script de base de datos
Ejecuta `SUPABASE_SCHEMA.sql` en el SQL editor de tu proyecto Supabase.

## Creación de usuario admin
1. Registra o inicia sesión con el email que será admin.
2. En SQL corre:
```sql
-- Obtener el UUID del usuario en auth.users
select id, email from auth.users where email = 'admin@tu-dominio.com';
-- Promover
select public.promote_to_admin('UUID_DEL_USUARIO');
```
(O puedes actualizar manualmente en `profiles` el campo `role` a 'admin').

Si el perfil no se creó aún, forzar creación insertando:
```sql
insert into public.profiles (id, role) values ('UUID_DEL_USUARIO','admin') on conflict (id) do update set role='admin';
```

## Flujo principal
1. Admin crea tiendas (definiendo filas/columnas del mapa).
2. Admin agrega productos asignando cada uno a una celda (fila-columna => `r-c`).
3. Usuario selecciona tienda, elige productos para su lista.
4. Genera ruta óptima (Gemini devuelve pasos ordenados).
5. Usuario puede guardar la ruta (tabla `routes`).

## Notas
- La generación de ruta depende de un prompt y puede necesitar ajustes para resultados más limpios.
- RLS protege operaciones de acuerdo al rol.
- Puedes extender el modelo de datos (ej: categorías, imágenes) sin romper el core.

## Mejoras futuras
- Cache local de rutas.
- Editor visual de mapa (drag & drop).
- Métrica de distancia real (A* o TSP heurística local antes de mandar a Gemini).

---
Listo para usar. 

## Verificación de correo
Si en el proyecto Supabase está habilitada la confirmación de email, tras registrarte se enviará un correo. Hasta que no confirmes, la sesión no se mantiene y seguirás viendo el botón "Ingresar". El formulario ahora muestra un mensaje recordatorio. Después de confirmar, vuelve y haz login.



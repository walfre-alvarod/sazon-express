# Fase 2: Backend y API REST

## Objetivo

Conectar el sistema con MySQL y exponer los datos mediante un servidor Node.js con Express.

## Entregables

- Servidor Express y configuracion por variables de entorno.
- Conexion reutilizable a MySQL con `mysql2`.
- Endpoints publicos para productos, usuarios y pedidos.
- Creacion transaccional de pedidos y sus detalles.
- API administrativa protegida con JWT.
- Inicio de sesion con contrasena cifrada.
- Migracion automatica para bases creadas en fases anteriores.
- Manejo centralizado de errores y rutas inexistentes.

## Archivos relacionados

- [`src/server.js`](../../src/server.js)
- [`src/app.js`](../../src/app.js)
- [`src/config/`](../../src/config/)
- [`src/controllers/`](../../src/controllers/)
- [`src/routes/`](../../src/routes/)
- [`src/middlewares/`](../../src/middlewares/)
- [`database/migrations/migrate_to_final.sql`](../../database/migrations/migrate_to_final.sql)
- [`package.json`](../../package.json)
- [`.env.example`](../../.env.example)

## Endpoints principales

- `GET /api/health`
- `GET /api/productos`
- `GET /api/productos/:id`
- `POST /api/pedidos`
- `POST /api/admin/login`
- `GET|POST /api/admin/productos`
- `GET /api/admin/pedidos`

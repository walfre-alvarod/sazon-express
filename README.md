# Sazón Express

Sistema completo de pedidos de comida a domicilio con tienda pública y panel administrativo.

## Organización por fases

El desarrollo y sus entregables están documentados por separado en [`fases/`](fases/README.md):

- [Fase 1: Planificación, diseño UI/UX y base de datos](fases/fase-1/README.md)
- [Fase 2: Backend y API REST](fases/fase-2/README.md)
- [Fase 3: Integración del frontend y JavaScript](fases/fase-3/README.md)
- [Fase 4: Pruebas, depuración y refinamiento](fases/fase-4/README.md)
- [Fase 5: Documentación final y entrega](fases/fase-5/README.md)

El código ejecutable se mantiene en la raíz del repositorio para evitar duplicados y conservar correctas todas las rutas del sistema.

## Estructura del proyecto

```text
sazon-express/
|-- fases/             Evidencia y entregables por fase
|-- public/            HTML, CSS, JavaScript e imágenes del cliente
|-- scripts/           Comprobaciones y utilidades de base de datos
|-- src/               Configuración, rutas, controladores y middlewares
|-- test/              Pruebas automáticas
|-- app.js             Configuración de Express
|-- server.js          Inicio del servidor
|-- schema.sql         Creación de la base de datos
|-- package.json       Dependencias y comandos
`-- README.md          Documentación general
```

## Funciones incluidas

### Cliente

- Catálogo cargado desde MySQL mediante API REST.
- Filtros por categoría y detalle de cada platillo.
- Carrito persistente con `localStorage`.
- Cambio de cantidades, eliminación y cálculo de totales.
- Checkout con datos de entrega y método de pago.
- Creación transaccional del pedido y pantalla de confirmación.
- Seguimiento por número de pedido y correo con actualización automática.

### Administrador

- Inicio de sesión protegido con contraseña cifrada y JWT.
- Resumen de pedidos, ventas, clientes y platillos activos.
- Alta, edición, ocultación y reactivación de platillos.
- Consulta y búsqueda de pedidos.
- Filtros por estado.
- Detalle del cliente, dirección, pago y productos pedidos.
- Estados: pendiente, en preparación, en camino, entregado y cancelado.

## Requisitos

- Node.js 18 o superior.
- XAMPP con MySQL/MariaDB.
- La base `pedidos_db` creada con `schema.sql`.

## Configuración

El archivo `.env` debe estar en la raíz, junto a `package.json`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pedidos_db
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@sazonexpress.com
ADMIN_PASSWORD=Admin12345
JWT_SECRET=cambia-esta-clave-por-una-frase-larga-y-privada
```

Si tu `.env` todavía no tiene las últimas cuatro variables, el sistema usará las credenciales de prueba indicadas arriba. Para una entrega pública debes cambiar `ADMIN_PASSWORD` y `JWT_SECRET`.

## Primera ejecución

1. Enciende MySQL en XAMPP.
2. Si aún no existe la base, importa `schema.sql` desde phpMyAdmin.
3. Instala las dependencias:

```powershell
npm.cmd install
```

4. Inicia el sistema:

```powershell
npm.cmd start
```

El servidor actualiza automáticamente una base creada en fases anteriores. No borra productos, clientes ni pedidos existentes.

## Direcciones para probar

- Tienda: `http://localhost:3000`
- Seguimiento: `http://localhost:3000/seguimiento.html`
- Administración: `http://localhost:3000/admin`
- Salud de la API: `http://localhost:3000/api/health`

Credenciales administrativas predeterminadas:

```text
Correo: admin@sazonexpress.com
Contraseña: Admin12345
```

## Recorrido de prueba

1. Abre la tienda y agrega uno o más platillos.
2. Revisa el carrito y modifica una cantidad.
3. Completa el checkout y confirma el pedido.
4. Abre el seguimiento desde la confirmación y consulta el estado.
5. Abre `/admin` e inicia sesión.
6. Entra a Pedidos, abre el pedido creado y cambia su estado.
7. Regresa al seguimiento y comprueba que el estado cambió.
8. Entra a Platillos, agrega uno nuevo y comprueba que aparece en la tienda.

## Pruebas automáticas

```powershell
npm.cmd test
```

Las pruebas cubren la respuesta del servidor, entrega de tienda y panel, seguridad de rutas administrativas y validaciones principales.

## API principal

Rutas públicas:

- `GET /api/health`
- `GET /api/productos`
- `GET /api/productos/:id`
- `POST /api/pedidos`
- `GET /api/pedidos/seguimiento/:id?correo=...`

Rutas administrativas protegidas:

- `POST /api/admin/login`
- `GET /api/admin/resumen`
- `GET|POST /api/admin/productos`
- `PUT /api/admin/productos/:id`
- `PATCH /api/admin/productos/:id/disponibilidad`
- `GET /api/admin/pedidos`
- `GET /api/admin/pedidos/:id`
- `PATCH /api/admin/pedidos/:id/estado`

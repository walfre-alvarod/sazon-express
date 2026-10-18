# Fase 3: Integracion del frontend y JavaScript

## Objetivo

Convertir las vistas estaticas en una tienda funcional conectada a la API REST.

## Entregables

- Catalogo generado dinamicamente desde MySQL.
- Filtros por categoria y detalle de cada producto.
- Carrito persistente mediante `localStorage`.
- Modificacion de cantidades y calculo de totales.
- Checkout conectado al endpoint de pedidos.
- Confirmacion con numero de pedido.
- Historial local y seguimiento del estado del pedido.
- Panel administrativo para productos y pedidos.

## Archivos relacionados

- [`public/js/app.js`](../../public/js/app.js)
- [`public/js/seguimiento.js`](../../public/js/seguimiento.js)
- [`public/js/admin.js`](../../public/js/admin.js)
- [`public/seguimiento.html`](../../public/seguimiento.html)
- [`public/admin.html`](../../public/admin.html)
- [`public/css/admin.css`](../../public/css/admin.css)

## Flujos implementados

1. El cliente consulta el menu y agrega productos.
2. El carrito conserva los productos entre paginas.
3. El checkout envia el pedido al servidor.
4. El cliente consulta el avance con su numero y correo.
5. El administrador actualiza productos y estados de pedidos.

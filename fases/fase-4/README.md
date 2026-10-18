# Fase 4: Pruebas, depuracion y refinamiento

## Objetivo

Comprobar el funcionamiento conjunto del cliente, servidor y base de datos, y corregir problemas de calidad y experiencia de uso.

## Entregables

- Pruebas de salud y respuestas HTTP.
- Pruebas de acceso a la tienda y panel administrativo.
- Verificacion de seguridad en rutas administrativas.
- Pruebas unitarias de validadores.
- Recorrido integral de productos, pedidos y cambios de estado.
- Diseno responsive y estados vacios o de error.
- Imagenes reales relacionadas con cada producto.

## Archivos relacionados

- [`test/app.test.js`](../../test/app.test.js)
- [`test/validators.test.js`](../../test/validators.test.js)
- [`scripts/integration-check.js`](../../scripts/integration-check.js)
- [`scripts/update-product-images.js`](../../scripts/update-product-images.js)
- [`scripts/database/update_product_images.sql`](../../scripts/database/update_product_images.sql)

## Comandos de verificacion

```powershell
npm.cmd test
npm.cmd run test:integration
```

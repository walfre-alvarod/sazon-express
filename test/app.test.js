const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("GET /api/health responde correctamente", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
});

test("sirve la tienda y el panel administrativo", async () => {
  const [tienda, admin, seguimiento] = await Promise.all([
    fetch(`${baseUrl}/`),
    fetch(`${baseUrl}/admin`),
    fetch(`${baseUrl}/seguimiento.html`)
  ]);
  assert.equal(tienda.status, 200);
  assert.match(await tienda.text(), /Sazón Express/);
  assert.equal(admin.status, 200);
  assert.match(await admin.text(), /Panel administrativo/);
  assert.equal(seguimiento.status, 200);
  assert.match(await seguimiento.text(), /Cómo va tu pedido/);
});

test("protege las rutas del administrador", async () => {
  const response = await fetch(`${baseUrl}/api/admin/resumen`);
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
});

test("una ruta inexistente devuelve 404", async () => {
  const response = await fetch(`${baseUrl}/api/no-existe`);
  assert.equal(response.status, 404);
});

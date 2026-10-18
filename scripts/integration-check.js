require("dotenv").config();

const pool = require("../src/config/database");

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 3000}/api`;
let productoId;
let pedidoId;
let usuarioId;

async function request(path, options = {}) {
  const response = await fetch(BASE_URL + path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    throw new Error(`${options.method || "GET"} ${path}: ${body.mensaje || response.status}`);
  }
  return body.data;
}

async function limpiar() {
  if (pedidoId) {
    await pool.execute("DELETE FROM detalles_pedido WHERE pedido_id = :pedidoId", { pedidoId });
    await pool.execute("DELETE FROM pedidos WHERE id = :pedidoId", { pedidoId });
  }
  if (usuarioId) {
    await pool.execute("DELETE FROM usuarios WHERE id = :usuarioId", { usuarioId });
  }
  if (productoId) {
    await pool.execute("DELETE FROM productos WHERE id = :productoId", { productoId });
  }
}

async function ejecutar() {
  try {
    const login = await request("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: process.env.ADMIN_EMAIL || "admin@sazonexpress.com",
        password: process.env.ADMIN_PASSWORD || "Admin12345"
      })
    });
    const auth = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${login.token}`
    };

    const catalogo = await request("/productos");
    if (!catalogo.length) throw new Error("El catálogo no tiene productos para probar pedidos.");

    const producto = await request("/admin/productos", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        nombre: "Platillo temporal de prueba",
        descripcion: "Se crea y elimina automáticamente durante la prueba integral.",
        precio: 25,
        categoria: "postres",
        imagen_url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80"
      })
    });
    productoId = producto.id;

    await request(`/admin/productos/${productoId}`, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ ...producto, nombre: "Platillo temporal actualizado" })
    });
    await request(`/admin/productos/${productoId}/disponibilidad`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ activo: 0 })
    });

    const correoPrueba = `prueba-${Date.now()}@example.com`;
    const pedido = await request("/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: {
          nombre: "Cliente de prueba automática",
          correo: correoPrueba,
          telefono: "5555-0000",
          direccion: "Dirección temporal de prueba"
        },
        metodo_pago: "efectivo",
        items: [{ producto_id: catalogo[0].id, cantidad: 2 }]
      })
    });
    pedidoId = pedido.id;
    usuarioId = pedido.usuario_id;

    const detalle = await request(`/admin/pedidos/${pedidoId}`, { headers: auth });
    if (detalle.detalles.length !== 1) throw new Error("El detalle del pedido no coincide.");

    await request(`/admin/pedidos/${pedidoId}/estado`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ estado: "en_preparacion" })
    });

    const seguimiento = await request(
      `/pedidos/seguimiento/${pedidoId}?correo=${encodeURIComponent(correoPrueba)}`
    );
    if (seguimiento.estado !== "en_preparacion") {
      throw new Error("El seguimiento público no refleja el estado actualizado.");
    }

    console.log("Prueba integral completada: login, CRUD, pedido, seguimiento y cambio de estado.");
  } finally {
    await limpiar();
    await pool.end();
  }
}

ejecutar().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

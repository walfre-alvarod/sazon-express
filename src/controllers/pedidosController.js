const pool = require("../config/database");
const httpError = require("../utils/httpError");
const { esEnteroPositivo, validarItems, validarUsuario } = require("../utils/validators");

const COSTO_ENVIO = 15;

async function seguirPedido(req, res, next) {
  try {
    const id = Number(req.params.id);
    const correo = String(req.query.correo || "").trim().toLowerCase();

    if (!esEnteroPositivo(id) || !correo) {
      throw httpError(400, "Ingresa un numero de pedido y correo validos.");
    }

    const [pedidos] = await pool.execute(
      `SELECT p.id, p.fecha, p.fecha_actualizacion, p.total, p.estado, p.metodo_pago,
              u.nombre AS cliente
       FROM pedidos p
       INNER JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.id = :id AND LOWER(u.correo) = :correo
       LIMIT 1`,
      { id, correo }
    );

    if (pedidos.length === 0) {
      throw httpError(404, "No encontramos un pedido con esos datos.");
    }

    const [detalles] = await pool.execute(
      `SELECT pr.nombre, pr.imagen_url, d.cantidad, d.precio_unitario,
              d.cantidad * d.precio_unitario AS subtotal
       FROM detalles_pedido d
       INNER JOIN productos pr ON pr.id = d.producto_id
       WHERE d.pedido_id = :id
       ORDER BY d.id`,
      { id }
    );

    res.json({ ok: true, data: { ...pedidos[0], detalles } });
  } catch (error) {
    next(error);
  }
}

async function listarPedidos(req, res, next) {
  try {
    const [pedidos] = await pool.execute(`
      SELECT
        p.id,
        p.fecha,
        p.total,
        p.estado,
        u.id AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo
      FROM pedidos p
      INNER JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.fecha DESC, p.id DESC
    `);

    res.json({ ok: true, data: pedidos });
  } catch (error) {
    next(error);
  }
}

async function obtenerPedido(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!esEnteroPositivo(id)) {
      throw httpError(400, "El id del pedido debe ser un entero positivo.");
    }

    const [pedidos] = await pool.execute(
      `
        SELECT
          p.id,
          p.fecha,
          p.total,
          p.estado,
          u.id AS usuario_id,
          u.nombre AS usuario_nombre,
          u.correo AS usuario_correo,
          u.telefono AS usuario_telefono,
          u.direccion AS usuario_direccion
        FROM pedidos p
        INNER JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = :id
      `,
      { id }
    );

    if (pedidos.length === 0) {
      throw httpError(404, "Pedido no encontrado.");
    }

    const [detalles] = await pool.execute(
      `
        SELECT
          d.producto_id,
          pr.nombre,
          pr.imagen_url,
          d.cantidad,
          d.precio_unitario,
          d.cantidad * d.precio_unitario AS subtotal
        FROM detalles_pedido d
        INNER JOIN productos pr ON pr.id = d.producto_id
        WHERE d.pedido_id = :id
        ORDER BY d.id ASC
      `,
      { id }
    );

    res.json({
      ok: true,
      data: {
        ...pedidos[0],
        detalles
      }
    });
  } catch (error) {
    next(error);
  }
}

async function crearPedido(req, res, next) {
  const connection = await pool.getConnection();

  try {
    const usuarioId = req.body.usuario_id ? Number(req.body.usuario_id) : null;
    const validacionItems = validarItems(req.body.items);
    const metodoPago = String(req.body.metodo_pago || "efectivo").trim();

    if (!["efectivo", "tarjeta", "transferencia"].includes(metodoPago)) {
      throw httpError(400, "Metodo de pago no valido.");
    }

    if (validacionItems.error) throw httpError(400, validacionItems.error);

    await connection.beginTransaction();

    const usuario_id = usuarioId || (await crearUsuarioParaPedido(connection, req.body.usuario));

    if (!esEnteroPositivo(usuario_id)) {
      throw httpError(400, "Debe enviar usuario_id o datos completos de usuario.");
    }

    const [usuarios] = await connection.execute(
      "SELECT id FROM usuarios WHERE id = :usuario_id",
      { usuario_id }
    );

    if (usuarios.length === 0) {
      throw httpError(404, "Usuario no encontrado.");
    }

    const itemsConPrecio = await obtenerItemsConPrecio(connection, validacionItems.datos);
    const subtotal = itemsConPrecio.reduce(
      (suma, item) => suma + item.cantidad * Number(item.precio),
      0
    );
    const total = subtotal + COSTO_ENVIO;

    const [resultadoPedido] = await connection.execute(
      `INSERT INTO pedidos (usuario_id, total, metodo_pago, estado)
       VALUES (:usuario_id, :total, :metodo_pago, 'pendiente')`,
      { usuario_id, total, metodo_pago: metodoPago }
    );

    const pedido_id = resultadoPedido.insertId;

    for (const item of itemsConPrecio) {
      await connection.execute(
        `
          INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario)
          VALUES (:pedido_id, :producto_id, :cantidad, :precio_unitario)
        `,
        {
          pedido_id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio
        }
      );
    }

    await connection.commit();

    res.status(201).json({
      ok: true,
      mensaje: "Pedido creado correctamente.",
      data: {
        id: pedido_id,
        usuario_id,
        estado: "pendiente",
        metodo_pago: metodoPago,
        subtotal,
        envio: COSTO_ENVIO,
        total,
        detalles: itemsConPrecio
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

async function crearUsuarioParaPedido(connection, usuario) {
  const validacion = validarUsuario(usuario);
  if (validacion.error) return null;

  const { nombre, correo, telefono, direccion } = validacion.datos;

  try {
    const [resultado] = await connection.execute(
      `
        INSERT INTO usuarios (nombre, correo, telefono, direccion)
        VALUES (:nombre, :correo, :telefono, :direccion)
      `,
      { nombre, correo, telefono, direccion }
    );

    return resultado.insertId;
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") throw error;

    const [usuarios] = await connection.execute(
      "SELECT id FROM usuarios WHERE correo = :correo",
      { correo }
    );

    return usuarios[0] && usuarios[0].id;
  }
}

async function obtenerItemsConPrecio(connection, items) {
  const ids = [...new Set(items.map((item) => item.producto_id))];
  const placeholders = ids.map((id) => `:id${id}`).join(", ");
  const params = Object.fromEntries(ids.map((id) => [`id${id}`, id]));

  const [productos] = await connection.execute(
    `
      SELECT id, nombre, precio
      FROM productos
      WHERE activo = 1 AND id IN (${placeholders})
    `,
    params
  );

  if (productos.length !== ids.length) {
    throw httpError(400, "Uno o mas productos no existen.");
  }

  const productosPorId = new Map(productos.map((producto) => [producto.id, producto]));
  const cantidadesPorProducto = new Map();

  for (const item of items) {
    cantidadesPorProducto.set(
      item.producto_id,
      (cantidadesPorProducto.get(item.producto_id) || 0) + item.cantidad
    );
  }

  return [...cantidadesPorProducto.entries()].map(([producto_id, cantidad]) => {
    const producto = productosPorId.get(producto_id);
    return {
      producto_id,
      nombre: producto.nombre,
      cantidad,
      precio: Number(producto.precio)
    };
  });
}

module.exports = {
  listarPedidos,
  obtenerPedido,
  crearPedido,
  seguirPedido
};

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const httpError = require("../utils/httpError");
const { esEnteroPositivo, validarProducto } = require("../utils/validators");

const ESTADOS = ["pendiente", "en_preparacion", "en_camino", "entregado", "cancelado"];

async function iniciarSesion(req, res, next) {
  try {
    const correo = String(req.body.correo || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!correo || !password) throw httpError(400, "Correo y contrasena son obligatorios.");

    const [filas] = await pool.execute(
      `SELECT id, nombre, correo, password_hash
       FROM administradores
       WHERE correo = :correo AND activo = 1
       LIMIT 1`,
      { correo }
    );

    const admin = filas[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      throw httpError(401, "Credenciales incorrectas.");
    }

    const token = jwt.sign(
      { id: admin.id, nombre: admin.nombre, correo: admin.correo },
      process.env.JWT_SECRET || "sazon-express-desarrollo-cambiar",
      { expiresIn: "8h" }
    );

    res.json({
      ok: true,
      data: { token, admin: { id: admin.id, nombre: admin.nombre, correo: admin.correo } }
    });
  } catch (error) {
    next(error);
  }
}

function obtenerSesion(req, res) {
  res.json({ ok: true, data: req.admin });
}

async function obtenerResumen(req, res, next) {
  try {
    const [[resumen]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM productos WHERE activo = 1) AS productos_activos,
        (SELECT COUNT(*) FROM usuarios) AS clientes,
        (SELECT COUNT(*) FROM pedidos WHERE DATE(fecha) = CURDATE()) AS pedidos_hoy,
        (SELECT COALESCE(SUM(total), 0) FROM pedidos WHERE estado <> 'cancelado') AS ventas_totales,
        (SELECT COUNT(*) FROM pedidos WHERE estado = 'pendiente') AS pendientes,
        (SELECT COUNT(*) FROM pedidos WHERE estado = 'en_preparacion') AS en_preparacion,
        (SELECT COUNT(*) FROM pedidos WHERE estado = 'en_camino') AS en_camino,
        (SELECT COUNT(*) FROM pedidos WHERE estado = 'entregado') AS entregados
    `);

    const [recientes] = await pool.query(`
      SELECT p.id, p.fecha, p.total, p.estado, u.nombre AS cliente
      FROM pedidos p
      INNER JOIN usuarios u ON u.id = p.usuario_id
      ORDER BY p.fecha DESC, p.id DESC
      LIMIT 6
    `);

    res.json({ ok: true, data: { resumen, recientes } });
  } catch (error) {
    next(error);
  }
}

async function listarProductosAdmin(req, res, next) {
  try {
    const [productos] = await pool.query(`
      SELECT id, nombre, descripcion, precio, categoria, imagen_url, activo
      FROM productos
      ORDER BY activo DESC, id DESC
    `);
    res.json({ ok: true, data: productos });
  } catch (error) {
    next(error);
  }
}

async function crearProducto(req, res, next) {
  try {
    const validacion = validarProducto(req.body);
    if (validacion.error) throw httpError(400, validacion.error);

    const producto = validacion.datos;
    const [resultado] = await pool.execute(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, activo)
       VALUES (:nombre, :descripcion, :precio, :categoria, :imagen_url, 1)`,
      producto
    );

    res.status(201).json({
      ok: true,
      mensaje: "Platillo agregado correctamente.",
      data: { id: resultado.insertId, ...producto, activo: 1 }
    });
  } catch (error) {
    next(error);
  }
}

async function actualizarProducto(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!esEnteroPositivo(id)) throw httpError(400, "Id de producto no valido.");

    const validacion = validarProducto(req.body);
    if (validacion.error) throw httpError(400, validacion.error);

    const [resultado] = await pool.execute(
      `UPDATE productos
       SET nombre = :nombre, descripcion = :descripcion, precio = :precio,
           categoria = :categoria, imagen_url = :imagen_url
       WHERE id = :id`,
      { ...validacion.datos, id }
    );

    if (resultado.affectedRows === 0) throw httpError(404, "Producto no encontrado.");
    res.json({ ok: true, mensaje: "Platillo actualizado correctamente." });
  } catch (error) {
    next(error);
  }
}

async function cambiarDisponibilidadProducto(req, res, next) {
  try {
    const id = Number(req.params.id);
    const activo = req.body.activo === true || Number(req.body.activo) === 1 ? 1 : 0;
    if (!esEnteroPositivo(id)) throw httpError(400, "Id de producto no valido.");

    const [resultado] = await pool.execute(
      "UPDATE productos SET activo = :activo WHERE id = :id",
      { activo, id }
    );
    if (resultado.affectedRows === 0) throw httpError(404, "Producto no encontrado.");

    res.json({
      ok: true,
      mensaje: activo ? "Platillo reactivado." : "Platillo ocultado del menu."
    });
  } catch (error) {
    next(error);
  }
}

async function listarPedidosAdmin(req, res, next) {
  try {
    const estado = String(req.query.estado || "").trim();
    const buscar = String(req.query.buscar || "").trim();
    const condiciones = [];
    const parametros = {};

    if (estado && estado !== "todos") {
      if (!ESTADOS.includes(estado)) throw httpError(400, "Estado de pedido no valido.");
      condiciones.push("p.estado = :estado");
      parametros.estado = estado;
    }

    if (buscar) {
      condiciones.push("(CAST(p.id AS CHAR) LIKE :buscar OR u.nombre LIKE :buscar OR u.correo LIKE :buscar)");
      parametros.buscar = `%${buscar}%`;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const [pedidos] = await pool.execute(
      `SELECT p.id, p.fecha, p.total, p.estado, p.metodo_pago,
              u.nombre AS cliente, u.correo, u.telefono,
              COALESCE(SUM(d.cantidad), 0) AS articulos
       FROM pedidos p
       INNER JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN detalles_pedido d ON d.pedido_id = p.id
       ${where}
       GROUP BY p.id, p.fecha, p.total, p.estado, p.metodo_pago,
                u.nombre, u.correo, u.telefono
       ORDER BY p.fecha DESC, p.id DESC`,
      parametros
    );

    res.json({ ok: true, data: pedidos });
  } catch (error) {
    next(error);
  }
}

async function obtenerPedidoAdmin(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!esEnteroPositivo(id)) throw httpError(400, "Id de pedido no valido.");

    const [pedidos] = await pool.execute(
      `SELECT p.id, p.fecha, p.total, p.estado, p.metodo_pago,
              u.nombre AS cliente, u.correo, u.telefono, u.direccion
       FROM pedidos p
       INNER JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.id = :id`,
      { id }
    );
    if (pedidos.length === 0) throw httpError(404, "Pedido no encontrado.");

    const [detalles] = await pool.execute(
      `SELECT d.producto_id, pr.nombre, pr.imagen_url, d.cantidad,
              d.precio_unitario, d.cantidad * d.precio_unitario AS subtotal
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

async function actualizarEstadoPedido(req, res, next) {
  try {
    const id = Number(req.params.id);
    const estado = String(req.body.estado || "").trim();
    if (!esEnteroPositivo(id)) throw httpError(400, "Id de pedido no valido.");
    if (!ESTADOS.includes(estado)) throw httpError(400, "Estado de pedido no valido.");

    const [resultado] = await pool.execute(
      "UPDATE pedidos SET estado = :estado WHERE id = :id",
      { estado, id }
    );
    if (resultado.affectedRows === 0) throw httpError(404, "Pedido no encontrado.");

    res.json({ ok: true, mensaje: "Estado del pedido actualizado." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  iniciarSesion,
  obtenerSesion,
  obtenerResumen,
  listarProductosAdmin,
  crearProducto,
  actualizarProducto,
  cambiarDisponibilidadProducto,
  listarPedidosAdmin,
  obtenerPedidoAdmin,
  actualizarEstadoPedido
};

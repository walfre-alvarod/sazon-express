const pool = require("../config/database");
const httpError = require("../utils/httpError");

const CATEGORIAS = ["hamburguesas", "pizzas", "asados", "postres", "bebidas"];

async function listarProductos(req, res, next) {
  try {
    const { categoria } = req.query;
    const params = {};
    let sql = `
      SELECT id, nombre, descripcion, precio, categoria, imagen_url
      FROM productos
      WHERE activo = 1
    `;

    if (categoria) {
      if (!CATEGORIAS.includes(categoria)) {
        throw httpError(400, "Categoria no valida.");
      }
      sql += " AND categoria = :categoria";
      params.categoria = categoria;
    }

    sql += " ORDER BY id ASC";

    const [productos] = await pool.execute(sql, params);
    res.json({ ok: true, data: productos });
  } catch (error) {
    next(error);
  }
}

async function obtenerProducto(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw httpError(400, "El id del producto debe ser un entero positivo.");
    }

    const [productos] = await pool.execute(
      `
        SELECT id, nombre, descripcion, precio, categoria, imagen_url
        FROM productos
        WHERE id = :id AND activo = 1
      `,
      { id }
    );

    if (productos.length === 0) {
      throw httpError(404, "Producto no encontrado.");
    }

    res.json({ ok: true, data: productos[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarProductos,
  obtenerProducto
};

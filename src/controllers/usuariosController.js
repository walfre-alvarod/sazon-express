const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const httpError = require("../utils/httpError");
const { esEnteroPositivo, normalizarTexto, validarRegistro } = require("../utils/validators");

function crearToken(cliente) {
  return jwt.sign(
    { id: cliente.id, nombre: cliente.nombre, correo: cliente.correo, rol: "cliente" },
    process.env.JWT_SECRET || "sazon-express-desarrollo-cambiar",
    { expiresIn: "30d" }
  );
}

function perfilCliente(cliente) {
  return { id: cliente.id, nombre: cliente.nombre, correo: cliente.correo, telefono: cliente.telefono };
}

async function direccionesDe(usuario_id) {
  const [direcciones] = await pool.execute(
    "SELECT id, etiqueta, direccion, predeterminada FROM direcciones WHERE usuario_id = :usuario_id ORDER BY predeterminada DESC, id DESC",
    { usuario_id }
  );
  return direcciones;
}

async function registrarUsuario(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const validacion = validarRegistro(req.body);
    if (validacion.error) throw httpError(400, validacion.error);
    const { nombre, correo, telefono, direccion, password } = validacion.datos;
    const etiqueta = normalizarTexto(req.body.etiqueta) || "Casa";
    const password_hash = await bcrypt.hash(password, 12);

    await connection.beginTransaction();
    const [resultado] = await connection.execute(
      `INSERT INTO usuarios (nombre, correo, telefono, direccion, password_hash)
       VALUES (:nombre, :correo, :telefono, :direccion, :password_hash)`,
      { nombre, correo, telefono, direccion, password_hash }
    );
    const id = resultado.insertId;
    const [direccionResultado] = await connection.execute(
      `INSERT INTO direcciones (usuario_id, etiqueta, direccion, predeterminada)
       VALUES (:usuario_id, :etiqueta, :direccion, 1)`,
      { usuario_id: id, etiqueta, direccion }
    );
    await connection.commit();

    const cliente = { id, nombre, correo, telefono };
    res.status(201).json({
      ok: true,
      mensaje: "Cuenta creada correctamente.",
      data: {
        token: crearToken(cliente), cliente,
        direcciones: [{ id: direccionResultado.insertId, etiqueta, direccion, predeterminada: 1 }]
      }
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return next(httpError(409, "Ya existe una cuenta con ese correo."));
    next(error);
  } finally {
    connection.release();
  }
}

async function iniciarSesion(req, res, next) {
  try {
    const correo = normalizarTexto(req.body.correo).toLowerCase();
    const password = String(req.body.password || "");
    if (!correo || !password) throw httpError(400, "Correo y contrasena son obligatorios.");
    const [filas] = await pool.execute(
      "SELECT id, nombre, correo, telefono, password_hash FROM usuarios WHERE correo = :correo LIMIT 1", { correo }
    );
    const cliente = filas[0];
    if (!cliente || !cliente.password_hash || !(await bcrypt.compare(password, cliente.password_hash))) {
      throw httpError(401, "Correo o contrasena incorrectos.");
    }
    res.json({ ok: true, data: { token: crearToken(cliente), cliente: perfilCliente(cliente), direcciones: await direccionesDe(cliente.id) } });
  } catch (error) { next(error); }
}

async function obtenerPerfil(req, res, next) {
  try {
    const [filas] = await pool.execute(
      "SELECT id, nombre, correo, telefono FROM usuarios WHERE id = :id LIMIT 1", { id: req.cliente.id }
    );
    if (!filas[0]) throw httpError(404, "Cuenta no encontrada.");
    res.json({ ok: true, data: { cliente: perfilCliente(filas[0]), direcciones: await direccionesDe(req.cliente.id) } });
  } catch (error) { next(error); }
}

async function crearDireccion(req, res, next) {
  try {
    const etiqueta = normalizarTexto(req.body.etiqueta) || "Nueva direccion";
    const direccion = normalizarTexto(req.body.direccion);
    if (!direccion) throw httpError(400, "La direccion es obligatoria.");
    const [existentes] = await pool.execute("SELECT COUNT(*) total FROM direcciones WHERE usuario_id = :usuario_id", { usuario_id: req.cliente.id });
    const predeterminada = existentes[0].total === 0 ? 1 : 0;
    const [resultado] = await pool.execute(
      "INSERT INTO direcciones (usuario_id, etiqueta, direccion, predeterminada) VALUES (:usuario_id, :etiqueta, :direccion, :predeterminada)",
      { usuario_id: req.cliente.id, etiqueta, direccion, predeterminada }
    );
    res.status(201).json({ ok: true, data: { id: resultado.insertId, etiqueta, direccion, predeterminada } });
  } catch (error) { next(error); }
}

async function eliminarDireccion(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!esEnteroPositivo(id)) throw httpError(400, "Direccion no valida.");
    const [resultado] = await pool.execute("DELETE FROM direcciones WHERE id = :id AND usuario_id = :usuario_id", { id, usuario_id: req.cliente.id });
    if (!resultado.affectedRows) throw httpError(404, "Direccion no encontrada.");
    res.json({ ok: true, mensaje: "Direccion eliminada." });
  } catch (error) { next(error); }
}

module.exports = { registrarUsuario, iniciarSesion, obtenerPerfil, crearDireccion, eliminarDireccion };

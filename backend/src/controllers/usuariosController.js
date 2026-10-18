const pool = require("../config/database");
const httpError = require("../utils/httpError");
const { validarUsuario } = require("../utils/validators");

async function crearUsuario(req, res, next) {
  try {
    const validacion = validarUsuario(req.body);
    if (validacion.error) throw httpError(400, validacion.error);

    const { nombre, correo, telefono, direccion } = validacion.datos;

    const [resultado] = await pool.execute(
      `
        INSERT INTO usuarios (nombre, correo, telefono, direccion)
        VALUES (:nombre, :correo, :telefono, :direccion)
      `,
      { nombre, correo, telefono, direccion }
    );

    res.status(201).json({
      ok: true,
      mensaje: "Usuario creado correctamente.",
      data: { id: resultado.insertId, nombre, correo, telefono, direccion }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      next(httpError(409, "Ya existe un usuario con ese correo."));
      return;
    }
    next(error);
  }
}

module.exports = {
  crearUsuario
};

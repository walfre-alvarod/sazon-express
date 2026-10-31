const jwt = require("jsonwebtoken");
const httpError = require("../utils/httpError");

function authCliente(req, res, next) {
  const [tipo, token] = String(req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) return next(httpError(401, "Debes iniciar sesion para continuar."));
  try {
    const sesion = jwt.verify(token, process.env.JWT_SECRET || "sazon-express-desarrollo-cambiar");
    if (sesion.rol !== "cliente") throw new Error("Rol no valido");
    req.cliente = sesion;
    next();
  } catch (error) {
    next(httpError(401, "La sesion vencio o no es valida."));
  }
}

module.exports = authCliente;

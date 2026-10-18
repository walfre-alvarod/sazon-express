const jwt = require("jsonwebtoken");
const httpError = require("../utils/httpError");

function authAdmin(req, res, next) {
  const encabezado = req.headers.authorization || "";
  const [tipo, token] = encabezado.split(" ");

  if (tipo !== "Bearer" || !token) {
    next(httpError(401, "Debes iniciar sesion como administrador."));
    return;
  }

  try {
    req.admin = jwt.verify(
      token,
      process.env.JWT_SECRET || "sazon-express-desarrollo-cambiar"
    );
    next();
  } catch (error) {
    next(httpError(401, "La sesion vencio o no es valida."));
  }
}

module.exports = authAdmin;

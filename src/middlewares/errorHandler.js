function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    ok: false,
    mensaje: statusCode >= 500 ? "Error interno del servidor." : error.message
  });
}

module.exports = errorHandler;

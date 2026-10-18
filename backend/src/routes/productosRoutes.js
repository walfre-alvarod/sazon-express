const express = require("express");
const {
  listarProductos,
  obtenerProducto
} = require("../controllers/productosController");

const router = express.Router();

router.get("/", listarProductos);
router.get("/:id", obtenerProducto);

module.exports = router;

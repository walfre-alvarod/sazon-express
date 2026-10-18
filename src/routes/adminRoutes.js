const express = require("express");
const authAdmin = require("../middlewares/authAdmin");
const controller = require("../controllers/adminController");

const router = express.Router();

router.post("/login", controller.iniciarSesion);
router.use(authAdmin);
router.get("/me", controller.obtenerSesion);
router.get("/resumen", controller.obtenerResumen);
router.get("/productos", controller.listarProductosAdmin);
router.post("/productos", controller.crearProducto);
router.put("/productos/:id", controller.actualizarProducto);
router.patch("/productos/:id/disponibilidad", controller.cambiarDisponibilidadProducto);
router.get("/pedidos", controller.listarPedidosAdmin);
router.get("/pedidos/:id", controller.obtenerPedidoAdmin);
router.patch("/pedidos/:id/estado", controller.actualizarEstadoPedido);

module.exports = router;

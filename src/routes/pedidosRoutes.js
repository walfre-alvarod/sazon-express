const express = require("express");
const { crearPedido, seguirPedido } = require("../controllers/pedidosController");

const router = express.Router();

router.get("/seguimiento/:id", seguirPedido);
router.post("/", crearPedido);

module.exports = router;

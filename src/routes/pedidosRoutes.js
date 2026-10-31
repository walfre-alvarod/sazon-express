const express = require("express");
const { crearPedido, seguirPedido } = require("../controllers/pedidosController");
const authCliente = require("../middlewares/authCliente");

const router = express.Router();

router.get("/seguimiento/:id", seguirPedido);
router.post("/", authCliente, crearPedido);

module.exports = router;

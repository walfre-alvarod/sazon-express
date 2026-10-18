const express = require("express");
const { crearUsuario } = require("../controllers/usuariosController");

const router = express.Router();

router.post("/", crearUsuario);

module.exports = router;

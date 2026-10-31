const express = require("express");
const { registrarUsuario, iniciarSesion, obtenerPerfil, crearDireccion, eliminarDireccion } = require("../controllers/usuariosController");
const authCliente = require("../middlewares/authCliente");

const router = express.Router();

router.post("/", registrarUsuario);
router.post("/registro", registrarUsuario);
router.post("/login", iniciarSesion);
router.get("/perfil", authCliente, obtenerPerfil);
router.post("/direcciones", authCliente, crearDireccion);
router.delete("/direcciones/:id", authCliente, eliminarDireccion);

module.exports = router;

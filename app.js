const express = require("express");
const cors = require("cors");
const path = require("path");
const productosRoutes = require("./src/routes/productosRoutes");
const usuariosRoutes = require("./src/routes/usuariosRoutes");
const pedidosRoutes = require("./src/routes/pedidosRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const notFound = require("./src/middlewares/notFound");
const errorHandler = require("./src/middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mensaje: "API de Sazon Express funcionando." });
});

app.use("/api/productos", productosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/admin", adminRoutes);

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.get("/admin", (req, res) => res.sendFile(path.join(publicPath, "admin.html")));
app.get("/", (req, res) => res.sendFile(path.join(publicPath, "index.html")));

app.use(notFound);
app.use(errorHandler);

module.exports = app;

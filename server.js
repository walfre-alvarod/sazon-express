require("dotenv").config();

const app = require("./app");
const pool = require("./src/config/database");
const ejecutarMigraciones = require("./src/config/migrate");

const PORT = Number(process.env.PORT || 3000);

async function iniciarServidor() {
  try {
    await pool.query("SELECT 1");
    await ejecutarMigraciones();

    app.listen(PORT, () => {
      console.log(`API de Sazon Express disponible en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo conectar a MySQL. Revisa las variables de .env.");
    console.error(error.message);
    process.exit(1);
  }
}

iniciarServidor();

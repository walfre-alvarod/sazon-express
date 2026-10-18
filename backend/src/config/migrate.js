const bcrypt = require("bcryptjs");
const pool = require("./database");

async function columnaExiste(tabla, columna) {
  const [filas] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tabla AND COLUMN_NAME = :columna`,
    { tabla, columna }
  );
  return filas[0].total > 0;
}

async function ejecutarMigraciones() {
  if (!(await columnaExiste("productos", "activo"))) {
    await pool.query(
      "ALTER TABLE productos ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER imagen_url"
    );
  }

  if (!(await columnaExiste("pedidos", "metodo_pago"))) {
    await pool.query(
      "ALTER TABLE pedidos ADD COLUMN metodo_pago ENUM('efectivo', 'tarjeta', 'transferencia') NOT NULL DEFAULT 'efectivo' AFTER total"
    );
  }

  if (!(await columnaExiste("pedidos", "fecha_actualizacion"))) {
    await pool.query(
      "ALTER TABLE pedidos ADD COLUMN fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER fecha"
    );
  }

  await pool.query(
    "ALTER TABLE pedidos MODIFY estado ENUM('pendiente', 'en_preparacion', 'en_camino', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente'"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS administradores (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      nombre VARCHAR(100) NOT NULL,
      correo VARCHAR(150) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      activo TINYINT(1) NOT NULL DEFAULT 1,
      fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT pk_administradores PRIMARY KEY (id),
      CONSTRAINT uq_administradores_correo UNIQUE (correo)
    ) ENGINE = InnoDB
      DEFAULT CHARSET = utf8mb4
      COLLATE = utf8mb4_unicode_ci
  `);

  const correo = (process.env.ADMIN_EMAIL || "admin@sazonexpress.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin12345";
  const nombre = (process.env.ADMIN_NAME || "Administrador").trim();
  const [administradores] = await pool.execute(
    "SELECT id FROM administradores WHERE correo = :correo LIMIT 1",
    { correo }
  );

  if (administradores.length === 0) {
    const password_hash = await bcrypt.hash(password, 12);
    await pool.execute(
      `INSERT INTO administradores (nombre, correo, password_hash)
       VALUES (:nombre, :correo, :password_hash)`,
      { nombre, correo, password_hash }
    );
    console.log(`Administrador inicial creado: ${correo}`);
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    console.warn("Aviso: configura ADMIN_PASSWORD y JWT_SECRET en .env antes de publicar el sistema.");
  }
}

module.exports = ejecutarMigraciones;

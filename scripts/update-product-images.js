require("dotenv").config();

const pool = require("../src/config/database");

const imagenes = [
  [1, "https://images.pexels.com/photos/6045440/pexels-photo-6045440.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [2, "https://images.pexels.com/photos/20264649/pexels-photo-20264649.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [3, "https://images.pexels.com/photos/7962694/pexels-photo-7962694.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [4, "https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [5, "https://images.pexels.com/photos/4109083/pexels-photo-4109083.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [6, "https://images.pexels.com/photos/32538759/pexels-photo-32538759.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [7, "https://images.pexels.com/photos/9397764/pexels-photo-9397764.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [8, "https://images.pexels.com/photos/7462565/pexels-photo-7462565.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [9, "https://images.pexels.com/photos/28377753/pexels-photo-28377753.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [10, "https://images.pexels.com/photos/5472299/pexels-photo-5472299.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [11, "https://images.pexels.com/photos/34567561/pexels-photo-34567561.jpeg?auto=compress&cs=tinysrgb&w=1200"],
  [12, "https://images.pexels.com/photos/6209634/pexels-photo-6209634.jpeg?auto=compress&cs=tinysrgb&w=1200"]
];

async function actualizarImagenes() {
  for (const [id, imagenUrl] of imagenes) {
    await pool.execute(
      "UPDATE productos SET imagen_url = ? WHERE id = ?",
      [imagenUrl, id]
    );
  }

  const [productos] = await pool.query(
    "SELECT id, nombre, imagen_url FROM productos ORDER BY id"
  );

  console.table(productos);
}

actualizarImagenes()
  .catch((error) => {
    console.error("No se pudieron actualizar las imágenes:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

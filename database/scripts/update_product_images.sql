USE pedidos_db;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/6045440/pexels-photo-6045440.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 1;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/20264649/pexels-photo-20264649.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 2;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/7962694/pexels-photo-7962694.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 3;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/14590497/pexels-photo-14590497.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 4;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/4109083/pexels-photo-4109083.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 5;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/32538759/pexels-photo-32538759.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 6;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/9397764/pexels-photo-9397764.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 7;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/7462565/pexels-photo-7462565.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 8;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/28377753/pexels-photo-28377753.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 9;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/5472299/pexels-photo-5472299.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 10;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/34567561/pexels-photo-34567561.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 11;

UPDATE productos SET imagen_url = 'https://images.pexels.com/photos/6209634/pexels-photo-6209634.jpeg?auto=compress&cs=tinysrgb&w=1200'
WHERE id = 12;

SELECT id, nombre, imagen_url FROM productos ORDER BY id;

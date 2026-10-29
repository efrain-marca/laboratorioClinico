const { query } = require('../config/db');

async function listar() {
  return query('SELECT * FROM inventario_quimicos ORDER BY nombre');
}

async function crear(data) {
  const result = await query(`INSERT INTO inventario_quimicos
    (nombre, descripcion, unidad, stock_actual, stock_minimo) VALUES (?, ?, ?, ?, ?)`,
  [data.nombre, data.descripcion || null, data.unidad, data.stock_actual, data.stock_minimo]);
  const id = Number(result.insertId);
  const codigo = `QUI-${String(id).padStart(6, '0')}`;
  await query('UPDATE inventario_quimicos SET codigo=? WHERE id=?', [codigo, id]);
  return obtener(id);
}

async function obtener(id) {
  const rows = await query('SELECT * FROM inventario_quimicos WHERE id=? LIMIT 1', [id]);
  return rows[0] || null;
}

async function actualizar(id, data) {
  const result = await query(`UPDATE inventario_quimicos SET nombre=?, descripcion=?, unidad=?,
    stock_actual=?, stock_minimo=?, activo=? WHERE id=?`,
  [data.nombre, data.descripcion || null, data.unidad, data.stock_actual, data.stock_minimo, data.activo ? 1 : 0, id]);
  return Number(result.affectedRows) > 0 ? obtener(id) : null;
}

async function eliminar(id) {
  const result = await query('DELETE FROM inventario_quimicos WHERE id=?', [id]);
  return Number(result.affectedRows) > 0;
}

module.exports = { listar, crear, obtener, actualizar, eliminar };
const { query } = require('../config/db');
const TABLE = 'personas';
const FIELDS = ["ci", "nombres", "apellidos", "fecha_nacimiento", "sexo", "telefono", "email", "direccion"];

async function listar() {
  return query('SELECT * FROM ' + TABLE + ' ORDER BY id DESC');
}
async function obtener(id) {
  const rows = await query('SELECT * FROM ' + TABLE + ' WHERE id = ?', [id]);
  return rows[0] || null;
}
async function crear(data) {
  const values = FIELDS.map((field) => data[field] ?? null);
  const result = await query(
    'INSERT INTO ' + TABLE + ' (ci, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    values
  );
  return obtener(Number(result.insertId));
}
async function actualizar(id, data) {
  const values = FIELDS.map((field) => data[field] ?? null);
  await query('UPDATE ' + TABLE + ' SET ci = ?, nombres = ?, apellidos = ?, fecha_nacimiento = ?, sexo = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?', [...values, id]);
  return obtener(id);
}
async function eliminar(id) {
  const result = await query('DELETE FROM ' + TABLE + ' WHERE id = ?', [id]);
  return Number(result.affectedRows) > 0;
}
module.exports = { listar, obtener, crear, actualizar, eliminar };

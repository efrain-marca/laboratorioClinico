const { pool } = require('../config/db');

async function listar() {
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(
      `SELECT u.id, u.usuario, u.nombre_completo, u.rol, u.activo, u.creado_en, p.vista
       FROM usuarios u LEFT JOIN usuario_permisos p ON p.usuario_id = u.id
       ORDER BY u.nombre_completo, p.vista`
    );
    const users = new Map();
    for (const row of rows) {
      if (!users.has(row.id)) {
        users.set(row.id, {
          id: row.id,
          usuario: row.usuario,
          nombre_completo: row.nombre_completo,
          rol: row.rol,
          activo: Boolean(row.activo),
          creado_en: row.creado_en,
          permisos: []
        });
      }
      if (row.vista) users.get(row.id).permisos.push(row.vista);
    }
    return [...users.values()];
  } finally {
    conn.release();
  }
}

async function crear({ usuario, passwordHash, nombreCompleto, rol, permisos }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await conn.query(
      'INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol) VALUES (?, ?, ?, ?)',
      [usuario, passwordHash, nombreCompleto, rol]
    );
    for (const vista of permisos) {
      await conn.query('INSERT INTO usuario_permisos (usuario_id, vista) VALUES (?, ?)', [result.insertId, vista]);
    }
    await conn.commit();
    return { id: Number(result.insertId) };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function actualizar(id, { usuario, passwordHash, nombreCompleto, rol, permisos }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const fields = ['usuario = ?', 'nombre_completo = ?', 'rol = ?'];
    const params = [usuario, nombreCompleto, rol];
    if (passwordHash) {
      fields.push('password_hash = ?');
      params.push(passwordHash);
    }
    params.push(id);
    await conn.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, params);
    await conn.query('DELETE FROM usuario_permisos WHERE usuario_id = ?', [id]);
    for (const vista of permisos) {
      await conn.query('INSERT INTO usuario_permisos (usuario_id, vista) VALUES (?, ?)', [id, vista]);
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function cambiarEstado(id, activo) {
  const result = await pool.query(
    "UPDATE usuarios SET activo = ? WHERE id = ? AND rol <> 'administrador'",
    [activo ? 1 : 0, id]
  );
  return result.affectedRows > 0;
}

async function obtener(id) {
  const rows = await pool.query('SELECT id, rol FROM usuarios WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function eliminar(id) {
  const result = await pool.query("DELETE FROM usuarios WHERE id = ? AND rol <> 'administrador'", [id]);
  return result.affectedRows > 0;
}

module.exports = { listar, crear, actualizar, cambiarEstado, obtener, eliminar };
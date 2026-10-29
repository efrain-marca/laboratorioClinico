const { query } = require('../config/db');

async function tienePermiso(usuarioId, vista) {
  const rows = await query(
    'SELECT 1 FROM usuario_permisos WHERE usuario_id = ? AND vista = ? LIMIT 1',
    [usuarioId, vista]
  );
  return rows.length > 0;
}

async function permisosPorUsuario(usuarioId) {
  const rows = await query(
    'SELECT vista FROM usuario_permisos WHERE usuario_id = ? ORDER BY vista',
    [usuarioId]
  );
  return rows.map(row => row.vista);
}

async function usuarioActivo(usuarioId) {
  const rows = await query('SELECT activo FROM usuarios WHERE id = ? LIMIT 1', [usuarioId]);
  return Boolean(rows[0]?.activo);
}
async function buscarPorUsuario(usuario) {
  const rows = await query(
    'SELECT id, usuario, password_hash, nombre_completo, rol, activo FROM usuarios WHERE usuario = ? LIMIT 1',
    [usuario]
  );
  return rows[0] || null;
}

async function crear({ usuario, passwordHash, nombreCompleto, rol = 'administrador' }) {
  const result = await query(
    'INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol) VALUES (?, ?, ?, ?)',
    [usuario, passwordHash, nombreCompleto, rol]
  );
  return { id: Number(result.insertId), usuario, nombre_completo: nombreCompleto, rol };
}

module.exports = { buscarPorUsuario, crear, tienePermiso, permisosPorUsuario, usuarioActivo };

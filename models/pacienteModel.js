const { query, pool } = require('../config/db');

async function listar() {
  return query(`SELECT pa.id, pa.persona_id, pa.codigo_paciente, pa.observaciones, pa.creado_en,
    pe.ci, pe.nombres, pe.apellidos, pe.telefono, pe.email
    FROM pacientes pa JOIN personas pe ON pe.id = pa.persona_id ORDER BY pa.id DESC`);
}
async function obtener(id) {
  const rows = await query('SELECT * FROM pacientes WHERE id = ?', [id]);
  return rows[0] || null;
}
async function crear(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await conn.query(`INSERT INTO pacientes (persona_id, codigo_paciente, observaciones)
      VALUES (?, CONCAT('TMP-', UUID_SHORT()), ?)`, [data.persona_id, data.observaciones || null]);
    const id = Number(result.insertId), codigo = `PAC-${String(id).padStart(6, '0')}`;
    await conn.query('UPDATE pacientes SET codigo_paciente=? WHERE id=?', [codigo, id]);
    await conn.commit();
    const rows = await conn.query('SELECT * FROM pacientes WHERE id=?', [id]);
    return rows[0];
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}
async function actualizar(id, data) {
  await query('UPDATE pacientes SET persona_id = ?, observaciones = ? WHERE id = ?',
    [data.persona_id, data.observaciones || null, id]);
  return obtener(id);
}
async function eliminar(id) {
  const result = await query('DELETE FROM pacientes WHERE id = ?', [id]);
  return Number(result.affectedRows) > 0;
}
async function personasDisponibles(pacienteId = null, term = '') {
  const filter = term ? ` AND (p.ci LIKE ? OR p.nombres LIKE ? OR p.apellidos LIKE ?
    OR CONCAT(p.nombres,' ',p.apellidos) LIKE ? OR CONCAT(p.apellidos,' ',p.nombres) LIKE ?)` : '';
  const search = `%${term}%`;
  return query(`SELECT p.id, p.ci, p.nombres, p.apellidos, p.telefono, p.email FROM personas p
    LEFT JOIN pacientes pa ON pa.persona_id = p.id WHERE (pa.id IS NULL OR pa.id=?)${filter}
    ORDER BY p.apellidos, p.nombres LIMIT 30`, term
    ? [pacienteId, search, search, search, search, search]
    : [pacienteId]);
}
async function historial(id) {
  const paciente = await query(`SELECT pa.*, pe.ci, pe.nombres, pe.apellidos, pe.fecha_nacimiento,
    pe.sexo, pe.telefono, pe.email, pe.direccion FROM pacientes pa
    JOIN personas pe ON pe.id=pa.persona_id WHERE pa.id=?`, [id]);
  if (!paciente[0]) return null;
  const solicitudes = await query(`SELECT s.id, s.codigo, s.fecha_solicitud, s.estado,
    COALESCE((SELECT SUM(sd.precio) FROM solicitud_detalles sd WHERE sd.solicitud_id=s.id),0) AS total,
    COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.solicitud_id=s.id),0) AS pagado
    FROM solicitudes s WHERE s.paciente_id=? ORDER BY s.fecha_solicitud DESC`, [id]);
  const resultados = await query(`SELECT s.codigo AS solicitud, COALESCE(sd.nombre_analisis,a.nombre) AS analisis, r.valor, r.unidad,
    r.referencia, r.interpretacion, r.fecha_resultado, r.validado
    FROM resultados r JOIN solicitud_detalles sd ON sd.id=r.solicitud_detalle_id
    JOIN solicitudes s ON s.id=sd.solicitud_id JOIN analisis a ON a.id=sd.analisis_id
    WHERE s.paciente_id=? ORDER BY r.fecha_resultado DESC`, [id]);
  const pagos = await query(`SELECT pg.fecha_pago, s.codigo AS solicitud, pg.monto, pg.metodo, pg.referencia
    FROM pagos pg JOIN solicitudes s ON s.id=pg.solicitud_id WHERE s.paciente_id=?
    ORDER BY pg.fecha_pago DESC`, [id]);
  return { paciente: paciente[0], solicitudes, resultados, pagos };
}
module.exports = { listar, obtener, crear, actualizar, eliminar, personasDisponibles, historial };

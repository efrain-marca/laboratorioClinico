const { query, pool } = require('../config/db');

async function listar() {
  return query(`SELECT s.*, pa.codigo_paciente, CONCAT(pe.nombres, ' ', pe.apellidos) AS paciente,
    COALESCE((SELECT SUM(sd.precio) FROM solicitud_detalles sd WHERE sd.solicitud_id=s.id),0) AS total,
    COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.solicitud_id=s.id),0) AS pagado
    FROM solicitudes s JOIN pacientes pa ON pa.id=s.paciente_id
    JOIN personas pe ON pe.id=pa.persona_id ORDER BY s.id DESC`);
}
async function obtener(id) {
  const rows = await query(`SELECT s.*, pa.codigo_paciente, pe.ci,
    CONCAT(pe.nombres, ' ', pe.apellidos) AS paciente
    FROM solicitudes s JOIN pacientes pa ON pa.id=s.paciente_id
    JOIN personas pe ON pe.id=pa.persona_id WHERE s.id=?`, [id]);
  if (!rows[0]) return null;
  rows[0].detalles = await query(`SELECT sd.id, sd.solicitud_id, sd.analisis_id, sd.precio,
    COALESCE(sd.codigo_analisis,a.codigo) AS codigo_analisis,
    COALESCE(sd.nombre_analisis,a.nombre) AS analisis, COALESCE(sd.descripcion_analisis,a.descripcion) AS descripcion_analisis
    FROM solicitud_detalles sd JOIN analisis a ON a.id=sd.analisis_id WHERE sd.solicitud_id=?`, [id]);
  return rows[0];
}
async function crear(data, usuarioId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const codigo = data.codigo || `SOL-${Date.now()}`;
    const result = await conn.query(
      'INSERT INTO solicitudes (codigo, paciente_id, estado, observaciones, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [codigo, data.paciente_id, data.estado || 'Pendiente', data.observaciones || null, usuarioId]
    );
    const id = Number(result.insertId);
    for (const analisisId of data.analisis_ids) {
      const rows = await conn.query('SELECT id, codigo, nombre, descripcion, precio FROM analisis WHERE id=? AND activo=1', [analisisId]);
      if (!rows[0]) throw new Error(`El análisis ${analisisId} no existe o está inactivo.`);
      await conn.query(`INSERT INTO solicitud_detalles
        (solicitud_id, analisis_id, codigo_analisis, nombre_analisis, descripcion_analisis, precio)
        VALUES (?, ?, ?, ?, ?, ?)`, [id, analisisId, rows[0].codigo, rows[0].nombre, rows[0].descripcion, rows[0].precio]);
    }
    await conn.commit();
    return obtener(id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally { conn.release(); }
}
async function actualizarEstado(id, estado) {
  if (estado === 'Completada') return null;
  let result;
  if (estado === 'En proceso') {
    result = await query("UPDATE solicitudes SET estado=? WHERE id=? AND estado='Pendiente'", [estado, id]);
  } else if (estado === 'Cancelada') {
    result = await query(`UPDATE solicitudes SET estado=? WHERE id=? AND estado IN ('Pendiente','En proceso')
      AND NOT EXISTS (SELECT 1 FROM pagos WHERE solicitud_id=?)
      AND NOT EXISTS (SELECT 1 FROM solicitud_detalles sd JOIN resultados r ON r.solicitud_detalle_id=sd.id WHERE sd.solicitud_id=?)`, [estado, id, id, id]);
  } else return null;
  return Number(result.affectedRows) > 0 ? obtener(id) : null;
}
async function actualizar(id, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const rows = await conn.query(`SELECT s.estado,
      EXISTS(SELECT 1 FROM pagos p WHERE p.solicitud_id=s.id) AS tiene_pagos,
      EXISTS(SELECT 1 FROM solicitud_detalles sd JOIN resultados r ON r.solicitud_detalle_id=sd.id WHERE sd.solicitud_id=s.id) AS tiene_resultados
      FROM solicitudes s WHERE s.id=? FOR UPDATE`, [id]);
    if (!rows[0]) {
      const error = new Error('Solicitud no encontrada.');
      error.code = 'SOLICITUD_NO_ENCONTRADA';
      throw error;
    }
    if (rows[0].estado !== 'Pendiente' || rows[0].tiene_pagos || rows[0].tiene_resultados) {
      const error = new Error('Solo pueden modificarse solicitudes pendientes sin pagos ni resultados.');
      error.code = 'SOLICITUD_NO_EDITABLE';
      throw error;
    }
    const actuales = await conn.query('SELECT * FROM solicitud_detalles WHERE solicitud_id=?', [id]);
    const previos = new Map(actuales.map(item => [Number(item.analisis_id), item]));
    await conn.query('UPDATE solicitudes SET paciente_id=?, observaciones=? WHERE id=?',
      [data.paciente_id, data.observaciones || null, id]);
    await conn.query('DELETE FROM solicitud_detalles WHERE solicitud_id=?', [id]);
    for (const analisisId of data.analisis_ids) {
      const rowsAnalisis = await conn.query('SELECT id, precio, activo FROM analisis WHERE id=?', [analisisId]);
      const analisis = rowsAnalisis[0];
      if (!analisis || (!Number(analisis.activo) && !previos.has(analisisId))) {
        const error = new Error(`El análisis ${analisisId} no existe o está inactivo.`);
        error.code = 'ANALISIS_NO_DISPONIBLE';
        throw error;
      }
      const anterior=previos.get(analisisId);
      const snapshot=anterior||analisis;
      await conn.query(`INSERT INTO solicitud_detalles
        (solicitud_id, analisis_id, codigo_analisis, nombre_analisis, descripcion_analisis, precio)
        VALUES (?, ?, ?, ?, ?, ?)`, [id, analisisId, snapshot.codigo_analisis||snapshot.codigo,
        snapshot.nombre_analisis||snapshot.nombre, snapshot.descripcion_analisis??snapshot.descripcion, snapshot.precio]);
    }
    await conn.commit();
    return obtener(id);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}
async function eliminar(id) {
  const result = await query('DELETE FROM solicitudes WHERE id=?', [id]);
  return Number(result.affectedRows) > 0;
}
async function opciones(solicitudId = null) {
  const pacientes = solicitudId
    ? await query(`SELECT pa.id, pa.codigo_paciente, pe.ci, pe.telefono, pe.email,
        CONCAT(pe.nombres, ' ', pe.apellidos) AS nombre FROM pacientes pa
        JOIN personas pe ON pe.id=pa.persona_id WHERE pa.id=(SELECT paciente_id FROM solicitudes WHERE id=?)`, [solicitudId])
    : [];
  const analisis = await query(`SELECT id, codigo, nombre, precio FROM analisis
    WHERE activo=1 OR id IN (SELECT analisis_id FROM solicitud_detalles WHERE solicitud_id=?) ORDER BY nombre`, [solicitudId]);
  return { pacientes, analisis };
}
async function buscarPacientes(term) {
  const search=`%${term}%`;
  return query(`SELECT pa.id, pa.codigo_paciente, pe.ci, pe.telefono, pe.email,
    CONCAT(pe.nombres, ' ', pe.apellidos) AS nombre FROM pacientes pa
    JOIN personas pe ON pe.id=pa.persona_id
    WHERE pe.ci LIKE ? OR pe.nombres LIKE ? OR pe.apellidos LIKE ?
      OR CONCAT(pe.nombres,' ',pe.apellidos) LIKE ? OR CONCAT(pe.apellidos,' ',pe.nombres) LIKE ?
    ORDER BY pe.apellidos, pe.nombres LIMIT 30`, [search,search,search,search,search]);
}
module.exports = { listar, obtener, crear, actualizar, actualizarEstado, eliminar, opciones, buscarPacientes };

const { query } = require('../config/db');
async function listar() {
  return query(`SELECT pg.*, s.codigo AS solicitud, CONCAT(pe.nombres, ' ', pe.apellidos) AS paciente,
    CASE
      WHEN (SELECT COALESCE(SUM(p2.monto),0) FROM pagos p2 WHERE p2.solicitud_id=s.id) >=
        (SELECT COALESCE(SUM(sd.precio),0) FROM solicitud_detalles sd WHERE sd.solicitud_id=s.id) THEN 'Pagado'
      WHEN (SELECT COALESCE(SUM(p2.monto),0) FROM pagos p2 WHERE p2.solicitud_id=s.id) > 0 THEN 'Parcial'
      ELSE 'Pendiente'
    END AS estado_pago,
    u.nombre_completo AS registrado_por
    FROM pagos pg JOIN solicitudes s ON s.id=pg.solicitud_id
    JOIN pacientes pa ON pa.id=s.paciente_id JOIN personas pe ON pe.id=pa.persona_id
    LEFT JOIN usuarios u ON u.id=pg.usuario_id ORDER BY pg.id DESC`);
}
async function crear(data, usuarioId) {
  const result = await query('INSERT INTO pagos (solicitud_id, monto, metodo, referencia, usuario_id) VALUES (?, ?, ?, ?, ?)',
    [data.solicitud_id, data.monto, data.metodo, data.referencia || null, usuarioId]);
  const rows = await query('SELECT * FROM pagos WHERE id=?', [Number(result.insertId)]);
  return rows[0];
}
async function eliminar(id) {
  const result = await query('DELETE FROM pagos WHERE id=?', [id]);
  return Number(result.affectedRows) > 0;
}
async function saldoSolicitud(id) {
  const rows=await query(`SELECT s.id,
    (SELECT COALESCE(SUM(sd.precio),0) FROM solicitud_detalles sd WHERE sd.solicitud_id=s.id) -
    (SELECT COALESCE(SUM(pg.monto),0) FROM pagos pg WHERE pg.solicitud_id=s.id) AS saldo
    FROM solicitudes s WHERE s.id=? AND s.estado<>'Cancelada'`, [id]);
  return rows[0]||null;
}
async function solicitudesConSaldo(term = '') {
  const filter=term?` AND (pe.ci LIKE ? OR pe.nombres LIKE ? OR pe.apellidos LIKE ?
    OR CONCAT(pe.nombres,' ',pe.apellidos) LIKE ? OR CONCAT(pe.apellidos,' ',pe.nombres) LIKE ?)`:'';
  const search=`%${term}%`;
  return query(`SELECT s.id, s.codigo, pa.codigo_paciente, pe.ci, pe.telefono, pe.email,
    CONCAT(pe.nombres, ' ', pe.apellidos) AS paciente,
    (SELECT COALESCE(SUM(sd.precio),0) FROM solicitud_detalles sd WHERE sd.solicitud_id=s.id) -
    (SELECT COALESCE(SUM(pg.monto),0) FROM pagos pg WHERE pg.solicitud_id=s.id) AS saldo
    FROM solicitudes s JOIN pacientes pa ON pa.id=s.paciente_id JOIN personas pe ON pe.id=pa.persona_id
    WHERE s.estado <> 'Cancelada'${filter} HAVING saldo > 0 ORDER BY s.id DESC LIMIT 50`,
  term?[search,search,search,search,search]:[]);
}
module.exports = { listar, crear, eliminar, saldoSolicitud, solicitudesConSaldo };

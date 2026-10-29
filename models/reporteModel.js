const { query } = require('../config/db');
async function resumen() {
  const rows = await query(`SELECT
    (SELECT COUNT(*) FROM personas) AS personas,
    (SELECT COUNT(*) FROM pacientes) AS pacientes,
    (SELECT COUNT(*) FROM analisis WHERE activo=1) AS analisis_activos,
    (SELECT COUNT(*) FROM solicitudes WHERE estado='Pendiente') AS solicitudes_pendientes,
    (SELECT COUNT(*) FROM solicitudes WHERE estado='En proceso') AS solicitudes_en_proceso,
    (SELECT COUNT(*) FROM solicitudes WHERE estado='Completada') AS solicitudes_completadas,
    (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE DATE(fecha_pago)=CURDATE()) AS ingresos_hoy`);
  return rows[0];
}
async function ingresosPorMes() {
  return query(`SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes, SUM(monto) AS total
    FROM pagos WHERE fecha_pago >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
    GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m') ORDER BY mes`);
}
async function periodo(desde, hasta) {
  const [rows, analisis, ingresos] = await Promise.all([
    query(`SELECT
      (SELECT COUNT(*) FROM personas WHERE DATE(creado_en) BETWEEN ? AND ?) AS personas,
      (SELECT COUNT(*) FROM pacientes WHERE DATE(creado_en) BETWEEN ? AND ?) AS pacientes,
      (SELECT COUNT(*) FROM solicitudes WHERE DATE(fecha_solicitud) BETWEEN ? AND ?) AS solicitudes,
      (SELECT COUNT(*) FROM solicitudes WHERE estado='Completada' AND DATE(fecha_solicitud) BETWEEN ? AND ?) AS solicitudes_realizadas,
      (SELECT COUNT(*) FROM resultados WHERE DATE(fecha_resultado) BETWEEN ? AND ?) AS resultados,
      (SELECT COUNT(*) FROM pagos WHERE DATE(fecha_pago) BETWEEN ? AND ?) AS pagos,
      (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE DATE(fecha_pago) BETWEEN ? AND ?) AS ingresos`,
    [desde,hasta,desde,hasta,desde,hasta,desde,hasta,desde,hasta,desde,hasta,desde,hasta]),
    query(`SELECT COALESCE(sd.codigo_analisis,a.codigo) AS codigo,
      COALESCE(sd.nombre_analisis,a.nombre) AS nombre, COUNT(sd.id) AS solicitados,
      SUM(CASE WHEN r.validado=1 THEN 1 ELSE 0 END) AS realizados
      FROM solicitud_detalles sd JOIN solicitudes s ON s.id=sd.solicitud_id
      JOIN analisis a ON a.id=sd.analisis_id LEFT JOIN resultados r ON r.solicitud_detalle_id=sd.id
      WHERE DATE(s.fecha_solicitud) BETWEEN ? AND ?
      GROUP BY COALESCE(sd.codigo_analisis,a.codigo), COALESCE(sd.nombre_analisis,a.nombre)
      ORDER BY solicitados DESC, nombre`, [desde,hasta]),
    query(`SELECT DATE_FORMAT(fecha_pago,'%Y-%m') AS mes, SUM(monto) AS total
      FROM pagos WHERE DATE(fecha_pago) BETWEEN ? AND ? GROUP BY DATE_FORMAT(fecha_pago,'%Y-%m') ORDER BY mes`, [desde,hasta])
  ]);
  return { resumen: rows[0], analisis, ingresos };
}
async function buscarPacientes(term) {
  const search=`%${term}%`;
  return query(`SELECT pa.id, pa.codigo_paciente, pe.ci, pe.nombres, pe.apellidos,
    pe.fecha_nacimiento, pe.sexo, pe.telefono, pe.email, pe.direccion
    FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id
    WHERE pe.ci LIKE ? OR pe.nombres LIKE ? OR pe.apellidos LIKE ?
      OR CONCAT(pe.nombres,' ',pe.apellidos) LIKE ? OR CONCAT(pe.apellidos,' ',pe.nombres) LIKE ?
    ORDER BY pe.apellidos, pe.nombres LIMIT 30`, [search,search,search,search,search]);
}
async function catalogo() {
  return query(`SELECT codigo,nombre,descripcion,precio,tiempo_entrega_horas,activo,creado_en
    FROM analisis ORDER BY nombre`);
}
async function solicitudes(desde,hasta) {
  return query(`SELECT s.codigo,s.fecha_solicitud,s.estado,pa.codigo_paciente,pe.ci,
    CONCAT(pe.nombres,' ',pe.apellidos) AS paciente,
    GROUP_CONCAT(COALESCE(sd.nombre_analisis,a.nombre) ORDER BY sd.id SEPARATOR ', ') AS analisis,
    COALESCE((SELECT SUM(sd2.precio) FROM solicitud_detalles sd2 WHERE sd2.solicitud_id=s.id),0) AS total,
    COALESCE((SELECT SUM(pg.monto) FROM pagos pg WHERE pg.solicitud_id=s.id),0) AS pagado
    FROM solicitudes s JOIN pacientes pa ON pa.id=s.paciente_id JOIN personas pe ON pe.id=pa.persona_id
    LEFT JOIN solicitud_detalles sd ON sd.solicitud_id=s.id LEFT JOIN analisis a ON a.id=sd.analisis_id
    WHERE DATE(s.fecha_solicitud) BETWEEN ? AND ?
    GROUP BY s.id,s.codigo,s.fecha_solicitud,s.estado,pa.codigo_paciente,pe.ci,pe.nombres,pe.apellidos
    ORDER BY s.fecha_solicitud DESC,s.id DESC`,[desde,hasta]);
}
async function usuarios() {
  return query(`SELECT u.usuario,u.nombre_completo,u.rol,u.activo,u.creado_en,
    GROUP_CONCAT(up.vista ORDER BY up.vista SEPARATOR ', ') AS vistas
    FROM usuarios u LEFT JOIN usuario_permisos up ON up.usuario_id=u.id
    GROUP BY u.id,u.usuario,u.nombre_completo,u.rol,u.activo,u.creado_en
    ORDER BY u.nombre_completo`);
}
module.exports = { resumen, ingresosPorMes, periodo, buscarPacientes, catalogo, solicitudes, usuarios };

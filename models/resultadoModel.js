const { query, pool } = require('../config/db');

async function listar() {
  const rows=await query(`SELECT r.*, sd.solicitud_id, COALESCE(sd.nombre_analisis,a.nombre) AS analisis,
    COALESCE(sd.codigo_analisis,a.codigo) AS codigo_analisis, s.codigo AS solicitud,
    CONCAT(pe.nombres, ' ', pe.apellidos) AS paciente, pe.ci, u.nombre_completo AS registrado_por,
    uv.nombre_completo AS validado_por_nombre
    FROM resultados r JOIN solicitud_detalles sd ON sd.id=r.solicitud_detalle_id
    JOIN solicitudes s ON s.id=sd.solicitud_id JOIN analisis a ON a.id=sd.analisis_id
    JOIN pacientes pa ON pa.id=s.paciente_id JOIN personas pe ON pe.id=pa.persona_id
    LEFT JOIN usuarios u ON u.id=r.usuario_id LEFT JOIN usuarios uv ON uv.id=r.validado_por
    ORDER BY r.id DESC`);
  if(!rows.length)return rows;
  const ids=rows.map(row=>row.id),placeholders=ids.map(()=>'?').join(',');
  const reactivos=await query(`SELECT rr.resultado_id, rr.quimico_id, rr.nombre_quimico AS nombre,
    rr.unidad, rr.cantidad, iq.stock_actual FROM resultado_reactivos rr
    JOIN inventario_quimicos iq ON iq.id=rr.quimico_id WHERE rr.resultado_id IN (${placeholders})`,ids);
  const byResult=new Map(rows.map(row=>[Number(row.id),[]]));
  for(const item of reactivos)byResult.get(Number(item.resultado_id))?.push(item);
  for(const row of rows)row.reactivos=byResult.get(Number(row.id))||[];
  return rows;
}
async function pendientesPorCi(ci) {
  const pacientes=await query(`SELECT pa.id, pa.codigo_paciente, pe.ci, pe.nombres, pe.apellidos,
    pe.telefono, pe.email FROM pacientes pa JOIN personas pe ON pe.id=pa.persona_id WHERE pe.ci=? LIMIT 1`, [ci]);
  if(!pacientes[0])return null;
  const analisis=await query(`SELECT sd.id AS solicitud_detalle_id, s.codigo AS solicitud,
    s.fecha_solicitud, COALESCE(sd.codigo_analisis,a.codigo) AS codigo_analisis,
    COALESCE(sd.nombre_analisis,a.nombre) AS analisis
    FROM solicitud_detalles sd JOIN solicitudes s ON s.id=sd.solicitud_id
    JOIN analisis a ON a.id=sd.analisis_id JOIN pacientes pa ON pa.id=s.paciente_id
    LEFT JOIN resultados r ON r.solicitud_detalle_id=sd.id
    WHERE pa.id=? AND r.id IS NULL AND s.estado<>'Cancelada'
    ORDER BY s.fecha_solicitud, s.id, sd.id`, [pacientes[0].id]);
  const reactivos=await query(`SELECT id, codigo, nombre, unidad, stock_actual FROM inventario_quimicos
    WHERE activo=1 AND stock_actual>0 ORDER BY nombre`);
  return { paciente:pacientes[0], analisis, reactivos };
}
function errorInventario(code,message){const error=new Error(message);error.code=code;return error;}
async function devolverReactivos(conn,resultadoId){
  const rows=await conn.query('SELECT quimico_id,cantidad FROM resultado_reactivos WHERE resultado_id=? FOR UPDATE',[resultadoId]);
  for(const item of rows)await conn.query('UPDATE inventario_quimicos SET stock_actual=stock_actual+? WHERE id=?',[item.cantidad,item.quimico_id]);
  await conn.query('DELETE FROM resultado_reactivos WHERE resultado_id=?',[resultadoId]);
}
async function consumirReactivos(conn,resultadoId,reactivos){
  if(!Array.isArray(reactivos)||!reactivos.length)throw errorInventario('REACTIVOS_REQUERIDOS','Selecciona al menos un reactivo y su cantidad.');
  const ids=reactivos.map(item=>Number(item.quimico_id));
  if(ids.some(id=>!Number.isInteger(id)||id<1)||new Set(ids).size!==ids.length)throw errorInventario('REACTIVOS_INVALIDOS','La selección de reactivos no es válida.');
  for(const item of reactivos){
    const cantidad=Number(item.cantidad);
    if(!Number.isFinite(cantidad)||cantidad<=0)throw errorInventario('CANTIDAD_REACTIVO_INVALIDA','Cada cantidad utilizada debe ser mayor que cero.');
    const rows=await conn.query('SELECT id,nombre,unidad,stock_actual,activo FROM inventario_quimicos WHERE id=? FOR UPDATE',[Number(item.quimico_id)]);
    const quimico=rows[0];
    if(!quimico||!Number(quimico.activo))throw errorInventario('REACTIVO_NO_DISPONIBLE','Uno de los reactivos seleccionados no está activo.');
    if(Number(quimico.stock_actual)<cantidad)throw errorInventario('STOCK_INSUFICIENTE',`Stock insuficiente para ${quimico.nombre}. Disponible: ${quimico.stock_actual} ${quimico.unidad}.`);
    const update=await conn.query('UPDATE inventario_quimicos SET stock_actual=stock_actual-? WHERE id=? AND stock_actual>=?',[cantidad,quimico.id,cantidad]);
    if(!Number(update.affectedRows))throw errorInventario('STOCK_INSUFICIENTE',`Stock insuficiente para ${quimico.nombre}.`);
    await conn.query(`INSERT INTO resultado_reactivos (resultado_id,quimico_id,nombre_quimico,unidad,cantidad)
      VALUES (?,?,?,?,?)`,[resultadoId,quimico.id,quimico.nombre,quimico.unidad,cantidad]);
  }
}
async function crear(data, usuarioId) {
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const result=await conn.query(`INSERT INTO resultados
      (solicitud_detalle_id,valor,unidad,referencia,interpretacion,observaciones,usuario_id)
      VALUES (?,?,?,?,?,?,?)`,[data.solicitud_detalle_id,data.valor,data.unidad||null,data.referencia||null,
      data.interpretacion||null,data.observaciones||null,usuarioId]);
    const id=Number(result.insertId);
    await consumirReactivos(conn,id,data.reactivos);
    await conn.query(`UPDATE solicitudes s JOIN solicitud_detalles sd ON sd.solicitud_id=s.id
      SET s.estado='En proceso' WHERE s.id=(SELECT solicitud_id FROM solicitud_detalles WHERE id=?)
      AND s.estado='Pendiente'`,[data.solicitud_detalle_id]);
    await conn.commit();
    return {id};
  }catch(error){await conn.rollback();throw error;}
  finally{conn.release();}
}
async function actualizar(id, data) {
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const exists=await conn.query('SELECT id FROM resultados WHERE id=? FOR UPDATE',[id]);
    if(!exists[0]){await conn.rollback();return false;}
    await devolverReactivos(conn,id);
    await consumirReactivos(conn,id,data.reactivos);
    await conn.query(`UPDATE resultados SET valor=?,unidad=?,referencia=?,interpretacion=?,observaciones=?,
      fecha_resultado=CURRENT_TIMESTAMP,validado=0,validado_por=NULL,validado_en=NULL WHERE id=?`,
    [data.valor,data.unidad||null,data.referencia||null,data.interpretacion||null,data.observaciones||null,id]);
    await conn.query(`UPDATE solicitudes s JOIN solicitud_detalles sd ON sd.solicitud_id=s.id
      JOIN resultados r ON r.solicitud_detalle_id=sd.id SET s.estado='En proceso'
      WHERE r.id=? AND s.estado='Completada'`,[id]);
    await conn.commit();
    return true;
  }catch(error){await conn.rollback();throw error;}
  finally{conn.release();}
}
async function validar(id, usuarioId) {
  const result = await query(`UPDATE resultados SET validado=1, validado_por=?, validado_en=CURRENT_TIMESTAMP
    WHERE id=? AND validado=0`, [usuarioId, id]);
  if (Number(result.affectedRows) === 0) return false;
  await query(`UPDATE solicitudes s JOIN solicitud_detalles sd ON sd.solicitud_id=s.id
    JOIN resultados r ON r.solicitud_detalle_id=sd.id
    SET s.estado='Completada'
    WHERE r.id=? AND s.estado='En proceso' AND NOT EXISTS (
      SELECT 1 FROM solicitud_detalles d LEFT JOIN resultados pending ON pending.solicitud_detalle_id=d.id
      WHERE d.solicitud_id=s.id AND (pending.id IS NULL OR pending.validado=0)
    )`, [id]);
  return true;
}
async function eliminar(id) {
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const rows=await conn.query('SELECT solicitud_detalle_id FROM resultados WHERE id=? FOR UPDATE',[id]);
    if(!rows[0]){await conn.rollback();return false;}
    await devolverReactivos(conn,id);
    await conn.query('DELETE FROM resultados WHERE id=?',[id]);
    await conn.query(`UPDATE solicitudes s JOIN solicitud_detalles sd ON sd.solicitud_id=s.id
      SET s.estado='En proceso' WHERE sd.id=? AND s.estado='Completada'`,[rows[0].solicitud_detalle_id]);
    await conn.commit();
    return true;
  }catch(error){await conn.rollback();throw error;}
  finally{conn.release();}
}
module.exports = { listar, pendientesPorCi, crear, actualizar, validar, eliminar };

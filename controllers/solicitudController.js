const Model=require('../models/solicitudModel');
async function listar(req,res,next){try{res.json(await Model.listar());}catch(e){next(e);}}
async function opciones(req,res,next){try{res.json(await Model.opciones(Number(req.query.solicitud_id)||null));}catch(e){next(e);}}
async function buscarPacientes(req,res,next){
 try{const term=String(req.query.buscar||'').trim();if(term.length<1)return res.json([]);res.json(await Model.buscarPacientes(term));}
 catch(e){next(e);}
}
async function obtener(req,res,next){try{const x=await Model.obtener(Number(req.params.id));if(!x)return res.status(404).json({error:'Solicitud no encontrada.'});res.json(x);}catch(e){next(e);}}
async function crear(req,res,next){
 try{
  const paciente_id=Number(req.body.paciente_id);
  const analisis_ids=Array.isArray(req.body.analisis_ids)?req.body.analisis_ids.map(Number):[];
  if(!paciente_id||analisis_ids.length===0)return res.status(400).json({error:'Selecciona un paciente y al menos un análisis.'});
  if(new Set(analisis_ids).size!==analisis_ids.length)return res.status(400).json({error:'No repitas análisis en una solicitud.'});
  const x=await Model.crear({paciente_id,analisis_ids,observaciones:req.body.observaciones},req.session.user.id);
  res.status(201).json(x);
 }catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Código de solicitud duplicado.'});next(e);}
}
async function actualizar(req,res,next){
 try{
  const id=Number(req.params.id),paciente_id=Number(req.body.paciente_id);
  const analisis_ids=Array.isArray(req.body.analisis_ids)?req.body.analisis_ids.map(Number):[];
  if(!paciente_id||analisis_ids.length===0)return res.status(400).json({error:'Selecciona un paciente y al menos un análisis.'});
  if(new Set(analisis_ids).size!==analisis_ids.length)return res.status(400).json({error:'No repitas análisis en una solicitud.'});
  const solicitud=await Model.actualizar(id,{paciente_id,analisis_ids,observaciones:req.body.observaciones});
  res.json(solicitud);
 }catch(e){
  if(e.code==='SOLICITUD_NO_ENCONTRADA')return res.status(404).json({error:e.message});
  if(e.code==='SOLICITUD_NO_EDITABLE')return res.status(409).json({error:e.message});
  if(e.code==='ANALISIS_NO_DISPONIBLE')return res.status(400).json({error:e.message});
  next(e);
 }
}
async function cambiarEstado(req,res,next){try{const estados=['En proceso','Cancelada'];if(!estados.includes(req.body.estado))return res.status(400).json({error:'El estado solo puede avanzar a proceso o cancelarse. La finalización se produce al validar todos los resultados.'});const x=await Model.actualizarEstado(Number(req.params.id),req.body.estado);if(!x)return res.status(409).json({error:'La solicitud no existe o ya no permite ese cambio de estado.'});res.json(x);}catch(e){next(e);}}
async function eliminar(req,res,next){try{if(!await Model.eliminar(Number(req.params.id)))return res.status(404).json({error:'Solicitud no encontrada.'});res.json({ok:true});}catch(e){if(e.code==='ER_ROW_IS_REFERENCED_2')return res.status(409).json({error:'No se puede eliminar una solicitud con pagos asociados.'});next(e);}}
module.exports={listar,opciones,buscarPacientes,obtener,crear,actualizar,cambiarEstado,eliminar};

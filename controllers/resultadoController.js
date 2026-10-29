const Model=require('../models/resultadoModel');
function validarReactivos(value){
 if(!Array.isArray(value)||!value.length)return null;
 const reactivos=value.map(item=>({quimico_id:Number(item.quimico_id),cantidad:Number(item.cantidad)}));
 if(reactivos.some(item=>!Number.isInteger(item.quimico_id)||item.quimico_id<1||!Number.isFinite(item.cantidad)||item.cantidad<=0))return null;
 if(new Set(reactivos.map(item=>item.quimico_id)).size!==reactivos.length)return null;
 return reactivos;
}
function errorInventario(error,res){
 const messages={
  REACTIVOS_REQUERIDOS:'Selecciona al menos un reactivo y su cantidad.',
  REACTIVOS_INVALIDOS:'La selección de reactivos no es válida.',
  CANTIDAD_REACTIVO_INVALIDA:'Cada cantidad utilizada debe ser mayor que cero.',
  REACTIVO_NO_DISPONIBLE:'Uno de los reactivos seleccionados no está activo.',
  STOCK_INSUFICIENTE:error.message
 };
 if(!messages[error.code])return false;
 res.status(error.code==='STOCK_INSUFICIENTE'?409:400).json({error:messages[error.code]});
 return true;
}
async function listar(req,res,next){try{res.json(await Model.listar());}catch(e){next(e);}}
async function pendientes(req,res,next){
 try{
  const ci=String(req.query.ci||'').trim();
  if(!ci)return res.status(400).json({error:'Ingresa el CI del paciente.'});
  const data=await Model.pendientesPorCi(ci);
  if(!data)return res.status(404).json({error:'No existe un paciente registrado con ese CI.'});
  res.json(data);
 }catch(e){next(e);}
}
async function crear(req,res,next){
 try{
    const {solicitud_detalle_id,valor,unidad,referencia,interpretacion,observaciones}=req.body;
  const reactivos=validarReactivos(req.body.reactivos);
  if(!solicitud_detalle_id||!String(valor||'').trim())return res.status(400).json({error:'Selecciona un análisis pendiente e ingresa el resultado.'});
  if(!reactivos)return res.status(400).json({error:'Selecciona al menos un reactivo e ingresa una cantidad positiva para cada uno.'});
    res.status(201).json(await Model.crear({solicitud_detalle_id:Number(solicitud_detalle_id),valor:String(valor).trim(),unidad,referencia,interpretacion,observaciones,reactivos},req.session.user.id));
 }catch(e){if(errorInventario(e,res))return;if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Ese análisis ya tiene un resultado registrado.'});if(e.code==='ER_NO_REFERENCED_ROW_2')return res.status(400).json({error:'El análisis seleccionado no existe.'});next(e);}
}
async function actualizar(req,res,next){
 try{
    const {valor,unidad,referencia,interpretacion,observaciones}=req.body;
  const reactivos=validarReactivos(req.body.reactivos);
  if(!String(valor||'').trim())return res.status(400).json({error:'El resultado es obligatorio.'});
  if(!reactivos)return res.status(400).json({error:'Selecciona al menos un reactivo e ingresa una cantidad positiva para cada uno.'});
    if(!await Model.actualizar(Number(req.params.id),{valor:String(valor).trim(),unidad,referencia,interpretacion,observaciones,reactivos}))return res.status(404).json({error:'Resultado no encontrado.'});
  res.json({ok:true});
 }catch(e){if(errorInventario(e,res))return;next(e);}
}
async function validar(req,res,next){
 try{
  if(!await Model.validar(Number(req.params.id),req.session.user.id))return res.status(404).json({error:'Resultado no encontrado o ya validado.'});
  res.json({ok:true});
 }catch(e){next(e);}
}
async function eliminar(req,res,next){try{if(!await Model.eliminar(Number(req.params.id)))return res.status(404).json({error:'Resultado no encontrado.'});res.json({ok:true});}catch(e){next(e);}}
module.exports={listar,pendientes,crear,actualizar,validar,eliminar};

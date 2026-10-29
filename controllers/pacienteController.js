const Model = require('../models/pacienteModel');
async function listar(req,res,next){try{res.json(await Model.listar());}catch(e){next(e);}}
async function opciones(req,res,next){try{res.json(await Model.personasDisponibles(Number(req.query.paciente_id)||null,String(req.query.buscar||'').trim()));}catch(e){next(e);}}
async function historial(req,res,next){try{const data=await Model.historial(Number(req.params.id));if(!data)return res.status(404).json({error:'Paciente no encontrado.'});res.json(data);}catch(e){next(e);}}
async function crear(req,res,next){
  try {
    const {persona_id,observaciones}=req.body;
    if(!persona_id) return res.status(400).json({error:'Selecciona una persona.'});
    res.status(201).json(await Model.crear({persona_id:Number(persona_id),observaciones}));
  } catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'La persona ya es paciente o el código ya existe.'});next(e);}
}
async function actualizar(req,res,next){
  try{
    const id=Number(req.params.id);
    if(!(await Model.obtener(id)))return res.status(404).json({error:'Paciente no encontrado.'});
    const {persona_id,observaciones}=req.body;
    if(!persona_id)return res.status(400).json({error:'Selecciona una persona.'});
    res.json(await Model.actualizar(id,{persona_id:Number(persona_id),observaciones}));
  }catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'La persona ya es paciente o el código ya existe.'});next(e);}
}
async function eliminar(req,res,next){try{if(!await Model.eliminar(Number(req.params.id)))return res.status(404).json({error:'Paciente no encontrado.'});res.json({ok:true});}catch(e){if(e.code==='ER_ROW_IS_REFERENCED_2')return res.status(409).json({error:'No se puede eliminar porque tiene solicitudes asociadas.'});next(e);}}
module.exports={listar,opciones,historial,crear,actualizar,eliminar};

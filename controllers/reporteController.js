const Model=require('../models/reporteModel');
const Paciente=require('../models/pacienteModel');
const Almacen=require('../models/almacenModel');
async function resumen(req,res,next){try{res.json(await Model.resumen());}catch(e){next(e);}}
async function resumenPanel(req,res,next){
	try{
		const data=await Model.resumen();
		if(req.session.user.rol!=='administrador')delete data.ingresos_hoy;
		res.json(data);
	}catch(e){next(e);}
}
async function ingresos(req,res,next){try{res.json(await Model.ingresosPorMes());}catch(e){next(e);}}
function fechaValida(value){
	if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
	const date=new Date(`${value}T00:00:00.000Z`);
	return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
async function periodo(req,res,next){
	const {desde,hasta}=req.query;
	if(!fechaValida(desde)||!fechaValida(hasta))return res.status(400).json({error:'Selecciona un periodo con fechas válidas.'});
	if(desde>hasta)return res.status(400).json({error:'La fecha inicial no puede ser posterior a la fecha final.'});
	try{res.json(await Model.periodo(desde,hasta));}catch(e){next(e);}
}
async function buscarPacientes(req,res,next){
	const term=String(req.query.buscar||'').trim();
	if(term.length<1)return res.json([]);
	try{res.json(await Model.buscarPacientes(term));}catch(e){next(e);}
}
async function historialPaciente(req,res,next){
	try{const data=await Paciente.historial(Number(req.params.id));if(!data)return res.status(404).json({error:'Paciente no encontrado.'});res.json(data);}catch(e){next(e);}
}
async function inventario(req,res,next){
	try{res.json(await Almacen.listar());}catch(e){next(e);}
}
async function catalogo(req,res,next){try{res.json(await Model.catalogo());}catch(e){next(e);}}
async function solicitudes(req,res,next){
	const {desde,hasta}=req.query;
	if(!fechaValida(desde)||!fechaValida(hasta))return res.status(400).json({error:'Selecciona un periodo con fechas válidas.'});
	if(desde>hasta)return res.status(400).json({error:'La fecha inicial no puede ser posterior a la final.'});
	try{res.json(await Model.solicitudes(desde,hasta));}catch(e){next(e);}
}
async function usuarios(req,res,next){try{res.json(await Model.usuarios());}catch(e){next(e);}}
module.exports={resumen,resumenPanel,ingresos,periodo,buscarPacientes,historialPaciente,inventario,catalogo,solicitudes,usuarios};

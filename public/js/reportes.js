const today=new Date(),monthStart=new Date(today.getFullYear(),today.getMonth(),1);
const localDate=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
document.querySelector('#desde').value=localDate(monthStart);
document.querySelector('#hasta').value=localDate(today);
const reportType=document.querySelector('#report-type');

async function loadReport(){
	const desde=document.querySelector('#desde').value,hasta=document.querySelector('#hasta').value;
	try{
		document.querySelector('#report-caption').textContent=`Periodo: ${desde} a ${hasta}`;
		const data=await api(`/api/reportes/periodo?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
		const summary=data.resumen;
		for(const [element,key] of [['personas','personas'],['pacientes','pacientes'],['solicitudes','solicitudes'],['resultados','resultados'],['pagos','pagos']])document.getElementById(element).textContent=summary[key]??0;
		document.querySelector('#analisis-realizados').textContent=data.analisis.reduce((sum,item)=>sum+Number(item.realizados||0),0);
		document.querySelector('#ingresos').textContent=money(summary.ingresos);
		document.querySelector('#analysis-rows').innerHTML=data.analisis.map(item=>`<tr><td>${esc(item.codigo)}</td><td>${esc(item.nombre)}</td><td>${item.solicitados}</td><td>${item.realizados}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No hay análisis en este periodo.</td></tr>';
		document.querySelector('#rows').innerHTML=data.ingresos.map(item=>`<tr><td>${esc(item.mes)}</td><td>${money(item.total)}</td></tr>`).join('')||'<tr><td colspan="2" class="empty">No hay ingresos en este periodo.</td></tr>';
	}catch(error){notice(error.message,true);}
}
async function searchPatients(term){
	const results=document.querySelector('#report-patient-results');
	if(!term.trim()){results.hidden=true;results.innerHTML='';return;}
	const patients=await api(`/api/reportes/pacientes?buscar=${encodeURIComponent(term)}`);
	results.innerHTML=patients.map(patient=>`<button type="button" class="search-option" data-patient-id="${patient.id}">${esc(patient.ci)} · ${esc(patient.nombres)} ${esc(patient.apellidos)} · ${esc(patient.codigo_paciente)}</button>`).join('')||'<span class="search-empty">Sin coincidencias.</span>';
	results.hidden=false;
}
async function showPatientReport(id){
	const data=await api(`/api/reportes/pacientes/${id}`),patient=data.paciente;
	document.querySelector('#report-patient-info').innerHTML=`<div class="patient-summary"><h2>${esc(patient.nombres)} ${esc(patient.apellidos)}</h2><p><strong>CI:</strong> ${esc(patient.ci)} · <strong>Código:</strong> ${esc(patient.codigo_paciente)}</p><p><strong>Fecha de nacimiento:</strong> ${esc(patient.fecha_nacimiento)} · <strong>Sexo:</strong> ${esc(patient.sexo)}</p><p><strong>Teléfono:</strong> ${esc(patient.telefono)} · <strong>Correo:</strong> ${esc(patient.email)}</p><p><strong>Dirección:</strong> ${esc(patient.direccion)}</p></div>`;
	document.querySelector('#patient-requests').innerHTML=data.solicitudes.map(item=>`<tr><td>${esc(item.codigo)}</td><td>${esc(dateText(item.fecha_solicitud))}</td><td>${esc(item.estado)}</td><td>${money(item.total)}</td><td>${money(item.pagado)}</td><td>${money(Math.max(0,Number(item.total)-Number(item.pagado)))}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Sin solicitudes.</td></tr>';
	document.querySelector('#patient-results').innerHTML=data.resultados.map(item=>`<tr><td>${esc(item.solicitud)}</td><td>${esc(item.analisis)}</td><td>${esc(item.valor)} ${esc(item.unidad)}</td><td>${esc(item.interpretacion)}</td><td>${esc(dateText(item.fecha_resultado))}</td><td>${item.validado?'Validado':'Pendiente'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Sin resultados.</td></tr>';
	document.querySelector('#patient-payments').innerHTML=data.pagos.map(item=>`<tr><td>${esc(dateText(item.fecha_pago))}</td><td>${esc(item.solicitud)}</td><td>${money(item.monto)}</td><td>${esc(item.metodo)}</td><td>${esc(item.referencia)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">Sin pagos.</td></tr>';
	document.querySelector('#report-patient-history').hidden=false;
}
async function loadInventoryReport(){
	try{
		const items=await api('/api/reportes/inventario');
		document.querySelector('#inventory-rows').innerHTML=items.map(item=>`<tr><td>${esc(item.codigo)}</td><td>${esc(item.nombre)}</td><td>${esc(item.unidad)}</td><td>${Number(item.stock_actual).toLocaleString('es-BO')}</td><td>${Number(item.stock_minimo).toLocaleString('es-BO')}</td><td>${Number(item.activo)?(Number(item.stock_actual)<=Number(item.stock_minimo)?'Stock bajo':'Activo'):'Inactivo'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No hay químicos registrados.</td></tr>';
	}catch(error){notice(error.message,true);}
}
async function loadCatalogReport(){
	try{
		const items=await api('/api/reportes/catalogo');
		document.querySelector('#catalog-rows').innerHTML=items.map(item=>`<tr><td>${esc(item.codigo)}</td><td>${esc(item.nombre)}</td><td>${esc(item.descripcion)}</td><td>${money(item.precio)}</td><td>${Number(item.tiempo_entrega_horas)} h</td><td>${Number(item.activo)?'Activo':'Inactivo'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No hay análisis registrados.</td></tr>';
	}catch(error){notice(error.message,true);}
}
async function loadRequestsReport(){
	const desde=document.querySelector('#desde').value,hasta=document.querySelector('#hasta').value;
	try{
		document.querySelector('#report-caption').textContent=`Solicitudes del ${desde} al ${hasta}`;
		const items=await api(`/api/reportes/solicitudes?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
		document.querySelector('#request-rows').innerHTML=items.map(item=>`<tr><td>${esc(dateText(item.fecha_solicitud))}</td><td>${esc(item.codigo)}</td><td>${esc(item.ci)}</td><td>${esc(item.paciente)}</td><td>${esc(item.analisis)}</td><td>${esc(item.estado)}</td><td>${money(item.total)}</td><td>${money(item.pagado)}</td><td>${money(Math.max(0,Number(item.total)-Number(item.pagado)))}</td></tr>`).join('')||'<tr><td colspan="9" class="empty">No hay solicitudes en este periodo.</td></tr>';
	}catch(error){notice(error.message,true);}
}
async function loadUsersReport(){
	try{
		const items=await api('/api/reportes/usuarios');
		document.querySelector('#user-rows').innerHTML=items.map(item=>`<tr><td>${esc(item.usuario)}</td><td>${esc(item.nombre_completo)}</td><td>${esc(item.rol)}</td><td>${esc(item.vistas||'Sin vistas asignadas')}</td><td>${Number(item.activo)?'Activo':'Inactivo'}</td><td>${esc(dateText(item.creado_en))}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No hay usuarios registrados.</td></tr>';
	}catch(error){notice(error.message,true);}
}
function showSelectedReport(){
	const type=reportType.value;
	document.querySelector('#period-form').hidden=!['administrativo','solicitudes'].includes(type);
	document.querySelector('#admin-report').hidden=type!=='administrativo';
	document.querySelector('#patient-report').hidden=type!=='paciente';
	document.querySelector('#inventory-report').hidden=type!=='inventario';
	document.querySelector('#catalog-report').hidden=type!=='catalogo';
	document.querySelector('#requests-report').hidden=type!=='solicitudes';
	document.querySelector('#users-report').hidden=type!=='usuarios';
	document.querySelector('#report-heading').textContent=({administrativo:'Resumen administrativo',catalogo:'Catálogo de análisis',solicitudes:'Solicitudes por periodo',paciente:'Historial de paciente',inventario:'Inventario de químicos',usuarios:'Usuarios del sistema'})[type];
	if(type==='catalogo')document.querySelector('#report-caption').textContent='Catálogo vigente e histórico de análisis clínicos.';
	if(type==='inventario')document.querySelector('#report-caption').textContent='Existencias actuales y niveles mínimos de reactivos.';
	if(type==='usuarios')document.querySelector('#report-caption').textContent='Cuentas, roles, permisos asignados y estado.';
	if(type==='paciente')document.querySelector('#report-caption').textContent='Historial clínico y administrativo del paciente seleccionado.';
	if(type==='administrativo')loadReport();
	if(type==='catalogo')loadCatalogReport();
	if(type==='solicitudes')loadRequestsReport();
	if(type==='inventario')loadInventoryReport();
	if(type==='usuarios')loadUsersReport();
}
document.querySelector('#period-form').addEventListener('submit',event=>{event.preventDefault();if(reportType.value==='solicitudes')loadRequestsReport();else loadReport();});
document.querySelector('#report-patient-search').addEventListener('input',event=>{
	document.querySelector('#report-patient-history').hidden=true;
	document.querySelector('#report-patient-info').innerHTML='';
	searchPatients(event.target.value).catch(error=>notice(error.message,true));
});
document.querySelector('#report-patient-results').addEventListener('click',event=>{
	const option=event.target.closest('[data-patient-id]');
	if(!option)return;
	document.querySelector('#report-patient-search').value=option.textContent;
	document.querySelector('#report-patient-results').hidden=true;
	showPatientReport(option.dataset.patientId).catch(error=>notice(error.message,true));
});
reportType.addEventListener('change',showSelectedReport);
showSelectedReport();

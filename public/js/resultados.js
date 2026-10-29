const form=document.querySelector('#form');
let results=[],canManage=false,availableReactives=[];
async function loadPending(ci){
	const select=document.querySelector('#solicitud_detalle_id'),info=document.querySelector('#patient-info');
	const data=await api(`/api/resultados/pendientes?ci=${encodeURIComponent(ci)}`);
	availableReactives=data.reactivos;
	info.textContent=`${data.paciente.codigo_paciente} · ${data.paciente.ci} · ${data.paciente.nombres} ${data.paciente.apellidos}${data.paciente.telefono?` · ${data.paciente.telefono}`:''}`;
	select.innerHTML='<option value="">Selecciona tipo de análisis pendiente</option>'+data.analisis.map(item=>`<option value="${item.solicitud_detalle_id}">${esc(item.codigo_analisis)} · ${esc(item.analisis)} · Solicitud ${esc(item.solicitud)} · ${esc(dateText(item.fecha_solicitud))}</option>`).join('');
	select.disabled=data.analisis.length===0;
	document.querySelector('#reactive-field').hidden=false;
	renderReactives(availableReactives);
	if(!data.analisis.length)info.textContent+=' · No hay análisis pendientes; los que ya tienen resultado no se muestran.';
	if(!availableReactives.length)info.textContent+=' · No hay reactivos activos con stock disponible.';
}
function renderReactives(items,selected=[]){
	const selectedById=new Map(selected.map(item=>[Number(item.quimico_id),item]));
	document.querySelector('#reactive-list').innerHTML=items.map(item=>{
		const previous=selectedById.get(Number(item.quimico_id||item.id));
		const id=Number(item.quimico_id||item.id),stock=Number(item.stock_actual||0),used=Number(previous?.cantidad||0);
		return `<label class="checkitem reagent-choice"><input class="reagent-check" type="checkbox" value="${id}" ${previous?'checked':''}><span>${esc(item.codigo||'')} · ${esc(item.nombre)} (${esc(item.unidad)}) · disponible ${Number(stock+used).toLocaleString('es-BO')}</span><input class="reagent-quantity" type="number" min="0.01" step="0.01" max="${stock+used}" value="${previous?used:''}" placeholder="Cantidad" ${previous?'':'disabled'}></label>`;
	}).join('')||'<span class="search-empty">Registra químicos con stock en Almacén para poder guardar resultados.</span>';
}
function selectedReactives(){
	return [...document.querySelectorAll('#reactive-list .reagent-check:checked')].map(check=>({quimico_id:Number(check.value),cantidad:Number(check.closest('.reagent-choice').querySelector('.reagent-quantity').value)}));
}
async function loadRole(){const data=await api('/api/login/me');canManage=['administrador','laboratorista'].includes(data.usuario?.rol);if(results.length)render();}
function render(){
	document.querySelector('#rows').innerHTML=results.map(item=>{
		const status=item.validado?`Validado${item.validado_por_nombre?` por ${esc(item.validado_por_nombre)}`:''}`:'Pendiente de validación';
		const actions=`<div class="actions">${canManage?`<button class="btn secondary" data-edit="${item.id}">Corregir</button>${item.validado?'':`<button class="btn" data-validate="${item.id}">Validar</button>`}`:''}${item.validado?`<button class="btn secondary" data-print="${item.id}">Imprimir</button>`:'Pendiente de validación'}</div>`;
		const reagentSummary=item.reactivos.map(reagent=>`${esc(reagent.nombre)}: ${Number(reagent.cantidad).toLocaleString('es-BO')} ${esc(reagent.unidad)}`).join('<br>')||'—';
		return `<tr><td>${esc(item.solicitud)}</td><td>${esc(item.paciente)}</td><td>${esc(item.analisis)}</td><td>${esc(item.valor)}</td><td>${esc(item.unidad)}</td><td>${esc(item.interpretacion)}</td><td>${reagentSummary}</td><td>${esc(dateText(item.fecha_resultado))}</td><td>${status}</td><td>${actions}</td></tr>`;
	}).join('')||'<tr><td colspan="10" class="empty">No hay resultados.</td></tr>';
}
async function refresh(){results=await api('/api/resultados');render();}
function clearEdit(){form.reset();document.querySelector('#resultado-id').value='';document.querySelector('#patient-ci').disabled=false;document.querySelector('#patient-ci').required=true;document.querySelector('#form-title').textContent='Registrar resultado';document.querySelector('#detail-field').hidden=false;document.querySelector('#solicitud_detalle_id').required=true;document.querySelector('#editing-info').hidden=true;document.querySelector('#cancel-edit').hidden=true;document.querySelector('#reactive-field').hidden=true;availableReactives=[];}
function editResult(item){
	document.querySelector('#resultado-id').value=item.id;
	document.querySelector('#patient-ci').value=item.ci||'';
	document.querySelector('#patient-ci').required=false;
	document.querySelector('#patient-ci').disabled=true;
	document.querySelector('#form-title').textContent=item.validado?'Corregir resultado validado':'Corregir resultado';
	document.querySelector('#detail-field').hidden=true;
	document.querySelector('#solicitud_detalle_id').required=false;
	const editOptions=[...item.reactivos,...availableReactives.filter(option=>!item.reactivos.some(used=>Number(used.quimico_id)===Number(option.id)))];
	renderReactives(editOptions,item.reactivos);
	document.querySelector('#reactive-field').hidden=false;
	const info=document.querySelector('#editing-info');info.textContent=`${item.solicitud} · ${item.paciente} · ${item.analisis}`;info.hidden=false;
	for(const field of ['valor','unidad','referencia','interpretacion','observaciones'])document.getElementById(field).value=item[field]||'';
	document.querySelector('#cancel-edit').hidden=false;
	window.scrollTo({top:0,behavior:'smooth'});
}
function printResult(item){
	if(!item?.validado){notice('Solo se pueden imprimir resultados validados.',true);return;}
	const printWindow=window.open('','_blank','width=850,height=700');
	if(!printWindow){notice('Permite ventanas emergentes para imprimir el resultado.',true);return;}
	const reagentRows=item.reactivos.map(reagent=>`<tr><td>${esc(reagent.nombre)}</td><td>${Number(reagent.cantidad).toLocaleString('es-BO')} ${esc(reagent.unidad)}</td></tr>`).join('');
	printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resultado ${esc(item.solicitud)}</title><style>body{font:15px sans-serif;color:#172033;margin:42px}h1{color:#142b4a;border-bottom:3px solid #174a80;padding-bottom:12px}h2{font-size:17px;margin-top:28px}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:10px;text-align:left}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 22px}.muted{color:#64748b}.signature{margin-top:64px;width:260px;border-top:1px solid #172033;padding-top:8px}</style></head><body><h1>Laboratorio Clínico</h1><p class="muted">Resultado de análisis</p><div class="meta"><p><strong>Paciente:</strong> ${esc(item.paciente)} (${esc(item.ci)})</p><p><strong>Solicitud:</strong> ${esc(item.solicitud)}</p><p><strong>Análisis:</strong> ${esc(item.analisis)}</p><p><strong>Fecha de emisión:</strong> ${esc(dateText(item.fecha_resultado))}</p></div><h2>Resultado</h2><table><thead><tr><th>Valor</th><th>Unidad</th><th>Referencia</th></tr></thead><tbody><tr><td>${esc(item.valor)}</td><td>${esc(item.unidad)}</td><td>${esc(item.referencia)}</td></tr></tbody></table><p><strong>Interpretación:</strong> ${esc(item.interpretacion)||'—'}</p>${reagentRows?`<h2>Reactivos utilizados</h2><table><thead><tr><th>Material</th><th>Cantidad</th></tr></thead><tbody>${reagentRows}</tbody></table>`:''}${item.observaciones?`<p><strong>Observaciones:</strong> ${esc(item.observaciones)}</p>`:''}<p><strong>Validado:</strong> ${item.validado?'Sí':'No'}${item.validado_por_nombre?` · ${esc(item.validado_por_nombre)}`:''}</p><div class="signature">Personal autorizado</div><script>window.onload=()=>window.print()</script></body></html>`);
	printWindow.document.close();
}
form.addEventListener('submit',async event=>{
	event.preventDefault();
	const id=document.querySelector('#resultado-id').value;
	const body=Object.fromEntries(['solicitud_detalle_id','valor','unidad','referencia','interpretacion','observaciones'].map(field=>[field,document.getElementById(field).value]));
	body.reactivos=selectedReactives();
	if(!id&&!body.solicitud_detalle_id){notice('Busca por CI y selecciona un análisis pendiente.',true);return;}
	const ci=document.querySelector('#patient-ci').value.trim();
	try{await api('/api/resultados'+(id?`/${id}`:''),{method:id?'PUT':'POST',body:JSON.stringify(body)});notice(id?'Resultado corregido; requiere nueva validación.':'Resultado registrado.');clearEdit();if(ci){document.querySelector('#patient-ci').value=ci;await loadPending(ci);}await refresh();}catch(error){notice(error.message,true);}
});
document.querySelector('#search-patient').addEventListener('click',async()=>{
	const ci=document.querySelector('#patient-ci').value.trim();
	if(!ci){notice('Ingresa el CI del paciente.',true);return;}
	try{await loadPending(ci);notice('Análisis pendientes cargados para el paciente.');}
	catch(error){document.querySelector('#solicitud_detalle_id').innerHTML='<option value="">No se encontraron análisis</option>';document.querySelector('#solicitud_detalle_id').disabled=true;document.querySelector('#patient-info').textContent='';notice(error.message,true);}
});
document.querySelector('#patient-ci').addEventListener('input',()=>{
	const select=document.querySelector('#solicitud_detalle_id');
	select.innerHTML='<option value="">Busca nuevamente al paciente</option>';select.disabled=true;
	document.querySelector('#patient-info').textContent='';
	document.querySelector('#reactive-field').hidden=true;document.querySelector('#reactive-list').innerHTML='';
});
document.querySelector('#reactive-list').addEventListener('change',event=>{
	if(!event.target.matches('.reagent-check'))return;
	const quantity=event.target.closest('.reagent-choice').querySelector('.reagent-quantity');
	quantity.disabled=!event.target.checked;quantity.required=event.target.checked;
});
document.querySelector('#rows').addEventListener('click',async event=>{
	const edit=event.target.dataset.edit,validate=event.target.dataset.validate,print=event.target.dataset.print;
	if(edit){editResult(results.find(item=>item.id==edit));return;}
	if(print){printResult(results.find(item=>item.id==print));return;}
	if(validate){try{await api(`/api/resultados/${validate}/validar`,{method:'PATCH'});notice('Resultado validado.');await refresh();}catch(error){notice(error.message,true);}}
});
document.querySelector('#cancel-edit').addEventListener('click',clearEdit);
Promise.all([loadRole(),refresh()]).catch(error=>notice(error.message,true));

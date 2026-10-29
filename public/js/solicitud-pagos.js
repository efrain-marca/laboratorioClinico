const paymentForm=document.querySelector('#quick-payment-form');
const paymentPanel=document.querySelector('#quick-payment-panel');

async function loadPaymentAccess(){
  const data=await api('/api/login/me');
  const allowed=['administrador','recepcionista'].includes(data.usuario?.rol)&&
    (data.usuario?.rol==='administrador'||data.permisos.includes('pagos'));
  paymentPanel.hidden=!allowed;
}
async function searchPaymentRequests(term){
  const results=document.querySelector('#quick-payment-results');
  if(!term.trim()){results.hidden=true;results.innerHTML='';return;}
  const items=await api(`/api/pagos/opciones/solicitudes?buscar=${encodeURIComponent(term)}`);
  results.innerHTML=items.map(item=>`<button type="button" class="search-option" data-request-id="${item.id}" data-label="${esc(`${item.ci} · ${item.paciente} · ${item.codigo}`)}" data-details="${esc([item.telefono,item.email].filter(Boolean).join(' · '))}" data-balance="${Number(item.saldo)}">${esc(item.ci)} · ${esc(item.paciente)} · ${esc(item.codigo)} · saldo ${money(item.saldo)}</button>`).join('')||'<span class="search-empty">No hay solicitudes con saldo para esa búsqueda.</span>';
  results.hidden=false;
}
document.querySelector('#quick-payment-search').addEventListener('input',event=>{
  document.querySelector('#quick-payment-request').value='';
  document.querySelector('#quick-payment-selected').textContent='Selecciona una solicitud con saldo.';
  searchPaymentRequests(event.target.value).catch(error=>notice(error.message,true));
});
document.querySelector('#quick-payment-results').addEventListener('click',event=>{
  const item=event.target.closest('[data-request-id]');
  if(!item)return;
  document.querySelector('#quick-payment-request').value=item.dataset.requestId;
  document.querySelector('#quick-payment-amount').max=item.dataset.balance;
  document.querySelector('#quick-payment-selected').textContent=`Solicitud seleccionada: ${item.dataset.label}${item.dataset.details?` · ${item.dataset.details}`:''} · saldo ${money(item.dataset.balance)}`;
  document.querySelector('#quick-payment-results').hidden=true;
});
paymentForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const solicitud_id=document.querySelector('#quick-payment-request').value;
  const monto=Number(document.querySelector('#quick-payment-amount').value);
  if(!solicitud_id){notice('Busca y selecciona una solicitud con saldo.',true);return;}
  const body={solicitud_id,monto,metodo:document.querySelector('#quick-payment-method').value,referencia:document.querySelector('#quick-payment-reference').value};
  try{
    await api('/api/pagos',{method:'POST',body:JSON.stringify(body)});
    notice('Pago registrado junto a la solicitud.');paymentForm.reset();
    document.querySelector('#quick-payment-request').value='';document.querySelector('#quick-payment-amount').removeAttribute('max');
    document.querySelector('#quick-payment-selected').textContent='Selecciona una solicitud con saldo.';
    document.querySelector('#quick-payment-results').hidden=true;
    window.dispatchEvent(new Event('payment-saved'));
  }catch(error){notice(error.message,true);}
});
loadPaymentAccess().catch(error=>{paymentPanel.hidden=true;});
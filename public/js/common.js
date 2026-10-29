async function api(url, options={}) {
  const opts={...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}};
  const response=await fetch(url,opts);
  const type=response.headers.get('content-type')||'';
  const data=type.includes('application/json')?await response.json():null;
  if(response.status===401){location.href='/login';throw new Error('Tu sesión ha terminado.');}
  if(!response.ok)throw new Error(data?.error||'No se pudo completar la operación.');
  return data;
}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(value){return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(value||0));}
function dateText(value){return value?String(value).replace('T',' ').slice(0,16):'';}
function notice(message,error=false){const el=document.querySelector('#notice');if(el){el.textContent=message||'';el.classList.toggle('error',!!error);}}
async function logout(){try{await api('/api/login/logout',{method:'POST'});}finally{location.href='/login';}}
async function loadUser(){
  try{
    const data=await api('/api/login/me'),user=data.usuario;
    const label=document.querySelector('#user-name');
    if(label)label.textContent=user?.nombre_completo||'';
    if(!user)return;
    const roleAccess={personas:['recepcionista'],pacientes:['recepcionista'],analisis:['recepcionista'],solicitudes:['recepcionista','laboratorista'],resultados:['recepcionista','laboratorista'],pagos:['recepcionista','cajero'],almacen:['recepcionista','laboratorista'],reportes:[]};
    const nav=document.querySelector('.sidebar');
    if(nav&&user.rol==='administrador'&&!nav.querySelector('a[href="/usuarios"]')){const link=document.createElement('a');link.href='/usuarios';link.textContent='Usuarios';nav.append(link);}
    if(nav&&(user.rol==='administrador'||roleAccess.almacen.includes(user.rol))&&(user.rol==='administrador'||data.permisos.includes('almacen'))&&!nav.querySelector('a[href="/almacen"]')){const link=document.createElement('a');link.href='/almacen';link.textContent='Almacén';nav.append(link);}
    for(const link of document.querySelectorAll('a[href]')){
      const view=new URL(link.href,location.origin).pathname.slice(1);
      if(view==='usuarios'){link.hidden=user.rol!=='administrador';if(location.pathname==='/usuarios')link.classList.add('active');}
      else if(roleAccess[view])link.hidden=user.rol!=='administrador'&&(!data.permisos.includes(view)||!roleAccess[view].includes(user.rol));
    }
  }catch{}
}

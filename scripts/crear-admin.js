require('dotenv').config();
const readline=require('readline');
const bcrypt=require('bcryptjs');
const Login=require('../models/loginModel');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
function ask(q){return new Promise(resolve=>rl.question(q,resolve));}
(async()=>{
 try{
  const usuario=(await ask('Usuario administrador: ')).trim();
  const nombreCompleto=(await ask('Nombre completo: ')).trim();
  const password=await ask('Contraseña (mínimo 10 caracteres): ');
  if(!usuario||!nombreCompleto||password.length<10)throw new Error('Datos inválidos: completa los campos y usa al menos 10 caracteres de contraseña.');
  const passwordHash=await bcrypt.hash(password,12);
  await Login.crear({usuario,passwordHash,nombreCompleto,rol:'administrador'});
  console.log('Administrador creado correctamente.');
 }catch(e){console.error('No se pudo crear el administrador:',e.message);process.exitCode=1;}
 finally{rl.close();process.exit();}
})();

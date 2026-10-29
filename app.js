require('dotenv').config();
const express=require('express');
const path=require('path');
const session=require('express-session');
const helmet=require('helmet');
const {requireAuth,requireRole,requireViewAccess}=require('./middleware/auth');

const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  name:'lab.sid',
  secret:process.env.SESSION_SECRET || 'LABORITORIOCLINICO',
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:1000*60*60*4}
}));

app.use('/api/login',require('./routes/loginRoutes'));
app.get('/api/dashboard/resumen',requireAuth,require('./controllers/reporteController').resumenPanel);
app.get('/login',(req,res)=>req.session.user?res.redirect('/'):res.sendFile(path.join(__dirname,'views/login/index.html')));
app.use('/assets',express.static(path.join(__dirname,'public')));
app.get('/',requireAuth,(req,res)=>res.sendFile(path.join(__dirname,'views/dashboard/index.html')));
const pages=['personas','pacientes','analisis','solicitudes','resultados','pagos','almacen','reportes'];
const pageRoles={
  personas:['administrador','recepcionista'],
  pacientes:['administrador','recepcionista'],
  analisis:['administrador','recepcionista'],
  solicitudes:['administrador','recepcionista','laboratorista'],
  resultados:['administrador','recepcionista','laboratorista'],
  pagos:['administrador','recepcionista','cajero'],
  almacen:['administrador','recepcionista','laboratorista'],
  reportes:['administrador']
};
for(const page of pages){
  app.get('/'+page,requireViewAccess(page),requireRole(...pageRoles[page]),(req,res)=>res.sendFile(path.join(__dirname,'views',page,'index.html')));
}
app.get('/usuarios',requireAuth,requireRole('administrador'),(req,res)=>res.sendFile(path.join(__dirname,'views/usuarios/index.html')));
app.use('/api/usuarios',requireAuth,requireRole('administrador'),require('./routes/usuarioRoutes'));
app.use('/api/personas',requireViewAccess('personas'),requireRole('administrador','recepcionista'),require('./routes/personaRoutes'));
app.use('/api/pacientes',requireViewAccess('pacientes'),requireRole('administrador','recepcionista'),require('./routes/pacienteRoutes'));
app.use('/api/analisis',requireViewAccess('analisis'),requireRole('administrador','recepcionista'),require('./routes/analisisRoutes'));
app.use('/api/solicitudes',requireViewAccess('solicitudes'),require('./routes/solicitudRoutes'));
app.use('/api/resultados',requireViewAccess('resultados'),require('./routes/resultadoRoutes'));
app.use('/api/pagos',requireViewAccess('pagos'),require('./routes/pagoRoutes'));
app.use('/api/almacen',requireViewAccess('almacen'),requireRole('administrador','recepcionista','laboratorista'),require('./routes/almacenRoutes'));
app.use('/api/reportes',requireViewAccess('reportes'),require('./routes/reporteRoutes'));

app.use((req,res)=>req.originalUrl.startsWith('/api/')
  ?res.status(404).json({error:'Recurso no encontrado.'})
  :res.status(404).send('Página no encontrada.'));
app.use((err,req,res,next)=>{
  console.error(err);
  if(res.headersSent)return next(err);
  const status=err.status||500;
  res.status(status).json({error:status===500?'Ocurrió un error interno. Verifica la terminal y la configuración.':err.message});
});

const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log(`Laboratorio Clínico disponible en http://localhost:${port}`));

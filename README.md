# Sistema Web de Gestión de Laboratorio Clínico (MVC)

Proyecto base funcional con Node.js, Express, HTML/CSS/JavaScript, sesiones y MariaDB.

## Módulos
- Login y cierre de sesión.
- Gestión de personas.
- Gestión de pacientes.
- Catálogo de análisis.
- Solicitudes de análisis.
- Registro y consulta de resultados (la recepción puede registrar resultados).
- Pagos.
- Reportes básicos.

## Requisitos
- Node.js 20 o superior.
- MariaDB.
- npm.

## Instalación en Fedora
1. Descomprime el proyecto y entra en la carpeta:
   `cd laboratorio_clinico_mvc`
2. Instala dependencias:
   `npm install`
3. Crea la base de datos y tablas con el script:
   `sudo mariadb < database/schema.sql`
4. Crea usuario de base de datos (recomendado, en vez de usar root):
   ```sql
   CREATE USER 'laboratorio_user'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON laboratorio_clinico.* TO 'laboratorio_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
   Ejecuta esos comandos dentro de `sudo mariadb` si tu instalación lo requiere.
5. Copia `.env.example` a `.env` y edítalo con tus datos:
   `cp .env.example .env`
6. Crea un usuario administrador inicial seguro:
   `node scripts/crear-admin.js`
   El script te pedirá usuario y contraseña en la terminal.
7. Inicia el servidor:
   `npm start`
8. Abre `http://localhost:3000`.

## Usuarios y permisos por vista
- El administrador puede abrir **Usuarios** para crear cuentas de recepcionista, laboratorista o cajero y elegir las vistas permitidas.
- Recepción administra pacientes, personas y solicitudes; laboratorio procesa solicitudes y valida resultados; caja registra pagos; los reportes quedan para administración.
- Las contraseñas se guardan cifradas; un usuario inactivo no puede iniciar sesión ni continuar usando una sesión abierta.
- Las historias de usuario no se aplican automáticamente al iniciar la app. En una instalación existente, ejecuta estas migraciones en orden:
   ```bash
   sudo mariadb laboratorio_clinico < database/migrations/001_usuario_permisos.sql
   sudo mariadb laboratorio_clinico < database/migrations/002_validacion_resultados.sql
   sudo mariadb laboratorio_clinico < database/migrations/003_snapshot_analisis.sql
   sudo mariadb laboratorio_clinico < database/migrations/004_rol_cajero.sql
   sudo mariadb laboratorio_clinico < database/migrations/005_interpretacion_resultados.sql
   sudo mariadb laboratorio_clinico < database/migrations/006_inventario_quimicos.sql
   sudo mariadb laboratorio_clinico < database/migrations/007_resultado_reactivos.sql
   ```
- En una instalación nueva, `database/schema.sql` ya incluye las tablas y columnas añadidas por estas migraciones.
- Los códigos de paciente y químicos se asignan automáticamente al guardar.
- Cada resultado registra sus reactivos y cantidades; el stock se descuenta al guardar y se devuelve si se corrige o elimina.
- El apartado **Reportes** permite consultar el historial por CI/nombre y el estado del inventario.

## Notas importantes
- No hay credenciales predeterminadas. Debes crear el administrador con el script.
- Las contraseñas se almacenan con bcrypt.
- Las rutas de la API requieren sesión iniciada, excepto login.
- El proyecto es una base académica: antes de usar datos clínicos reales, agrega auditoría completa de cambios, copias de seguridad, HTTPS y revisión de seguridad.
- La marca de validación registra quién validó y cuándo, pero no sustituye firma clínica ni revisión médica.
# laboratorioClinico

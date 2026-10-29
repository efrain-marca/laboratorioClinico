const views = [
  { key: 'personas', label: 'Personas' },
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'analisis', label: 'Análisis' },
  { key: 'solicitudes', label: 'Solicitudes' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'almacen', label: 'Almacén' },
  { key: 'reportes', label: 'Reportes' }
];

const viewRoles = {
  personas: ['recepcionista'],
  pacientes: ['recepcionista'],
  analisis: ['recepcionista'],
  solicitudes: ['recepcionista', 'laboratorista'],
  resultados: ['recepcionista', 'laboratorista'],
  pagos: ['recepcionista', 'cajero'],
  almacen: ['recepcionista', 'laboratorista'],
  reportes: []
};

module.exports = { views, viewKeys: views.map(view => view.key), viewRoles };
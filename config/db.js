const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'laboratorio_user',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'laboratorio_clinico',
  connectionLimit: 5,
  dateStrings: true,
  bigIntAsNumber: true
});

async function query(sql, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    return await conn.query(sql, params);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, query };

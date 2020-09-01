const mysql = require('mysql2/promise');

const pool = mysql.createPool({
     host:'localhost',
     user:'root',
     port:'3306',
     password:'4752580',
     database:'kiosk',
     dateStrings:'date',
     connectionLimit:10,
     queueLimit:0
});

module.exports = pool;

const { pool } = require('./src/config/db');

console.log('🔍 Checking columns in "employees" table...');

pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'employees'
`)
    .then(res => {
        console.log('📦 Columns found:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Failed to retrieve columns:', err);
        process.exit(1);
    });
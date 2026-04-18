require("dotenv").config();
const pool = require("./config/db");

async function testDB() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("DB Connected:", result.rows[0]);
  } catch (err) {
    console.error("DB Error:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testDB();

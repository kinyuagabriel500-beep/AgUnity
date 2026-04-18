const { Sequelize } = require("sequelize");
const env = require("../config/env");

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  logging: false,
  dialectOptions: env.databaseSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {}
});

module.exports = sequelize;

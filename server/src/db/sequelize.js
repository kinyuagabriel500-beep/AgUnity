const { Sequelize } = require("sequelize");
const env = require("../config/env");

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: "postgres",
  logging: false
});

module.exports = sequelize;

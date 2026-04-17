const bcrypt = require("bcryptjs");

const hashPassword = async (plainPassword) => bcrypt.hash(plainPassword, 12);
const comparePassword = async (plainPassword, passwordHash) =>
  bcrypt.compare(plainPassword, passwordHash);

module.exports = { hashPassword, comparePassword };

const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { User } = require("../db/models");

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Missing bearer token" });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const requireRole = (...allowedRoles) => {
  const normalized = allowedRoles.flat().map((role) => String(role).toLowerCase());

  return (req, res, next) => {
    const currentRole = String(req.user?.role || "").toLowerCase();
    if (!normalized.includes(currentRole)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    return next();
  };
};

module.exports = { requireAuth, requireRole };

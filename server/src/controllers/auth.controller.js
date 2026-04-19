const { z } = require("zod");
const { User } = require("../db/models");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signAccessToken } = require("../services/token.service");

const allowedRoles = ["farmer", "buyer", "transporter", "warehouse", "retailer", "consumer", "admin"];

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(allowedRoles).default("farmer")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(allowedRoles).optional()
});

const register = async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ where: { email: payload.email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      passwordHash
    });

    const token = signAccessToken({ userId: user.id, email: user.email });
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await User.findOne({ where: { email: payload.email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await comparePassword(payload.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (payload.role && String(payload.role).toLowerCase() !== String(user.role).toLowerCase()) {
      return res.status(403).json({ message: "Role does not match this account" });
    }

    const token = signAccessToken({ userId: user.id, email: user.email });
    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };

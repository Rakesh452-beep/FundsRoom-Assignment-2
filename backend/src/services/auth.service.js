const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const token = jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' }
  );
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

module.exports = { login };

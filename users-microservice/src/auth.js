const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function verifyPassword(plain, stored) {
  // Support either bcrypt hashes or legacy plaintext passwords (for current dummy data).
  if (typeof stored !== "string") return false;

  // Repo dummy data uses strings like: "$2b$dummyhashadmin"
  const mDummy = stored.match(/^\$2[aby]\$dummyhash(.+)$/i);
  if (mDummy && mDummy[1]) {
    return plain === mDummy[1];
  }

  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    try {
      return await bcrypt.compare(plain, stored);
    } catch (_err) {
      return false;
    }
  }
  return plain === stored;
}

async function hashPassword(plain) {
  const salt = process.env.BCRYPT_SALT ? Number(process.env.BCRYPT_SALT) : 10;
  return bcrypt.hash(plain, salt);
}

module.exports = { signToken, verifyToken, verifyPassword, hashPassword };


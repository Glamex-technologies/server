const jwt = require("jsonwebtoken");
const Token = require("../../startup/model").models.Token;
const genrateToken = async(data) => {
  const token = jwt.sign(
    data,
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRY_TIME },
  );
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000); 
  await Token.create({
    token,
    expires_at: expiresAt,
  });
  return token;
}

const verifyToken = async(token) => {
  try {
    const record = await Token.findOne({ where: { token: token } });
    if (!record) return null;
    if (new Date() > record.expires_at) {
      return null; 
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = {
  genrateToken,
  verifyToken
};
const jwt = require("jsonwebtoken");
const config = require("../config/config");

const generateToken = (user) => {
    return jwt.sign(
        { email: user.email },
        config.jwt_secret,
        { expiresIn: "30d" }
    );
};

module.exports = { generateToken };
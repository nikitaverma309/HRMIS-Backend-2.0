const Employee = require("../models/employeeModel");

const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const tokenManage = require("../models/tokenManage");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided in header" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.SECRETKEY);

    let user = await Employee.findById(decoded.id.id);

    if (!user) {
      return res.status(401).json({ message: "User not found for this token" });
    }

    req.user = user;
    req.user.roleType = decoded.id.userType;

    const tokenRecord = await tokenManage.findOne({
      token: token,
      id: decoded.id.id,
      status: true,
    });

    if (!tokenRecord) {
      throw new Error("Token is invalid, expired, or not active");
    }

    req.tokenPayload = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token is invalid or expired, please login again" });
  }
});


const authorize = (...allowedRoles) => {
  return (req, res, next) => {

    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided in header" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.SECRETKEY);

    if (!decoded || !decoded.id) {
      return res.status(403).json({ message: "User not authenticated" });
    }

    const userRole = decoded.id.type;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    next();
  };
};



module.exports = { authMiddleware, authorize };

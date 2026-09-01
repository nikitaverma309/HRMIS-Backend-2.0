const { generateToken } = require("../config/jwtToken");
const asyncHandler = require("express-async-handler");
const employeeModel = require("../models/employeeModel");
const tokenManage = require("../models/tokenManage");
const logActivity = require("../helper/activityLog");
const { rXDecrypt } = require("../utils/rXSecure");

const loginUser = asyncHandler(async (req, res) => {
  try {
    const IP =
      req.headers["x-forwarded-for"]?.split(",").shift() ||
      req.socket?.remoteAddress;
    const userIp = IP.split(":")[0];
    const encrypted = req.body.encryptyKaran;

    const recivedData = JSON.parse(rXDecrypt(encrypted));
    const { username, password, timestamp } = recivedData;
    if (!timestamp || isNaN(new Date(timestamp).getTime())) {
      return res.status(400).json({ error: "Invalid or missing timestamp" });
    }
    const diffMinutes = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60);
    if (diffMinutes > 10) {
      return res.status(400).json({ error: "Invalid Id And Password" });
    }

    // ── Employee, matched by empCode ──
    const findEmployee = await employeeModel.findOne({
      empCode: username,
      verified: true,
    });
    if (!findEmployee) {
      return res
        .status(201)
        .send({ msg: "Invalid credentials. Please try again." });
    }
    if (!(await findEmployee.isPasswordMatched(password))) {
      return res
        .status(201)
        .send({ msg: "Invalid credentials. Please try again." });
    }

    const session = await tokenManage.find({ id: findEmployee._id });
    if (session && session.length > 0) {
      await tokenManage.deleteMany({ id: findEmployee._id });
    }

    const employeeFullName = `${findEmployee.firstName} ${findEmployee.lastName}`;
    const resultResponse = { status: true };
    resultResponse.token = generateToken({
      id: findEmployee._id,
      username: employeeFullName,
      userType: "Employee",
      empCode: findEmployee.empCode,
      type: 4,
      employeeName: employeeFullName,
    });

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await tokenManage.create({
      token: resultResponse.token,
      expiresAt: expiresAt,
      id: findEmployee._id,
      userIp,
    });

    await logActivity({
      req,
      userId: findEmployee._id,
      userName: employeeFullName,
      modifiedBy: findEmployee._id,
      activityType: "Login",
      subject: "User Login",
      referenceModel: "tokenManage",
      body: { userId: findEmployee._id, empCode: findEmployee.empCode },
      activityDescription: `User logged in successfully`,
      status: "Success",
      docStatus: 1,
    });

    return res.status(200).json(resultResponse);
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).send({ message: error.message });
  }
});

const checkToken = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  const IP =
    req.headers["x-forwarded-for"]?.split(",").shift() ||
    req.socket?.remoteAddress;
  let userIp = IP.split(":")[0];

  if (userIp && userIp.includes(",")) {
    userIp = userIp.split(",")[0];
  }
  if (userIp && userIp.startsWith("::ffff:")) {
    userIp = userIp.split("::ffff:")[1];
  }

  try {
    const x = await tokenManage.findOne({ token, userIp });
    if (x) {
      res.status(200).send({ msg: "Found" });
    } else {
      res.status(201).send({ msg: "Not Found" });
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
});

const handleLogout = asyncHandler(async (req, res) => {
  try {
    const userId = String(req.params.id);
    const x = await tokenManage.deleteMany({ id: userId });

    if (x) {
      res.status(200).send({ msg: "Logout Successfuly." });

      await logActivity({
        req,
        userName: req.user?.name,
        userId: userId,
        activityType: "Logout",
        subject: "Logout",
        referenceModel: "tokenManage",
        body: { x, userId },
        activityDescription: "Id deleteMany On tokenManage  Logout Successfuly.",
        status: "Success",
      });
    }
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).send({ message: error.message });
  }
});

module.exports = {
  loginUser,
  checkToken,
  handleLogout,
};

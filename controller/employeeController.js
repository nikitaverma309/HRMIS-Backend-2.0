const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const fss = require("fs").promises;
const employeeModel = require("../models/employeeModel");
const faceAttendanceModel = require("../models/faceAttendanceModel");
const attendanceModel = require("../models/attendanceModel");
const tokenManage = require("../models/tokenManage");
const logActivity = require("../helper/activityLog");
const { generateToken } = require("../config/jwtToken");

async function generateEmpCode() {
  let code;
  let exists = true;
  while (exists) {
    // 11-digit numeric code (10,000,000,000 - 99,999,999,999)
    code = Math.floor(10000000000 + Math.random() * 90000000000).toString();
    exists = await employeeModel.findOne({ empCode: code });
  }
  return code;
}

const registerEmployee = asyncHandler(async (req, res) => {
  try {
    const { firstName, lastName, email, contact, address, district, password } = req.body;
    if (!firstName || !lastName || !email || !contact || !address || !district || !password) {
      return res.status(400).json({
        msg: "firstName, lastName, email, contact, address, district and password are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters" });
    }

    const screenShot = req.files ? req.files.map((file) => file.path) : null;
    if (!screenShot || screenShot.length === 0) {
      return res.status(400).json({ msg: "Face image is required for registration" });
    }

    const existingEmployee = await employeeModel.findOne({ email });
    if (existingEmployee) {
      return res.status(409).json({ msg: "Employee already registered with this email" });
    }

    const empCode = await generateEmpCode();
    const hashedPassword = await bcrypt.hash(password, 10);
    const newEmployee = await employeeModel.create({
      firstName,
      lastName,
      empCode,
      email,
      contact,
      address,
      district,
      password: hashedPassword,
    });

    const imageBuffer = await fss.readFile(screenShot[0]);
    const imageBase64 = imageBuffer.toString("base64");
    await faceAttendanceModel.create({
      empCode: newEmployee.empCode,
      name: `${firstName} ${lastName}`,
      uploadPath: screenShot[0],
      imageBase64,
    });

    await logActivity({
      req,
      userId: newEmployee._id,
      userName: `${firstName} ${lastName}`,
      activityType: "Create",
      subject: "Employee Registration",
      referenceModel: "employeeModel",
      body: { empCode },
      activityDescription: "New employee registered, awaiting face verification.",
      status: "Success",
    });

    const employeeResponse = newEmployee.toObject();
    delete employeeResponse.password;

    return res.status(201).json({
      msg: "Registration successful. Awaiting face verification.",
      empCode: newEmployee.empCode,
      employee: employeeResponse,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
});

const employeeLogin = asyncHandler(async (req, res) => {
  try {
    const IP =
      req.headers["x-forwarded-for"]?.split(",").shift() ||
      req.socket?.remoteAddress;
    const userIp = IP ? IP.split(":")[0] : undefined;

    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ msg: "identifier and password are required" });
    }

    const findEmployee = await employeeModel.findOne({
      $or: [{ empCode: identifier }, { email: identifier }],
    });
    if (!findEmployee || !(await findEmployee.isPasswordMatched(password))) {
      return res.status(401).json({ msg: "Invalid credentials. Please try again." });
    }

    // `employeeModel.verified` is unused/cosmetic — the real face-verification
    // status lives on the faceattendances collection (see scripts/verifyEmployee.js).
    const faceStatus = await faceAttendanceModel.findOne({
      empCode: findEmployee.empCode,
    });
    if (!faceStatus || !faceStatus.verified) {
      return res.status(403).json({
        msg: "Your face is not verified yet. Please wait for admin approval.",
      });
    }

    await tokenManage.deleteMany({ id: findEmployee._id });

    const employeeFullName = `${findEmployee.firstName} ${findEmployee.lastName}`;
    const token = generateToken({
      id: findEmployee._id,
      username: employeeFullName,
      userType: "Employee",
      empCode: findEmployee.empCode,
      type: 4,
      employeeName: employeeFullName,
    });

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await tokenManage.create({
      token,
      expiresAt,
      id: findEmployee._id,
      userIp,
    });

    await logActivity({
      req,
      userId: findEmployee._id,
      userName: employeeFullName,
      modifiedBy: findEmployee._id,
      activityType: "Login",
      subject: "Employee Login",
      referenceModel: "tokenManage",
      body: { userId: findEmployee._id, empCode: findEmployee.empCode },
      activityDescription: "Employee logged in successfully",
      status: "Success",
      docStatus: 1,
    });

    const employeeResponse = findEmployee.toObject();
    delete employeeResponse.password;

    return res.status(200).json({ token, employee: employeeResponse });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
});

const getEmployeeProfile = asyncHandler(async (req, res) => {
  try {
    const empCode = req.query.empCode || req.params.empCode;
    if (!empCode) {
      return res.status(400).json({ msg: "empCode is required" });
    }

    const employee = await employeeModel.findOne({ empCode }).select("-password");
    if (!employee) {
      return res.status(404).json({ msg: "No employee found with this empCode" });
    }

    const faceStatus = await faceAttendanceModel.findOne({ empCode }).select("-imageBase64");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await attendanceModel.findOne({
      empCode,
      loginTime: { $gte: today },
    });

    return res.status(200).json({
      employee,
      faceStatus: faceStatus
        ? { verified: faceStatus.verified, reRegister: faceStatus.reRegister }
        : null,
      todayAttendance: todayAttendance || null,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
});

// Full attendance history for one employee, most recent first.
const getEmployeeAttendanceHistory = asyncHandler(async (req, res) => {
  try {
    const empCode = req.query.empCode || req.params.empCode;
    if (!empCode) {
      return res.status(400).json({ msg: "empCode is required" });
    }

    const records = await attendanceModel
      .find({ empCode })
      .sort({ loginTime: -1 });

    return res.status(200).json({ empCode, count: records.length, records });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
});

module.exports = {
  registerEmployee,
  employeeLogin,
  getEmployeeProfile,
  getEmployeeAttendanceHistory,
};

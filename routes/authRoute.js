const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

/* ================= MIDDLEWARES ================= */
const { authMiddleware, authorize, verifyOwnEmpCode } = require("../middleware/authMiddleware");

/* ================= CONTROLLERS ================= */
const { loginUser, checkToken, handleLogout } = require("../controller/userController");
const {
  registerEmployee,
  employeeLogin,
  getEmployeeProfile,
  getEmployeeAttendanceHistory,
} = require("../controller/employeeController");

const {
  recognizeEmployeeFace,
  getUnVerifiedFaceNode,
  updateFaceNode,
  reEnterFaceNode,
  addAttendanceNode,
  reRegisterEmployeeFace,
  getVerifiedFaceCountCollegeWise,
  getFaceVerificationStatus,
} = require("../controller/faceAttendanceController");

/* ================= FILE UPLOAD (FACE IMAGES) ================= */
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path.basename(file.originalname, ext);

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Only .jpg, .jpeg, .png files are allowed"), false);
  }
  if ((file.originalname.match(/\./g) || []).length > 1) {
    return cb(
      new Error("File name contains multiple extensions, which is not allowed"),
      false,
    );
  }
  if (baseName.length > 50) {
    return cb(new Error("Filename is too long. Maximum 50 characters allowed"), false);
  }
  cb(null, true);
};

const storageFace = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./controller/face");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const uploadFace = multer({
  storage: storageFace,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter,
});

const storageRecognizeFace = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./controller/temp");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const uploadRecognizeFace = multer({
  storage: storageRecognizeFace,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter,
});

/* ================= AUTH / TOKEN ================= */
router.post("/api/login", loginUser);
router.get("/api/user-logout/:id", authMiddleware, handleLogout);
router.get("/api/auth/check-token", checkToken);

/* ================= EMPLOYEE REGISTRATION ================= */
router.post("/api/employee/register", uploadFace.array("files"), registerEmployee);
router.post("/api/employee/login", employeeLogin);
router.get("/api/employee/profile", getEmployeeProfile);
router.get("/api/employee/attendance-history", getEmployeeAttendanceHistory);

/* ================= FACE ATTENDANCE ================= */
router.post(
  "/api/recognize-face/check",
  uploadRecognizeFace.array("files"),
  recognizeEmployeeFace,
);
router.get(
  "/api/get/unverified-faces-node/:id",
  authMiddleware,
  authorize(4),
  getUnVerifiedFaceNode,
);
router.put(
  "/api/employee/verify-face-node/:id",
  authMiddleware,
  authorize(4),
  updateFaceNode,
);
router.put(
  "/api/employee/reenter-face-node/:id",
  authMiddleware,
  reEnterFaceNode,
);
router.get("/api/attendance/add-node", addAttendanceNode);
router.get("/api/employee/face-verification-status", getFaceVerificationStatus);
router.post(
  "/api/reregister-face/update",
  uploadFace.array("files"),
  reRegisterEmployeeFace,
);
router.get(
  "/api/get/face-verified-count/:id",
  authMiddleware,
  authorize(4),
  getVerifiedFaceCountCollegeWise,
);

module.exports = router;

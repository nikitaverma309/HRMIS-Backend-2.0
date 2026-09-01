const asyncHandler = require("express-async-handler");
const path = require("path");
const fs = require("fs");
const fss = require("fs").promises;
const faceapi = require("@vladmandic/face-api");
const { Canvas, Image, ImageData, loadImage } = require("canvas");
const employeeModel = require("../models/employeeModel");
const faceAttendanceModel = require("../models/faceAttendanceModel");
const attendanceModel = require("../models/attendanceModel");
const logActivity = require("../helper/activityLog");
const { isWithinAllowedLocation } = require("../helper/geofence");
// // Monkey-patch environment
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function loadModels() {
  if (!modelsLoaded) {
    const modelPath = path.join(__dirname, "../facemodels");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    // console.log("Models loaded successfully.");
    modelsLoaded = true; // Set flag to true after models are loaded
  }
}

async function recognizeFace(referenceImagePath, queryImagePath) {
  // Load the reference image using loadImage
  const referenceImage = await loadImage(referenceImagePath);
  const referenceDetection = await faceapi
    .detectSingleFace(referenceImage)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!referenceDetection) {
    return "No face detected in reference image.";
  }

  const labeledDescriptor = new faceapi.LabeledFaceDescriptors("Person A", [
    referenceDetection.descriptor,
  ]);

  // Load the query image using loadImage
  const queryImage = await loadImage(queryImagePath);
  const queryDetections = await faceapi
    .detectAllFaces(queryImage)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (queryDetections.length === 0) {
    return "No faces detected in query image.";
  }

  // Match the query detections with the labeled descriptors
  const faceMatcher = new faceapi.FaceMatcher([labeledDescriptor]);
  const results = queryDetections.map((detection) =>
    faceMatcher.findBestMatch(detection.descriptor)
  );
  // console.log()
  // results.map((result, i) => {
  //   return result._distance;
  //   console.log(`Face ${i + 1}: ${result.toString()}`);
  // });
  return results[0]._distance;
}

// async function main() {
//   await loadModels();
//   const referenceImagePath = path.join(
//     __dirname,
//     "camera_image_1734003102829.jpeg"
//   ); // Replace with your reference image path
//   const queryImagePath = path.join(
//     __dirname,
//     "camera_image_1734951425250.jpeg"
//   ); // Replace with your query image path
//   await recognizeFace(referenceImagePath, queryImagePath);
// }

// main().catch((err) => console.error(err));

const reRegisterEmployeeFace = asyncHandler(async (req, res) => {
  try {
    const { empCode } = req.body;
    const screenShot = req.files ? req.files.map((file) => file.path) : null;
    const imageBuffer = await fss.readFile(screenShot[0]);
    const imageBase64 = imageBuffer.toString("base64");
    const checkEmployee = await employeeModel.findOne({ empCode: empCode });
    if (!checkEmployee)
      return res.status(201).json({ msg: "Employee Not Exists" });

    const checkFaceStatus = await faceAttendanceModel.findOne({
      empCode: empCode,
    });
    if(!checkFaceStatus){
      return res.status(201).json({ msg: "Employee Face Not Exists" });
    }
    const body = {
      empCode: empCode,
      name: checkEmployee.name,
      college: checkEmployee.college,
      uploadPath: screenShot[0],
      imageBase64: imageBase64,
      verified: false,
      reRegister: false,
    };
    const add = await faceAttendanceModel.findByIdAndUpdate(
      checkFaceStatus._id,
      body,
      { new: true }
    );

        await logActivity({
        req,  // <--- REQUIRED
        activityType: "Create",
        subject: "Face Re-registered ",
        referenceModel: "faceAttendanceModel",
        body: { add: add, finalBody:body, },
        activityDescription: `. Face Re-registered  successfully.`,
        status: "Success",
      });

    if (add) {
      return res.status(200).json({ msg: "Face Re-registered Successfully.Wait for Verification" });
    } else {
      res.status(201).json({ msg: "Face Registeration Failed" });
    }
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).send({ message: error.message });
  }
});

const recognizeEmployeeFace = asyncHandler(async (req, res) => {

  // console.log("Entering Here");
  
  const { empCode } = req.body;
  const screenShot = req.files ? req.files.map((file) => file.path) : null;
  const checkEmployee = await employeeModel.findOne({ empCode: empCode });
  if (!checkEmployee)
    return res.status(201).json({ msg: "Employee Not Exists" });

  const checkFaceStatus = await faceAttendanceModel.findOne({
    empCode: empCode,
  });

  // console.log("Entering Here 2");

  
  if (
    checkFaceStatus &&
    checkFaceStatus.verified === false &&
    checkFaceStatus.reRegister === false
  ) {
    return res.status(201).json({ msg: "Face Verification Pending" });
  }
  await loadModels();

  // console.log("Entering Here 3");


  const referenceImagePath = path.join(
    __dirname,
    "..",
    checkFaceStatus.uploadPath
  );
  const queryImagePath = path.join(__dirname, "..", screenShot[0]);
  const response = await recognizeFace(referenceImagePath, queryImagePath);
  if (response === "No faces detected in query image.") {
    return res.status(201).send({ msg: "Face Not Detected In Captured Image" });
  } else if (response === "No face detected in reference image.") {
    return res
      .status(201)
      .send({ msg: "Face Not Detected In Reference Image" });
  } else {
    const matchPercentage = Number(response).toFixed(2);
    if (matchPercentage < 0.4) {
      return res.status(200).json({ msg: empCode });
    } else {
      return res.status(201).json({ msg: "No Match Found" });
    }
  }
});

const getUnVerifiedFaceNode = asyncHandler(async (req, res) => {
  try {
    const getUnVerifiedFaceNode = await faceAttendanceModel.find({
      college: String(req.params.id),
      verified: false,
      
    });
    if (getUnVerifiedFaceNode.length > 0) {
      return res.status(200).send(getUnVerifiedFaceNode);
    } else {
      return res.status(201).send({ msg: "No Record Found" });
    }
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).send({ message: error.message });
  }
});

const updateFaceNode = asyncHandler(async (req, res) => {
  try {
    const empId = req.params.id;
    const updateFaceStatus = {
      verified: true,
    };
    const updateFaceNode = await faceAttendanceModel.findByIdAndUpdate(
      { _id: empId },
      updateFaceStatus,
      { new: true }
    );

            await logActivity({
        req,  // <--- REQUIRED
        activityType: "Update",
        subject: " updateFaceNode ",
        referenceModel: "faceAttendanceModel",
        body: { updateFaceNode: updateFaceNode},
        activityDescription: `.  updateFaceNode  successfully.`,
        status: "Success",
      });


    if (updateFaceNode) {
      return res.status(200).send(updateFaceNode);
    } else {
      return res.status(200).send({ msg: "Updation Failed" });
    }
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).send({ message: error.message });
  }
});

const reEnterFaceNode = asyncHandler(async (req, res) => {
  try {
    const empId = req.params.id;
    const updateBody = {
      reRegister: true,
    };
    const reEnterFaceNode = await faceAttendanceModel.findByIdAndUpdate(
      { _id: empId },
      updateBody,
      { new: true }
    );
    if (reEnterFaceNode) {
      return res.status(200).send(reEnterFaceNode);
    } else {
      return res.status(200).send({ msg: "Updation Failed" });
    }
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).send({ message: error.message });
  }
});

const addAttendanceNode = asyncHandler(async (req, res) => {
  try {
    const empCode = req.query.empCode;
    const attendanceFrom = req.query.attendanceFrom
      ? req.query.attendanceFrom
      : "MOBILE";
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.long);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).send({ msg: "Location (lat, long) is required" });
    }
    if (!isWithinAllowedLocation(latitude, longitude)) {
      return res
        .status(400)
        .send({ msg: "Attendance not allowed outside registered location" });
    }
    const getEmployeeData = await employeeModel.findOne({ empCode });
    const getEmployeeFaceData = await faceAttendanceModel.findOne({ empCode });
    if (!getEmployeeData) {
      return res.status(400).send({ msg: "Employee not found" });
    }

    if (!getEmployeeFaceData.verified) {
      return res.status(400).send({ msg: "Face Not Verified" });
    }
    if (getEmployeeFaceData.reRegister) {
      return res.status(400).send({ msg: "Face Not Re-registered" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingAttendance = await attendanceModel.findOne({
      empCode,
      loginTime: { $gte: today },
    });
    if (existingAttendance) {
      existingAttendance.logoutTime = new Date();
      await existingAttendance.save();
      return res.status(200).send({
        msg: "Logout time updated successfully",
        attendance: existingAttendance,
        employeeData: getEmployeeData,
        getEmployeeFaceData: getEmployeeFaceData,
      });
    } else {
      const body = {
        name: `${getEmployeeData.firstName} ${getEmployeeData.lastName}`,
        empId: String(getEmployeeData._id),
        empCode: getEmployeeData.empCode,
        college: getEmployeeData.college,
        loginTime: new Date(),
        attendanceFrom: attendanceFrom,
      };
      const attendance = await attendanceModel.create(body);
      return res.status(200).send({
        msg: "Attendance created successfully",
        attendance,
        employeeData: getEmployeeData,
        getEmployeeFaceData: getEmployeeFaceData,
      });
    }
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .send({ message: error.message || "Internal Server Error" });
  }
});

// Public status check so the app can block attendance capture before the
// camera even opens, instead of only finding out after uploading a photo.
const getFaceVerificationStatus = asyncHandler(async (req, res) => {
  try {
    const empCode = req.query.empCode;
    if (!empCode) {
      return res.status(400).json({ msg: "empCode is required" });
    }

    const employee = await employeeModel.findOne({ empCode });
    if (!employee) {
      return res.status(404).json({
        msg: "No employee found with this empCode",
        action: "CHECK_EMP_CODE",
      });
    }

    const faceStatus = await faceAttendanceModel.findOne({ empCode });
    if (!faceStatus) {
      return res.status(404).json({
        msg: "No face registered for this employee",
        verified: false,
        action: "REGISTER_FACE",
      });
    }

    if (faceStatus.reRegister) {
      return res.status(200).json({
        verified: faceStatus.verified,
        reRegister: true,
        msg: "Face needs to be re-registered",
        action: "REGISTER_FACE",
      });
    }

    if (!faceStatus.verified) {
      return res.status(200).json({
        verified: false,
        reRegister: false,
        msg: "Face registered, awaiting admin verification",
        action: "WAIT_FOR_VERIFICATION",
      });
    }

    return res.status(200).json({
      verified: true,
      reRegister: false,
      msg: "Face verified, ready for attendance",
      action: "PROCEED_TO_CAMERA",
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
});

const getVerifiedFaceCountCollegeWise = asyncHandler(async (req, res) => {
  try {
    const collegeId = req.params.id;
    const getVerifiedFaceCount = await faceAttendanceModel.countDocuments({college: collegeId,verified: true});
    
    if (getVerifiedFaceCount) {
      return res.status(200).json(getVerifiedFaceCount);
    } else {
      return res.status(201).json({ msg: "Failed To Calculate Face Count" });
    }
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).send({ message: error.message });
  }
});

module.exports = {
  recognizeEmployeeFace,
  getUnVerifiedFaceNode,
  updateFaceNode,
  reEnterFaceNode,
  addAttendanceNode,
  reRegisterEmployeeFace,
  getVerifiedFaceCountCollegeWise,
  getFaceVerificationStatus,
};

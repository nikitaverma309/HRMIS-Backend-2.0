const mongoose = require("mongoose"); // Erase if already required
const bcrypt = require("bcrypt");
// Declare the Schema of the Mongo model
var employeeSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      index: true,
    },
    lastName: {
      type: String,
      required: true,
      index: true,
    },
    empCode: {
      type: String,
      required: true,
      // unique:true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    contact: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
    },
    faceVerified: {
      type: Boolean,
      default: false,
    },
    reRegisteredFace: {
      type: Boolean,
      default: false,
    },
    encodedImage: {
      type: String,
    },
    activeStatus: {
      type: Boolean,
      default: true,
    },
    workingStatus: {
      type: String,
      enum: ["active", "inactive", "retired", "death", "suspended"],
      default: "active",
    },
    //  Add Profile Image Field
    profileImgUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);
employeeSchema.methods.isPasswordMatched = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
//Export the model
module.exports = mongoose.model("employee", employeeSchema);

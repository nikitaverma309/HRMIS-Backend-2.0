const mongoose = require('mongoose'); // Erase if already required
// Declare the Schema of the Mongo model
var FaceAttendanceSchema = new mongoose.Schema({
    empCode:{
        type: String,
        index: true,
        required: true,
    },
    name:{
        type: String,
    },
    college:{
        type: String,
    },
    uploadPath: {
        type: String,
    },
    verified:{
        type: Boolean,
        default: false,
    },
    reRegister:{
        type: Boolean,
        default: false,
    },
    faceVerificationDate: {
        type: Date,
    },
    imageBase64: {
        type: String,
    },
}, {timestamps: true});
//Export the model
module.exports = mongoose.model('faceattendance', FaceAttendanceSchema);
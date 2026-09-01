const mongoose = require('mongoose');
var attendanceSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        index:true,
    },
    empId: {
        type: String,
        required: true,
        index: true,
    },
    empCode:{
        type:String,
        required:true,
        index:true,
    },
    college:{
        type: String,
        index: true,
    },
    loginTime:{
        type: Date,
        Default: new Date(),
    },
    logoutTime:{
        type: Date,
        Default: new Date(),
    },
    attendanceFrom: {
        type: String,
    }
}, {timestamps: true});
//Export the model
module.exports = mongoose.model('attendance', attendanceSchema);
const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.Mixed,
    },
    userName:{
        type: String,
        maxlength: 100 // Limit the length of the username
    },
    frontendRoute: {
        type: String,
    },
    apiRoute: {
        type: String,
        required: true
    },

    method: {
        type: String,
        enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "UPDATE"],
    },

    creation: {
        type: Date,
        default: Date.now
    },
    modifiedBy: {
    type: mongoose.Schema.Types.Mixed
    },

    docStatus: {
        type: Number,
        enum: [0, 1, 2], // 0 = Draft, 1 = Submitted, 2 = Cancelled
        default: 0
    },

    referenceModel: {
        type: String,   // E.g., "Employee", "LeaveRequest"
    },
    activityType: {
        type: String,
        enum: [
            "Login",          // login request
            "Logout",         // logout action
            "View",           // viewing a record (GET)
            "Create",         // creating a new document (POST)
            "Submit",         // submitting a form or application (POST)
            "Approve",        // approving a record (POST)
            "Reject",         // rejecting a record (POST)
            "Forward",        // forwarding to another user (POST)
            "Update",         // updating a record (PUT/PATCH)
            "Delete",         // deleting a record (DELETE)
            "Error",          // error logging
            "AccessDenied",   // failed access attempt
            "Download",       // downloading a file
            "Upload",         // uploading a file (POST)
            "Print",          // printing a record
            "StatusChange"    // generic status changes (POST)
        ],
        required: true
    },
    subject: {
        type: String,
        required: true,
        maxlength: 100 // Limit the length of the subject
    },

    body: {
        type: mongoose.Schema.Types.Mixed, // To store any additional data related to the activity
        required: false
    },
    activityDescription: {
        type: String,
        maxlength: 500 // Limit the length of the description
    },

    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Success", "Failed"],
        default: "Success"
    },
    errorMessage: {
        type: String,
        maxlength: 500, // Limit the length of the error message
        required: false
    },
},

    {
        timestamps: {
            createdAt: 'creation',
            updatedAt: 'modified'
        },
        collection: "activity_logs"
    });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);

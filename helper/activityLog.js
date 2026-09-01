const ActivityLog = require("../models/activityLogModel");

// Activity Logger Function
const logActivity = async ({
    req,
    userId = req.user,
    userName = "",
    activityType = "UNKNOWN",
    subject = "No Subject",
    referenceModel = null,
    body = {},
    activityDescription = "No Description Provided",
    status = "Success",
    errorMessage = "",
    modifiedBy,
    docStatus = 0
}) => {
    try {
        const userFromReq = req.user || {};
        const finalUserId = userFromReq?._id || userId || "Anonymous";
        const finalModifiedBy = modifiedBy || userFromReq?._id || "System";
        const finalUserName = userName || userFromReq?.name || userFromReq?.username || "Anonymous";

        // Log missing critical fields
        let missing = [];
        if (!finalUserId && !userFromReq?._id) missing.push("userId");
        if (!activityType || activityType === "UNKNOWN") missing.push("activityType");
        if (!subject || subject === "No Subject") missing.push("subject");

        if (missing.length > 0) {
            console.warn("⚠️ Missing required fields for activity logging:", missing.join(", "));
        }

        const getClientIP = (req) => {
            const forwarded = req.headers?.["x-forwarded-for"];
            return forwarded ? forwarded.split(",")[0].trim() : (req.ip || req.connection?.remoteAddress || "Unknown IP");
        };

        const logData = {
            userId: finalUserId,
            userName: finalUserName,
            activityType: activityType || "UNKNOWN",
            subject: subject || "No Subject",
            referenceModel: referenceModel || "N/A",
            body: body || {},
            activityDescription: activityDescription || "No Description",
            apiRoute: req?.originalUrl || "Unknown API Route",
            frontendRoute: req.headers?.["web-url"] || req.headers?.["referer"] || "Unknown Frontend Route",
            method: req?.method || "UNKNOWN",
            ipAddress: getClientIP(req),
            userAgent: req.headers?.["user-agent"] || "Unknown User Agent",
            status: status || "Pending",
            errorMessage: errorMessage || "",
            modifiedBy: finalModifiedBy,
            docStatus: docStatus || 0,
            timestamp: new Date() // Added timestamp for better logging
        };

        await ActivityLog.create(logData);
        // console.log("✅ Activity logged successfully");
        return { success: true, logId: logData._id };
    } catch (err) {
        console.error("❌ Activity logging failed:", err.message);
        return { success: false, error: err.message };
    }
};

module.exports = logActivity;
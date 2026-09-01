const express = require("express");
const cors = require("cors");
const dbConnect = require("./config/dbConnect");
const dotenv = require("dotenv").config();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const authRouter = require("./routes/authRoute");
const {  notFound,   errorHandler,   blockSuspiciousInput, } = require("./middleware/errorHandler");
const app = express();
const PORT = process.env.PORT || 3001;
const SERVERTYPE = process.env.SERVERTYPE;
const { rXEncrypt, rXDecrypt } = require("./utils/rXSecure");
dbConnect();

function getFormattedDateTime() {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Month is 0-based
  const year = String(now.getFullYear()); // Last 2 digits of year

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

const logFile = path.join(__dirname, "logs.json");
// console.log(logFile,"Getting log File");
function logError(error, req) {
  const logEntry = {
    time: getFormattedDateTime(),
    message: error.message,
    stack: error.stack,
    url: req?.originalUrl || "N/A",
    method: req?.method || "N/A",
  };

  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
}

app.use((err, req, res, next) => {
  logError(err, req);
  res.status(500).json({ error: "Something went wrong!" });
});
//  Request Parsing
app.use(bodyParser.json({ limit: "120mb" }));
app.use(express.json({ limit: "120mb" }));
app.use(express.urlencoded({ limit: "120mb", extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));

// Rate Limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: " Too Many Requests From This IP. Please Try Again Later.",
    });
  },
});
app.use(limiter);

//  Secure HTTP Headers
app.use(helmet({
    contentSecurityPolicy: false, // 🔥 disable helmet CSP
  }));
app.use((req, res, next) => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("X-Powered-By", "");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://heonline.cg.nic.in; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' http://localhost:8800 http://localhost:3001 http://localhost:5173 https://heonline.cg.nic.in; " +
      "frame-src 'self' http://localhost:8800 data: blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';",
  );
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

//  Force HTTPS in PRODUCTION


//  CORS Configuration
if (SERVERTYPE === "PRODUCTION") {
  app.set("trust proxy", true);
  const allowedOrigins = ["https://heonline.cg.nic.in"];
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(" Not Allowed By CORS"));
      }
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
} else {
  app.set("trust proxy", false);
  app.use(cors());
}

//  Allow only safe HTTP methods
app.use((req, res, next) => {
  const allowedMethods = ["GET", "POST", "DELETE", "PUT"];
  
  if(req.method === "TRACE"){
    return res.status(405).json({
      status : false,
      message:"TRACE method not allowed"
    })
  }
 
  
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      statusCode: 405,
      status: false,
      message: "Method Not Allowed",
    });
  }
  next();
});

// Static File Serving
app.use("/lmsbackend/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/lmsbackend/controller/face",express.static(path.join(__dirname, "controller/face")),);

//  Routes
app.get("/", (req, res) => res.send("Hello World"));
app.use("/lmsbackend", blockSuspiciousInput, authRouter);

// 404 & Error Handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  // console.log(`🚀 Server Is Running At => http://10.121.64.215:${PORT}`);
  console.log(`🚀 Server Is Running At => http://localhost:${PORT}`);
});




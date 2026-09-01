const { stack } = require("../routes/authRoute");

const notFound = (req, res, next) => {
    const error = new Error(`Not Found: ${req.originalURL}`);
    res.status(404);
    next(error);
}

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode== 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err?.message,
        stack: err?.stack
    })
}
    


const suspiciousPattern = /<\s*script|javascript\s*:|on\w+\s*=/i;


const decodeInput = (str) => {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

const check = (obj) => {
  for (let key in obj) {
    if (typeof obj[key] === "string") {
      const value = decodeInput(obj[key]);
      if (suspiciousPattern.test(value)) {
        return true;
      }
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      if (check(obj[key])) return true; // recursive check
    }
  }
  return false;
};

const blockSuspiciousInput = (req, res, next) => {
  if ( check(req.query) || check(req.params)) {
    return res.status(400).json({ error: "Suspicious content detected" });
  }
  next();
};



module.exports= {notFound, errorHandler,blockSuspiciousInput};
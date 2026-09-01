const jwt = require("jsonwebtoken");
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.SECRETKEY, { expiresIn: "2h" });

    // return jwt.sign({id},process.env.SECRETKEY, {expiresIn: "3d"});
}
module.exports = {generateToken};
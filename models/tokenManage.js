const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  id: { type: String, required: true },
  token: { type: String, required: true },
  userIp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  status: { type: Boolean, default: true },
 
}, {
    timestamps: true,
  },);

TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-remove expired tokens

module.exports = mongoose.model("TokenSchema", TokenSchema);

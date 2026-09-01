// comment this line on backend   
// import CryptoJS from 'crypto-js';
// comment this line on frantend
const CryptoJS = require('crypto-js')
const isNode = typeof window === 'undefined';
let rawKey;
let AES_KEY;
// comment this line on frantend
rawKey = process.env.SECRET_KEY; 
// comment this line on backend    
// rawKey = import.meta.env.VITE_SECRET_KEY 

// Validate and derive key
if (!rawKey || rawKey.length < 8) {
    throw new Error("SECRET_KEY must be at least 8 characters.");
}
AES_KEY = CryptoJS.SHA256(rawKey);

// Encrypt function
function rXEncrypt(plainText) {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plainText, AES_KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    return `${CryptoJS.enc.Base64.stringify(iv)}:${encrypted.toString()}`;
}

// Decrypt function
function rXDecrypt(cipherText) {
    const [ivStr, encrypted] = cipherText.split(":");
    if (!ivStr || !encrypted) throw new Error("Invalid encrypted format");

    const iv = CryptoJS.enc.Base64.parse(ivStr);
    const decrypted = CryptoJS.AES.decrypt(encrypted, AES_KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// Final export: dual environment friendly
if (isNode) {
    // For backend (CommonJS)
    module.exports = { rXEncrypt, rXDecrypt };
} else {
    // For frontend (attach to window)
    window.rXEncrypt = rXEncrypt;
    window.rXDecrypt = rXDecrypt;
}
// For Franted Esm js Enable this line
//  export { rXEncrypt, rXDecrypt };  
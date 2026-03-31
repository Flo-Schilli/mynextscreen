"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
exports.verifyApiKey = verifyApiKey;
const crypto_1 = require("crypto");
const bcrypt = require("bcrypt");
const BCRYPT_ROUNDS = 10;
function generateApiKey() {
    return (0, crypto_1.randomBytes)(32).toString('base64url');
}
async function hashApiKey(plaintext) {
    return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}
async function verifyApiKey(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
}
//# sourceMappingURL=api-key.util.js.map
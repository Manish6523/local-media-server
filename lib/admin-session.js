"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminToken = adminToken;
exports.isAdmin = isAdmin;
const crypto_1 = require("crypto");
const db_1 = require("./db");
function adminToken(expires) {
    return (0, crypto_1.createHmac)("sha256", (0, db_1.getConfig)("admin_pin_hash") || "").update(expires).digest("hex");
}
function isAdmin(request) {
    if (!(0, db_1.getPinEnabled)())
        return true;
    const token = request.headers.get("cookie")?.split("; ").find(c => c.startsWith("vidlock_admin="))?.split("=")[1];
    if (!token)
        return false;
    const [expires, signature] = token.split(".");
    if (!signature || Number(expires) <= Date.now())
        return false;
    const expected = Buffer.from(adminToken(expires));
    const actual = Buffer.from(signature);
    return expected.length === actual.length && (0, crypto_1.timingSafeEqual)(expected, actual);
}

"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocket = getSocket;
exports.disconnectSocket = disconnectSocket;
const socket_io_client_1 = require("socket.io-client");
let socket = null;
function getSocket() {
    if (!socket) {
        socket = (0, socket_io_client_1.io)({
            transports: ["websocket", "polling"],
            autoConnect: true,
        });
    }
    return socket;
}
function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

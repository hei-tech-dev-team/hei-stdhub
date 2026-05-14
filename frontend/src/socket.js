import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

let socket = null;
let connectionPromise = null;

export const getSocket = async () => {
  if (socket?.connected) return socket;
  if (connectionPromise) return connectionPromise;

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
  });

  connectionPromise = new Promise((resolve, reject) => {
    socket.on("connect", () => {
      connectionPromise = null;
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      connectionPromise = null;
      console.error("Socket connection error:", err);
      reject(err);
    });
    setTimeout(() => {
      connectionPromise = null;
      reject(new Error("Socket connection timeout"));
    }, 10000);
  });

  return connectionPromise;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

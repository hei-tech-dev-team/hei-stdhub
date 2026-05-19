import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

let socket = null;
let connectionPromise = null;
let listeners = new Set();
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 12;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

const notifyListeners = (state, details = {}) => {
  listeners.forEach((fn) => fn(state, details));
};

export const onConnectionChange = (fn) => {
  listeners.add(fn);
  if (socket) {
    fn(socket.connected ? "connected" : "disconnected", {
      connected: socket.connected,
    });
  }
  return () => listeners.delete(fn);
};

export const getSocket = async () => {
  if (socket?.connected) return socket;
  if (connectionPromise) return connectionPromise;

  const token = localStorage.getItem("hei_token");
  if (!token) throw new Error("No auth token available");

  reconnectAttempts = 0;

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
    reconnectionDelay: BASE_RECONNECT_DELAY,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 15000,
    autoConnect: true,
  });

  socket.on("connect", () => {
    connectionPromise = null;
    reconnectAttempts = 0;
    notifyListeners("connected", { socketId: socket.id });
  });

  socket.on("disconnect", (reason) => {
    notifyListeners("disconnected", { reason });
  });

  socket.on("reconnect_attempt", (attempt) => {
    reconnectAttempts = attempt;
    notifyListeners("reconnecting", { attempt, max: MAX_RECONNECT_ATTEMPTS });
  });

  socket.on("reconnect", (attempt) => {
    reconnectAttempts = 0;
    notifyListeners("reconnected", { attempt });
  });

  socket.on("reconnect_failed", () => {
    notifyListeners("reconnect_failed");
  });

  socket.on("connect_error", (err) => {
    notifyListeners("connect_error", { error: err.message });
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
      if (!socket?.connected) {
        connectionPromise = null;
        reject(new Error("Socket connection timeout"));
      }
    }, 15000);
  });

  return connectionPromise;
};

export const disconnectSocket = () => {
  if (socket) {
    notifyListeners("disconnected");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    connectionPromise = null;
    reconnectAttempts = 0;
  }
};

export const refreshSocket = async () => {
  disconnectSocket();
  return getSocket();
};

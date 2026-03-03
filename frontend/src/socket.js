let socketInstance = null;

export const getSocket = async () => {
  if (!socketInstance) {
    const { io } = await import("socket.io-client");
    const URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    socketInstance = io(URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socketInstance;
};

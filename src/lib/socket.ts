import { io, type Socket } from "socket.io-client";
import type { Prayer } from "../types";
import { API_URL } from "./config";

export interface ServerToClientEvents {
  "prayer:new": (prayer: Prayer) => void;
  "prayer:update": (prayer: Prayer) => void;
  "prayer:remove": (payload: { id: string }) => void;
}

let socket: Socket<ServerToClientEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents> {
  if (!socket) {
    socket = io(API_URL, { autoConnect: true });
  }
  return socket;
}

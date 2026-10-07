import { apiAction } from "@/server/api-route.server";
import { requestRoomToken } from "@/features/room/server/token-route.server";

export const action = apiAction(requestRoomToken);

import { apiAction } from "@/server/api-route.server";
import { setRaisedHand } from "@/features/room/server/hand-route.server";

export const action = apiAction(setRaisedHand);

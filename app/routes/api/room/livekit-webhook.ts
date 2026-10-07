import { apiAction } from "@/server/api-route.server";
import { receiveLivekitWebhook } from "@/features/room/server/webhook/route.server";

export const action = apiAction(receiveLivekitWebhook);

import { apiAction, apiLoader } from "@/server/api-route.server";
import { handleParticipantAuth } from "@/features/auth/server/participant-auth-route.server";

export const loader = apiLoader(handleParticipantAuth);
export const action = apiAction(handleParticipantAuth);

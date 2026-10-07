import { type ActionFunctionArgs } from "react-router";
import { withRequest } from "@/server/request-context.server";
import { POST } from "./token.server";

export const action = ({ request, context }: ActionFunctionArgs) =>
  withRequest(request, context, () =>
    request.method === "POST"
      ? POST(request)
      : new Response(null, { status: 405, headers: { Allow: "POST" } }),
  );

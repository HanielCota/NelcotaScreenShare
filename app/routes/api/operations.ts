import { operations, readOperations } from "@/app/operations.server";
import { operationDispatcher } from "@/server/operations/dispatch.server";

const dispatch = operationDispatcher({
  operations,
  readOperations,
  successRedirects: {
    "auth-acceptInvitation": "/admin/entrar?aviso=convite",
    "account-deleteMyAccount": "/?aviso=conta-excluida",
  },
});

export const loader = dispatch;
export const action = dispatch;

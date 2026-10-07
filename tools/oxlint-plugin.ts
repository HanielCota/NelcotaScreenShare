/**
 * Project lint rules that oxlint does not ship (loaded through `jsPlugins` in oxlint.config.ts).
 *
 * `nelcota/no-else`: AGENTS.md §1.1 bans `else` and `else if`. Divergent logic uses early
 * returns, guard clauses or lookup tables, so the happy path stays at the top level.
 * Ternaries are still allowed.
 */

interface IfStatementNode {
  alternate: object | null;
}

interface RuleContext {
  report(descriptor: { node: object; messageId: "noElse" }): void;
}

const noElse = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow `else` and `else if` (use early returns or guard clauses)." },
    messages: {
      noElse:
        "Do not use `else` or `else if`: return early or use a guard clause (AGENTS.md §1.1).",
    },
    schema: [],
  },
  create(context: RuleContext) {
    return {
      IfStatement(node: IfStatementNode) {
        if (node.alternate) context.report({ node: node.alternate, messageId: "noElse" });
      },
    };
  },
};

export default {
  meta: { name: "nelcota" },
  rules: { "no-else": noElse },
};

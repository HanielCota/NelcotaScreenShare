import { useNavigation } from "react-router";

export function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === "idle") return null;
  return (
    <output className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-brand motion-reduce:animate-none">
      <span className="sr-only">Carregando página…</span>
    </output>
  );
}

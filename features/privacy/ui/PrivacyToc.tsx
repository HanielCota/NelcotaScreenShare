import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PrivacyTocItem {
  id: string;
  label: string;
}

/**
 * Section bar of the notice, sticky at the top while scrolling: highlights the pill
 * of the section on screen. Without JavaScript, it is still a plain anchor list.
 */
export function PrivacyToc({ items }: { items: PrivacyTocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = items.find((item) => visible.has(item.id));
        if (!first) return;
        setActive(first.id);
        // On mobile the bar scrolls sideways: keeps the active pill in view.
        const list = listRef.current;
        const pill = list?.querySelector<HTMLElement>(`a[href="#${first.id}"]`);
        if (list && pill) {
          const left = pill.offsetLeft - (list.clientWidth - pill.offsetWidth) / 2;
          list.scrollTo({ left, behavior: "smooth" });
        }
      },
      // The "current" section is the one crossing the strip just below the bar.
      { rootMargin: "-20% 0px -55% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Nesta página" className="glass rounded-2xl p-1.5">
      <ol
        ref={listRef}
        className="relative flex [scrollbar-width:none] gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const current = item.id === active;
          return (
            <li key={item.id} className="shrink-0 sm:flex-1">
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "flex h-9 items-center justify-center rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  current
                    ? "bg-brand/15 text-brand-soft"
                    : "text-ink-muted hover:bg-surface-3 hover:text-ink",
                )}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { useEffect } from "react";

export default function BodyLock({ active = true }: { active?: boolean }) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
  return null;
}
import { useEffect } from "react";

type AnalyticsProps = {
  token?: string | null;
};

export function Analytics({ token }: AnalyticsProps) {
  useEffect(() => {
    if (!token) return;

    const dataAttribute = JSON.stringify({ token });
    const existingScript = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        'script[src="https://static.cloudflareinsights.com/beacon.min.js"]',
      ),
    ).find((script) => script.getAttribute("data-cf-beacon") === dataAttribute);

    if (existingScript) return;

    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.setAttribute("data-cf-beacon", dataAttribute);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [token]);

  return null;
}

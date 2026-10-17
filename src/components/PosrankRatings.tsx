import { useEffect } from "react";

const SCRIPT_URL = "https://posrank.co/posrank-ratings.js?v=1";

export default function PosrankRatings() {
  useEffect(() => {
    // Posrank observes new containers, including client-side page navigation.
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) return;
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <section aria-label="Calificaciones en Posrank" className="relative border-y border-border py-8">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div
          data-posrank-ratings="e460b1f8-b093-4651-8d63-9b9ddfd24072"
          data-template="banner"
          data-theme="light"
          className="min-h-[420px] w-full"
        />
      </div>
    </section>
  );
}
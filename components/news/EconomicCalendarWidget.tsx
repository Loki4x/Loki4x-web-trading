"use client";

import { useEffect, useRef } from "react";

export function EconomicCalendarWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = false;
    script.text = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      width: "100%",
      height: "650",
      locale: "en",
      importanceFilter: "-1,0,1",
      countryFilter: "",
    });
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}

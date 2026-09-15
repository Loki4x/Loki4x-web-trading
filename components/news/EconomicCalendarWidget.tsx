"use client";

export function EconomicCalendarWidget() {
  return (
    <div className="tradingview-widget-container">
      <div className="tradingview-widget-container__widget" />
      <script
        type="text/javascript"
        src="https://s3.tradingview.com/external-embedding/embed-widget-events.js"
        async
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            colorTheme: "dark",
            isTransparent: true,
            width: "100%",
            height: "650",
            locale: "en",
            importanceFilter: "-1,0,1",
            countryFilter: "",
          }),
        }}
      />
    </div>
  );
}

export function EconomicCalendarWidget() {
  return (
    <iframe
      src="https://www.tradays.com/en/economic-calendar/widget?mode=2&dateFormat=DMY&theme=dark"
      title="Economic Calendar"
      width="100%"
      height="650"
      scrolling="no"
      style={{ border: "none", display: "block" }}
      loading="lazy"
    />
  );
}

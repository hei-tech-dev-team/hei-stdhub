import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { PULL_TRIGGER_THRESHOLD_PX } from "../../utils/pullToRefresh.js";

export default function PullToRefreshIndicator({
  pullDistance = 0,
  refreshing = false,
}) {
  const visible = refreshing || pullDistance > 0;
  const ready = pullDistance >= PULL_TRIGGER_THRESHOLD_PX;
  const height = refreshing ? PULL_TRIGGER_THRESHOLD_PX : pullDistance;

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none sticky top-0 z-20 flex shrink-0 items-end justify-center overflow-hidden transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ height }}
    >
      <div
        className="mb-2 flex items-center gap-2 rounded-full border border-gray-100 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-navy/60 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <FontAwesomeIcon
          icon={refreshing ? faSpinner : faArrowDown}
          spin={refreshing}
          className={
            refreshing
              ? "text-gold"
              : "text-navy/40 transition-transform duration-150"
          }
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${ready ? 180 : 0}deg)` }
          }
        />
        <span>
          {refreshing
            ? "Actualisation..."
            : ready
              ? "Relâchez pour actualiser"
              : "Tirez pour actualiser"}
        </span>
      </div>
    </div>
  );
}

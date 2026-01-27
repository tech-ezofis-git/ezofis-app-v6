import React from "react";

interface BarLoaderProps {
  className?: string;
  style?: React.CSSProperties;

  /**
   * Overall loader height in px.
   * Optimized for inline text: default 12px.
   * Recommended range: 10–16px.
   */
  size?: number;

  /**
   * Any valid CSS color string.
   * Defaults to your grey token.
   */
  color?: string;
}

const BarLoader: React.FC<BarLoaderProps> = ({
  className = "",
  style,
  size = 10, // inline-text default (10–12px sweet spot)
  color = "var(--gray-9)",
}) => {
  // Preserve original proportions
  const barW = (13.6 / 32) * size;
  const barH = size;
  const lift = (8 / 32) * size;
  const peakH = (40 / 32) * size;
  const centerGap = (19.992 / 32) * size;

  const containerW = barW * 3 + centerGap * 2;

  return (
    <span
      className={`relative inline-flex align-middle items-center justify-center ${className}`}
      style={{
        ...style,
        width: containerW,
        height: barH,
        ["--barloader-color" as any]: color,
      }}
      aria-label="Loading"
      role="status"
    >
      <style>{`
        @keyframes barloader-pulse {
          0%, 80%, 100% {
            opacity: .75;
            box-shadow: 0 0 var(--barloader-color);
            height: ${barH}px;
          }
          40% {
            opacity: 1;
            box-shadow: 0 -${lift}px var(--barloader-color);
            height: ${peakH}px;
          }
        }
        .barloader-bar {
          width: ${barW}px;
          height: ${barH}px;
          background: var(--barloader-color);
          animation: barloader-pulse .8s infinite ease-in-out;
          border-radius: 1px; /* optional: helps at tiny sizes */
        }
      `}</style>

      <span className="flex items-center justify-center" style={{ gap: centerGap }}>
        <span className="barloader-bar" style={{ animationDelay: "0s" }} />
        <span className="barloader-bar" style={{ animationDelay: "0.16s" }} />
        <span className="barloader-bar" style={{ animationDelay: "0.32s" }} />
      </span>
    </span>
  );
};

export default BarLoader;

export function Mascot() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="mascot w-[14px] h-[14px] shrink-0 motion-safe:animate-mascot-dance"
      style={{ filter: "drop-shadow(0 0 4px var(--accent-glow))" }}
    >
      <g fill="var(--primary)">
        <circle className="mascot-eye motion-safe:animate-mascot-blink" cx="5" cy="6.4" r="1.45" />
        <circle className="mascot-eye motion-safe:animate-mascot-blink" cx="11" cy="6.4" r="1.45" />
        <circle cx="8" cy="11" r="0.95" opacity="0.85" />
      </g>
    </svg>
  );
}

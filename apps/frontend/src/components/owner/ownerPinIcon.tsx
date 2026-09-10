/** Mobile `assets/icons/icon-pin.svg` — purple teardrop + white hole. */
export function OwnerPinIcon({
  className,
  width = 15,
  height = 21,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <img
      src="/images/icons/icon-pin.svg"
      alt=""
      width={width}
      height={height}
      className={className}
      aria-hidden
      draggable={false}
    />
  );
}

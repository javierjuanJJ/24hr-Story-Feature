import { SVGProps } from "react";

export function LeftIcon({
  size = 24,
  color = "currentColor",
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="19" y1="5" x2="5" y2="12" />
      <line x1="5" y1="12" x2="19" y2="19" />
    </svg>
  );
}
/** One icon set: 24×24 grid, 1.7 stroke, round caps. Decorative by default. */
const P: Record<string, string> = {
  search: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm10 3-5-5",
  heart: "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z",
  home: "M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z",
  plus: "M12 5v14M5 12h14",
  chat: "M5 18.5V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v8a1.5 1.5 0 0 1-1.5 1.5H8z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  back: "m14.5 5-7 7 7 7",
  next: "m9.5 5 7 7-7 7",
  filter: "M4 7h10m4 0h2M4 17h4m4 0h8M16 5v4M10 15v4",
  phone: "M6.6 4h2.6l1.3 4-1.9 1.2a11 11 0 0 0 6.2 6.2l1.2-1.9 4 1.3v2.6A1.6 1.6 0 0 1 18.4 19 14.4 14.4 0 0 1 5 5.6 1.6 1.6 0 0 1 6.6 4Z",
  send: "m4 12 16-8-6 16-2.5-6.5z",
  clip: "m19 11-7.2 7.2a4.5 4.5 0 0 1-6.4-6.4l7.5-7.5a3 3 0 0 1 4.3 4.3l-7.3 7.3a1.5 1.5 0 0 1-2.1-2.1L14.5 7",
  close: "M6 6l12 12M18 6 6 18",
  camera: "M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  pin: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  star: "m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z",
  up: "M12 19V6m-5 5 5-5 5 5",
  check: "m5 12.5 4.5 4.5L19 7.5",
  trash: "M5 7h14M10 7V5h4v2m-6 0 .8 12h6.4L16 7",
  edit: "M5 19h4L19 9l-4-4L5 15zM13 7l4 4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  logout: "M14 4h4a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20h-4M10 16l-4-4 4-4M6 12h9",
  shield: "M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z",
  wa: "M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6zM9.2 8.6c.3 2.9 2.4 5.3 5.6 6l1-1.4-1.9-1-.9.8a4.6 4.6 0 0 1-2.3-2.3l.8-.9-1-1.9z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4",
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, className = "", label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === "more" ? "none" : "none"}
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <path d={P[name]} />
    </svg>
  );
}

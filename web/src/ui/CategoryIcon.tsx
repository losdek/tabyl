/** One line-icon per category, same 24-grid and 1.7 stroke as the rest of the set. */
const P: Record<string, string> = {
  transport: "M4 15.5V12l1.8-4.2A2 2 0 0 1 7.6 6.5h8.8a2 2 0 0 1 1.8 1.3L20 12v3.5a1 1 0 0 1-1 1h-1M6 16.5H5a1 1 0 0 1-1-1M4 12h16M8 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm11 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM8 16.5h8",
  realty: "M4 11 12 4.5l8 6.5M6 9.5V19h12V9.5M10 19v-5h4v5",
  electronics: "M8 3.5h8a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5ZM11 17.5h2",
  home: "M5 11.5V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2.5M3.5 13a1.5 1.5 0 0 1 3 0v1h11v-1a1.5 1.5 0 0 1 3 0v4.5h-17zM5.5 17.5V19m13-1.5V19",
  clothes: "M9 4.5 4.5 7l1.5 4 2-.8V19.5h8V10.2l2 .8 1.5-4L15 4.5a3 3 0 0 1-6 0Z",
  kids: "M6 7.5a5.5 5.5 0 0 1 11 0H6Zm0 0V13a3 3 0 0 0 3 3h6l2-4.5H6M8.5 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm10 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  jobs: "M4 8.5h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 8.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2.5M4 13h16",
  services: "M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z",
  animals: "M8 9a1.8 1.8 0 1 1 0-3.6A1.8 1.8 0 0 1 8 9Zm8 0a1.8 1.8 0 1 1 0-3.6A1.8 1.8 0 0 1 16 9ZM4.8 13a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Zm14.4 0a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2ZM12 12c-2.5 0-5 3.2-5 5.2 0 1.6 1.4 2.3 3 1.8.8-.3 1.3-.3 2-.3s1.2 0 2 .3c1.6.5 3-.2 3-1.8 0-2-2.5-5.2-5-5.2Z",
  hobby: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 3.5v17M3.5 12h17M6 6c3 2.5 3 9.5 0 12m12-12c-3 2.5-3 9.5 0 12",
};

export function CategoryIcon({ slug, size = 22 }: { slug: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[slug] ?? P.hobby} />
    </svg>
  );
}

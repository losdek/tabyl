import { preload } from "react-dom";

type P = { id: string; width: number; height: number; blur: string };

export const photoUrl = (id: string, w: 320 | 640 | 1280, ext: "webp" | "avif" = "webp") => `/media/p/${id}/${w}.${ext}`;

/**
 * AVIF with WebP fallback at three widths; the blurred placeholder is painted
 * as the background so nothing jumps while the photo loads.
 */
export function Photo({
  photo,
  sizes,
  alt = "",
  className = "",
  priority = false,
  aspect,
}: {
  photo: P;
  sizes: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  aspect?: string;
}) {
  const set = (ext: "webp" | "avif") => ([320, 640, 1280] as const).map((w) => `${photoUrl(photo.id, w, ext)} ${w}w`).join(", ");
  // the first photos on a page are the LCP element: let the browser fetch them with the HTML
  if (priority) preload(photoUrl(photo.id, 640, "avif"), { as: "image", imageSrcSet: set("avif"), imageSizes: sizes, fetchPriority: "high", type: "image/avif" });
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <img
        src={photoUrl(photo.id, 640)}
        srcSet={set("webp")}
        sizes={sizes}
        width={photo.width}
        height={photo.height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={`block h-auto w-full bg-field object-cover ${className}`}
        style={{ backgroundImage: `url(${photo.blur})`, backgroundSize: "cover", aspectRatio: aspect }}
      />
    </picture>
  );
}

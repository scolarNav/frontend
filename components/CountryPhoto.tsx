import type { CountryPhoto as Photo } from "@/lib/country-media";

/** A captioned location photo with its licence credit. */
export default function CountryPhoto({
  photo,
  country,
  priority = false,
  className = "aspect-[16/9]",
}: {
  photo: Photo;
  country: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className="min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={`${photo.place}, ${country}`}
        width={1280}
        height={720}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`${className} w-full rounded-xl bg-surface-2 object-cover`}
      />
      <figcaption className="mt-2 text-sm text-slate">
        <span className="font-medium text-ink-soft">{photo.place}</span>
        {" · "}
        <a href={photo.source} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          Photo: {photo.author}, {photo.license}
        </a>
      </figcaption>
    </figure>
  );
}

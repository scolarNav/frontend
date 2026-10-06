import { countryMedia } from "@/lib/country-media";

/** Flag image for a country guide. Emoji flags do not render on Windows, so this uses the bundled SVG. */
export default function CountryFlag({
  code,
  name,
  className = "h-6 w-9",
}: {
  code: string;
  name: string;
  className?: string;
}) {
  const media = countryMedia(code);
  if (!media) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.flag}
      alt={`Flag of ${name}`}
      width={36}
      height={24}
      className={`${className} shrink-0 rounded-sm object-cover shadow-sm ring-1 ring-rule`}
    />
  );
}

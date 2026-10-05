import { UTM_KEYS } from "@/lib/book-attribution";

/** Echo the page's utm_* query params into a form as hidden fields. */
export function UtmHiddenFields({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  return (
    <>
      {UTM_KEYS.map((key) => {
        const raw = params[key];
        const value = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 120);
        return value ? (
          <input key={key} type="hidden" name={key} value={value} />
        ) : null;
      })}
    </>
  );
}

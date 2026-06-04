// Renders a Schema.org JSON-LD <script> tag. Server component — never add "use client".
// `<` is escaped to < per the Next.js 16 json-ld guide to prevent XSS via injected data.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

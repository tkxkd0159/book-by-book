export function formatBookDescription(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  const allowedTags: string[] = [];
  const addAllowedTag = (tag: string) => {
    const token = `__BOOK_DESC_TAG_${allowedTags.length}__`;
    allowedTags.push(tag);
    return token;
  };

  const masked = raw
    .replace(/<\s*br\s*\/?\s*>/gi, () => addAllowedTag("<br />"))
    .replace(/<\s*(\/?)\s*(b|strong)\s*>/gi, (_match, closing: string) =>
      addAllowedTag(closing ? "</strong>" : "<strong>"),
    )
    .replace(/<\s*(\/?)\s*(i|em)\s*>/gi, (_match, closing: string) =>
      addAllowedTag(closing ? "</em>" : "<em>"),
    )
    .replace(/<\s*p\b[^>]*>/gi, () => addAllowedTag("<p>"))
    .replace(/<\s*\/\s*p\s*>/gi, () => addAllowedTag("</p>"))
    .replace(/<\s*ul\b[^>]*>/gi, () => addAllowedTag("<ul>"))
    .replace(/<\s*\/\s*ul\s*>/gi, () => addAllowedTag("</ul>"))
    .replace(/<\s*ol\b[^>]*>/gi, () => addAllowedTag("<ol>"))
    .replace(/<\s*\/\s*ol\s*>/gi, () => addAllowedTag("</ol>"))
    .replace(/<\s*li\b[^>]*>/gi, () => addAllowedTag("<li>"))
    .replace(/<\s*\/\s*li\s*>/gi, () => addAllowedTag("</li>"));

  const escaped = masked
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/__BOOK_DESC_TAG_(\d+)__/g, (_match, indexText: string) => {
      const index = Number(indexText);
      return allowedTags[index] ?? "";
    });

  const normalized = escaped
    .replace(/\r\n/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n/g, "<br />")
    .replace(/(?:<br \/>\s*){4,}/gi, "<br /><br />")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();

  return normalized.length > 0 ? normalized : null;
}

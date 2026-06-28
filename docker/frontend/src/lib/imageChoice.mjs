export function svgToDataUri(svg) {
  if (!svg) return ''
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

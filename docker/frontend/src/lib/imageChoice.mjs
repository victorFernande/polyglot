export function svgToDataUri(svg) {
  if (!svg) return ''
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function selectableImageChoiceOptions(options) {
  return (options || [])
    .filter((option) => option && option.value && option.label_pt)
    .map((option) => ({
      ...option,
      key: String(option.value),
      selectValue: option.value,
      label: option.display_text || option.value,
      displayText: option.display_text || option.value,
      portugueseLabel: option.label_pt,
      imageSrc: option.image_src || svgToDataUri(option.svg),
    }))
    .filter((option) => option.imageSrc)
}

export function toSingular(label: string) {
  return label.endsWith('s') ? label.slice(0, -1) : label
}

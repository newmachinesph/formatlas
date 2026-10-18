function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function searchCommands(commands, query, limit = 12) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return commands.slice(0, limit)

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

  return commands
    .map((command, index) => {
      const label = normalize(command.label)
      const category = normalize(command.category)
      const keywords = normalize(command.keywords)
      const haystack = `${label} ${category} ${keywords}`
      if (!tokens.every((token) => haystack.includes(token))) return null

      let score = 4
      if (label === normalizedQuery) score = 0
      else if (label.startsWith(normalizedQuery)) score = 1
      else if (label.includes(normalizedQuery)) score = 2
      else if (keywords.includes(normalizedQuery)) score = 3

      return { command, index, score }
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map(({ command }) => command)
}

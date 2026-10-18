export const PROFILE_HISTORY_LIMIT = 32

export function profileSnapshot(measurements, pose, appearance) {
  return { measurements, pose, appearance }
}

function sameSnapshot(left, right) {
  return Boolean(left && right && JSON.stringify(left) === JSON.stringify(right))
}

export function commitProfileCheckpoint(history, snapshot, limit = PROFILE_HISTORY_LIMIT) {
  if (!snapshot) return history
  const last = history.past.at(-1)
  const past = sameSnapshot(last, snapshot)
    ? history.past
    : [...history.past, snapshot].slice(-limit)
  return { past, future: [] }
}

export function undoProfileHistory(history, current, limit = PROFILE_HISTORY_LIMIT) {
  if (!history.past.length) return null
  return {
    profile: history.past.at(-1),
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, limit),
    },
  }
}

export function redoProfileHistory(history, current, limit = PROFILE_HISTORY_LIMIT) {
  if (!history.future.length) return null
  return {
    profile: history.future[0],
    history: {
      past: [...history.past, current].slice(-limit),
      future: history.future.slice(1),
    },
  }
}

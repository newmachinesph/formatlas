import { sanitizeProfile } from './profile.js'

export const STUDY_LIBRARY_KEY = 'form-atlas-study-library-v1'
export const MAX_STUDIES = 6

function profileSignature(profile) {
  return JSON.stringify({
    measurements: profile.measurements,
    pose: profile.pose,
    appearance: profile.appearance,
  })
}

export function readStudyLibrary(source) {
  try {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((entry, index) => {
      if (!entry?.profile?.measurements || typeof entry.profile.measurements !== 'object') return []
      const profile = sanitizeProfile(entry.profile)
      return [{
        id: typeof entry.id === 'string' && entry.id ? entry.id : `recovered-${index + 1}`,
        name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 48) : `Study ${index + 1}`,
        createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : 0,
        profile,
      }]
    }).slice(0, MAX_STUDIES)
  } catch {
    return []
  }
}

export function addStudy(studies, profile, name, createdAt = Date.now()) {
  const safeProfile = sanitizeProfile(profile)
  const duplicate = studies.find((study) => profileSignature(study.profile) === profileSignature(safeProfile))
  if (duplicate) return { studies, added: null, duplicate }

  const study = {
    id: `study-${createdAt}-${studies.length + 1}`,
    name: String(name || `Study ${studies.length + 1}`).trim().slice(0, 48),
    createdAt,
    profile: safeProfile,
  }

  return {
    studies: [study, ...studies].slice(0, MAX_STUDIES),
    added: study,
    duplicate: null,
  }
}

export function removeStudy(studies, id) {
  return studies.filter((study) => study.id !== id)
}

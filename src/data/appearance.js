export const DEFAULT_APPEARANCE = Object.freeze({
  skinColor: '#c9ad96',
  suitColor: '#303834',
  hairStyle: 'pixie',
  hairColor: '#33231f',
  browColor: '#4a3029',
  lashIntensity: 58,
})

// Bundled accessories are authored against MakeHuman's complete hm08 fit mesh.
export const MAKEHUMAN_FIT_VERTEX_COUNT = 19158
export const MAKEHUMAN_PROXY_FORMAT_VERSION = 1

export const HAIR_STYLES = Object.freeze([
  { id: 'bare', label: 'No hair', description: 'Anatomy-only head', thumbnail: null },
  { id: 'pixie', label: 'Close crop', description: 'MakeHuman · Short 02', thumbnail: '/assets/makehuman/thumbnails/pixie.webp' },
  { id: 'bob', label: 'Chin-length bob', description: 'MakeHuman · Bob 01', thumbnail: '/assets/makehuman/thumbnails/bob.webp' },
  { id: 'curls', label: 'Short coils', description: 'MakeHuman · Afro 01', thumbnail: '/assets/makehuman/thumbnails/curls.webp' },
  { id: 'long', label: 'Shoulder length', description: 'MakeHuman · Long 01', thumbnail: '/assets/makehuman/thumbnails/long.webp' },
  { id: 'ponytail', label: 'Low ponytail', description: 'MakeHuman · Ponytail 01', thumbnail: '/assets/makehuman/thumbnails/ponytail.webp' },
])

export const MAKEHUMAN_HAIR_ASSETS = Object.freeze({
  pixie: { proxy: '/assets/makehuman/proxies/hair-pixie.proxy', texture: '/assets/makehuman/textures/pixie.webp' },
  bob: { proxy: '/assets/makehuman/proxies/hair-bob.proxy', texture: '/assets/makehuman/textures/bob.webp' },
  curls: { proxy: '/assets/makehuman/proxies/hair-curls.proxy', texture: '/assets/makehuman/textures/curls.webp' },
  long: { proxy: '/assets/makehuman/proxies/hair-long.proxy', texture: '/assets/makehuman/textures/long.webp' },
  ponytail: { proxy: '/assets/makehuman/proxies/hair-ponytail.proxy', texture: '/assets/makehuman/textures/ponytail.webp' },
})

export const MAKEHUMAN_FACE_ASSETS = Object.freeze({
  eyes: '/assets/makehuman/proxies/eyes.proxy',
  brows: '/assets/makehuman/proxies/brows.proxy',
  lashes: '/assets/makehuman/proxies/lashes.proxy',
  browTexture: '/assets/makehuman/textures/brows.webp',
  lashTexture: '/assets/makehuman/textures/lashes.webp',
})

export const SKIN_SWATCHES = Object.freeze([
  { label: 'Tone 01', value: '#f0d1bd' },
  { label: 'Tone 02', value: '#dfb99a' },
  { label: 'Tone 03', value: '#c9ad96' },
  { label: 'Tone 04', value: '#b98262' },
  { label: 'Tone 05', value: '#956247' },
  { label: 'Tone 06', value: '#774b38' },
  { label: 'Tone 07', value: '#5b382d' },
  { label: 'Tone 08', value: '#3c271f' },
])

export const HAIR_SWATCHES = Object.freeze([
  { label: 'Soft black', value: '#1b1717' },
  { label: 'Espresso', value: '#33231f' },
  { label: 'Chestnut', value: '#6a4030' },
  { label: 'Copper', value: '#a95f3f' },
  { label: 'Honey', value: '#bb8a52' },
  { label: 'Platinum', value: '#d8cec0' },
  { label: 'Silver', value: '#918d91' },
  { label: 'Ink violet', value: '#392f4f' },
])

export const SUIT_SWATCHES = Object.freeze([
  { label: 'Graphite', value: '#35343a' },
  { label: 'Oxblood', value: '#653a35' },
  { label: 'Deep navy', value: '#28384f' },
  { label: 'Forest', value: '#334c45' },
  { label: 'Ochre', value: '#a87532' },
  { label: 'Bone', value: '#d8cec3' },
])

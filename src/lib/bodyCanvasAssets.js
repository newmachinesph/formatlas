import { useLoader } from '@react-three/fiber'
import { MPFBGeometryLoader, MPFBLoader } from './mpfb.js'

export const MPFB_MANIFEST_URL = '/assets/mpfb/manifest.json'

export function clearBodyCanvasAssetCache() {
  useLoader.clear(MPFBLoader, MPFB_MANIFEST_URL)
  useLoader.clear(MPFBGeometryLoader, MPFB_MANIFEST_URL)
}

import { Component, memo, Suspense, useDeferredValue, useEffect, useLayoutEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import {
  DEFAULT_APPEARANCE,
  MAKEHUMAN_FACE_ASSETS,
  MAKEHUMAN_FIT_VERTEX_COUNT,
  MAKEHUMAN_HAIR_ASSETS,
} from '../data/appearance.js'
import { fitProxyPositions, MHProxyLoader } from '../lib/makehumanProxy.js'

const NO_RAYCAST = () => null
const WHITE = new THREE.Color('#ffffff')

class AccessoryBoundary extends Component {
  state = { failed: false, retries: 0 }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    if (this.state.retries > 0) return
    this.retryTimer = window.setTimeout(() => {
      try {
        this.props.onRetry?.()
      } finally {
        this.setState((current) => ({ failed: false, retries: current.retries + 1 }))
      }
    }, 650)
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && (this.state.failed || this.state.retries > 0)) {
      window.clearTimeout(this.retryTimer)
      this.setState({ failed: false, retries: 0 })
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.retryTimer)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function clearAccessoryCache(proxyUrl, textureUrl) {
  if (proxyUrl) useLoader.clear(MHProxyLoader, proxyUrl)
  if (textureUrl) useLoader.clear(THREE.TextureLoader, textureUrl)
}

function useProxyGeometry(proxy, fitPositions) {
  const positions = useMemo(
    () => fitProxyPositions(proxy, fitPositions),
    [fitPositions, proxy],
  )
  const geometry = useMemo(() => {
    const value = new THREE.BufferGeometry()
    value.setAttribute('position', new THREE.BufferAttribute(new Float32Array(proxy.renderCount * 3), 3))
    value.setAttribute('uv', new THREE.BufferAttribute(proxy.uvs.slice(), 2))
    value.setIndex(new THREE.BufferAttribute(proxy.indices, 1))
    value.computeVertexNormals()
    value.computeBoundingSphere()
    return value
  }, [proxy])

  useLayoutEffect(() => {
    const position = geometry.getAttribute('position')
    position.array.set(positions)
    position.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
  }, [geometry, positions])

  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}

function useColorTexture(url) {
  const texture = useLoader(THREE.TextureLoader, url)
  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    texture.needsUpdate = true
  }, [texture])
  return texture
}

function tint(color, whiteMix = 0.62) {
  return new THREE.Color(color).lerp(WHITE, whiteMix)
}

function HairProxy({ asset, fitPositions, color }) {
  const proxy = useLoader(MHProxyLoader, asset.proxy)
  const texture = useColorTexture(asset.texture)
  const geometry = useProxyGeometry(proxy, fitPositions)
  // Hair maps are neutral luminance/alpha derivatives, so the selected swatch
  // is the actual material tint instead of being mixed with a baked source hue.
  const materialColor = useMemo(() => new THREE.Color(color), [color])

  return (
    <mesh geometry={geometry} castShadow receiveShadow raycast={NO_RAYCAST} renderOrder={2}>
      <meshPhysicalMaterial
        map={texture}
        color={materialColor}
        side={THREE.DoubleSide}
        roughness={0.56}
        metalness={0}
        clearcoat={0.08}
        clearcoatRoughness={0.72}
        alphaTest={0.13}
        alphaToCoverage
      />
    </mesh>
  )
}

function EyeProxy({ fitPositions, skinColor, surfaceMode }) {
  const proxy = useLoader(MHProxyLoader, MAKEHUMAN_FACE_ASSETS.eyes)
  const geometry = useProxyGeometry(proxy, fitPositions)
  const neutralColor = useMemo(() => {
    if (surfaceMode === 'studio') return new THREE.Color(skinColor).lerp(WHITE, 0.5)
    if (surfaceMode === 'clay') return new THREE.Color('#c3b9b2')
    return new THREE.Color('#a99da1')
  }, [skinColor, surfaceMode])

  return (
    <mesh geometry={geometry} raycast={NO_RAYCAST} renderOrder={3}>
      <meshStandardMaterial color={neutralColor} roughness={0.5} metalness={0} />
    </mesh>
  )
}

function PupilPair({ faceAnchor }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 18, 12), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#080a09', toneMapped: false }), [])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  if (!faceAnchor
    || !Number.isFinite(faceAnchor.y)
    || !Number.isFinite(faceAnchor.eyeX)
    || !Number.isFinite(faceAnchor.frontZ)) return null

  const radius = THREE.MathUtils.clamp(faceAnchor.eyeX * 0.105, 0.03, 0.045)
  // Eye spacing and corneal depth scale together across the authored head
  // morphs, while pupil radius should remain visually restrained.
  const z = faceAnchor.frontZ + faceAnchor.eyeX * 0.48
  const scale = [radius, radius, radius * 0.32]

  return (
    <group>
      <mesh geometry={geometry} material={material} position={[-faceAnchor.eyeX, faceAnchor.y, z]} scale={scale} raycast={NO_RAYCAST} renderOrder={4} />
      <mesh geometry={geometry} material={material} position={[faceAnchor.eyeX, faceAnchor.y, z]} scale={scale} raycast={NO_RAYCAST} renderOrder={4} />
    </group>
  )
}

function BrowProxy({ fitPositions, color }) {
  const proxy = useLoader(MHProxyLoader, MAKEHUMAN_FACE_ASSETS.brows)
  const texture = useColorTexture(MAKEHUMAN_FACE_ASSETS.browTexture)
  const geometry = useProxyGeometry(proxy, fitPositions)
  const materialColor = useMemo(() => tint(color, 0.46), [color])

  return (
    <mesh geometry={geometry} raycast={NO_RAYCAST} renderOrder={4}>
      <meshStandardMaterial
        map={texture}
        color={materialColor}
        side={THREE.DoubleSide}
        roughness={0.78}
        alphaTest={0.18}
        alphaToCoverage
      />
    </mesh>
  )
}

function LashProxy({ fitPositions, intensity }) {
  const proxy = useLoader(MHProxyLoader, MAKEHUMAN_FACE_ASSETS.lashes)
  const texture = useColorTexture(MAKEHUMAN_FACE_ASSETS.lashTexture)
  const geometry = useProxyGeometry(proxy, fitPositions)
  const definition = THREE.MathUtils.clamp(Number(intensity) || 0, 0, 100) / 100
  const materialColor = useMemo(
    () => new THREE.Color('#756a6c').lerp(new THREE.Color('#160f12'), definition),
    [definition],
  )

  return (
    <mesh geometry={geometry} raycast={NO_RAYCAST} renderOrder={5}>
      <meshStandardMaterial
        map={texture}
        color={materialColor}
        side={THREE.DoubleSide}
        roughness={0.7}
        alphaTest={0.12}
        alphaToCoverage
      />
    </mesh>
  )
}

function FigureAppearance({
  fitPositions,
  faceAnchor,
  skinColor = DEFAULT_APPEARANCE.skinColor,
  hairStyle = DEFAULT_APPEARANCE.hairStyle,
  hairColor = DEFAULT_APPEARANCE.hairColor,
  browColor = DEFAULT_APPEARANCE.browColor,
  lashIntensity = DEFAULT_APPEARANCE.lashIntensity,
  surfaceMode = 'studio',
}) {
  const deferredHairStyle = useDeferredValue(hairStyle)
  const hairAsset = MAKEHUMAN_HAIR_ASSETS[deferredHairStyle]
  const hasCompatibleTopology = (Array.isArray(fitPositions) || ArrayBuffer.isView(fitPositions))
    && fitPositions.length === MAKEHUMAN_FIT_VERTEX_COUNT * 3
  if (!hasCompatibleTopology) return null
  const studioAppearance = surfaceMode === 'studio'

  return (
    <>
      <AccessoryBoundary
        resetKey="eyes-neutral"
        onRetry={() => clearAccessoryCache(MAKEHUMAN_FACE_ASSETS.eyes)}
      >
        <Suspense fallback={null}>
          <EyeProxy fitPositions={fitPositions} skinColor={skinColor} surfaceMode={surfaceMode} />
        </Suspense>
      </AccessoryBoundary>
      <PupilPair faceAnchor={faceAnchor} />
      {studioAppearance && (
        <>
          <AccessoryBoundary
            resetKey="brows"
            onRetry={() => clearAccessoryCache(MAKEHUMAN_FACE_ASSETS.brows, MAKEHUMAN_FACE_ASSETS.browTexture)}
          >
            <Suspense fallback={null}>
              <BrowProxy fitPositions={fitPositions} color={browColor} />
            </Suspense>
          </AccessoryBoundary>
          <AccessoryBoundary
            resetKey="lashes"
            onRetry={() => clearAccessoryCache(MAKEHUMAN_FACE_ASSETS.lashes, MAKEHUMAN_FACE_ASSETS.lashTexture)}
          >
            <Suspense fallback={null}>
              <LashProxy fitPositions={fitPositions} intensity={lashIntensity} />
            </Suspense>
          </AccessoryBoundary>
          {hairAsset && (
            <AccessoryBoundary
              resetKey={deferredHairStyle}
              onRetry={() => clearAccessoryCache(hairAsset.proxy, hairAsset.texture)}
            >
              <Suspense fallback={null}>
                <HairProxy asset={hairAsset} fitPositions={fitPositions} color={hairColor} />
              </Suspense>
            </AccessoryBoundary>
          )}
        </>
      )}
    </>
  )
}

export default memo(FigureAppearance)

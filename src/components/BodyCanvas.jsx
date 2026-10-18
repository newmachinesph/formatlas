import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { ContactShadows, Html, Line, OrbitControls, useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { MPFBGeometryLoader } from '../lib/mpfb.js'
import { MPFB_MANIFEST_URL } from '../lib/bodyCanvasAssets.js'
import { classifyBodyFace, classifyBodyPoint } from '../lib/bodyRegions.js'
import { framePerspectiveBounds, makeFaceBounds, makeYRotationSafeBounds, unionModelBounds } from '../lib/cameraFraming.js'
import { createLatestWorkerQueue } from '../lib/latestWorkerQueue.js'
import { captureDimensions } from '../lib/captureSizing.js'
import { MEASUREMENT_LANDMARKS } from '../data/anatomy.js'
import FigureAppearance from './FigureAppearance.jsx'

const DEFAULT_SKIN_COLOR = '#c9ad96'
const DEFAULT_SUIT_COLOR = '#303834'
const CLAY_COLOR = new THREE.Color('#c9ccc6')
const HIGHLIGHT_COLOR = new THREE.Color('#b86448')
const NO_RAYCAST = () => null

const REGION_COLORS = {
  head: '#bca696',
  neck: '#a78f83',
  bust: '#c45f78',
  torso: '#d18470',
  waist: '#d5a36e',
  pelvis: '#9573a0',
  legs: '#6f8ba8',
  arms: '#62a0a0',
}

const VIEW_ANGLES = {
  front: 0,
  threeQuarter: -Math.PI * 0.24,
  side: -Math.PI / 2,
  back: Math.PI,
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ))

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return undefined
    const update = () => setReduced(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  return reduced
}

function partIsSelected(region, selectedPart) {
  if (selectedPart === 'all' || selectedPart === 'pose') return selectedPart === 'all'
  if (selectedPart === 'appearance') return false
  if (selectedPart === 'torso') return region === 'torso' || region === 'waist'
  if (selectedPart === 'head') return region === 'head' || region === 'neck'
  if (selectedPart === 'pelvis' || selectedPart === 'hips') return region === 'pelvis'
  return region === selectedPart
}

function makeBodyColors(basePositions, appearance, selectedPart, surfaceMode) {
  const colors = new Float32Array(basePositions.length)
  const skin = new THREE.Color(appearance?.skinColor || DEFAULT_SKIN_COLOR)
  const suit = new THREE.Color(appearance?.suitColor || DEFAULT_SUIT_COLOR)
  const working = new THREE.Color()
  const selectionEnabled = selectedPart !== 'all' && selectedPart !== 'appearance' && selectedPart !== 'pose'

  for (let offset = 0; offset < basePositions.length; offset += 3) {
    const x = Math.abs(basePositions[offset])
    const y = basePositions[offset + 1]
    const region = classifyBodyPoint({ x: basePositions[offset], y })
    const torsoSuit = y > -1.72 && y < 4.48 && x < 1.75
    const briefSuit = y > -2.68 && y <= -1.72 && x < 0.8 + (y + 2.68) * 0.82
    const selected = partIsSelected(region, selectedPart)

    if (surfaceMode === 'atlas') working.set(REGION_COLORS[region] || '#b6aaa3')
    else if (surfaceMode === 'clay' || surfaceMode === 'contour') working.copy(CLAY_COLOR)
    else working.copy(torsoSuit || briefSuit ? suit : skin)

    if (selectionEnabled && selected) {
      working.lerp(HIGHLIGHT_COLOR, surfaceMode === 'atlas' ? 0.38 : 0.24)
    } else if (surfaceMode === 'atlas' && selectionEnabled) {
      working.lerp(CLAY_COLOR, 0.36)
    }

    colors[offset] = working.r
    colors[offset + 1] = working.g
    colors[offset + 2] = working.b
  }

  return colors
}

function FigureMesh({ assets, morphed, appearance, selectedPart, surfaceMode, onSelectPart }) {
  const skinColor = appearance?.skinColor || DEFAULT_SKIN_COLOR
  const suitColor = appearance?.suitColor || DEFAULT_SUIT_COLOR
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(assets.positions.slice(), 3))
    result.setAttribute('color', new THREE.BufferAttribute(new Float32Array(assets.positions.length), 3))
    result.setIndex(new THREE.BufferAttribute(assets.indices, 1))
    result.computeVertexNormals()
    result.computeBoundingSphere()
    return result
  }, [assets])

  useLayoutEffect(() => {
    const position = geometry.getAttribute('position')
    position.array.set(morphed.positions)
    position.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
  }, [geometry, morphed])

  useLayoutEffect(() => {
    const color = geometry.getAttribute('color')
    color.array.set(makeBodyColors(assets.positions, { skinColor, suitColor }, selectedPart, surfaceMode))
    color.needsUpdate = true
  }, [assets.positions, geometry, selectedPart, skinColor, suitColor, surfaceMode])

  useEffect(() => () => geometry.dispose(), [geometry])

  const selectFromMesh = (event) => {
    event.stopPropagation()
    if (!onSelectPart) return
    const region = classifyBodyFace(event.face, assets.positions)
    if (region) onSelectPart(region)
  }

  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow onClick={selectFromMesh}>
        <meshPhysicalMaterial
          vertexColors
          roughness={surfaceMode === 'studio' ? 0.68 : 0.82}
          metalness={0}
          clearcoat={surfaceMode === 'studio' ? 0.045 : 0}
          clearcoatRoughness={0.72}
        />
      </mesh>
      {surfaceMode === 'contour' && (
        <mesh geometry={geometry} renderOrder={3}>
          <meshBasicMaterial color="#313a35" wireframe transparent opacity={0.24} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}

function GhostMesh({ assets, morphed }) {
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(morphed.positions.slice(), 3))
    result.setIndex(new THREE.BufferAttribute(assets.indices, 1))
    result.computeBoundingSphere()
    return result
  }, [assets.indices, morphed.positions])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} renderOrder={0}>
      <meshBasicMaterial color="#367f77" wireframe transparent opacity={0.28} depthWrite={false} />
    </mesh>
  )
}

function nearestEquivalentAngle(current, target) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current))
}

function calculateModelBounds(positions, scale, groundOffset) {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset] * scale
    const y = positions[offset + 1] * scale + groundOffset
    const z = positions[offset + 2] * scale
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  }
}

function isEditableKeyboardTarget(target) {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select, button')) return true
  return Boolean(target.closest('[contenteditable]:not([contenteditable="false"])'))
}

function formatBandValue(value, unit) {
  if (!Number.isFinite(value)) return '—'
  return unit === 'imperial' ? `${(value / 2.54).toFixed(1)} in` : `${value.toFixed(1)} cm`
}

function formatBandResidual(value, unit) {
  if (!Number.isFinite(value)) return '—'
  const converted = unit === 'imperial' ? value / 2.54 : value
  const suffix = unit === 'imperial' ? 'in' : 'cm'
  return `${converted >= 0 ? '+' : ''}${converted.toFixed(1)} ${suffix}`
}

function formatAnthropometryStatus(result) {
  if (result?.status === 'within-tolerance') return 'within tolerance'
  if (result?.calibrationStatus === 'authored-limit') return 'authored limit'
  if (result?.calibrationStatus === 'calibration-miss') return 'calibration gap'
  if (result?.status === 'outside-tolerance') return 'outside tolerance'
  return 'unmeasurable'
}

function ribbonLabelPosition(points) {
  if (!Array.isArray(points) || points.length === 0) return null
  let anchor = points[0]
  for (const point of points) {
    if (point[0] > anchor[0]) anchor = point
  }
  return [anchor[0] + 0.17, anchor[1], anchor[2]]
}

function pointToSegmentDistanceSquared(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= Number.EPSILON) return (px - ax) ** 2 + (py - ay) ** 2
  const amount = THREE.MathUtils.clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1)
  const nearestX = ax + dx * amount
  const nearestY = ay + dy * amount
  return (px - nearestX) ** 2 + (py - nearestY) ** 2
}

function projectedRibbonDistanceSquared(points, group, camera, rect, pointerX, pointerY) {
  if (!group || !Array.isArray(points) || points.length < 2) return Infinity
  group.updateWorldMatrix(true, false)
  const projected = new THREE.Vector3()
  let previous = null
  let closest = Infinity
  for (const point of points) {
    projected.set(point[0], point[1], point[2]).applyMatrix4(group.matrixWorld).project(camera)
    const current = {
      x: (projected.x + 1) * rect.width * 0.5,
      y: (1 - projected.y) * rect.height * 0.5,
      visible: projected.z >= -1 && projected.z <= 1,
    }
    if (previous?.visible && current.visible) {
      closest = Math.min(
        closest,
        pointToSegmentDistanceSquared(pointerX, pointerY, previous.x, previous.y, current.x, current.y),
      )
    }
    previous = current
  }
  return closest
}

function MeasurementHitTarget({ points, onHoverStart, onHoverEnd }) {
  const geometry = useMemo(() => {
    const curvePoints = points.map((point) => new THREE.Vector3(...point))
    if (curvePoints.length > 2 && curvePoints[0].distanceToSquared(curvePoints.at(-1)) < 0.000001) {
      curvePoints.pop()
    }
    if (curvePoints.length < 3) return null

    const curve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal')
    const tubularSegments = Math.max(48, Math.min(192, curvePoints.length * 2))
    return new THREE.TubeGeometry(curve, tubularSegments, 0.12, 8, true)
  }, [points])

  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!geometry) return null

  return (
    <mesh
      geometry={geometry}
      renderOrder={7}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHoverStart()
      }}
      onPointerOut={onHoverEnd}
    >
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  )
}

function MeasurementBands({ anthropometry, selectedPart, selectedBand, unit, onSelectBand }) {
  const [hoveredBand, setHoveredBand] = useState(null)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const interactionGroup = useRef(null)
  const hoveredBandRef = useRef(null)
  const lastSelectionRef = useRef({ key: null, at: 0 })
  useCursor(Boolean(hoveredBand), 'pointer', 'auto')

  const selectBandKey = useCallback((key) => {
    const band = MEASUREMENT_LANDMARKS.find((candidate) => candidate.key === key)
    if (!band) return
    const now = performance.now()
    if (lastSelectionRef.current.key === key && now - lastSelectionRef.current.at < 120) return
    lastSelectionRef.current = { key, at: now }
    onSelectBand?.(band.part, band.key)
  }, [onSelectBand])

  useEffect(() => {
    const canvas = gl.domElement
    let spacePressed = false
    const handleKeyDown = (event) => {
      if (event.code === 'Space' || event.key === ' ') spacePressed = true
    }
    const handleKeyUp = (event) => {
      if (event.code === 'Space' || event.key === ' ') spacePressed = false
    }
    const handlePointerDownCapture = (event) => {
      if (event.button !== 0
        || spacePressed
        || canvas.dataset.spacePanning === 'true'
        || !interactionGroup.current) return
      // Fine pointers already established an exact semantic ribbon during
      // hover. Prefer that identity; projection below is the touch/no-hover
      // fallback and can be ambiguous where high-hip and full-hip overlap.
      if (hoveredBandRef.current) {
        selectBandKey(hoveredBandRef.current)
        return
      }
      const rect = canvas.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top
      if (pointerX < 0 || pointerY < 0 || pointerX > rect.width || pointerY > rect.height) return

      let closestKey = null
      let closestDistance = 22 ** 2
      for (const band of MEASUREMENT_LANDMARKS) {
        const distance = projectedRibbonDistanceSquared(
          anthropometry?.ribbons?.[band.key],
          interactionGroup.current,
          camera,
          rect,
          pointerX,
          pointerY,
        )
        if (distance <= closestDistance) {
          closestDistance = distance
          closestKey = band.key
        }
      }
      if (closestKey) selectBandKey(closestKey)
    }
    const clearSpace = () => {
      spacePressed = false
    }
    canvas.addEventListener('keydown', handleKeyDown)
    canvas.addEventListener('keyup', handleKeyUp)
    window.addEventListener('pointerdown', handlePointerDownCapture, true)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearSpace)
    return () => {
      canvas.removeEventListener('keydown', handleKeyDown)
      canvas.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('pointerdown', handlePointerDownCapture, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clearSpace)
    }
  }, [anthropometry, camera, gl, selectBandKey])

  const fallbackBand = selectedPart === 'bust' ? 'bust'
    : selectedPart === 'waist' || selectedPart === 'torso' ? 'waist'
      : selectedPart === 'pelvis' || selectedPart === 'hips' ? 'hips'
        : selectedPart === 'legs' ? 'thigh'
          : selectedPart === 'neck' || selectedPart === 'head' ? 'neck'
            : null
  const activeBand = selectedBand || fallbackBand

  return (
    <group ref={interactionGroup}>
      {MEASUREMENT_LANDMARKS.map((band) => {
    const points = anthropometry?.ribbons?.[band.key]
    const result = anthropometry?.results?.[band.key]
    if (!Array.isArray(points) || points.length < 2 || !result) return null
    const active = activeBand === band.key
    const hovered = hoveredBand === band.key
    const labelPosition = ribbonLabelPosition(points)
    const hoverBand = () => {
      hoveredBandRef.current = band.key
      setHoveredBand(band.key)
    }
    const leaveBand = () => {
      if (hoveredBandRef.current === band.key) hoveredBandRef.current = null
      setHoveredBand((current) => current === band.key ? null : current)
    }

        return (
          <group key={band.key}>
        <Line
          points={points}
          color={active ? '#72e4e3' : hovered ? '#d7ffff' : '#96c3c5'}
          lineWidth={active ? 2.4 : hovered ? 1.7 : 0.85}
          transparent
          opacity={active ? 0.98 : hovered ? 0.78 : 0.28}
          depthTest={false}
          renderOrder={5}
          raycast={NO_RAYCAST}
        />
        <MeasurementHitTarget
          points={points}
          onHoverStart={hoverBand}
          onHoverEnd={leaveBand}
        />
        {(active || hovered) && labelPosition && (
          <Html
            position={labelPosition}
            center
            distanceFactor={9}
            zIndexRange={[12, 0]}
            pointerEvents="none"
            wrapperClass="body-band-label-host"
            style={{ pointerEvents: 'none' }}
          >
            <div className={`body-band-label${hovered && !active ? ' hover' : ''}`}>
              <span>{band.label}</span>
              <strong>{formatBandValue(result.valueCm, unit)}</strong>
              <small>
                Target {formatBandValue(result.targetCm, unit)} · Δ {formatBandResidual(result.residualCm, unit)} · {formatAnthropometryStatus(result)}
              </small>
            </div>
          </Html>
        )}
          </group>
        )
      })}
    </group>
  )
}

function FigureStage({ assets, morphed, comparisonMorphed, resolvedMeasurements, resolvedComparisonMeasurements, morphPending, pose, autoRotate, appearance, selectedPart, selectedBand, surfaceMode, showMeasurements, compareEnabled, cameraView, resetViewKey, unit, onSelectPart, onSelectBand, onBoundsChange, onAnthropometryChange }) {
  const stage = useRef()
  const suppressBodySelectionUntil = useRef(0)
  const rotationTarget = useRef((VIEW_ANGLES[cameraView] || 0) + THREE.MathUtils.degToRad(pose.turn))
  const previousRotationState = useRef({ autoRotate, cameraView, turn: pose.turn, resetViewKey })
  const onAnthropometryChangeRef = useRef(onAnthropometryChange)
  const reducedMotion = useReducedMotion()
  const invalidate = useThree((state) => state.invalidate)
  const anthropometryPayload = useMemo(() => ({
    active: morphed.anthropometry,
    reference: comparisonMorphed?.anthropometry || null,
  }), [comparisonMorphed, morphed.anthropometry])
  const desiredHeight = resolvedMeasurements.height / 30.2
  const modelScale = desiredHeight / (morphed.maxY - morphed.minY)
  const groundOffset = -morphed.minY * modelScale + 0.055
  const comparisonScale = comparisonMorphed
    ? (resolvedComparisonMeasurements.height / 30.2) / (comparisonMorphed.maxY - comparisonMorphed.minY)
    : modelScale
  const comparisonGround = comparisonMorphed ? -comparisonMorphed.minY * comparisonScale + 0.055 : groundOffset
  const modelBounds = useMemo(() => {
    const activeBounds = calculateModelBounds(morphed.positions, modelScale, groundOffset)
    const comparisonBounds = compareEnabled && comparisonMorphed
      ? calculateModelBounds(comparisonMorphed.positions, comparisonScale, comparisonGround)
      : null
    return makeYRotationSafeBounds(unionModelBounds(activeBounds, comparisonBounds))
  }, [compareEnabled, comparisonGround, comparisonMorphed, comparisonScale, groundOffset, modelScale, morphed.positions])

  const selectMeasurementBand = useCallback((part, band) => {
    suppressBodySelectionUntil.current = performance.now() + 1500
    onSelectBand?.(part, band)
  }, [onSelectBand])

  const selectBodyPart = useCallback((part) => {
    if (performance.now() < suppressBodySelectionUntil.current) return
    onSelectPart?.(part)
  }, [onSelectPart])

  useLayoutEffect(() => {
    onBoundsChange?.(modelBounds)
  }, [modelBounds, onBoundsChange])

  useLayoutEffect(() => {
    onAnthropometryChangeRef.current = onAnthropometryChange
  }, [onAnthropometryChange])

  useEffect(() => {
    onAnthropometryChangeRef.current?.(anthropometryPayload)
  }, [anthropometryPayload])

  useEffect(() => {
    const previous = previousRotationState.current
    const current = stage.current?.rotation.y || 0
    const canonical = (VIEW_ANGLES[cameraView] || 0) + THREE.MathUtils.degToRad(pose.turn)
    const viewRequested = previous.cameraView !== cameraView
      || previous.turn !== pose.turn
      || previous.resetViewKey !== resetViewKey

    if (!autoRotate) {
      rotationTarget.current = previous.autoRotate && !viewRequested
        ? current
        : nearestEquivalentAngle(current, canonical)
    }
    previousRotationState.current = { autoRotate, cameraView, turn: pose.turn, resetViewKey }
    invalidate()
  }, [autoRotate, cameraView, invalidate, pose.turn, resetViewKey])

  useEffect(() => {
    invalidate()
  }, [appearance, autoRotate, cameraView, comparisonMorphed, invalidate, morphed, morphPending, pose.turn, reducedMotion, resetViewKey, selectedBand, selectedPart, showMeasurements, surfaceMode, unit])

  useFrame((_, delta) => {
    if (!stage.current) return
    if (autoRotate && !reducedMotion) {
      stage.current.rotation.y += delta * 0.3
      invalidate()
    }
    else {
      const target = rotationTarget.current
      stage.current.rotation.y = THREE.MathUtils.damp(stage.current.rotation.y, target, 7, delta)
      if (Math.abs(stage.current.rotation.y - target) > 0.0001) invalidate()
    }
  })

  return (
    <group ref={stage}>
      {compareEnabled && comparisonMorphed && (
        <group position={[0, comparisonGround, 0]} scale={comparisonScale}>
          <GhostMesh assets={assets} morphed={comparisonMorphed} />
        </group>
      )}
      <group position={[0, groundOffset, 0]} scale={modelScale}>
        <FigureMesh
          assets={assets}
          morphed={morphed}
          appearance={appearance}
          selectedPart={selectedPart}
          surfaceMode={surfaceMode}
          onSelectPart={selectBodyPart}
        />
        <FigureAppearance
          fitPositions={morphed.fitPositions}
          faceAnchor={morphed.faceAnchor}
          hairStyle={appearance?.hairStyle}
          hairColor={appearance?.hairColor}
          skinColor={appearance?.skinColor}
          browColor={appearance?.browColor}
          lashIntensity={appearance?.lashIntensity}
          surfaceMode={surfaceMode}
        />
        {showMeasurements && !morphPending && (
          <MeasurementBands
            anthropometry={morphed.anthropometry}
            selectedPart={selectedPart}
            selectedBand={selectedBand}
            unit={unit}
            onSelectBand={selectMeasurementBand}
          />
        )}
      </group>
      {morphPending && (
        <Html position={[0, modelBounds.max.y + 0.18, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div className="canvas-evaluating" role="status">Updating surface tapeâ€¦</div>
        </Html>
      )}
    </group>
  )
}

function LoadingFigure() {
  return (
    <Html position={[0, 2.8, 0]} center distanceFactor={9} zIndexRange={[20, 0]}>
      <div className="canvas-loader" role="status" aria-live="polite">
        <span className="canvas-loader-scan" aria-hidden="true"><i /></span>
        <strong>Building the human mesh</strong>
        <small>Decoding anatomy and fitted assets</small>
      </div>
    </Html>
  )
}

function useMpfbMorphWorker({ measurements, comparisonMeasurements, pose, compareEnabled }) {
  const [state, setState] = useState({
    active: null,
    reference: null,
    measurements: null,
    comparisonMeasurements: null,
    pending: true,
    error: null,
  })
  const queueRef = useRef(null)
  const workerPose = useMemo(() => ({ arms: pose.arms, stance: pose.stance }), [pose.arms, pose.stance])

  useEffect(() => {
    const worker = new Worker(new URL('../workers/mpfbMorph.worker.js', import.meta.url), {
      type: 'module',
      name: 'form-atlas-morph',
    })
    const queue = createLatestWorkerQueue({
      send: (job) => worker.postMessage({ type: 'morph', ...job }),
      onResult: (message) => {
        setState({
          active: message.active,
          reference: message.reference,
          measurements: message.measurements,
          comparisonMeasurements: message.comparisonMeasurements,
          pending: false,
          error: null,
        })
      },
      onError: (message) => {
        const error = message instanceof Error ? message : new Error(message?.error || 'The anatomy worker stopped unexpectedly')
        setState((current) => ({ ...current, pending: false, error }))
      },
    })
    queueRef.current = queue

    const handleMessage = (event) => {
      if (event.data?.type === 'ready') queue.markReady()
      else if (event.data?.type === 'fatal') queue.fail(new Error(event.data.error))
      else queue.resolve(event.data)
    }
    const handleError = (event) => {
      event.preventDefault?.()
      queue.fail(new Error(event.message || 'The anatomy worker stopped unexpectedly'))
    }
    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage({ type: 'initialize', manifestUrl: MPFB_MANIFEST_URL })

    return () => {
      queue.close()
      queueRef.current = null
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
    }
  }, [])

  useEffect(() => {
    setState((current) => ({ ...current, pending: true, error: null }))
    queueRef.current?.enqueue({
      measurements,
      comparisonMeasurements,
      pose: workerPose,
      compareEnabled,
    })
  }, [compareEnabled, comparisonMeasurements, measurements, workerPose])

  return state
}

function StudioControls({ focusMode, modelBounds, resetViewKey, fitBodyViewKey = 0, onNavigate }) {
  const controls = useRef()
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)
  const transition = useRef(null)
  const pendingFrame = useRef(null)
  const hasFramed = useRef(false)
  const manuallyNavigated = useRef(false)
  const lastFrameMode = useRef('body')
  const previousRequest = useRef({ focusMode, resetViewKey, fitBodyViewKey, width: 0, height: 0, modelBounds: null })
  const mouseButtons = useMemo(() => ({
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }), [])
  const fullBodyFrame = useMemo(() => framePerspectiveBounds(modelBounds, {
    aspect: size.width / Math.max(1, size.height),
    verticalFovDegrees: camera.fov,
    margin: 1.13,
  }), [camera.fov, modelBounds, size.height, size.width])

  const startFrame = useCallback((mode) => {
    if (!controls.current || !modelBounds) {
      pendingFrame.current = mode
      return
    }

    const requestedBounds = mode === 'face' ? makeFaceBounds(modelBounds) : modelBounds
    const frame = framePerspectiveBounds(requestedBounds, {
      aspect: size.width / Math.max(1, size.height),
      verticalFovDegrees: camera.fov,
      margin: mode === 'face' ? 1.16 : 1.13,
    })
    if (!frame) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    transition.current = {
      elapsed: 0,
      duration: reduceMotion ? 0.01 : 0.58,
      fromPosition: camera.position.clone(),
      fromTarget: controls.current.target.clone(),
      toPosition: new THREE.Vector3(frame.position.x, frame.position.y, frame.position.z),
      toTarget: new THREE.Vector3(frame.target.x, frame.target.y, frame.target.z),
    }
    camera.near = 0.05
    camera.far = Math.max(100, frame.far)
    camera.updateProjectionMatrix()
    pendingFrame.current = null
    hasFramed.current = true
    manuallyNavigated.current = false
    lastFrameMode.current = mode
    invalidate()
  }, [camera, invalidate, modelBounds, size.height, size.width])

  useEffect(() => {
    const previous = previousRequest.current
    const fitBodyRequested = previous.fitBodyViewKey !== fitBodyViewKey
    const resetRequested = previous.resetViewKey !== resetViewKey
    const focusChanged = previous.focusMode !== focusMode
    const resized = previous.width !== size.width || previous.height !== size.height
    const boundsChanged = previous.modelBounds !== modelBounds
    let requestedMode = pendingFrame.current

    if (fitBodyRequested) requestedMode = 'body'
    else if (!hasFramed.current) requestedMode = focusMode === 'face' ? 'face' : 'body'
    else if (focusChanged) requestedMode = focusMode === 'face' ? 'face' : 'body'
    else if (resetRequested) requestedMode = lastFrameMode.current
    else if ((resized || boundsChanged) && !manuallyNavigated.current) requestedMode = lastFrameMode.current

    previousRequest.current = { focusMode, resetViewKey, fitBodyViewKey, width: size.width, height: size.height, modelBounds }
    if (requestedMode) startFrame(requestedMode)
  }, [fitBodyViewKey, focusMode, modelBounds, resetViewKey, size.height, size.width, startFrame])

  useEffect(() => {
    const canvas = gl.domElement
    const navigation = {
      pointerInside: false,
      spaceHeld: false,
      spaceGesture: false,
      suppressClick: false,
      suppressTimer: 0,
      previousCursor: canvas.style.cursor,
    }
    const originalTabIndex = canvas.getAttribute('tabindex')
    const originalLabel = canvas.getAttribute('aria-label')
    const originalDescription = canvas.getAttribute('aria-describedby')
    const originalShortcuts = canvas.getAttribute('aria-keyshortcuts')
    const originalSpacePanning = canvas.dataset.spacePanning

    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', 'Interactive 3D body preview')
    canvas.setAttribute('aria-describedby', 'viewport-navigation-help')
    canvas.setAttribute('aria-keyshortcuts', 'Space ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight PageUp PageDown')

    const setLeftButton = (action) => {
      mouseButtons.LEFT = action
      if (controls.current) controls.current.mouseButtons.LEFT = action
    }
    const releaseSpace = () => {
      if (!navigation.spaceHeld) return
      navigation.spaceHeld = false
      delete canvas.dataset.spacePanning
      setLeftButton(THREE.MOUSE.ROTATE)
      canvas.style.cursor = navigation.spaceGesture ? 'grabbing' : navigation.previousCursor
      invalidate()
    }
    const cancelSpaceNavigation = (shouldInvalidate = true) => {
      navigation.spaceHeld = false
      navigation.spaceGesture = false
      delete canvas.dataset.spacePanning
      navigation.suppressClick = false
      window.clearTimeout(navigation.suppressTimer)
      navigation.suppressTimer = 0
      setLeftButton(THREE.MOUSE.ROTATE)
      canvas.style.cursor = navigation.previousCursor
      if (shouldInvalidate) invalidate()
    }
    const finishSpaceGesture = () => {
      if (!navigation.spaceGesture) return
      navigation.spaceGesture = false
      canvas.style.cursor = navigation.spaceHeld ? 'grab' : navigation.previousCursor
      window.clearTimeout(navigation.suppressTimer)
      navigation.suppressTimer = window.setTimeout(() => {
        navigation.suppressClick = false
      }, 0)
    }
    const handlePointerEnter = () => {
      navigation.pointerInside = true
    }
    const handlePointerLeave = () => {
      navigation.pointerInside = false
      if (navigation.spaceGesture) releaseSpace()
      else cancelSpaceNavigation()
    }
    const handlePointerDown = (event) => {
      if (event.button !== 0) return
      canvas.focus({ preventScroll: true })
      if (!navigation.spaceHeld) return
      navigation.spaceGesture = true
      navigation.suppressClick = true
      canvas.style.cursor = 'grabbing'
    }
    const handlePointerUp = () => finishSpaceGesture()
    const handlePointerCancel = () => cancelSpaceNavigation()
    const handleClickCapture = (event) => {
      if (!navigation.suppressClick) return
      event.preventDefault()
      event.stopImmediatePropagation()
      navigation.suppressClick = false
      window.clearTimeout(navigation.suppressTimer)
    }
    const handleKeyDown = (event) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (isEditableKeyboardTarget(event.target)) return
      const canvasEngaged = navigation.pointerInside || document.activeElement === canvas || navigation.spaceGesture
      if (!canvasEngaged) return
      event.preventDefault()
      if (navigation.spaceHeld) return
      navigation.spaceHeld = true
      canvas.dataset.spacePanning = 'true'
      setLeftButton(THREE.MOUSE.PAN)
      canvas.style.cursor = 'grab'
      invalidate()
    }
    const handleKeyUp = (event) => {
      if (event.code !== 'Space' && event.key !== ' ') return
      if (navigation.spaceHeld) event.preventDefault()
      releaseSpace()
    }
    const handleCanvasCameraKeyDown = (event) => {
      if (!controls.current || isEditableKeyboardTarget(event.target)) return
      const rotate = event.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
      const zoom = event.key === 'PageUp' || event.key === 'PageDown'
      if (!rotate && !zoom) return

      event.preventDefault()
      event.stopImmediatePropagation()
      transition.current = null
      manuallyNavigated.current = true
      onNavigate?.()
      const target = controls.current.target
      const offset = camera.position.clone().sub(target)

      if (zoom) {
        const currentDistance = offset.length()
        const factor = event.key === 'PageUp' ? 0.88 : 1 / 0.88
        const nextDistance = THREE.MathUtils.clamp(
          currentDistance * factor,
          controls.current.minDistance,
          controls.current.maxDistance,
        )
        offset.setLength(nextDistance)
      } else {
        const spherical = new THREE.Spherical().setFromVector3(offset)
        const step = THREE.MathUtils.degToRad(7.5)
        if (event.key === 'ArrowLeft') spherical.theta -= step
        if (event.key === 'ArrowRight') spherical.theta += step
        if (event.key === 'ArrowUp') spherical.phi -= step
        if (event.key === 'ArrowDown') spherical.phi += step
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.current.minPolarAngle, controls.current.maxPolarAngle)
        offset.setFromSpherical(spherical)
      }

      camera.position.copy(target).add(offset)
      camera.lookAt(target)
      controls.current.update()
      invalidate()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') cancelSpaceNavigation()
    }
    const handleWindowBlur = () => cancelSpaceNavigation()

    canvas.addEventListener('pointerenter', handlePointerEnter)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('pointerdown', handlePointerDown, true)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerCancel)
    canvas.addEventListener('click', handleClickCapture, true)
    canvas.addEventListener('keydown', handleCanvasCameraKeyDown, true)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    window.addEventListener('keyup', handleKeyUp, { passive: false })
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelSpaceNavigation(false)
      if (originalTabIndex === null) canvas.removeAttribute('tabindex')
      else canvas.setAttribute('tabindex', originalTabIndex)
      if (originalLabel === null) canvas.removeAttribute('aria-label')
      else canvas.setAttribute('aria-label', originalLabel)
      if (originalDescription === null) canvas.removeAttribute('aria-describedby')
      else canvas.setAttribute('aria-describedby', originalDescription)
      if (originalShortcuts === null) canvas.removeAttribute('aria-keyshortcuts')
      else canvas.setAttribute('aria-keyshortcuts', originalShortcuts)
      if (originalSpacePanning === undefined) delete canvas.dataset.spacePanning
      else canvas.dataset.spacePanning = originalSpacePanning
      canvas.removeEventListener('pointerenter', handlePointerEnter)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('pointerdown', handlePointerDown, true)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerCancel)
      canvas.removeEventListener('click', handleClickCapture, true)
      canvas.removeEventListener('keydown', handleCanvasCameraKeyDown, true)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [camera, gl, invalidate, mouseButtons, onNavigate])

  useFrame((_, delta) => {
    const motion = transition.current
    if (!motion || !controls.current) return
    motion.elapsed += delta
    const progress = Math.min(1, motion.elapsed / motion.duration)
    const eased = 1 - ((1 - progress) ** 3)
    camera.position.lerpVectors(motion.fromPosition, motion.toPosition, eased)
    controls.current.target.lerpVectors(motion.fromTarget, motion.toTarget, eased)
    controls.current.update()
    if (progress >= 1) transition.current = null
    else invalidate()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      panSpeed={0.58}
      keyPanSpeed={16}
      keyEvents={gl.domElement}
      zoomToCursor
      mouseButtons={mouseButtons}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      cursor={fullBodyFrame ? [fullBodyFrame.target.x, fullBodyFrame.target.y, fullBodyFrame.target.z] : [0, 3, 0]}
      minTargetRadius={0}
      maxTargetRadius={fullBodyFrame ? Math.max(1, fullBodyFrame.radius * 1.2) : 4}
      minDistance={focusMode === 'face' ? 1.8 : 2.5}
      maxDistance={fullBodyFrame ? Math.max(14, fullBodyFrame.distance * 2.25) : 24}
      minPolarAngle={Math.PI * 0.3}
      maxPolarAngle={Math.PI * 0.68}
      onStart={() => {
        transition.current = null
        manuallyNavigated.current = true
        onNavigate?.()
      }}
      onChange={() => invalidate()}
      onEnd={() => invalidate()}
    />
  )
}

function WebGLRecovery({ onLost, onRestored }) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const canvas = gl.domElement
    const handleLost = (event) => {
      event.preventDefault()
      onLost?.()
    }
    const handleRestored = () => {
      onRestored?.()
      invalidate()
    }

    canvas.addEventListener('webglcontextlost', handleLost)
    canvas.addEventListener('webglcontextrestored', handleRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
    }
  }, [gl, invalidate, onLost, onRestored])

  return null
}

function CaptureController({ requestKey = 0, onCaptured }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const handledRequest = useRef(0)
  const onCapturedRef = useRef(onCaptured)

  useLayoutEffect(() => {
    onCapturedRef.current = onCaptured
  }, [onCaptured])

  useEffect(() => {
    if (!requestKey || requestKey === handledRequest.current) return
    handledRequest.current = requestKey
    let target = null
    const previousTarget = gl.getRenderTarget()
    const previousXr = gl.xr.enabled
    const previousBackground = scene.background

    try {
      const { width, height } = captureDimensions({
        width: size.width,
        height: size.height,
        pixelRatio: gl.getPixelRatio(),
        deviceMemory: globalThis.navigator?.deviceMemory,
      })
      target = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: true,
        stencilBuffer: false,
        type: THREE.UnsignedByteType,
      })
      target.texture.colorSpace = THREE.SRGBColorSpace

      gl.xr.enabled = false
      scene.background = new THREE.Color('#b8c0ba')
      gl.setRenderTarget(target)
      gl.clear(true, true, true)
      gl.render(scene, camera)
      const pixels = new Uint8Array(width * height * 4)
      gl.readRenderTargetPixels(target, 0, 0, width, height, pixels)
      gl.setRenderTarget(previousTarget)
      gl.xr.enabled = previousXr
      scene.background = previousBackground
      invalidate()

      const output = document.createElement('canvas')
      output.width = width
      output.height = height
      const context = output.getContext('2d')
      if (!context) throw new Error('Image canvas is unavailable')
      const rowBytes = width * 4
      const row = new Uint8Array(rowBytes)
      for (let y = 0; y < Math.floor(height / 2); y += 1) {
        const topStart = y * rowBytes
        const bottomStart = (height - 1 - y) * rowBytes
        row.set(pixels.subarray(topStart, topStart + rowBytes))
        pixels.copyWithin(topStart, bottomStart, bottomStart + rowBytes)
        pixels.set(row, bottomStart)
      }
      const image = new ImageData(new Uint8ClampedArray(pixels.buffer), width, height)
      context.putImageData(image, 0, 0)
      output.toBlob((blob) => {
        if (blob) onCapturedRef.current?.({ blob, width, height })
        else onCapturedRef.current?.({ error: new Error('Image encoding failed') })
      }, 'image/png')
    } catch (error) {
      onCapturedRef.current?.({ error })
    } finally {
      gl.setRenderTarget(previousTarget)
      gl.xr.enabled = previousXr
      scene.background = previousBackground
      target?.dispose()
    }
  }, [camera, gl, invalidate, requestKey, scene, size.height, size.width])

  return null
}

function LoadedFigure(props) {
  const assets = useLoader(MPFBGeometryLoader, MPFB_MANIFEST_URL)
  const morph = useMpfbMorphWorker(props)
  if (morph.error) throw morph.error
  if (!morph.active || !morph.measurements) return <LoadingFigure />

  return (
    <FigureStage
      {...props}
      assets={assets}
      morphed={morph.active}
      comparisonMorphed={morph.reference}
      resolvedMeasurements={morph.measurements}
      resolvedComparisonMeasurements={morph.comparisonMeasurements}
      morphPending={morph.pending}
    />
  )
}

function Scene(props) {
  const [modelBounds, setModelBounds] = useState(null)
  const handleBoundsChange = useCallback((nextBounds) => {
    setModelBounds((currentBounds) => {
      if (currentBounds
        && currentBounds.min.x === nextBounds.min.x
        && currentBounds.min.y === nextBounds.min.y
        && currentBounds.min.z === nextBounds.min.z
        && currentBounds.max.x === nextBounds.max.x
        && currentBounds.max.y === nextBounds.max.y
        && currentBounds.max.z === nextBounds.max.z) return currentBounds
      return nextBounds
    })
  }, [])

  return (
    <>
      <ambientLight intensity={1.12} />
      <hemisphereLight args={['#fffdf7', '#46504a', 0.8]} />
      <directionalLight position={[4.8, 8, 6]} intensity={2.25} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3.5, 4]} intensity={0.76} color="#ead8c6" />
      <Suspense fallback={<LoadingFigure />}>
        <LoadedFigure {...props} onBoundsChange={handleBoundsChange} />
      </Suspense>
      <ContactShadows position={[0, 0.035, 0]} opacity={0.2} scale={7} blur={2.7} far={5} resolution={256} />
      <CaptureController requestKey={props.captureRequestKey} onCaptured={props.onCaptureResult} />
      <StudioControls
        focusMode={props.focusMode}
        modelBounds={modelBounds}
        resetViewKey={props.resetViewKey}
        fitBodyViewKey={props.fitBodyViewKey}
        onNavigate={props.onNavigate}
      />
    </>
  )
}

function BodyCanvas(props) {
  const [contextLost, setContextLost] = useState(false)
  const handleContextLost = useCallback(() => setContextLost(true), [])
  const handleContextRestored = useCallback(() => setContextLost(false), [])

  return (
    <>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.65]}
        camera={{ position: [0, 2.9, 10.2], fov: 34, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
        aria-label="Interactive female surface-anatomy model with selectable body regions and measurement bands."
      >
        <WebGLRecovery onLost={handleContextLost} onRestored={handleContextRestored} />
        <Scene {...props} />
      </Canvas>
      {contextLost && (
        <div className="scene-state scene-error" role="status" aria-live="polite">
          <span className="scene-state-mark">!</span>
          <strong>Restoring the 3D preview</strong>
          <p>The graphics context paused. Your profile is safe while the browser reconnects it.</p>
        </div>
      )}
    </>
  )
}

export default memo(BodyCanvas)

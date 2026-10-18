import { MEASUREMENT_PROTOCOL } from '../data/measurementProtocol.js'

const DEFAULT_RELATIVE_EPSILON = 1e-7
const MIN_ENVELOPE_AREA = 1e-10

const clamp01 = (value) => Math.min(1, Math.max(0, value))

function point2d(value) {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) return [value[0], value[1]]
  if (value?.point) return [value.point[0], value.point[2]]
  if (Number.isFinite(value?.x) && Number.isFinite(value?.z)) return [value.x, value.z]
  throw new TypeError('Convex-envelope points must be [x, z], { x, z }, or mesh-section nodes')
}

function cross2d(origin, a, b) {
  const [ox, oz] = point2d(origin)
  const [ax, az] = point2d(a)
  const [bx, bz] = point2d(b)
  return (ax - ox) * (bz - oz) - (az - oz) * (bx - ox)
}

/** Return the counter-clockwise convex envelope while retaining input items. */
export function convexEnvelope(points) {
  if (!Array.isArray(points)) throw new TypeError('Convex-envelope input must be an array')
  if (points.length <= 1) return points.slice()

  const sorted = points.slice().sort((a, b) => {
    const [ax, az] = point2d(a)
    const [bx, bz] = point2d(b)
    return ax - bx || az - bz
  })
  const unique = []
  for (const point of sorted) {
    const [x, z] = point2d(point)
    const previous = unique[unique.length - 1]
    if (previous) {
      const [previousX, previousZ] = point2d(previous)
      if (x === previousX && z === previousZ) continue
    }
    unique.push(point)
  }
  if (unique.length <= 2) return unique

  const lower = []
  for (const point of unique) {
    while (lower.length >= 2 && cross2d(lower.at(-2), lower.at(-1), point) <= 0) lower.pop()
    lower.push(point)
  }
  const upper = []
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index]
    while (upper.length >= 2 && cross2d(upper.at(-2), upper.at(-1), point) <= 0) upper.pop()
    upper.push(point)
  }
  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

export function polygonPerimeter2d(points) {
  if (!Array.isArray(points) || points.length < 2) return 0
  let perimeter = 0
  for (let index = 0; index < points.length; index += 1) {
    const [x0, z0] = point2d(points[index])
    const [x1, z1] = point2d(points[(index + 1) % points.length])
    perimeter += Math.hypot(x1 - x0, z1 - z0)
  }
  return perimeter
}

export function polygonArea2d(points) {
  if (!Array.isArray(points) || points.length < 3) return 0
  let twiceArea = 0
  for (let index = 0; index < points.length; index += 1) {
    const [x0, z0] = point2d(points[index])
    const [x1, z1] = point2d(points[(index + 1) % points.length])
    twiceArea += x0 * z1 - x1 * z0
  }
  return Math.abs(twiceArea) / 2
}

function vertexPoint(positions, vertex) {
  const offset = vertex * 3
  return [positions[offset], positions[offset + 1], positions[offset + 2]]
}

export function evaluateAttachment(attachment, positions) {
  if (!attachment || !positions) throw new TypeError('An attachment and position array are required')
  const aOffset = attachment.a * 3
  const bOffset = attachment.b * 3
  const t = attachment.t
  const inverse = 1 - t
  return [
    positions[aOffset] * inverse + positions[bOffset] * t,
    positions[aOffset + 1] * inverse + positions[bOffset + 1] * t,
    positions[aOffset + 2] * inverse + positions[bOffset + 2] * t,
  ]
}

function makeVertexNode(vertex, positions) {
  return {
    key: `v:${vertex}`,
    point: vertexPoint(positions, vertex),
    attachment: { a: vertex, b: vertex, t: 0 },
  }
}

function makeEdgeNode(vertexA, vertexB, planeY, positions) {
  const a = Math.min(vertexA, vertexB)
  const b = Math.max(vertexA, vertexB)
  const yA = positions[a * 3 + 1]
  const yB = positions[b * 3 + 1]
  const denominator = yB - yA
  const t = denominator === 0 ? 0.5 : clamp01((planeY - yA) / denominator)
  const attachment = { a, b, t }
  return {
    key: `e:${a}:${b}`,
    point: evaluateAttachment(attachment, positions),
    attachment,
  }
}

function classifyDistance(distance, epsilon) {
  if (distance > epsilon) return 1
  if (distance < -epsilon) return -1
  return 0
}

function triangleSectionNodes(vertices, planeY, positions, epsilon) {
  const distances = vertices.map((vertex) => positions[vertex * 3 + 1] - planeY)
  const sides = distances.map((distance) => classifyDistance(distance, epsilon))
  if (sides.every((side) => side === 0)) return []

  const intersections = new Map()
  const edges = [[0, 1], [1, 2], [2, 0]]
  for (const [from, to] of edges) {
    const vertexA = vertices[from]
    const vertexB = vertices[to]
    const sideA = sides[from]
    const sideB = sides[to]
    if (sideA === 0 && sideB === 0) {
      const nodeA = makeVertexNode(vertexA, positions)
      const nodeB = makeVertexNode(vertexB, positions)
      intersections.set(nodeA.key, nodeA)
      intersections.set(nodeB.key, nodeB)
    } else if (sideA === 0) {
      const node = makeVertexNode(vertexA, positions)
      intersections.set(node.key, node)
    } else if (sideB === 0) {
      const node = makeVertexNode(vertexB, positions)
      intersections.set(node.key, node)
    } else if (sideA !== sideB) {
      const node = makeEdgeNode(vertexA, vertexB, planeY, positions)
      intersections.set(node.key, node)
    }
  }

  const nodes = [...intersections.values()]
  if (nodes.length <= 2) return nodes

  // A non-coplanar triangle can only contribute one segment. In a numerically
  // degenerate case retain the farthest pair instead of introducing a branch.
  let farthest = [nodes[0], nodes[1]]
  let maximumDistance = -Infinity
  for (let a = 0; a < nodes.length; a += 1) {
    for (let b = a + 1; b < nodes.length; b += 1) {
      const distance = Math.hypot(
        nodes[a].point[0] - nodes[b].point[0],
        nodes[a].point[2] - nodes[b].point[2],
      )
      if (distance > maximumDistance) {
        maximumDistance = distance
        farthest = [nodes[a], nodes[b]]
      }
    }
  }
  return farthest
}

function segmentKey(keyA, keyB) {
  return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`
}

function connectedComponents(nodes, adjacency) {
  const unseen = new Set(adjacency.keys())
  const components = []
  while (unseen.size) {
    const seed = unseen.values().next().value
    const stack = [seed]
    const keys = []
    unseen.delete(seed)
    while (stack.length) {
      const key = stack.pop()
      keys.push(key)
      for (const neighbor of adjacency.get(key) || []) {
        if (!unseen.has(neighbor)) continue
        unseen.delete(neighbor)
        stack.push(neighbor)
      }
    }
    const componentNodes = keys.map((key) => nodes.get(key))
    const degrees = keys.map((key) => adjacency.get(key)?.size || 0)
    components.push({
      keys,
      nodes: componentNodes,
      closed: componentNodes.length >= 3 && degrees.every((degree) => degree === 2),
      branched: degrees.some((degree) => degree > 2),
      open: degrees.some((degree) => degree < 2),
    })
  }
  return components
}

/**
 * Intersect an indexed triangle mesh with a horizontal plane. Nodes are keyed
 * by their canonical mesh edge (or exact vertex), so neighboring triangles
 * stitch without position quantization.
 */
export function sliceMeshAtPlane({ positions, indices, planeY, epsilon }) {
  return sliceMeshAtPlanes({ positions, indices, planeYs: [planeY], epsilon })[0]
}

function makeSectionBuilder(planeY) {
  return { planeY, nodes: new Map(), segments: new Map(), adjacency: new Map() }
}

function addSectionSegment(builder, intersections) {
  if (intersections.length !== 2 || intersections[0].key === intersections[1].key) return
  const [nodeA, nodeB] = intersections
  const key = segmentKey(nodeA.key, nodeB.key)
  if (builder.segments.has(key)) return
  builder.nodes.set(nodeA.key, nodeA)
  builder.nodes.set(nodeB.key, nodeB)
  builder.segments.set(key, [nodeA.key, nodeB.key])
  if (!builder.adjacency.has(nodeA.key)) builder.adjacency.set(nodeA.key, new Set())
  if (!builder.adjacency.has(nodeB.key)) builder.adjacency.set(nodeB.key, new Set())
  builder.adjacency.get(nodeA.key).add(nodeB.key)
  builder.adjacency.get(nodeB.key).add(nodeA.key)
}

function firstPlaneAtOrAbove(planes, value) {
  let low = 0
  let high = planes.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (planes[middle].planeY < value) low = middle + 1
    else high = middle
  }
  return low
}

/** Batch horizontal slices so each mesh triangle is visited only once. */
export function sliceMeshAtPlanes({ positions, indices, planeYs, epsilon }) {
  if (!Array.isArray(planeYs) || !planeYs.length || planeYs.some((planeY) => !Number.isFinite(planeY))) {
    throw new TypeError('planeYs must be a non-empty array of finite values')
  }
  const resolvedEpsilon = Number.isFinite(epsilon) && epsilon >= 0 ? epsilon : DEFAULT_RELATIVE_EPSILON
  const ordered = planeYs
    .map((planeY, originalIndex) => ({ planeY, originalIndex, builder: makeSectionBuilder(planeY) }))
    .sort((a, b) => a.planeY - b.planeY)

  for (let index = 0; index < indices.length; index += 3) {
    const vertices = [indices[index], indices[index + 1], indices[index + 2]]
    const y0 = positions[vertices[0] * 3 + 1]
    const y1 = positions[vertices[1] * 3 + 1]
    const y2 = positions[vertices[2] * 3 + 1]
    const minimum = Math.min(y0, y1, y2) - resolvedEpsilon
    const maximum = Math.max(y0, y1, y2) + resolvedEpsilon
    let planeIndex = firstPlaneAtOrAbove(ordered, minimum)
    while (planeIndex < ordered.length && ordered[planeIndex].planeY <= maximum) {
      const plane = ordered[planeIndex]
      addSectionSegment(
        plane.builder,
        triangleSectionNodes(vertices, plane.planeY, positions, resolvedEpsilon),
      )
      planeIndex += 1
    }
  }

  const resolved = new Array(ordered.length)
  for (const { originalIndex, builder } of ordered) {
    resolved[originalIndex] = {
      planeY: builder.planeY,
      nodes: builder.nodes,
      segments: [...builder.segments.values()],
      components: connectedComponents(builder.nodes, builder.adjacency),
    }
  }
  return resolved
}

export function boundsOfPositions(positions) {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset]
    const y = positions[offset + 1]
    const z = positions[offset + 2]
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new TypeError('Position arrays must contain only finite coordinates')
    }
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  }
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  }
}

function componentEnvelope(component) {
  const envelope = convexEnvelope(component.nodes)
  const area = polygonArea2d(envelope)
  if (envelope.length < 3 || area <= MIN_ENVELOPE_AREA) return null
  let minX = Infinity
  let maxX = -Infinity
  let centroidX = 0
  for (const node of envelope) {
    const x = node.point[0]
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    centroidX += x
  }
  return {
    component,
    envelope,
    area,
    perimeter: polygonPerimeter2d(envelope),
    minX,
    maxX,
    centroidX: centroidX / envelope.length,
  }
}

function selectComponent(components, selector, bodyWidth, epsilon) {
  const envelopes = components
    .filter((component) => component.closed)
    .map(componentEnvelope)
    .filter(Boolean)
  let eligible
  if (selector === 'center') {
    eligible = envelopes.filter(({ minX, maxX }) => minX <= epsilon && maxX >= -epsilon)
  } else if (selector === 'right') {
    const threshold = Math.max(epsilon, bodyWidth * 0.01)
    eligible = envelopes.filter(({ centroidX }) => centroidX > threshold)
  } else if (selector === 'left') {
    const threshold = Math.max(epsilon, bodyWidth * 0.01)
    eligible = envelopes.filter(({ centroidX }) => centroidX < -threshold)
  } else {
    eligible = envelopes
  }
  eligible.sort((a, b) => b.area - a.area)
  if (!eligible.length) return null
  const selected = eligible[0]
  const competingArea = eligible[1]?.area || 0
  const separation = selected.area > 0 ? 1 - competingArea / selected.area : 0
  return {
    ...selected,
    confidence: eligible.length === 1 ? 1 : 0.8 + Math.max(0, separation) * 0.2,
  }
}

function searchRatios(search) {
  const minRatio = search?.minRatio
  const maxRatio = search?.maxRatio
  const samples = Math.max(1, Math.round(search?.samples || 1))
  if (!Number.isFinite(minRatio) || !Number.isFinite(maxRatio) || minRatio < 0 || maxRatio > 1 || minRatio > maxRatio) {
    throw new TypeError('Measurement search windows must be finite ratios within [0, 1]')
  }
  if (samples === 1 || minRatio === maxRatio) return [(minRatio + maxRatio) / 2]
  return Array.from({ length: samples }, (_, index) => (
    minRatio + (maxRatio - minRatio) * index / (samples - 1)
  ))
}

function chooseCandidate(candidates, search) {
  if (!candidates.length) return null
  const preferred = Number.isFinite(search.preferredRatio)
    ? search.preferredRatio
    : (search.minRatio + search.maxRatio) / 2
  const byPreferred = (a, b) => Math.abs(a.ratio - preferred) - Math.abs(b.ratio - preferred)
  if (search.objective === 'closest') return candidates.slice().sort(byPreferred)[0]
  const direction = search.objective === 'min' ? 1 : -1
  return candidates.slice().sort((a, b) => (
    direction * (a.perimeter - b.perimeter) || byPreferred(a, b)
  ))[0]
}

function targetValue(targets, definition) {
  const value = targets?.[definition.targetKey || definition.key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function unmeasurableResult(definition, targetCm) {
  return {
    valueCm: null,
    targetCm,
    residualCm: null,
    toleranceCm: definition.toleranceCm,
    status: 'unmeasurable',
    yRatio: null,
    closed: false,
    confidence: 0,
  }
}

function validateGeometry(neutralPositions, posedPositions, indices, statureCm) {
  if (!neutralPositions || neutralPositions.length < 9 || neutralPositions.length % 3 !== 0) {
    throw new TypeError('neutralPositions must contain complete xyz vertices')
  }
  if (!indices || indices.length < 3 || indices.length % 3 !== 0) {
    throw new TypeError('indices must contain complete triangles')
  }
  if (!Number.isFinite(statureCm) || statureCm <= 0) throw new TypeError('statureCm must be positive and finite')
  const resolvedPosed = posedPositions || neutralPositions
  if (resolvedPosed.length !== neutralPositions.length) {
    throw new TypeError('posedPositions must match neutralPositions')
  }
  const vertexCount = neutralPositions.length / 3
  for (let index = 0; index < indices.length; index += 1) {
    const vertex = indices[index]
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= vertexCount) {
      throw new RangeError('indices contain an out-of-range vertex')
    }
  }
  boundsOfPositions(resolvedPosed)
  return resolvedPosed
}

/**
 * Measure versioned surface-tape circumferences on a neutral mesh and attach
 * the chosen tape vertices to the corresponding posed mesh edges.
 */
export function measureAnthropometry({
  neutralPositions,
  posedPositions,
  indices,
  statureCm,
  targets,
  protocol = MEASUREMENT_PROTOCOL,
}) {
  const resolvedPosed = validateGeometry(neutralPositions, posedPositions, indices, statureCm)
  if (!protocol || !Array.isArray(protocol.definitions)) throw new TypeError('A measurement protocol with definitions is required')
  const bounds = boundsOfPositions(neutralPositions)
  const statureUnits = bounds.size[1]
  if (!(statureUnits > 0)) throw new RangeError('The neutral mesh must have positive stature')
  const cmPerUnit = statureCm / statureUnits
  const bodyWidth = bounds.size[0]
  const epsilon = Math.max(statureUnits, bodyWidth, bounds.size[2], 1) * DEFAULT_RELATIVE_EPSILON
  const values = {}
  const results = {}
  const ribbons = {}

  for (const definition of protocol.definitions) {
    const targetCm = targetValue(targets, definition)
    if (definition.kind !== 'circumference' || definition.envelope !== 'convex-hull') {
      values[definition.key] = null
      results[definition.key] = unmeasurableResult(definition, targetCm)
      ribbons[definition.key] = []
      continue
    }

    const ratios = searchRatios(definition.search)
    const planeYs = ratios.map((ratio) => bounds.min[1] + statureUnits * ratio)
    const sections = sliceMeshAtPlanes({ positions: neutralPositions, indices, planeYs, epsilon })
    const candidates = []
    for (let index = 0; index < ratios.length; index += 1) {
      const ratio = ratios[index]
      const section = sections[index]
      const selected = selectComponent(section.components, definition.component, bodyWidth, epsilon)
      if (!selected) continue
      candidates.push({ ...selected, ratio, sampleIndex: index, sampleCount: ratios.length })
    }

    const chosen = chooseCandidate(candidates, definition.search)
    if (!chosen) {
      values[definition.key] = null
      results[definition.key] = unmeasurableResult(definition, targetCm)
      ribbons[definition.key] = []
      continue
    }

    const valueCm = chosen.perimeter * cmPerUnit
    const residualCm = targetCm === null ? null : valueCm - targetCm
    const status = residualCm === null || Math.abs(residualCm) <= definition.toleranceCm
      ? 'within-tolerance'
      : 'outside-tolerance'
    const boundaryExtremum = definition.search.objective !== 'closest'
      && chosen.sampleCount > 1
      && (chosen.sampleIndex === 0 || chosen.sampleIndex === chosen.sampleCount - 1)
    const confidence = Math.max(0, Math.min(1, chosen.confidence - (boundaryExtremum ? 0.15 : 0)))
    const ribbon = chosen.envelope.map((node) => evaluateAttachment(node.attachment, resolvedPosed))
    if (ribbon.length) ribbon.push(ribbon[0].slice())

    values[definition.key] = valueCm
    results[definition.key] = {
      valueCm,
      targetCm,
      residualCm,
      toleranceCm: definition.toleranceCm,
      status,
      yRatio: chosen.ratio,
      closed: chosen.component.closed,
      confidence,
    }
    ribbons[definition.key] = ribbon
  }

  return {
    protocol: {
      id: protocol.id,
      version: protocol.version,
      topology: protocol.topology,
    },
    values,
    results,
    ribbons,
  }
}

import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowCounterClockwise,
  ArrowsOut,
  ArrowUUpLeft,
  ArrowUUpRight,
  Camera,
  CaretDown,
  CaretRight,
  Check,
  CirclesFour,
  Command,
  Copy,
  Crosshair,
  Cube,
  DownloadSimple,
  Eye,
  FileCsv,
  FloppyDisk,
  FolderOpen,
  GenderFemale,
  Hand,
  Heart,
  Keyboard,
  LineSegments,
  MagnifyingGlass,
  Palette,
  Pause,
  PersonArmsSpread,
  PersonSimple,
  PersonSimpleRun,
  Play,
  Ruler,
  Scan,
  ShareNetwork,
  ShuffleAngular,
  SidebarSimple,
  SlidersHorizontal,
  Smiley,
  Stack,
  StackSimple,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from '@phosphor-icons/react'
import { SceneErrorBoundary } from './components/SceneErrorBoundary.jsx'
import AppearanceLab from './components/AppearanceLab.jsx'
import { DEFAULT_APPEARANCE } from './data/appearance.js'
import { PROFILE_VERSION, sanitizeProfile } from './lib/profile.js'
import { generateRandomProfile } from './lib/profileRandomizer.js'
import {
  commitProfileCheckpoint,
  profileSnapshot,
  redoProfileHistory,
  undoProfileHistory,
} from './lib/profileHistory.js'
import {
  anthropometryProtocolSnapshot,
  currentAnthropometryResult,
  isAnthropometryComplete,
  measurementsWithRealizedCircumferences,
  serializeAnthropometry,
} from './lib/anthropometryAudit.js'
import { assessModelDomain } from './lib/modelDomain.js'
import { formatHeight } from './lib/units.js'
import { searchCommands } from './lib/commandSearch.js'
import { buildMeasurementReportCsv } from './lib/measurementReport.js'
import {
  addStudy,
  readStudyLibrary,
  removeStudy,
  STUDY_LIBRARY_KEY,
} from './lib/studyLibrary.js'
import {
  ANATOMY_REGIONS,
  CONTROL_GROUPS,
  DEFAULT_LANDMARK_BY_REGION,
  deriveProfile,
  findRegion,
  INITIAL_MEASUREMENTS,
  INITIAL_POSE,
  MEASUREMENT_LANDMARKS,
  POSE_CONTROLS,
  PRESETS,
} from './data/anatomy.js'

const BodyCanvas = lazy(() => import('./components/BodyCanvas.jsx'))

const REGION_ICONS = {
  foundation: CirclesFour,
  bust: Heart,
  torso: Stack,
  pelvis: CirclesFour,
  legs: PersonSimpleRun,
  arms: Hand,
  head: Smiley,
  appearance: Palette,
  pose: PersonSimple,
}

const PART_TO_REGION = {
  head: 'head',
  neck: 'head',
  bust: 'bust',
  torso: 'torso',
  waist: 'torso',
  pelvis: 'pelvis',
  hips: 'pelvis',
  legs: 'legs',
  arms: 'arms',
}

const SURFACE_MODES = [
  { id: 'studio', label: 'Studio', icon: Eye },
  { id: 'atlas', label: 'Atlas', icon: Stack },
  { id: 'clay', label: 'Clay', icon: Cube },
  { id: 'contour', label: 'Contour', icon: LineSegments },
]

const VIEW_MODES = [
  { id: 'front', label: 'Front' },
  { id: 'threeQuarter', label: '3/4' },
  { id: 'side', label: 'Side' },
  { id: 'back', label: 'Back' },
]

const POSE_PRESETS = [
  { name: 'Neutral', pose: { arms: 22, stance: 38, turn: 0 } },
  { name: 'Anatomical', pose: { arms: 46, stance: 46, turn: 0 } },
  { name: 'Silhouette', pose: { arms: 32, stance: 58, turn: 0 } },
]

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function focusModeForRegion(regionId) {
  return regionId === 'head' || regionId === 'appearance' ? 'face' : 'body'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(query).matches
  ))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()

    if (media.addEventListener) media.addEventListener('change', update)
    else media.addListener(update)

    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update)
      else media.removeListener(update)
    }
  }, [query])

  return matches
}

function loadSession() {
  if (typeof window === 'undefined') return sanitizeProfile(null)
  try {
    const saved = window.localStorage.getItem('form-atlas-session-v5')
      || window.localStorage.getItem('form-atlas-session-v4')
      || window.localStorage.getItem('form-atlas-session-v3')
      || window.localStorage.getItem('form-atlas-session-v2')
    return sanitizeProfile(saved)
  } catch {
    return sanitizeProfile(null)
  }
}

function loadReference() {
  if (typeof window === 'undefined') return INITIAL_MEASUREMENTS
  try {
    const reference = JSON.parse(window.localStorage.getItem('form-atlas-reference-v2'))
    return sanitizeProfile({ measurements: reference }).measurements
  } catch {
    return INITIAL_MEASUREMENTS
  }
}

function loadStudies() {
  if (typeof window === 'undefined') return []
  try {
    return readStudyLibrary(window.localStorage.getItem(STUDY_LIBRARY_KEY))
  } catch {
    return []
  }
}

function qualitativeLabel(value, startLabel, endLabel) {
  if (value <= 28) return startLabel
  if (value >= 72) return endLabel
  if (value < 44) return `Leaning ${startLabel.toLowerCase()}`
  if (value > 56) return `Leaning ${endLabel.toLowerCase()}`
  return 'Balanced'
}

function controlDisplay(control, value, unit) {
  if (control.unit === 'cm') return unit === 'imperial' ? `${(value / 2.54).toFixed(1)} in` : `${value.toFixed(1)} cm`
  if (control.unit === 'kg') return unit === 'imperial' ? `${(value * 2.20462).toFixed(1)} lb` : `${value.toFixed(1)} kg`
  if (control.unit === 'years') return `${Math.round(value)} yr`
  if (control.unit === 'degrees') return `${Math.round(value)}°`
  if (control.unit === 'percent') return `${Math.round(value)}%`
  return qualitativeLabel(value, control.startLabel, control.endLabel)
}

function circumferenceDisplay(valueCm, unit, signed = false) {
  if (!Number.isFinite(valueCm)) return '—'
  const converted = unit === 'imperial' ? valueCm / 2.54 : valueCm
  const sign = signed && converted > 0 ? '+' : ''
  return `${sign}${converted.toFixed(1)} ${unit === 'imperial' ? 'in' : 'cm'}`
}

function massDisplay(valueKg, unit) {
  if (!Number.isFinite(valueKg)) return '—'
  return unit === 'imperial'
    ? `${(valueKg * 2.20462).toFixed(1)} lb`
    : `${valueKg.toFixed(1)} kg`
}

function numericDisplay(control, value, unit) {
  if (control.unit === 'cm' && unit === 'imperial') return Number((value / 2.54).toFixed(2))
  if (control.unit === 'kg' && unit === 'imperial') return Number((value * 2.20462).toFixed(2))
  return value
}

function numericToInternal(control, value, unit) {
  if (control.unit === 'cm' && unit === 'imperial') return value * 2.54
  if (control.unit === 'kg' && unit === 'imperial') return value / 2.20462
  return value
}

function numericBounds(control, unit) {
  if (control.unit === 'cm' && unit === 'imperial') return { min: control.min / 2.54, max: control.max / 2.54, step: control.step / 2.54 }
  if (control.unit === 'kg' && unit === 'imperial') return { min: control.min * 2.20462, max: control.max * 2.20462, step: control.step * 2.20462 }
  return { min: control.min, max: control.max, step: control.step }
}

function RangeControl({ control, value, unit, accent, onChange, onEditStart, onFocusPart }) {
  const progress = ((value - control.min) / (control.max - control.min)) * 100
  const id = `control-${control.key}`
  const bounds = numericBounds(control, unit)
  const displayedNumber = numericDisplay(control, value, unit)
  const numericSuffix = control.unit === 'cm' ? (unit === 'imperial' ? 'in' : 'cm')
    : control.unit === 'kg' ? (unit === 'imperial' ? 'lb' : 'kg')
      : control.unit === 'years' ? 'yr'
        : control.unit === 'degrees' ? '°'
          : '%'

  const startEditing = () => {
    onEditStart?.()
    onFocusPart?.(control.part, control.band)
  }

  const changeNumber = (event) => {
    const entered = Number(event.target.value)
    if (!Number.isFinite(entered)) return
    const internal = numericToInternal(control, entered, unit)
    onChange(Math.min(control.max, Math.max(control.min, internal)))
  }

  return (
    <div className="anatomy-control" data-control-key={control.key} style={{ '--control-accent': accent }}>
      <div className="control-heading">
        <label htmlFor={id}>{control.label}</label>
        <output htmlFor={id}>{controlDisplay(control, value, unit)}</output>
      </div>
      <div className="control-input-row">
        <input
          id={id}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={value}
          aria-valuetext={controlDisplay(control, value, unit)}
          onFocus={startEditing}
          onPointerDown={startEditing}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ '--range-progress': `${progress}%` }}
        />
        <label className="number-field">
          <span className="sr-only">Enter {control.label}</span>
          <input
            type="number"
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            value={displayedNumber}
            onFocus={startEditing}
            onChange={changeNumber}
          />
          <span>{numericSuffix}</span>
        </label>
      </div>
      {control.startLabel && (
        <div className="control-axis" aria-hidden="true">
          <span>{control.startLabel}</span>
          <span>{control.endLabel}</span>
        </div>
      )}
    </div>
  )
}

function Segmented({ options, value, onChange, label, compact = false }) {
  return (
    <div className={cx('segmented', compact && 'segmented-compact')} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx(value === option.value && 'active')}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function IconButton({ label, children, active = false, className, ...props }) {
  return (
    <button type="button" className={cx('icon-button', active && 'active', className)} aria-label={label} {...props}>
      {children}
      <span className="tool-label" aria-hidden="true">{label}</span>
    </button>
  )
}

function ExportMenu({ onProfile, onReport }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const closeMenu = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && menuRef.current?.contains(event.target)) return
      menuRef.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeMenu)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeMenu)
    }
  }, [])

  const select = (action) => {
    action()
    menuRef.current?.removeAttribute('open')
  }

  return (
    <details className="export-menu" ref={menuRef}>
      <summary className="top-action primary" aria-label="Export profile or measurement report">
        <DownloadSimple />
        <span>Export</span>
        <CaretDown className="export-caret" />
      </summary>
      <div className="export-menu-popover">
        <button type="button" onClick={() => select(onProfile)}>
          <ShareNetwork />
          <span><strong>Profile JSON</strong><small>Reopen the complete studio profile</small></span>
        </button>
        <button type="button" onClick={() => select(onReport)}>
          <FileCsv />
          <span><strong>Measurement CSV</strong><small>Targets, surface tape, residuals, and status</small></span>
        </button>
      </div>
    </details>
  )
}

function StudyMenu({ studies, unit, onSave, onOpen, onCompare, onRemove }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const closeMenu = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && menuRef.current?.contains(event.target)) return
      menuRef.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeMenu)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeMenu)
    }
  }, [])

  const select = (action) => {
    action()
    menuRef.current?.removeAttribute('open')
  }

  return (
    <details className="study-menu" ref={menuRef}>
      <summary className="top-action secondary" aria-label={`Open study library with ${studies.length} saved studies`}>
        <StackSimple />
        <span>Studies</span>
        <b>{studies.length}</b>
      </summary>
      <div className="study-menu-popover">
        <header>
          <span><strong>Study library</strong><small>Keep working variants close</small></span>
          <button type="button" onClick={onSave}><FloppyDisk /> Save current</button>
        </header>
        {studies.length ? (
          <div className="study-list">
            {studies.map((study) => (
              <article key={study.id}>
                <div className="study-copy">
                  <strong>{study.name}</strong>
                  <small>{formatHeight(study.profile.measurements.height, unit)} · {massDisplay(study.profile.measurements.weight, unit)}</small>
                </div>
                <div className="study-actions">
                  <button type="button" onClick={() => select(() => onOpen(study))}><FolderOpen /> Open</button>
                  <button type="button" onClick={() => select(() => onCompare(study))}><Crosshair /> Compare</button>
                  <button className="study-remove" type="button" aria-label={`Remove ${study.name}`} onClick={() => onRemove(study)}><Trash /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="study-empty">
            <StackSimple />
            <strong>No studies pinned yet</strong>
            <span>Save a proportion study, then reopen it or use it as the comparison reference.</span>
          </div>
        )}
        <footer>Stored only in this browser · up to 6 studies</footer>
      </div>
    </details>
  )
}

function CommandCenter({ open, commands, onClose }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const searchRef = useRef(null)
  const dialogRef = useRef(null)
  const results = useMemo(() => searchCommands(commands, query), [commands, query])

  const executeCommand = useCallback((command) => {
    if (!command || command.disabled) return
    command.run()
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    setQuery('')
    setActiveIndex(0)
    document.body.classList.add('command-open')
    const previousFocus = document.activeElement
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
    return () => {
      document.body.classList.remove('command-open')
      window.cancelAnimationFrame(frame)
      previousFocus?.focus?.()
    }
  }, [open])

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, results.length - 1)))
  }, [results.length])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => results.length ? (current + 1) % results.length : 0)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => results.length ? (current - 1 + results.length) % results.length : 0)
      } else if (event.key === 'Enter' && results[activeIndex]) {
        event.preventDefault()
        executeCommand(results[activeIndex])
      } else if (event.key === 'Tab') {
        const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), input, [href], summary') || [])]
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, executeCommand, onClose, open, results])

  useEffect(() => {
    if (!open || !results[activeIndex]) return
    document.getElementById(`command-${results[activeIndex].id}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, results])

  if (!open) return null

  return (
    <div className="command-backdrop" role="presentation" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section ref={dialogRef} className="command-center" role="dialog" aria-modal="true" aria-labelledby="command-center-title">
        <header className="command-center-head">
          <div>
            <span className="command-mark"><Command weight="bold" /></span>
            <span><strong id="command-center-title">Navigate FORM Atlas</strong><small>Jump to any tool, measurement, or view</small></span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close command center"><X /></button>
        </header>
        <label className="command-search">
          <MagnifyingGlass aria-hidden="true" />
          <span className="sr-only">Search studio commands</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search measurements, body areas, views, or actions…"
            autoComplete="off"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex] ? `command-${results[activeIndex].id}` : undefined}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
          />
          <kbd>Esc</kbd>
        </label>
        <div id="command-results" className="command-results" role="listbox" aria-label="Studio commands">
          {results.length ? results.map((command, index) => {
            const Icon = command.icon || CaretRight
            const startsGroup = index === 0 || results[index - 1].category !== command.category
            return (
              <div className="command-result-block" key={command.id}>
                {startsGroup && <div className="command-category">{command.category}</div>}
                <button
                  id={`command-${command.id}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  disabled={command.disabled}
                  className={cx(activeIndex === index && 'active')}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => executeCommand(command)}
                >
                  <span className="command-icon"><Icon /></span>
                  <span><strong>{command.label}</strong><small>{command.description}</small></span>
                  {command.shortcut ? <kbd>{command.shortcut}</kbd> : <CaretRight className="command-enter" />}
                </button>
              </div>
            )
          }) : (
            <div className="command-empty">
              <MagnifyingGlass />
              <strong>No matching studio command</strong>
              <span>Try a body area, measurement name, camera view, or export.</span>
            </div>
          )}
        </div>
        <footer className="command-footer">
          <span><Keyboard /> <kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Run command</span>
          <span><kbd>Esc</kbd> Close</span>
        </footer>
      </section>
    </div>
  )
}

const SceneLoading = memo(function SceneLoading() {
  return (
    <div className="scene-state scene-loading" aria-live="polite">
      <div className="body-skeleton" aria-hidden="true">
        <span className="sk-head" />
        <span className="sk-body" />
        <span className="sk-legs" />
      </div>
      <div>
        <strong>Loading anatomical mesh</strong>
        <span>Preparing 378 morph targets</span>
      </div>
    </div>
  )
})

function WorkspaceBar({ unit, setUnit, canUndo, canRedo, persistenceStatus, studies, focusMode, onUndo, onRedo, onReference, onImport, onExport, onExportReport, onOpenCommands, onSaveStudy, onOpenStudy, onCompareStudy, onRemoveStudy, onToggleFocus }) {
  return (
    <header className="workspace-bar">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true"><img src="/assets/images/form-atlas-mark.png" alt="" /></span>
        <div className="brand-copy">
          <strong>FORM ATLAS</strong>
          <small>Human anatomy studio</small>
        </div>
        <div className="workspace-status">
          <span className={cx('live-dot', persistenceStatus === 'tab' && 'storage-fallback')} />
          <span>Working profile</span>
          <small>{persistenceStatus === 'saved' ? 'saved locally' : persistenceStatus === 'tab' ? 'kept in this tab' : 'checking storage'}</small>
        </div>
      </div>

      <div className="workspace-actions">
        <button
          className="top-action secondary command-trigger"
          type="button"
          aria-keyshortcuts="Control+K Meta+K"
          onClick={onOpenCommands}
        >
          <MagnifyingGlass />
          <span>Find</span>
          <kbd>Ctrl K</kbd>
        </button>
        <Segmented
          compact
          label="Measurement units"
          value={unit}
          onChange={setUnit}
          options={[{ label: 'Metric', value: 'metric' }, { label: 'Imperial', value: 'imperial' }]}
        />
        <div className="history-actions" aria-label="Edit history">
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo last edit"><ArrowUUpLeft /></button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo last edit"><ArrowUUpRight /></button>
        </div>
        <StudyMenu
          studies={studies}
          unit={unit}
          onSave={onSaveStudy}
          onOpen={onOpenStudy}
          onCompare={onCompareStudy}
          onRemove={onRemoveStudy}
        />
        <button className={cx('top-action secondary focus-action', focusMode && 'active')} type="button" onClick={onToggleFocus} aria-pressed={focusMode}>
          <SidebarSimple />
          <span>{focusMode ? 'Exit focus' : 'Focus'}</span>
        </button>
        <button className="top-action secondary reference-action" type="button" onClick={onReference}><Crosshair /> Set reference</button>
        <button className="top-action secondary import-action" type="button" onClick={onImport}><UploadSimple /> Import</button>
        <ExportMenu onProfile={onExport} onReport={onExportReport} />
      </div>
    </header>
  )
}

function CalibrationLedger({ activeRegion, landmark, measurements, report, unit }) {
  const region = findRegion(activeRegion)
  const result = landmark ? currentAnthropometryResult(report, landmark.key, measurements) : null
  const toleranceCm = Number.isFinite(result?.toleranceCm) ? result.toleranceCm : 1
  const withinTolerance = result ? Math.abs(result.residualCm) <= toleranceCm : false
  const state = !landmark ? 'context' : !result ? 'pending' : withinTolerance ? 'within' : result.calibrationStatus === 'authored-limit' ? 'limit' : 'gap'
  const status = !landmark
    ? 'Sculpt workspace'
    : !result
      ? 'Evaluating mesh'
      : withinTolerance
        ? 'Within tolerance'
        : result.calibrationStatus === 'authored-limit'
          ? 'Authored limit'
          : 'Review residual'

  return (
    <section className={cx('calibration-ledger', `is-${state}`)} aria-label="Live surface calibration" aria-live="polite">
      <header>
        <span><Scan weight="bold" /> LIVE SURFACE</span>
        <b>{status}</b>
      </header>
      <div className="ledger-context">
        <span>{region.label}</span>
        <strong>{landmark?.label || region.shortLabel}</strong>
      </div>
      {landmark ? (
        <div className="ledger-values">
          <span><small>Target</small><strong>{circumferenceDisplay(measurements[landmark.measurement], unit)}</strong></span>
          <span><small>Surface</small><strong>{result ? circumferenceDisplay(result.valueCm, unit) : 'Pending'}</strong></span>
          <span><small>Residual</small><strong>{result ? circumferenceDisplay(result.residualCm, unit, true) : '—'}</strong></span>
        </div>
      ) : (
        <p>Choose a measurement ribbon to inspect target-to-surface truth.</p>
      )}
    </section>
  )
}

function ProfileRail({ activeRegion, onRegion, onPreset, onRandomize, measurements, unit }) {
  return (
    <aside className="profile-rail panel" aria-label="Body editing areas, presets, and appearance">
      <div className="base-anatomy-card">
        <GenderFemale weight="bold" />
        <div>
          <span>Base anatomy</span>
          <strong>Female</strong>
          <small>Adult surface morphology</small>
        </div>
        <span className="morph-count">378 morphs</span>
      </div>

      <section className="preset-section" aria-labelledby="preset-heading">
        <div className="rail-heading">
          <span id="preset-heading">Starting profiles</span>
          <small>non-medical</small>
        </div>
        <button className="randomize-profile" type="button" onClick={onRandomize} aria-describedby="randomize-profile-description">
          <ShuffleAngular weight="bold" aria-hidden="true" />
          <span>
            <strong>Randomize profile</strong>
            <small id="randomize-profile-description">Coordinated body, hair & palette · undoable</small>
          </span>
        </button>
        <div className="preset-grid">
          {PRESETS.map((preset) => (
            <button key={preset.id} type="button" onClick={() => onPreset(preset)}>
              <span>{preset.name}</span>
              <small>{preset.caption}</small>
            </button>
          ))}
        </div>
      </section>

      <nav className="region-nav" aria-label="Editing areas">
        <div className="rail-heading">
          <span>Edit areas</span>
          <small>select a workspace</small>
        </div>
        {ANATOMY_REGIONS.map((region, index) => {
          const Icon = REGION_ICONS[region.id]
          const controlSummary = region.id === 'appearance' ? 'Hair, skin & color'
            : `${region.id === 'pose' ? POSE_CONTROLS.length : CONTROL_GROUPS[region.id]?.length || 0} controls`
          return (
            <button
              key={region.id}
              type="button"
              className={cx(activeRegion === region.id && 'active')}
              onClick={() => onRegion(region.id)}
              aria-current={activeRegion === region.id ? 'page' : undefined}
              style={{ '--region-accent': region.accent }}
            >
              <span className="region-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <Icon weight={activeRegion === region.id ? 'fill' : 'regular'} />
              <span className="region-copy">
                <strong>{region.label}</strong>
                <small>{controlSummary}</small>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="rail-footnote">
        <Scan />
        <span><strong>{formatHeight(measurements.height, unit)} profile</strong>Click the model to jump between regions.</span>
      </div>
    </aside>
  )
}

function GeometryReadout({ landmark, measurements, report, modelDomain, unit }) {
  const result = landmark
    ? currentAnthropometryResult(report, landmark.key, measurements)
    : null
  const toleranceCm = result?.toleranceCm
  const effectiveToleranceCm = Number.isFinite(toleranceCm) ? toleranceCm : 1
  const withinTolerance = result
    ? Math.abs(result.residualCm) <= effectiveToleranceCm
    : false
  const authoredLimit = result?.calibrationStatus === 'authored-limit'
  const calibrationMiss = result?.calibrationStatus === 'calibration-miss'
  const auditState = !result ? 'pending' : withinTolerance ? 'within' : authoredLimit ? 'limit' : 'gap'
  const auditBadge = !result ? 'Measuring' : withinTolerance ? 'Close' : authoredLimit ? 'Asset limit' : 'Gap'
  const protocol = anthropometryProtocolSnapshot(report)

  if (!landmark && !modelDomain.saturated) return null

  return (
    <div className="geometry-audit" aria-live="polite">
      {landmark && (
        <section className={cx('geometry-readout', auditState)} aria-label={`${landmark.label} mesh measurement`}>
          <header>
            <Scan weight="bold" aria-hidden="true" />
            <span>
              <strong>Surface tape · {landmark.label}</strong>
              <small>{protocol.id} v{protocol.version} · experimental</small>
            </span>
            <b>{auditBadge}</b>
          </header>
          <div className="geometry-values">
            <span><small>Target input</small><strong>{circumferenceDisplay(measurements[landmark.measurement], unit)}</strong></span>
            <span><small>Mesh tape</small><strong>{result ? circumferenceDisplay(result.valueCm, unit) : 'Recalculating…'}</strong></span>
            <span><small>Residual</small><strong>{result ? circumferenceDisplay(result.residualCm, unit, true) : '—'}</strong></span>
          </div>
          <p>
            {result
              ? withinTolerance
                ? `Estimated surface is within ${circumferenceDisplay(effectiveToleranceCm, unit)} of the target.`
                : authoredLimit
                  ? 'The source target reached its authored deformation limit. The ribbon reports the closest generated surface without extrapolating the mesh.'
                  : calibrationMiss
                    ? 'The coupled targets could not converge inside tolerance. The ribbon reports the generated surface and exact residual.'
                    : 'The authored morph does not solve exactly to the requested circumference; the ribbon reports the generated surface.'
              : 'The 3D worker is evaluating this profile. Stale geometry is never reported as current.'}
          </p>
        </section>
      )}

      {modelDomain.saturated && (
        <div className="model-domain-warning" role="note">
          <WarningCircle weight="fill" aria-hidden="true" />
          <p>
            <strong>Macro mass limit reached</strong>
            At this height the source mesh represents approximately {massDisplay(modelDomain.supportedWeightKg[0], unit)}–{massDisplay(modelDomain.supportedWeightKg[1], unit)}. The mass value is retained, but body-mass shape is capped at BMI {modelDomain.effectiveBmi.toFixed(0)}.
          </p>
        </div>
      )}
    </div>
  )
}

function Inspector({ activeRegion, advanced, setAdvanced, measurements, pose, appearance, unit, updateMeasurement, updatePose, updateAppearance, checkpoint, focusControl, applyPosePreset, selectedLandmark, anthropometry, modelDomain }) {
  const region = findRegion(activeRegion)
  const allControls = activeRegion === 'pose' ? POSE_CONTROLS : CONTROL_GROUPS[activeRegion] || []
  const primary = activeRegion === 'pose' ? allControls : allControls.filter((control) => control.priority === 'primary')
  const detail = activeRegion === 'pose' ? [] : allControls.filter((control) => control.priority !== 'primary')
  const inspectorKicker = activeRegion === 'appearance'
    ? 'Appearance studio / Hair & color'
    : activeRegion === 'pose' ? 'Presentation / Pose' : `Surface anatomy / ${region.shortLabel}`

  const renderControl = (control, source, updater) => (
    <RangeControl
      key={control.key}
      control={control}
      value={source[control.key]}
      unit={unit}
      accent={region.accent}
      onChange={(next) => updater(control.key, next, control.part)}
      onEditStart={checkpoint}
      onFocusPart={focusControl}
    />
  )

  return (
    <aside className="inspector panel" aria-label={`${region.label} controls`} style={{ '--region-accent': region.accent }}>
      <header className="inspector-head">
        <div className="inspector-kicker"><span /> {inspectorKicker}</div>
        <h1>{region.label}</h1>
        <p>{region.description}</p>
        {activeRegion !== 'pose' && activeRegion !== 'appearance' && (
          <button className="detail-toggle" type="button" onClick={() => setAdvanced((value) => !value)} aria-pressed={advanced}>
            <span>
              <strong>Detailed anatomy</strong>
              <small>{advanced ? `${allControls.length} controls visible` : `${detail.length} refinements hidden`}</small>
            </span>
            <span className={cx('toggle-track', advanced && 'on')}><i /></span>
          </button>
        )}
      </header>

      <div className="inspector-scroll">
        {activeRegion === 'appearance' ? (
          <AppearanceLab appearance={appearance} onChange={updateAppearance} onEditStart={checkpoint} />
        ) : (
          <>
          {activeRegion !== 'pose' && (
            <GeometryReadout
              landmark={selectedLandmark}
              measurements={measurements}
              report={anthropometry}
              modelDomain={modelDomain}
              unit={unit}
            />
          )}
          {activeRegion === 'pose' && (
          <section className="pose-presets" aria-labelledby="pose-preset-title">
            <div className="control-section-title" id="pose-preset-title">Neutral poses</div>
            <div>
              {POSE_PRESETS.map((preset) => (
                <button key={preset.name} type="button" onClick={() => applyPosePreset(preset)}>{preset.name}</button>
              ))}
            </div>
          </section>
          )}

          <fieldset className="control-fieldset">
            <legend>{activeRegion === 'pose' ? 'Pose controls' : 'Core measurements'}</legend>
            {primary.map((control) => renderControl(control, activeRegion === 'pose' ? pose : measurements, activeRegion === 'pose' ? updatePose : updateMeasurement))}
          </fieldset>

          {advanced && detail.length > 0 && (
            <fieldset className="control-fieldset detail-fieldset">
              <legend>Detailed anatomy</legend>
              {detail.map((control) => renderControl(control, measurements, updateMeasurement))}
            </fieldset>
          )}

          <div className="inspector-note">
            <Ruler />
            <p><strong>Target and surface are distinct</strong>Controls request authored deformation; the surface tape reports the generated mesh. BMI and body-fat values remain non-clinical input estimates.</p>
          </div>
          </>
        )}
      </div>
    </aside>
  )
}

function Metric({ label, value, note }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  )
}

function ProportionDeck({ measurements, derived, unit, compareEnabled, referenceMeasurements, activeAnthropometry, referenceAnthropometry, analysisBasis, modelDomain, className, collapsible = false }) {
  const [expanded, setExpanded] = useState(false)
  const height = formatHeight(measurements.height, unit)
  const weight = unit === 'imperial' ? `${(measurements.weight * 2.20462).toFixed(1)} lb` : `${measurements.weight.toFixed(1)} kg`
  const activeWaist = currentAnthropometryResult(activeAnthropometry, 'waist', measurements)
  const activeHip = currentAnthropometryResult(activeAnthropometry, 'hips', measurements)
  const referenceWaist = currentAnthropometryResult(referenceAnthropometry, 'waist', referenceMeasurements)
  const referenceHip = currentAnthropometryResult(referenceAnthropometry, 'hips', referenceMeasurements)
  const comparisonUsesMesh = Boolean(activeWaist && activeHip && referenceWaist && referenceHip)
  const waistDelta = comparisonUsesMesh
    ? activeWaist.valueCm - referenceWaist.valueCm
    : measurements.waist - referenceMeasurements.waist
  const hipDelta = comparisonUsesMesh
    ? activeHip.valueCm - referenceHip.valueCm
    : measurements.hips - referenceMeasurements.hips

  return (
    <section className={cx('proportion-deck', className, collapsible && 'collapsible')} aria-label="Profile proportions">
      {collapsible && (
        <button
          className="deck-mobile-toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls="mobile-proportion-metrics"
          onClick={() => setExpanded((value) => !value)}
        >
          <span>
            <small>{analysisBasis === 'mesh' ? 'Mesh-informed proportions' : 'Target proportions'}</small>
            <strong>{derived.shape} · {derived.frame} frame</strong>
          </span>
          <span>{expanded ? 'Hide metrics' : 'View metrics'}</span>
        </button>
      )}
      <div id={collapsible ? 'mobile-proportion-metrics' : undefined} className="proportion-deck-content" hidden={collapsible && !expanded}>
        <div className="deck-title">
        <div>
          <span>{analysisBasis === 'mesh' ? 'Mesh-informed proportions' : 'Target proportions'}</span>
          <strong>{derived.shape} · {derived.frame} frame</strong>
        </div>
        <ChartGlyph values={[derived.bustWaist, derived.hipWaist, derived.legShare * 100]} />
        </div>
        <div className="metric-grid">
        <Metric label="Height" value={height} />
        <Metric label="Mass" value={weight} />
        <Metric label="Waist / hip" value={derived.waistHip.toFixed(2)} note={analysisBasis === 'mesh' ? 'surface tape' : 'target'} />
        <Metric label="Leg share" value={`${(derived.legShare * 100).toFixed(1)}%`} note="target lengths" />
        <Metric label="BMI estimate" value={derived.bmi.toFixed(1)} note={modelDomain.saturated ? 'mesh capped' : 'input-derived'} />
        <Metric label="Body fat" value={`~${derived.bodyFatEstimate.toFixed(1)}%`} note="non-clinical" />
        </div>
        {compareEnabled && (
          <div className="reference-deltas">
          <span><i /> Reference A · {comparisonUsesMesh ? 'mesh' : 'target'}</span>
          <span>Waist {circumferenceDisplay(waistDelta, unit, true)}</span>
          <span>Hip {circumferenceDisplay(hipDelta, unit, true)}</span>
          </div>
        )}
      </div>
    </section>
  )
}

function ChartGlyph({ values }) {
  const max = Math.max(...values, 1)
  return (
    <div className="chart-glyph" aria-hidden="true">
      {values.map((value, index) => <i key={index} style={{ height: `${Math.max(25, (value / max) * 100)}%` }} />)}
    </div>
  )
}

function MeasurementJumpList({ selectedBand, onSelectBand }) {
  const detailsRef = useRef(null)

  const selectBand = (landmark) => {
    onSelectBand(landmark.part, landmark.key)
    detailsRef.current?.removeAttribute('open')
  }

  return (
    <details className="measurement-jump" ref={detailsRef}>
      <summary aria-label="Choose an on-model measurement"><Ruler /> Measurements</summary>
      <div className="measurement-jump-list" aria-label="On-model measurements">
        {MEASUREMENT_LANDMARKS.map((landmark) => (
          <button
            key={landmark.key}
            type="button"
            aria-pressed={selectedBand === landmark.key}
            onClick={() => selectBand(landmark)}
          >
            <span>{landmark.label}</span>
            <small>{landmark.region}</small>
          </button>
        ))}
      </div>
    </details>
  )
}

function StageToolbar({ autoRotate, setAutoRotate, reducedMotion, showMeasurements, setShowMeasurements, compareEnabled, setCompareEnabled, appearanceActive, onAppearance, onCapture, onFullscreen, onResetView }) {
  const rotationLabel = reducedMotion
    ? 'Auto rotation disabled by reduced motion preference'
    : autoRotate ? 'Pause rotation' : 'Auto rotate'

  return (
    <div className="viewport-tools" aria-label="Preview tools">
      <IconButton label="Full screen" onClick={onFullscreen}><ArrowsOut /></IconButton>
      <IconButton label="Recenter selected area" onClick={onResetView}><Crosshair /></IconButton>
      <IconButton
        label={rotationLabel}
        active={autoRotate}
        aria-pressed={autoRotate}
        aria-disabled={reducedMotion}
        disabled={reducedMotion}
        onClick={() => {
          if (!reducedMotion) setAutoRotate((value) => !value)
        }}
      >
        {autoRotate ? <Pause weight="fill" /> : <Play weight="fill" />}
      </IconButton>
      <IconButton label={showMeasurements ? 'Hide measurement bands' : 'Show measurement bands'} active={showMeasurements} aria-pressed={showMeasurements} onClick={() => setShowMeasurements((value) => !value)}><Ruler /></IconButton>
      <IconButton label={compareEnabled ? 'Hide reference ghost' : 'Show reference ghost'} active={compareEnabled} aria-pressed={compareEnabled} onClick={() => setCompareEnabled((value) => !value)}><PersonArmsSpread /></IconButton>
      <IconButton label="Open appearance controls" active={appearanceActive} aria-pressed={appearanceActive} onClick={onAppearance}><Palette /></IconButton>
      <IconButton label="Save image" onClick={onCapture}><Camera /></IconButton>
    </div>
  )
}

function App() {
  const initialSession = useMemo(loadSession, [])
  const [measurements, setMeasurements] = useState(initialSession.measurements)
  const [pose, setPose] = useState(initialSession.pose)
  const [appearance, setAppearance] = useState(initialSession.appearance)
  const [referenceMeasurements, setReferenceMeasurements] = useState(loadReference)
  const [unit, setUnit] = useState('metric')
  const [activeRegion, setActiveRegion] = useState('bust')
  const [selectedPart, setSelectedPart] = useState('bust')
  const [selectedBand, setSelectedBand] = useState('bust')
  const [advanced, setAdvanced] = useState(true)
  const [surfaceMode, setSurfaceMode] = useState('studio')
  const [showMeasurements, setShowMeasurements] = useState(true)
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [cameraView, setCameraView] = useState('front')
  const [cameraFocusMode, setCameraFocusMode] = useState('body')
  const [autoRotate, setAutoRotate] = useState(false)
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [fitBodyViewKey, setFitBodyViewKey] = useState(0)
  const [captureRequestKey, setCaptureRequestKey] = useState(0)
  const [touchExplore, setTouchExplore] = useState(false)
  const [persistenceStatus, setPersistenceStatus] = useState('checking')
  const [toast, setToast] = useState('')
  const [commandOpen, setCommandOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [studies, setStudies] = useState(loadStudies)
  const [history, setHistory] = useState({ past: [], future: [] })
  const [anthropometry, setAnthropometry] = useState({ active: null, reference: null })
  const [measurementFocusRequest, setMeasurementFocusRequest] = useState({ band: null, sequence: 0 })
  const measurementsRef = useRef(measurements)
  const poseRef = useRef(pose)
  const appearanceRef = useRef(appearance)
  const pendingCheckpointRef = useRef(null)
  const randomizationCountRef = useRef(0)
  const viewportRef = useRef(null)
  const importInputRef = useRef(null)
  const toastTimer = useRef(null)
  const usesCoarsePointer = useMediaQuery('(pointer: coarse), (hover: none)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const modelDomain = useMemo(() => assessModelDomain(measurements), [measurements])
  const realizedAudit = useMemo(
    () => serializeAnthropometry(anthropometry.active, measurements),
    [anthropometry.active, measurements],
  )
  const referenceRealizedAudit = useMemo(
    () => serializeAnthropometry(anthropometry.reference, referenceMeasurements),
    [anthropometry.reference, referenceMeasurements],
  )
  const meshCoreReady = useMemo(
    () => ['bust', 'waist', 'hips'].every((key) => (
      currentAnthropometryResult(anthropometry.active, key, measurements)
    )),
    [anthropometry.active, measurements],
  )
  const analysisMeasurements = useMemo(
    () => meshCoreReady
      ? measurementsWithRealizedCircumferences(measurements, anthropometry.active)
      : measurements,
    [anthropometry.active, measurements, meshCoreReady],
  )
  const analysisBasis = meshCoreReady ? 'mesh' : 'target'
  const targetDerived = useMemo(() => deriveProfile(measurements), [measurements])
  const derived = useMemo(() => deriveProfile(analysisMeasurements), [analysisMeasurements])
  const selectedLandmark = useMemo(
    () => MEASUREMENT_LANDMARKS.find((landmark) => landmark.key === selectedBand),
    [selectedBand],
  )

  useEffect(() => {
    measurementsRef.current = measurements
    poseRef.current = pose
    appearanceRef.current = appearance
    try {
      window.localStorage.setItem('form-atlas-session-v5', JSON.stringify({ measurements, pose, appearance }))
      setPersistenceStatus('saved')
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
      setPersistenceStatus('tab')
    }
  }, [appearance, measurements, pose])

  useEffect(() => {
    try {
      window.localStorage.setItem('form-atlas-reference-v2', JSON.stringify(referenceMeasurements))
    } catch {
      // The in-memory reference remains usable when persistence is unavailable.
    }
  }, [referenceMeasurements])

  useEffect(() => {
    try {
      window.localStorage.setItem(STUDY_LIBRARY_KEY, JSON.stringify(studies))
    } catch {
      // Study variants remain available for the current tab when storage is restricted.
    }
  }, [studies])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (reducedMotion) setAutoRotate(false)
  }, [reducedMotion])

  useEffect(() => {
    if (!usesCoarsePointer) setTouchExplore(false)
  }, [usesCoarsePointer])

  useEffect(() => {
    if (!touchExplore) return undefined

    const leaveExploreMode = (event) => {
      if (event.key === 'Escape') setTouchExplore(false)
    }
    window.addEventListener('keydown', leaveExploreMode)
    return () => window.removeEventListener('keydown', leaveExploreMode)
  }, [touchExplore])

  useEffect(() => {
    if (!usesCoarsePointer) return undefined

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setTouchExplore(false)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [usesCoarsePointer])

  const notify = useCallback((message) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 1900)
  }, [])

  const closeCommands = useCallback(() => setCommandOpen(false), [])

  const handleAnthropometryChange = useCallback((next) => {
    setAnthropometry((current) => (
      current.active === next?.active && current.reference === next?.reference
        ? current
        : { active: next?.active || null, reference: next?.reference || null }
    ))
  }, [])

  const checkpoint = useCallback(() => {
    pendingCheckpointRef.current ||= {
      ...profileSnapshot(measurementsRef.current, poseRef.current, appearanceRef.current),
    }
  }, [])

  const commitCheckpoint = useCallback(() => {
    const snapshot = pendingCheckpointRef.current
    if (!snapshot) return
    pendingCheckpointRef.current = null
    setHistory((current) => commitProfileCheckpoint(current, snapshot))
  }, [])

  const updateMeasurement = useCallback((key, value, part) => {
    if (measurementsRef.current[key] === value) return
    commitCheckpoint()
    setMeasurements((current) => {
      const next = { ...current, [key]: value }
      measurementsRef.current = next
      return next
    })
    if (part) setSelectedPart(part)
  }, [commitCheckpoint])

  const updatePose = useCallback((key, value) => {
    if (poseRef.current[key] === value) return
    commitCheckpoint()
    setPose((current) => {
      const next = { ...current, [key]: value }
      poseRef.current = next
      return next
    })
  }, [commitCheckpoint])

  const updateAppearance = useCallback((keyOrValues, value) => {
    const changes = typeof keyOrValues === 'string' ? { [keyOrValues]: value } : keyOrValues
    if (!Object.entries(changes).some(([key, nextValue]) => appearanceRef.current[key] !== nextValue)) return
    commitCheckpoint()
    setAppearance((current) => {
      const next = { ...current, ...changes }
      appearanceRef.current = next
      return next
    })
  }, [commitCheckpoint])

  const undo = useCallback(() => {
    if (!history.past.length) return
    pendingCheckpointRef.current = null
    const current = profileSnapshot(measurementsRef.current, poseRef.current, appearanceRef.current)
    const transition = undoProfileHistory(history, current)
    if (!transition) return
    const previous = transition.profile
    setMeasurements(previous.measurements)
    setPose(previous.pose)
    setAppearance(previous.appearance || DEFAULT_APPEARANCE)
    measurementsRef.current = previous.measurements
    poseRef.current = previous.pose
    appearanceRef.current = previous.appearance || DEFAULT_APPEARANCE
    setHistory(transition.history)
    notify('Edit undone')
  }, [history, notify])

  const redo = useCallback(() => {
    if (!history.future.length) return
    pendingCheckpointRef.current = null
    const current = profileSnapshot(measurementsRef.current, poseRef.current, appearanceRef.current)
    const transition = redoProfileHistory(history, current)
    if (!transition) return
    const next = transition.profile
    setMeasurements(next.measurements)
    setPose(next.pose)
    setAppearance(next.appearance || DEFAULT_APPEARANCE)
    measurementsRef.current = next.measurements
    poseRef.current = next.pose
    appearanceRef.current = next.appearance || DEFAULT_APPEARANCE
    setHistory(transition.history)
    notify('Edit restored')
  }, [history, notify])

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      const commandModifier = event.ctrlKey || event.metaKey

      if (commandModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((current) => !current)
        return
      }
      if (isTyping || commandOpen) return
      if (event.key === '?') {
        event.preventDefault()
        setCommandOpen(true)
      } else if (commandModifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (!commandModifier && !event.altKey && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        setShowMeasurements((current) => {
          notify(current ? 'Measurement bands hidden' : 'Measurement bands shown')
          return !current
        })
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [commandOpen, notify, redo, undo])

  const chooseRegion = (regionId) => {
    const region = findRegion(regionId)
    setCameraFocusMode(focusModeForRegion(regionId))
    if (regionId === 'appearance') {
      setSurfaceMode('studio')
      setCameraView('front')
      setAutoRotate(false)
      setCameraResetKey((value) => value + 1)
    }
    setActiveRegion(regionId)
    setSelectedPart(region.part)
    setSelectedBand(DEFAULT_LANDMARK_BY_REGION[regionId] || null)
  }

  const focusControl = (part, band) => {
    if (part) setSelectedPart(part)
    setSelectedBand(band || null)
  }

  const selectMeshPart = (part) => {
    const regionId = PART_TO_REGION[part]
    if (!regionId) return
    setCameraFocusMode(focusModeForRegion(regionId))
    setActiveRegion(regionId)
    setSelectedPart(part)
    setSelectedBand(DEFAULT_LANDMARK_BY_REGION[regionId] || null)
  }

  const selectMeasurementBand = (part, band) => {
    const regionId = PART_TO_REGION[part]
    if (!regionId) return
    setCameraFocusMode(focusModeForRegion(regionId))
    setActiveRegion(regionId)
    setSelectedPart(part)
    setSelectedBand(band)
    setMeasurementFocusRequest((current) => ({ band, sequence: current.sequence + 1 }))
  }

  useEffect(() => {
    if (!measurementFocusRequest.band) return undefined
    const frame = window.requestAnimationFrame(() => {
      const band = measurementFocusRequest.band
      const control = document.querySelector(`[data-control-key="${band}"]`)
      control?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
      control?.querySelector('input[type="range"]')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [measurementFocusRequest, reducedMotion])

  const applyPreset = (preset) => {
    const next = { ...INITIAL_MEASUREMENTS, ...preset.changes }
    if (JSON.stringify(next) === JSON.stringify(measurementsRef.current)) {
      notify(`${preset.name} profile already active`)
      return
    }
    checkpoint()
    commitCheckpoint()
    measurementsRef.current = next
    setMeasurements(next)
    notify(`${preset.name} profile applied`)
  }

  const randomizeProfile = () => {
    const generated = sanitizeProfile({
      ...generateRandomProfile(),
      pose: poseRef.current,
    })
    const current = {
      measurements: measurementsRef.current,
      pose: poseRef.current,
      appearance: appearanceRef.current,
    }
    if (JSON.stringify(generated) === JSON.stringify(current)) return

    checkpoint()
    commitCheckpoint()
    measurementsRef.current = generated.measurements
    appearanceRef.current = generated.appearance
    setMeasurements(generated.measurements)
    setAppearance(generated.appearance)
    setCameraFocusMode('body')
    setAutoRotate(false)
    setFitBodyViewKey((value) => value + 1)
    randomizationCountRef.current += 1
    notify(`Random profile ${randomizationCountRef.current} generated · undo available`)
  }

  const applyPosePreset = (preset) => {
    if (JSON.stringify(preset.pose) === JSON.stringify(poseRef.current)) {
      notify(`${preset.name} pose already active`)
      return
    }
    checkpoint()
    commitCheckpoint()
    poseRef.current = preset.pose
    setPose(preset.pose)
    setAutoRotate(false)
    notify(`${preset.name} pose applied`)
  }

  const setReference = () => {
    setReferenceMeasurements({ ...measurements })
    setCompareEnabled(true)
    notify('Reference A pinned')
  }

  const saveStudy = () => {
    const profile = profileSnapshot(measurementsRef.current, poseRef.current, appearanceRef.current)
    const result = addStudy(studies, profile, `Study ${String(studies.length + 1).padStart(2, '0')} · ${derived.shape}`)
    if (result.duplicate) {
      notify(`Already saved as ${result.duplicate.name}`)
      return
    }
    setStudies(result.studies)
    notify(`${result.added.name} pinned`)
  }

  const openStudy = (study) => {
    const next = sanitizeProfile(study.profile)
    const unchanged = JSON.stringify(next) === JSON.stringify(profileSnapshot(measurementsRef.current, poseRef.current, appearanceRef.current))
    if (unchanged) {
      notify(`${study.name} is already open`)
      return
    }
    checkpoint()
    commitCheckpoint()
    measurementsRef.current = next.measurements
    poseRef.current = next.pose
    appearanceRef.current = next.appearance
    setMeasurements(next.measurements)
    setPose(next.pose)
    setAppearance(next.appearance)
    setAutoRotate(false)
    setCameraFocusMode('body')
    setFitBodyViewKey((value) => value + 1)
    notify(`${study.name} opened · undo available`)
  }

  const compareStudy = (study) => {
    setReferenceMeasurements({ ...study.profile.measurements })
    setCompareEnabled(true)
    notify(`${study.name} set as Reference A`)
  }

  const discardStudy = (study) => {
    setStudies((current) => removeStudy(current, study.id))
    notify(`${study.name} removed`)
  }

  const exportProfile = () => {
    const payload = {
      format: 'FORM Atlas profile',
      version: PROFILE_VERSION,
      baseAnatomy: 'female',
      measurements,
      targets: measurements,
      pose,
      appearance,
      analysis: {
        basis: analysisBasis,
        target: targetDerived,
        meshInformed: analysisBasis === 'mesh' ? derived : null,
        note: 'BMI and body-fat values are input-derived estimates; circumference results are experimental surface-tape measurements.',
      },
      realized: realizedAudit,
      measurementProtocol: anthropometryProtocolSnapshot(anthropometry.active),
      modelDomain,
      reference: compareEnabled ? {
        targets: referenceMeasurements,
        realized: referenceRealizedAudit,
      } : null,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    downloadBlob(blob, 'form-atlas-female-profile.json')
    notify(realizedAudit?.complete ? 'Profile and mesh audit exported' : 'Profile exported · mesh audit pending')
  }

  const exportMeasurementReport = () => {
    const csv = buildMeasurementReportCsv({
      measurements,
      anthropometry: anthropometry.active,
      unit,
    })
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, 'form-atlas-measurement-report.csv')
    notify(realizedAudit?.complete ? 'Measurement report exported' : 'Report exported · pending tape values marked')
  }

  const importProfile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      notify('Profile file is too large')
      return
    }

    try {
      const source = JSON.parse(await file.text())
      const profileSource = source?.profile || source
      if (!profileSource || typeof profileSource !== 'object' || !profileSource.measurements) {
        throw new Error('Missing profile measurements')
      }
      const imported = sanitizeProfile(source)
      const unchanged = JSON.stringify(imported) === JSON.stringify({
        measurements: measurementsRef.current,
        pose: poseRef.current,
        appearance: appearanceRef.current,
      })
      if (unchanged) {
        notify('That profile is already active')
        return
      }
      checkpoint()
      commitCheckpoint()
      measurementsRef.current = imported.measurements
      poseRef.current = imported.pose
      appearanceRef.current = imported.appearance
      setMeasurements(imported.measurements)
      setPose(imported.pose)
      setAppearance(imported.appearance)
      setAutoRotate(false)
      setCameraResetKey((value) => value + 1)
      notify('Profile imported safely')
    } catch {
      notify('Could not read that profile')
    }
  }

  const copyProfile = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ measurements, pose, appearance }, null, 2))
      notify('Profile copied')
    } catch {
      notify('Copy unavailable')
    }
  }

  const capture = () => {
    const canvas = viewportRef.current?.querySelector('canvas')
    if (!canvas) {
      notify('3D preview is not ready')
      return
    }
    const activeReady = isAnthropometryComplete(anthropometry.active, measurements)
    const referenceReady = !compareEnabled
      || isAnthropometryComplete(anthropometry.reference, referenceMeasurements)
    if (!activeReady || !referenceReady) {
      notify('Surface update is still finishing')
      return
    }
    setCaptureRequestKey((value) => value + 1)
    notify('Rendering viewport image')
  }

  const finishCapture = useCallback(({ blob, error }) => {
    if (error || !blob) {
      notify('Image capture unavailable')
      return
    }
    downloadBlob(blob, 'form-atlas-body.png')
    notify('Viewport image saved')
  }, [notify])

  const reset = () => {
    const alreadyReset = JSON.stringify({
      measurements: measurementsRef.current,
      pose: poseRef.current,
      appearance: appearanceRef.current,
    }) === JSON.stringify({
      measurements: INITIAL_MEASUREMENTS,
      pose: INITIAL_POSE,
      appearance: DEFAULT_APPEARANCE,
    })
    if (alreadyReset) {
      notify('Studio is already reset')
      return
    }
    checkpoint()
    commitCheckpoint()
    measurementsRef.current = INITIAL_MEASUREMENTS
    poseRef.current = INITIAL_POSE
    appearanceRef.current = DEFAULT_APPEARANCE
    setMeasurements(INITIAL_MEASUREMENTS)
    setPose(INITIAL_POSE)
    setAppearance(DEFAULT_APPEARANCE)
    setAutoRotate(false)
    chooseRegion('bust')
    notify('Studio reset')
  }

  const goFullscreen = async () => {
    if (!viewportRef.current) return
    try {
      if (!document.fullscreenElement) {
        if (!viewportRef.current.requestFullscreen) throw new Error('Fullscreen API unavailable')
        await viewportRef.current.requestFullscreen()
        if (usesCoarsePointer) setTouchExplore(true)
      } else {
        if (!document.exitFullscreen) throw new Error('Fullscreen API unavailable')
        await document.exitFullscreen()
        if (usesCoarsePointer) setTouchExplore(false)
      }
    } catch {
      if (usesCoarsePointer) setTouchExplore(false)
      notify('Full screen unavailable')
    }
  }

  const chooseView = (view) => {
    setCameraView(view)
    setCameraFocusMode('body')
    setAutoRotate(false)
    setFitBodyViewKey((value) => value + 1)
  }

  const fitWholeBody = () => {
    setCameraFocusMode('body')
    setAutoRotate(false)
    setFitBodyViewKey((value) => value + 1)
  }

  const commandItems = [
    {
      id: 'undo',
      label: 'Undo last edit',
      description: history.past.length ? 'Return to the previous profile state' : 'No earlier edit is available',
      category: 'Quick actions',
      keywords: 'history revert back',
      icon: ArrowUUpLeft,
      shortcut: 'Ctrl Z',
      disabled: !history.past.length,
      run: undo,
    },
    {
      id: 'redo',
      label: 'Redo edit',
      description: history.future.length ? 'Restore the next profile state' : 'No later edit is available',
      category: 'Quick actions',
      keywords: 'history restore forward',
      icon: ArrowUUpRight,
      shortcut: 'Ctrl ⇧ Z',
      disabled: !history.future.length,
      run: redo,
    },
    {
      id: 'randomize',
      label: 'Randomize profile',
      description: 'Generate a coordinated, undoable body and palette',
      category: 'Quick actions',
      keywords: 'generate body appearance new',
      icon: ShuffleAngular,
      run: randomizeProfile,
    },
    {
      id: 'toggle-focus',
      label: focusMode ? 'Exit focus mode' : 'Enter focus mode',
      description: focusMode ? 'Restore the anatomy rail and control inspector' : 'Give the 3D surface the full workbench',
      category: 'Quick actions',
      keywords: 'zen distraction free canvas panels workspace',
      icon: SidebarSimple,
      run: () => setFocusMode((value) => !value),
    },
    {
      id: 'save-study',
      label: 'Pin current study',
      description: 'Save this profile in the local study library',
      category: 'Quick actions',
      keywords: 'save variation library bookmark version',
      icon: FloppyDisk,
      run: saveStudy,
    },
    {
      id: 'toggle-measurements',
      label: showMeasurements ? 'Hide measurement bands' : 'Show measurement bands',
      description: 'Toggle the experimental surface-tape overlays',
      category: 'Quick actions',
      keywords: 'ribbons tape overlays',
      icon: Ruler,
      shortcut: 'M',
      run: () => setShowMeasurements((value) => !value),
    },
    {
      id: 'toggle-reference',
      label: compareEnabled ? 'Hide reference ghost' : 'Show reference ghost',
      description: 'Compare the working profile against Reference A',
      category: 'Quick actions',
      keywords: 'comparison before after overlay',
      icon: PersonArmsSpread,
      run: () => setCompareEnabled((value) => !value),
    },
    {
      id: 'set-reference',
      label: 'Set current profile as Reference A',
      description: 'Pin the current measurements for comparison',
      category: 'Quick actions',
      keywords: 'compare snapshot baseline',
      icon: Crosshair,
      run: setReference,
    },
    {
      id: 'capture',
      label: 'Save viewport image',
      description: 'Export the current 3D composition as PNG',
      category: 'File & sharing',
      keywords: 'capture screenshot png render',
      icon: Camera,
      run: capture,
    },
    {
      id: 'export-profile',
      label: 'Export complete profile',
      description: 'Save an importable JSON profile with audit data',
      category: 'File & sharing',
      keywords: 'download json save data',
      icon: ShareNetwork,
      run: exportProfile,
    },
    {
      id: 'export-report',
      label: 'Export measurement report',
      description: 'Save targets, surface tape, residuals, and status as CSV',
      category: 'File & sharing',
      keywords: 'download csv spreadsheet measurements',
      icon: FileCsv,
      run: exportMeasurementReport,
    },
    {
      id: 'import-profile',
      label: 'Import profile',
      description: 'Open and safely validate a FORM Atlas JSON file',
      category: 'File & sharing',
      keywords: 'upload open json',
      icon: UploadSimple,
      run: () => importInputRef.current?.click(),
    },
    {
      id: 'copy-profile',
      label: 'Copy profile data',
      description: 'Copy measurements, pose, and appearance as JSON',
      category: 'File & sharing',
      keywords: 'clipboard json data',
      icon: Copy,
      run: copyProfile,
    },
    ...ANATOMY_REGIONS.map((region) => ({
      id: `region-${region.id}`,
      label: region.label,
      description: region.description,
      category: 'Edit areas',
      keywords: `${region.id} ${region.shortLabel} controls anatomy`,
      icon: REGION_ICONS[region.id],
      run: () => chooseRegion(region.id),
    })),
    ...MEASUREMENT_LANDMARKS.map((landmark) => ({
      id: `measurement-${landmark.key}`,
      label: landmark.label,
      description: `Focus the ${landmark.label.toLowerCase()} tape and its exact control`,
      category: 'Measurements',
      keywords: `${landmark.key} ${landmark.region} circumference tape ribbon`,
      icon: Ruler,
      run: () => selectMeasurementBand(landmark.part, landmark.key),
    })),
    ...VIEW_MODES.map((view) => ({
      id: `view-${view.id}`,
      label: `${view.label} view`,
      description: 'Frame the full body from this camera angle',
      category: 'Camera views',
      keywords: `${view.id} camera angle orientation`,
      icon: Eye,
      run: () => chooseView(view.id),
    })),
    ...SURFACE_MODES.map((mode) => ({
      id: `surface-${mode.id}`,
      label: `${mode.label} surface`,
      description: `Switch the 3D preview to ${mode.label.toLowerCase()} rendering`,
      category: 'Surface modes',
      keywords: `${mode.id} render material style`,
      icon: mode.icon,
      run: () => setSurfaceMode(mode.id),
    })),
    {
      id: 'reset',
      label: 'Reset studio',
      description: 'Return anatomy, pose, and appearance to defaults · undoable',
      category: 'Studio maintenance',
      keywords: 'clear default restart',
      icon: ArrowCounterClockwise,
      run: reset,
    },
  ]

  const viewportNavigationHelp = usesCoarsePointer
    ? touchExplore
      ? '3D explore mode is active. Drag with one finger to rotate, pinch to zoom, and move with two fingers. Choose Fit body to restore the whole figure, or Done exploring to restore page scrolling.'
      : 'Page scrolling is active over the preview. Choose Explore 3D to rotate, zoom, and move the model.'
    : 'Drag to rotate the model, use the mouse wheel to zoom, right-drag to move, or hold Space while dragging to move. With the preview focused, arrow keys move, Shift plus arrow keys rotate, and Page Up or Page Down zoom. Choose Fit body to restore the whole figure.'

  return (
    <main className={cx('app-shell', focusMode && 'focus-mode')}>
      <WorkspaceBar
        unit={unit}
        setUnit={setUnit}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        persistenceStatus={persistenceStatus}
        studies={studies}
        focusMode={focusMode}
        onUndo={undo}
        onRedo={redo}
        onReference={setReference}
        onImport={() => importInputRef.current?.click()}
        onExport={exportProfile}
        onExportReport={exportMeasurementReport}
        onOpenCommands={() => setCommandOpen(true)}
        onSaveStudy={saveStudy}
        onOpenStudy={openStudy}
        onCompareStudy={compareStudy}
        onRemoveStudy={discardStudy}
        onToggleFocus={() => setFocusMode((value) => !value)}
      />
      <input
        ref={importInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        aria-hidden="true"
        onChange={importProfile}
      />

      <div className="studio-grid">
        <ProfileRail
          activeRegion={activeRegion}
          onRegion={chooseRegion}
          onPreset={applyPreset}
          onRandomize={randomizeProfile}
          measurements={measurements}
          unit={unit}
        />

        <section className="center-stage" aria-label="Interactive female body preview" aria-describedby="viewport-navigation-help">
          <div
            id="body-preview-viewport"
            className={cx('viewport', usesCoarsePointer && 'coarse-navigation', touchExplore && 'explore-active')}
            ref={viewportRef}
          >
            <div id="body-preview-scene" className="scene-host">
              <SceneErrorBoundary
                onRetry={async () => {
                  const sceneAssets = await import('./lib/bodyCanvasAssets.js')
                  sceneAssets.clearBodyCanvasAssetCache()
                  setAutoRotate(false)
                  setCameraResetKey((value) => value + 1)
                  notify('Retrying 3D preview')
                }}
              >
                <Suspense fallback={<SceneLoading />}>
                  <BodyCanvas
                    measurements={measurements}
                    comparisonMeasurements={referenceMeasurements}
                    pose={pose}
                    autoRotate={autoRotate}
                    appearance={appearance}
                    focusMode={cameraFocusMode}
                    selectedPart={selectedPart}
                    selectedBand={selectedBand}
                    surfaceMode={surfaceMode}
                    showMeasurements={showMeasurements}
                    compareEnabled={compareEnabled}
                    cameraView={cameraView}
                    resetViewKey={cameraResetKey}
                    fitBodyViewKey={fitBodyViewKey}
                    captureRequestKey={captureRequestKey}
                    unit={unit}
                    onSelectPart={selectMeshPart}
                    onSelectBand={selectMeasurementBand}
                    onNavigate={() => setAutoRotate(false)}
                    onAnthropometryChange={handleAnthropometryChange}
                    onCaptureResult={finishCapture}
                  />
                </Suspense>
              </SceneErrorBoundary>
            </div>

            <CalibrationLedger
              activeRegion={activeRegion}
              landmark={selectedLandmark}
              measurements={measurements}
              report={anthropometry.active}
              unit={unit}
            />

            <MeasurementJumpList selectedBand={selectedBand} onSelectBand={selectMeasurementBand} />

            {usesCoarsePointer && (
              <div className="touch-mode-control">
                <button
                  type="button"
                  aria-controls="body-preview-scene"
                  aria-pressed={touchExplore}
                  onClick={() => setTouchExplore((value) => !value)}
                >
                  {touchExplore ? <Check weight="bold" /> : <Hand weight="bold" />}
                  {touchExplore ? 'Done exploring' : 'Explore 3D'}
                </button>
                <span aria-live="polite">
                  {touchExplore ? 'Drag · pinch · two-finger move' : 'Scroll the page normally'}
                </span>
              </div>
            )}

            <div className="view-selector" role="group" aria-label="Camera framing and model views">
              <button type="button" className="fit-body-view" onClick={fitWholeBody} aria-label="Fit the whole body in the viewport">
                <Scan weight="bold" />
                Fit body
              </button>
              {VIEW_MODES.map((view) => (
                <button key={view.id} type="button" className={cx(cameraView === view.id && 'active')} onClick={() => chooseView(view.id)} aria-pressed={cameraView === view.id}>
                  {view.label}
                </button>
              ))}
            </div>

            <StageToolbar
              autoRotate={autoRotate}
              setAutoRotate={setAutoRotate}
              reducedMotion={reducedMotion}
              showMeasurements={showMeasurements}
              setShowMeasurements={setShowMeasurements}
              compareEnabled={compareEnabled}
              setCompareEnabled={setCompareEnabled}
              appearanceActive={activeRegion === 'appearance'}
              onAppearance={() => chooseRegion('appearance')}
              onCapture={capture}
              onFullscreen={goFullscreen}
              onResetView={() => {
                setCameraFocusMode(focusModeForRegion(activeRegion))
                setAutoRotate(false)
                setCameraResetKey((value) => value + 1)
              }}
            />

            <ProportionDeck
              className="proportion-deck-overlay"
              measurements={measurements}
              derived={derived}
              unit={unit}
              compareEnabled={compareEnabled}
              referenceMeasurements={referenceMeasurements}
              activeAnthropometry={anthropometry.active}
              referenceAnthropometry={anthropometry.reference}
              analysisBasis={analysisBasis}
              modelDomain={modelDomain}
            />

            <div className="surface-selector surface-selector-overlay" role="group" aria-label="Surface rendering mode">
              {SURFACE_MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <button key={mode.id} type="button" className={cx(surfaceMode === mode.id && 'active')} onClick={() => setSurfaceMode(mode.id)} aria-pressed={surfaceMode === mode.id}>
                    <Icon /> {mode.label}
                  </button>
                )
              })}
            </div>

            <div className="orbit-hint" aria-hidden="true">
              <SlidersHorizontal />
              <span className="pointer-hint">Drag to rotate · hold Space + drag to move · wheel to zoom</span>
              <span className="touch-hint">One finger rotates · pinch zooms · two fingers move · Fit body resets</span>
            </div>

            <span id="viewport-navigation-help" className="sr-only">{viewportNavigationHelp}</span>

            <div className="stage-secondary-actions stage-secondary-actions-overlay">
              <button type="button" onClick={copyProfile}><Copy /> Copy data</button>
              <button type="button" onClick={reset}><ArrowCounterClockwise /> Reset</button>
            </div>
          </div>
          <div className="stage-mobile-actions">
            <div className="surface-selector surface-selector-mobile" role="group" aria-label="Surface rendering mode">
              {SURFACE_MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <button key={mode.id} type="button" className={cx(surfaceMode === mode.id && 'active')} onClick={() => setSurfaceMode(mode.id)} aria-pressed={surfaceMode === mode.id}>
                    <Icon /> {mode.label}
                  </button>
                )
              })}
            </div>
            <div className="stage-secondary-actions stage-secondary-actions-mobile">
              <button type="button" onClick={copyProfile}><Copy /> Copy data</button>
              <button type="button" onClick={reset}><ArrowCounterClockwise /> Reset</button>
            </div>
          </div>
          <ProportionDeck
            className="proportion-deck-mobile"
            collapsible
            measurements={measurements}
            derived={derived}
            unit={unit}
            compareEnabled={compareEnabled}
            referenceMeasurements={referenceMeasurements}
            activeAnthropometry={anthropometry.active}
            referenceAnthropometry={anthropometry.reference}
            analysisBasis={analysisBasis}
            modelDomain={modelDomain}
          />
        </section>

        <Inspector
          activeRegion={activeRegion}
          advanced={advanced}
          setAdvanced={setAdvanced}
          measurements={measurements}
          pose={pose}
          appearance={appearance}
          unit={unit}
          updateMeasurement={updateMeasurement}
          updatePose={updatePose}
          updateAppearance={updateAppearance}
          checkpoint={checkpoint}
          focusControl={focusControl}
          applyPosePreset={applyPosePreset}
          selectedLandmark={selectedLandmark}
          anthropometry={anthropometry.active}
          modelDomain={modelDomain}
        />
      </div>

      <div className={cx('toast', toast && 'visible')} role="status" aria-live="polite">
        <Check weight="bold" /> {toast}
      </div>

      <CommandCenter open={commandOpen} commands={commandItems} onClose={closeCommands} />
    </main>
  )
}

export default App

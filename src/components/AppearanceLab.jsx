import { Check, Eye, HairDryer, Palette, TShirt } from '@phosphor-icons/react'
import {
  HAIR_STYLES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
  SUIT_SWATCHES,
} from '../data/appearance.js'

function SwatchGroup({ label, value, options, onChange }) {
  return (
    <fieldset className="swatch-fieldset">
      <legend>{label}</legend>
      <div className="swatch-grid">
        {options.map((option) => {
          const selected = value.toLowerCase() === option.value.toLowerCase()
          return (
            <button
              key={option.value}
              type="button"
              className={selected ? 'active' : undefined}
              aria-label={`${label}: ${option.label}`}
              aria-pressed={selected}
              title={option.label}
              onClick={() => onChange(option.value)}
            >
              <span style={{ '--swatch': option.value }} />
              {selected && <Check weight="bold" />}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function AppearanceRange({ id, label, value, startLabel, endLabel, onChange, onEditStart }) {
  return (
    <label className="appearance-range" htmlFor={`appearance-${id}`}>
      <span><strong>{label}</strong><output>{Math.round(value)}%</output></span>
      <input
        id={`appearance-${id}`}
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        style={{ '--range-progress': `${value}%` }}
        onFocus={onEditStart}
        onPointerDown={onEditStart}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small><span>{startLabel}</span><span>{endLabel}</span></small>
    </label>
  )
}

export default function AppearanceLab({ appearance, onChange, onEditStart }) {
  const select = (key, value) => {
    onEditStart?.()
    onChange(key, value)
  }

  return (
    <div className="appearance-lab">
      <section className="appearance-section" aria-labelledby="hair-style-title">
        <div className="appearance-section-title" id="hair-style-title"><HairDryer /><span><strong>Hair library</strong><small>Official fitted MakeHuman assets · CC0</small></span></div>
        <div className="hair-style-grid">
          {HAIR_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              className={appearance.hairStyle === style.id ? 'active' : undefined}
              onClick={() => select('hairStyle', style.id)}
              aria-pressed={appearance.hairStyle === style.id}
            >
              {style.thumbnail
                ? <img className="hair-preview" src={style.thumbnail} alt="" loading="lazy" />
                : <i className="hair-glyph hair-bare" aria-hidden="true" />}
              <span><strong>{style.label}</strong><small>{style.description}</small></span>
            </button>
          ))}
        </div>
        <SwatchGroup label="Hair tint" value={appearance.hairColor} options={HAIR_SWATCHES} onChange={(value) => select('hairColor', value)} />
      </section>

      <section className="appearance-section" aria-labelledby="complexion-title">
        <div className="appearance-section-title" id="complexion-title"><Palette /><span><strong>Complexion & color</strong><small>Skin and studio garment</small></span></div>
        <SwatchGroup label="Skin tone" value={appearance.skinColor} options={SKIN_SWATCHES} onChange={(value) => select('skinColor', value)} />
        <SwatchGroup label="Garment color" value={appearance.suitColor} options={SUIT_SWATCHES} onChange={(value) => select('suitColor', value)} />
      </section>

      <section className="appearance-section" aria-labelledby="face-detail-title">
        <div className="appearance-section-title" id="face-detail-title"><Eye /><span><strong>Face assets</strong><small>Warm sclera, black pupils, fitted brows and lashes</small></span></div>
        <SwatchGroup label="Brow color" value={appearance.browColor} options={HAIR_SWATCHES} onChange={(value) => select('browColor', value)} />
        <AppearanceRange id="lash-intensity" label="Lash definition" value={appearance.lashIntensity} startLabel="Natural" endLabel="Defined" onEditStart={onEditStart} onChange={(value) => onChange('lashIntensity', value)} />
      </section>

      <div className="appearance-note">
        <TShirt />
        <p><strong>Source-true appearance</strong>Hair and facial attachments use MakeHuman’s CC0 proxy assets and follow the morphed head.</p>
      </div>
    </div>
  )
}

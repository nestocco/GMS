import { useState } from 'react'
import { Save } from 'lucide-react'
import type { AuthUser } from '../../../types'

interface Props { user: AuthUser }

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border2)' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{titulo}</p>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

function Campo({ label, descripcion, children }: { label: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</p>
        {descripcion && <p style={{ fontSize: 10, color: 'var(--muted)' }}>{descripcion}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function InputNum({ value, onChange, suffix, testid }: { value: number; onChange: (v: number) => void; suffix?: string; testid?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        data-testid={testid}
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: 64, padding: '6px 10px', borderRadius: 8, textAlign: 'center',
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          color: 'var(--text)', fontSize: 13, fontWeight: 700, outline: 'none',
        }}
      />
      {suffix && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{suffix}</span>}
    </div>
  )
}

export default function Configuracion({ user: _user }: Props) {
  // Bonos
  const [bonoAnt91, setBonoAnt91]   = useState(5)
  const [bonoAnt365, setBonoAnt365] = useState(10)
  const [bonoVol90, setBonoVol90]   = useState(5)
  const [bonoVol180, setBonoVol180] = useState(10)
  const [bonoNivSilver, setBonoNivSilver] = useState(2.5)
  const [bonoNivVip, setBonoNivVip]       = useState(5)
  const [topeDesc, setTopeDesc]           = useState(25)

  // Anomalías
  const [umbralDispositivos, setUmbralDispositivos]   = useState(2)
  const [umbralMinDisp, setUmbralMinDisp]             = useState(60)
  const [umbralIngresos, setUmbralIngresos]           = useState(3)
  const [umbralGeoSedes, setUmbralGeoSedes]           = useState(2)
  const [umbralGeoMin, setUmbralGeoMin]               = useState(30)
  const [umbralDesercion, setUmbralDesercion]         = useState(7)

  return (
    <div data-testid="settings-page" style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Algoritmo de descuento */}
        <Seccion titulo="Algoritmo de descuento">
          <Campo label="Bono antigüedad — 91 a 365 días" descripcion="Descuento por continuidad acumulada media">
            <InputNum value={bonoAnt91} onChange={setBonoAnt91} suffix="%" testid="settings-input-bonus-seniority-91d" />
          </Campo>
          <Campo label="Bono antigüedad — más de 365 días" descripcion="Descuento por continuidad acumulada alta">
            <InputNum value={bonoAnt365} onChange={setBonoAnt365} suffix="%" testid="settings-input-bonus-seniority-365d" />
          </Campo>
          <Campo label="Bono volumen — 90 a 179 días de plan" descripcion="Descuento por duración del plan">
            <InputNum value={bonoVol90} onChange={setBonoVol90} suffix="%" testid="settings-input-bonus-volume-90d" />
          </Campo>
          <Campo label="Bono volumen — 180 días o más" descripcion="Descuento por plan de larga duración">
            <InputNum value={bonoVol180} onChange={setBonoVol180} suffix="%" testid="settings-input-bonus-volume-180d" />
          </Campo>
          <Campo label="Bono nivel — Silver / Gold">
            <InputNum value={bonoNivSilver} onChange={setBonoNivSilver} suffix="%" testid="settings-input-bonus-level-silver" />
          </Campo>
          <Campo label="Bono nivel — VIP / Premium">
            <InputNum value={bonoNivVip} onChange={setBonoNivVip} suffix="%" testid="settings-input-bonus-level-vip" />
          </Campo>
          <div style={{ height: 1, background: 'var(--border2)' }} />
          <Campo label="Tope máximo de descuento" descripcion="La suma de bonos se trunca a este valor para proteger el margen">
            <InputNum value={topeDesc} onChange={setTopeDesc} suffix="%" testid="settings-input-discount-cap" />
          </Campo>
        </Seccion>

        {/* Motor de anomalías */}
        <Seccion titulo="Motor de anomalías">
          <Campo label="Multidispositivo — cantidad" descripcion="Dispositivos distintos en el tiempo configurado">
            <InputNum value={umbralDispositivos} onChange={setUmbralDispositivos} suffix="dispositivos" testid="settings-input-anomaly-multidevice-count" />
          </Campo>
          <Campo label="Multidispositivo — ventana de tiempo">
            <InputNum value={umbralMinDisp} onChange={setUmbralMinDisp} suffix="min" testid="settings-input-anomaly-multidevice-window" />
          </Campo>
          <div style={{ height: 1, background: 'var(--border2)' }} />
          <Campo label="Frecuencia irregular — ingresos por día" descripcion="Más de N ingresos en el mismo día genera alerta">
            <InputNum value={umbralIngresos} onChange={setUmbralIngresos} suffix="ingresos" testid="settings-input-anomaly-daily-entries" />
          </Campo>
          <div style={{ height: 1, background: 'var(--border2)' }} />
          <Campo label="Análisis geográfico — sedes distintas" descripcion="Suplantación entre sucursales">
            <InputNum value={umbralGeoSedes} onChange={setUmbralGeoSedes} suffix="sedes" testid="settings-input-anomaly-geo-branches" />
          </Campo>
          <Campo label="Análisis geográfico — ventana de tiempo">
            <InputNum value={umbralGeoMin} onChange={setUmbralGeoMin} suffix="min" testid="settings-input-anomaly-geo-window" />
          </Campo>
          <div style={{ height: 1, background: 'var(--border2)' }} />
          <Campo label="Inactividad (deserción)" descripcion="Días sin asistencia antes de generar alerta">
            <InputNum value={umbralDesercion} onChange={setUmbralDesercion} suffix="días" testid="settings-input-anomaly-inactivity" />
          </Campo>
        </Seccion>

        {/* Guardar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button data-testid="settings-btn-save" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--green-deep)', color: 'var(--green)', fontSize: 12, fontWeight: 700,
          }}>
            <Save size={13} /> Guardar cambios
          </button>
        </div>

      </div>
    </div>
  )
}
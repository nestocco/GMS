import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import StatusBadge from '../shared/StatusBadge'
import { useSucursales } from '../../hooks/useSucursales'
import { supabase } from '../../lib/supabase'
import type { Socio } from '../../types'

const avatarColors: Record<string, { bg: string; color: string }> = {
  ACTIVA:    { bg: 'var(--green-deep)',              color: 'var(--green)'      },
  EN_GRACIA: { bg: 'rgba(184,134,11,0.2)',           color: '#C9A84C'           },
  IMPAGO:    { bg: 'rgba(217,119,6,0.2)',            color: '#D97706'           },
  CONGELADA: { bg: 'rgba(59,130,246,0.15)',          color: '#6BA3E8'           },
  CANCELADA: { bg: 'rgba(220,38,38,0.15)',           color: '#CC4444'           },
}

interface Props {
  socios: Socio[]
  selectedId: string | null
  onSelect: (socio: Socio) => void
}

const PAGE_SIZE = 15

export default function SociosList({ socios, selectedId, onSelect }: Props) {
  const { sucursales } = useSucursales()
  const [search, setSearch]       = useState('')
  const [sede, setSede]           = useState('Todas')
  const [estado, setEstado]       = useState('Todos')
  const [page, setPage]           = useState(1)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const filtered = useMemo(() => socios.filter(s => {
    const matchSearch = s.nombre.toLowerCase().includes(search.toLowerCase())
      || s.dni.includes(search)
      || s.email.toLowerCase().includes(search.toLowerCase())
    const matchSede   = sede   === 'Todas'  || s.sede   === sede
    const matchEstado = estado === 'Todos'  || s.status === estado
    return matchSearch && matchSede && matchEstado
  }), [socios, search, sede, estado])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated   = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  )

  // Generar signed URLs en batch para los socios visibles. La clave pageKey
  // es estable: solo cambia cuando cambian los IDs de la página, no en cada render.
  const pageKey = paginated.map(s => s.id).join(',')
  useEffect(() => {
    const withPhoto = paginated.filter(s => s.photo_url && !signedUrls[s.id])
    if (withPhoto.length === 0) return
    const paths = withPhoto.map(s => s.photo_url!)
    supabase.storage.from('member-photos').createSignedUrls(paths, 3600).then(({ data }) => {
      if (!data) return
      const map: Record<string, string> = {}
      data.forEach(entry => {
        const socio = withPhoto.find(s => s.photo_url === entry.path)
        if (socio && entry.signedUrl) map[socio.id] = entry.signedUrl
      })
      if (Object.keys(map).length > 0) setSignedUrls(prev => ({ ...prev, ...map }))
    })
  }, [pageKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resetear a página 1 al cambiar filtros
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }
  const handleSede   = (v: string) => { setSede(v);   setPage(1) }
  const handleEstado = (v: string) => { setEstado(v); setPage(1) }

  // Ventana de páginas: máximo 5 botones centrados en la página actual
  function pageWindow(): number[] {
    const delta = 2
    const start = Math.max(1, currentPage - delta)
    const end   = Math.min(totalPages, currentPage + delta)
    const pages: number[] = []
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ borderRight: '1px solid var(--border2)' }}>

      {/* Filters */}
      <div
        className="flex gap-2.5 items-center px-6 py-3.5 flex-shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border2)' }}
      >
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
        >
          <Search size={14} strokeWidth={1.75} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            data-testid="members-filter-search"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI o email..."
            style={{
              border: 'none', background: 'transparent',
              color: 'var(--text)', fontSize: 12, outline: 'none', flex: 1,
            }}
          />
        </div>

        {/* Sede */}
        <select
          data-testid="members-filter-branch"
          value={sede}
          onChange={e => handleSede(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 8,
            background: 'var(--surface2)', border: '1px solid var(--border2)',
            color: 'var(--muted)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="Todas">Todas</option>
          {sucursales.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
        </select>

        {/* Estado tabs */}
        <div
          className="flex gap-0.5 p-1 rounded-lg"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
        >
          {['Todos', 'ACTIVA', 'IMPAGO', 'CANCELADA'].map(s => (
            <button
              key={s}
              data-testid="members-filter-status"
              data-status={s}
              onClick={() => handleEstado(s)}
              style={{
                padding: '4px 8px', borderRadius: 6,
                fontSize: 9, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: estado === s ? 'var(--green-deep)' : 'transparent',
                color: estado === s ? 'var(--green)' : 'var(--muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <table data-testid="members-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr>
              {['Socio', 'Estado', 'Plan', 'Sede', 'Vencimiento'].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left', fontSize: 9, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '1px',
                    color: 'var(--muted)', padding: '8px 10px',
                    borderBottom: '1px solid var(--border2)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(s => {
              const av = avatarColors[s.status]
              const isSelected = s.id === selectedId
              return (
                <tr
                  key={s.id}
                  data-testid="members-table-row"
                  data-member-dni={s.dni}
                  onClick={() => onSelect(s)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'rgba(45,90,39,0.1)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(143,188,143,0.04)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: av.bg, color: av.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {signedUrls[s.id]
                          ? <img src={signedUrls[s.id]} alt={s.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : s.iniciales
                        }
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.nombre}</p>
                        <p style={{ fontSize: 10, color: 'var(--muted)' }}>DNI {s.dni}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td style={{ padding: '10px 10px', fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{s.plan}</td>
                  <td style={{ padding: '10px 10px', fontSize: 11, color: 'var(--muted)' }}>{s.sede}</td>
                  <td style={{ padding: '10px 10px', fontSize: 11, color: s.status === 'IMPAGO' ? 'var(--warm-light)' : 'var(--muted)', fontWeight: s.status === 'IMPAGO' ? 700 : 400 }}>{s.vencimiento}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border2)' }}
      >
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>
          {filtered.length === socios.length
            ? `${socios.length} socios`
            : `${filtered.length} de ${socios.length} socios`}
          {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
        </span>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              data-testid="members-pagination-prev"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface2)',
                color: currentPage === 1 ? 'var(--border2)' : 'var(--muted)',
                fontSize: 13, fontWeight: 700, cursor: currentPage === 1 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>

            {pageWindow().map(n => (
              <button
                key={n}
                data-testid="members-pagination-page"
                onClick={() => setPage(n)}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  border: '1px solid var(--border2)',
                  background: n === currentPage ? 'var(--green-deep)' : 'var(--surface2)',
                  color: n === currentPage ? 'var(--green)' : 'var(--muted)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{n}</button>
            ))}

            <button
              data-testid="members-pagination-next"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border2)',
                background: 'var(--surface2)',
                color: currentPage === totalPages ? 'var(--border2)' : 'var(--muted)',
                fontSize: 13, fontWeight: 700, cursor: currentPage === totalPages ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >›</button>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Upload, Loader2, AlertCircle, ChevronDown, ChevronUp, Database, TrendingUp, TrendingDown } from 'lucide-react'
import type { Brand, MetricsReport } from '@/lib/types'
import { getBrands, getMetricsReports, addMetricsReport } from '@/lib/storage'

const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok']

const QUALITY_COLOR = {
  complete: 'bg-green-50 text-green-800 border-green-200',
  partial:  'bg-yellow-50 text-yellow-800 border-yellow-200',
  minimal:  'bg-red-50 text-red-700 border-red-200',
}

export default function MetricsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandId, setBrandId] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reports, setReports] = useState<MetricsReport[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const b = getBrands()
    setBrands(b)
    if (b.length > 0) setBrandId(b[0].id)
    setReports(getMetricsReports())
  }, [])

  const brand = brands.find(b => b.id === brandId)

  async function analyze() {
    if (!csvFile || !brand) return
    setLoading(true)
    setError('')

    try {
      const text = await csvFile.text()
      const res = await fetch('/api/metrics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: text,
          platform,
          brand_name: brand.name,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al analizar'); return }

      const report: MetricsReport = {
        id: crypto.randomUUID(),
        brand_id: brandId,
        brand_name: brand.name,
        platform,
        period: `Reporte ${new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`,
        uploaded_at: new Date().toISOString(),
        raw_rows: data.row_count,
        insights: data.insights,
      }
      addMetricsReport(report)
      setReports(getMetricsReports())
      setExpandedId(report.id)
      setCsvFile(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(r => r.brand_id === brandId)

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 size={24} className="text-accent" />
        <h1 className="font-display text-3xl text-ink">Métricas</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Database size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          Subí el CSV exportado de <strong>Meta Business Suite</strong> o <strong>LinkedIn Analytics</strong>.
          La IA analiza los números reales que hay ahí — no inventa benchmarks externos.
          Los insights que da son específicos a tus datos.
        </div>
      </div>

      {/* Upload form */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Cliente</label>
            <select value={brandId} onChange={e => setBrandId(e.target.value)}
              className="w-full border border-border rounded px-3 py-2.5 text-sm bg-paper outline-none focus:border-accent">
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted uppercase tracking-wider">Plataforma del reporte</label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`text-xs px-3 py-1.5 rounded border transition-all font-mono flex-1
                    ${platform === p ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink hover:text-ink'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted uppercase tracking-wider">Archivo CSV</label>
          <div
            onClick={() => document.getElementById('csv-input')?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${csvFile ? 'border-accent bg-orange-50' : 'border-border hover:border-accent/50'}`}
          >
            {csvFile ? (
              <div>
                <p className="font-medium text-accent text-sm">{csvFile.name}</p>
                <p className="text-xs text-muted mt-1">{(csvFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={28} className="mx-auto text-muted" />
                <p className="text-sm text-muted">Clic para subir CSV</p>
                <p className="text-xs text-muted">Exportá desde Meta Business Suite o LinkedIn → Exportar datos</p>
              </div>
            )}
          </div>
          <input id="csv-input" type="file" accept=".csv,.txt" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setCsvFile(f) }} />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <button onClick={analyze} disabled={loading || !csvFile || !brandId}
          className="flex items-center gap-2 text-sm bg-accent text-white rounded px-4 py-2 hover:bg-orange-700 transition-colors disabled:opacity-40">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Analizando datos reales...</> : <><BarChart3 size={14} /> Analizar métricas</>}
        </button>
      </div>

      {/* Reports */}
      <div className="space-y-4">
        <h2 className="font-display text-xl text-ink">Reportes anteriores</h2>

        {filteredReports.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <BarChart3 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay reportes aún para este cliente.</p>
          </div>
        ) : (
          filteredReports.map(r => {
            const expanded = expandedId === r.id
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl overflow-hidden fade-up">
                <button
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-paper transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-ink text-left">{r.period}</p>
                      <p className="text-xs text-muted">{r.brand_name} · {r.platform} · {r.raw_rows} filas</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded border ${QUALITY_COLOR[r.insights.data_quality]}`}>
                      Calidad: {r.insights.data_quality}
                    </span>
                    {r.insights.avg_engagement_rate !== null && (
                      <span className="text-xs text-muted font-mono">
                        Avg. engagement: {r.insights.avg_engagement_rate?.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted">
                      <span>📅 Mejor día: <strong className="text-ink">{r.insights.best_day_of_week}</strong></span>
                      <span>🕐 Mejor hora: <strong className="text-ink">{r.insights.best_time_of_day}</strong></span>
                      <span>Columnas encontradas: {r.insights.columns_found.join(', ')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp size={12} /> Mejores posts
                        </h3>
                        {r.insights.best_performing_posts.slice(0, 3).map((p, i) => (
                          <div key={i} className="bg-green-50 border border-green-200 rounded p-2.5 text-xs">
                            <p className="font-medium text-green-800">{p.metric}: {p.value}</p>
                            {p.copy_preview && <p className="text-green-700 mt-0.5 truncate">"{p.copy_preview}"</p>}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingDown size={12} /> Peores posts
                        </h3>
                        {r.insights.worst_performing_posts.slice(0, 3).map((p, i) => (
                          <div key={i} className="bg-red-50 border border-red-200 rounded p-2.5 text-xs">
                            <p className="font-medium text-red-700">{p.metric}: {p.value}</p>
                            {p.copy_preview && <p className="text-red-600 mt-0.5 truncate">"{p.copy_preview}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {r.insights.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">Recomendaciones basadas en datos</h3>
                        <ul className="space-y-1.5">
                          {r.insights.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-accent font-mono">→</span> {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

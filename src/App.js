import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const CUADRILLAS = {
  c1: 'Cuadrilla 1 - Fredy',
  c2: 'Cuadrilla 2 - Carlos',
  c3: 'Cuadrilla 3 - Córdova',
};

const COLORES = {
  almacen: { bg: '#e8f5e9', text: '#2e7d32', label: 'Almacén' },
  cuadrilla: { bg: '#e3f2fd', text: '#1565c0', label: 'En cuadrilla' },
  enosa: { bg: '#fff8e1', text: '#f57f17', label: 'Calibración' },
  averiado: { bg: '#ffebee', text: '#c62828', label: 'Averiado' },
};

function Badge({ estado }) {
  const c = COLORES[estado] || { bg: '#f5f5f5', text: '#757575', label: estado };
  return (
    <span style={{
      background: c.bg, color: c.text, padding: '3px 10px',
      borderRadius: 20, fontSize: 12, fontWeight: 600
    }}>{c.label}</span>
  );
}

function fmtDT(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE') + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}
export default function App() {
  const [role, setRole] = useState(null);
  const [tab, setTab] = useState('acciones');
  const [equipos, setEquipos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [accion, setAccion] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const [selEquipos, setSelEquipos] = useState([]);
  const [instEquipo, setInstEquipo] = useState('');
  const [instSumi, setInstSumi] = useState('');
  const [instAlt, setInstAlt] = useState(false);
  const [instSumiAlt, setInstSumiAlt] = useState('');
  const [retEquipo, setRetEquipo] = useState('');
  const [retObs, setRetObs] = useState('');
  const [avEquipo, setAvEquipo] = useState('');
  const [avDesc, setAvDesc] = useState('');
  const [avMomento, setAvMomento] = useState('Al intentar instalarlo');
  const [devEquipo, setDevEquipo] = useState('');
  const [devDest, setDevDest] = useState('enosa');

  useEffect(() => { if (role) { cargarEquipos(); cargarMovimientos(); } }, [role]);

  async function cargarEquipos() {
    const { data } = await supabase.from('equipos').select('*').order('serie');
    if (data) setEquipos(data);
  }

  async function cargarMovimientos() {
    const { data } = await supabase.from('movimientos').select('*').order('timestamp', { ascending: false }).limit(100);
    if (data) setMovimientos(data);
  }

  function showMsg(text, tipo = 'success') {
    setMsg({ text, tipo });
    setTimeout(() => setMsg(null), 3000);
  }

  function myCuadrilla() { return CUADRILLAS[role]; }
  function misEquipos() {
    return equipos.filter(e => e.estado === 'cuadrilla' && e.ubicacion === myCuadrilla());
  }
  async function registrarSalida() {
    if (!selEquipos.length) { showMsg('Selecciona al menos un equipo', 'error'); return; }
    setLoading(true);
    for (const serie of selEquipos) {
      await supabase.from('equipos').update({ estado: 'cuadrilla', ubicacion: myCuadrilla(), suministro: null }).eq('serie', serie);
      await supabase.from('movimientos').insert({ tipo: 'salida', serie, detalle: `Salida hacia ${myCuadrilla()}`, cuadrilla: role });
    }
    await cargarEquipos(); await cargarMovimientos();
    setSelEquipos([]); setLoading(false);
    showMsg(`${selEquipos.length} equipo(s) registrado(s)`);
    setTimeout(() => setAccion(null), 1500);
  }

  async function registrarInstalacion() {
    if (!instEquipo || !instSumi) { showMsg('Completa todos los campos', 'error'); return; }
    setLoading(true);
    const det = instAlt ? `Instalado en alternativo (${instSumiAlt}) — original: ${instSumi}` : `Instalado en suministro ${instSumi}`;
    await supabase.from('equipos').update({ suministro: instSumi, suministro_alt: instAlt, suministro_alt_desc: instSumiAlt, fecha_instalacion: new Date().toISOString() }).eq('serie', instEquipo);
    await supabase.from('movimientos').insert({ tipo: 'instalacion', serie: instEquipo, detalle: det, cuadrilla: role, suministro: instSumi, alternativo: instAlt });
    await cargarEquipos(); await cargarMovimientos();
    setInstEquipo(''); setInstSumi(''); setInstAlt(false); setInstSumiAlt('');
    setLoading(false); showMsg('Instalación registrada');
    setTimeout(() => setAccion(null), 1500);
  }

  async function registrarRetiro() {
    if (!retEquipo) { showMsg('Selecciona un equipo', 'error'); return; }
    setLoading(true);
    const eq = equipos.find(e => e.serie === retEquipo);
    await supabase.from('equipos').update({ suministro: null, suministro_alt: false, fecha_instalacion: null }).eq('serie', retEquipo);
    await supabase.from('movimientos').insert({ tipo: 'retiro', serie: retEquipo, detalle: `Retirado de suministro ${eq?.suministro}${retObs ? ' — ' + retObs : ''}`, cuadrilla: role, suministro: eq?.suministro });
    await cargarEquipos(); await cargarMovimientos();
    setRetEquipo(''); setRetObs(''); setLoading(false); showMsg('Retiro registrado');
    setTimeout(() => setAccion(null), 1500);
  }

  async function registrarAveria() {
    if (!avEquipo || !avDesc) { showMsg('Describe la falla del equipo', 'error'); return; }
    setLoading(true);
    await supabase.from('equipos').update({ estado: 'averiado', suministro: null, desc_averia: avDesc }).eq('serie', avEquipo);
    await supabase.from('movimientos').insert({ tipo: 'averia', serie: avEquipo, detalle: `AVERÍA — ${avMomento}: ${avDesc}`, cuadrilla: role, alerta: true });
    await cargarEquipos(); await cargarMovimientos();
    setAvEquipo(''); setAvDesc(''); setLoading(false); showMsg('Avería reportada al supervisor', 'warning');
    setTimeout(() => setAccion(null), 1500);
  }

  async function registrarDevolucion() {
    if (!devEquipo) { showMsg('Selecciona un equipo', 'error'); return; }
    setLoading(true);
    const ubicacion = devDest === 'enosa' ? 'ENOSA - calibración' : 'SETEZO - almacén';
    await supabase.from('equipos').update({ estado: devDest === 'enosa' ? 'enosa' : 'almacen', ubicacion, suministro: null }).eq('serie', devEquipo);
    await supabase.from('movimientos').insert({ tipo: 'devolucion', serie: devEquipo, detalle: `Enviado a ${ubicacion}`, cuadrilla: role });
    await cargarEquipos(); await cargarMovimientos();
    setDevEquipo(''); setLoading(false); showMsg('Devolución registrada');
    setTimeout(() => setAccion(null), 1500);
  }
  const s = { fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: '#f0f2f5', color: '#1a1a2e' };

  if (!role) return (
    <div style={{ ...s, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>SETEZO</h1>
          <p style={{ color: '#666', margin: '8px 0 0', fontSize: 14 }}>Gestión de equipos de medición</p>
        </div>
        {[['c1', '👷', 'Cuadrilla 1 — Fredy', 'Técnico de campo'],
          ['c2', '👷', 'Cuadrilla 2 — Carlos', 'Técnico de campo'],
          ['c3', '👷', 'Cuadrilla 3 — Córdova', 'Técnico de campo'],
          ['sup', '📊', 'Supervisor', 'Panel de control completo']].map(([r, ico, name, desc]) => (
          <button key={r} onClick={() => setRole(r)} style={{
            width: '100%', padding: '14px 16px', marginBottom: 10,
            border: r === 'sup' ? '2px solid #1565c0' : '1px solid #ddd',
            borderRadius: 12, background: '#fff', cursor: 'pointer',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12
          }}>
            <span style={{ fontSize: 24 }}>{ico}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const eqFiltrados = equipos.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || e.serie?.toLowerCase().includes(q) || e.modelo?.toLowerCase().includes(q) || (e.ubicacion || '').toLowerCase().includes(q);
    const matchE = !filtroEstado || e.estado === filtroEstado;
    const matchT = !filtroTipo || e.tipo === filtroTipo;
    return matchQ && matchE && matchT;
  });

  const misEq = misEquipos();
  const misEqLibres = misEq.filter(e => !e.suministro);
  const misEqInstalados = misEq.filter(e => e.suministro);
  const alertas = movimientos.filter(m => m.alerta);
  const eqDisp = equipos.filter(e => e.estado === 'almacen');

  const tabStyle = (t) => ({
    flex: 1, padding: '12px 4px', textAlign: 'center', fontSize: 12, fontWeight: 600,
    color: tab === t ? '#1565c0' : '#888',
    borderBottom: tab === t ? '3px solid #1565c0' : '3px solid transparent',
    cursor: 'pointer', background: 'none', border: 'none',
    borderBottom: tab === t ? '3px solid #1565c0' : '3px solid transparent'
  });

  const btnStyle = {
    width: '100%', padding: '13px', borderRadius: 10, border: 'none',
    fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 8
  };
  return (
    <div style={s}>
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>⚡ SETEZO Equipos</div>
          <div style={{ fontSize: 12, color: '#90caf9', marginTop: 2 }}>{role === 'sup' ? 'Supervisor' : CUADRILLAS[role]}</div>
        </div>
        <button onClick={() => { setRole(null); setTab('acciones'); setAccion(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>Salir</button>
      </div>

      {msg && (
        <div style={{ background: msg.tipo === 'error' ? '#ffebee' : msg.tipo === 'warning' ? '#fff8e1' : '#e8f5e9', color: msg.tipo === 'error' ? '#c62828' : msg.tipo === 'warning' ? '#e65100' : '#2e7d32', padding: '10px 16px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #eee', position: 'sticky', top: 52, zIndex: 9 }}>
        {role === 'sup' ? (
          <>
            <button style={tabStyle('acciones')} onClick={() => setTab('acciones')}>📊 Panel</button>
            <button style={tabStyle('equipos')} onClick={() => setTab('equipos')}>📦 Inventario</button>
            <button style={tabStyle('alertas')} onClick={() => setTab('alertas')}>
              🚨 Alertas {alertas.length > 0 && <span style={{ background: '#c62828', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, marginLeft: 4 }}>{alertas.length}</span>}
            </button>
          </>
        ) : (
          <>
            <button style={tabStyle('acciones')} onClick={() => { setTab('acciones'); setAccion(null); }}>✅ Acciones</button>
            <button style={tabStyle('equipos')} onClick={() => setTab('equipos')}>📦 Mis equipos</button>
            <button style={tabStyle('historial')} onClick={() => setTab('historial')}>📋 Historial</button>
          </>
        )}
      </div>

      <div style={{ padding: '16px', maxWidth: 480, margin: '0 auto' }}>{role !== 'sup' && tab === 'acciones' && (
          <>
            {!accion && (
              <>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Equipos en tu cuadrilla: <strong>{misEq.length}</strong> | Instalados: <strong>{misEqInstalados.length}</strong></p>
                {[
                  ['salida', '📤', 'Salida del almacén', 'Registra equipos que te llevas hoy', '#e3f2fd', '#1565c0'],
                  ['instalacion', '🔌', 'Instalación en suministro', 'Registra dónde instalaste el equipo', '#e8f5e9', '#2e7d32'],
                  ['retiro', '🔋', 'Retiro de suministro', 'Equipo retirado al finalizar medición', '#f3e5f5', '#6a1b9a'],
                  ['averia', '⚠️', 'Reportar avería', 'Equipo con falla detectada en campo', '#ffebee', '#c62828'],
                  ['devolucion', '🏢', 'Enviar a calibración / almacén', 'Devolver equipo a ENOSA o almacén', '#fff8e1', '#e65100'],
                ].map(([id, ico, title, desc, bg, color]) => (
                  <div key={id} onClick={() => setAccion(id)} style={{ background: '#fff', borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 24 }}>{ico}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color }}>{title}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
                    </div>
                    <span style={{ color: '#ccc', fontSize: 20 }}>›</span>
                  </div>
                ))}
              </>
            )}

            {accion === 'salida' && (
              <>
                <button onClick={() => setAccion(null)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', marginBottom: 14, fontWeight: 600, padding: 0, fontSize: 14 }}>← Volver</button>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>📤 Salida del almacén</h2>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Selecciona los equipos que te llevas hoy</p>
                {eqDisp.length === 0 && <p style={{ color: '#888', textAlign: 'center', padding: 24 }}>No hay equipos disponibles en almacén</p>}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', marginBottom: 16, overflow: 'hidden' }}>
                  {eqDisp.map(e => (
                    <label key={e.serie} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selEquipos.includes(e.serie)} onChange={ev => setSelEquipos(ev.target.checked ? [...selEquipos, e.serie] : selEquipos.filter(s => s !== e.serie))} style={{ width: 18, height: 18 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{e.serie}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{e.marca} {e.modelo} — {e.tipo}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <button onClick={registrarSalida} disabled={loading} style={{ ...btnStyle, background: '#1565c0', color: '#fff' }}>
                  {loading ? 'Registrando...' : `✅ Registrar salida (${selEquipos.length} equipos)`}
                </button>
              </>
            )}{accion === 'instalacion' && (
              <>
                <button onClick={() => setAccion(null)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', marginBottom: 14, fontWeight: 600, padding: 0, fontSize: 14 }}>← Volver</button>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>🔌 Instalación</h2>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Registra dónde instalaste el equipo</p>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Equipo</label>
                <select value={instEquipo} onChange={e => setInstEquipo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }}>
                  <option value="">Selecciona un equipo</option>
                  {misEqLibres.map(e => <option key={e.serie} value={e.serie}>{e.serie} — {e.modelo}</option>)}
                </select>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>N° suministro programado</label>
                <input value={instSumi} onChange={e => setInstSumi(e.target.value)} placeholder="Ej: 16072403" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={instAlt} onChange={e => setInstAlt(e.target.checked)} style={{ width: 18, height: 18 }} />
                  Suministro alternativo (no pudo acceder al original)
                </label>
                {instAlt && (
                  <>
                    <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: '#e65100' }}>⚠️ Documenta el suministro alternativo usado</div>
                    <input value={instSumiAlt} onChange={e => setInstSumiAlt(e.target.value)} placeholder="Ej: SED E102449 — suministro 16781661" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }} />
                  </>
                )}
                <button onClick={registrarInstalacion} disabled={loading} style={{ ...btnStyle, background: '#2e7d32', color: '#fff' }}>
                  {loading ? 'Registrando...' : '✅ Registrar instalación'}
                </button>
              </>
            )}

            {accion === 'retiro' && (
              <>
                <button onClick={() => setAccion(null)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', marginBottom: 14, fontWeight: 600, padding: 0, fontSize: 14 }}>← Volver</button>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>🔋 Retiro</h2>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Equipo retirado al finalizar medición</p>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Equipo a retirar</label>
                <select value={retEquipo} onChange={e => setRetEquipo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }}>
                  <option value="">Selecciona un equipo</option>
                  {misEqInstalados.map(e => <option key={e.serie} value={e.serie}>{e.serie} — {e.modelo} ({e.suministro})</option>)}
                </select>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Observaciones (opcional)</label>
                <textarea value={retObs} onChange={e => setRetObs(e.target.value)} placeholder="Ej: Medición completada, 672 intervalos válidos" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14, minHeight: 80, resize: 'vertical' }} />
                <button onClick={registrarRetiro} disabled={loading} style={{ ...btnStyle, background: '#6a1b9a', color: '#fff' }}>
                  {loading ? 'Registrando...' : '✅ Registrar retiro'}
                </button>
              </>
            )}

            {accion === 'averia' && (
              <>
                <button onClick={() => setAccion(null)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', marginBottom: 14, fontWeight: 600, padding: 0, fontSize: 14 }}>← Volver</button>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>⚠️ Reportar avería</h2>
                <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#c62828' }}>🚨 Esta alerta llegará al supervisor inmediatamente</div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Equipo averiado</label>
                <select value={avEquipo} onChange={e => setAvEquipo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }}>
                  <option value="">Selecciona el equipo</option>
                  {misEq.map(e => <option key={e.serie} value={e.serie}>{e.serie} — {e.modelo}</option>)}
                </select>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>¿Cuándo lo detectaste?</label>
                <select value={avMomento} onChange={e => setAvMomento(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }}>
                  <option>Al intentar instalarlo</option>
                  <option>Durante la medición</option>
                  <option>Al retirarlo</option>
                </select>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Describe la falla</label>
                <textarea value={avDesc} onChange={e => setAvDesc(e.target.value)} placeholder="Ej: No enciende al conectar, pantalla en blanco..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14, minHeight: 100, resize: 'vertical' }} />
                <button onClick={registrarAveria} disabled={loading} style={{ ...btnStyle, background: '#c62828', color: '#fff' }}>
                  {loading ? 'Registrando...' : '🚨 Reportar avería'}
                </button>
              </>
            )}

            {accion === 'devolucion' && (
              <>
                <button onClick={() => setAccion(null)} style={{ background: 'none', border: 'none', color: '#1565c0', cursor: 'pointer', marginBottom: 14, fontWeight: 600, padding: 0, fontSize: 14 }}>← Volver</button>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>🏢 Devolución</h2>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Devuelve el equipo a ENOSA o al almacén</p>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Equipo</label>
                <select value={devEquipo} onChange={e => setDevEquipo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }}>
                  <option value="">Selecciona el equipo</option>
                  {misEqLibres.map(e => <option key={e.serie} value={e.serie}>{e.serie} — {e.modelo}</option>)}
                </select>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>Destino</label>
                <select value={devDest} onChange={e => setDevDest(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 14, fontSize: 14 }}>
                  <option value="enosa">ENOSA — calibración</option>
                  <option value="almacen">SETEZO — almacén</option>
                </select>
                <button onClick={registrarDevolucion} disabled={loading} style={{ ...btnStyle, background: '#e65100', color: '#fff' }}>
                  {loading ? 'Registrando...' : '✅ Registrar devolución'}
                </button>
              </>
            )}
          </>
        )}{role !== 'sup' && tab === 'equipos' && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar por serie..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 12, fontSize: 14 }} />
            {misEq.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 24 }}>Sin equipos en tu cuadrilla</p>}
            {misEq.filter(e => !search || e.serie.toLowerCase().includes(search.toLowerCase())).map(e => (
              <div key={e.serie} style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', padding: '12px 16px', marginBottom: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.serie}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{e.marca} {e.modelo} — {e.tipo}</div>
                    {e.suministro && <div style={{ fontSize: 12, color: '#1565c0', marginTop: 4 }}>🔌 Instalado en {e.suministro}{e.suministro_alt ? ' (alternativo)' : ''}</div>}
                  </div>
                  <Badge estado={e.estado} />
                </div>
              </div>
            ))}
          </>
        )}

        {role !== 'sup' && tab === 'historial' && (
          <>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Últimos movimientos de tu cuadrilla</p>
            {movimientos.filter(m => m.cuadrilla === role).slice(0, 50).map(m => (
              <div key={m.id} style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.serie}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{fmtDT(m.timestamp)}</div>
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{m.detalle}</div>
              </div>
            ))}
            {movimientos.filter(m => m.cuadrilla === role).length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 24 }}>Sin registros</p>}
          </>
        )}

        {role === 'sup' && tab === 'acciones' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                ['almacen', '#e8f5e9', '#2e7d32', '📦', 'En almacén'],
                ['cuadrilla', '#e3f2fd', '#1565c0', '👷', 'En cuadrilla'],
                ['enosa', '#fff8e1', '#f57f17', '🔧', 'Calibración'],
                ['averiado', '#ffebee', '#c62828', '⚠️', 'Averiados'],
              ].map(([estado, bg, color, ico, label]) => (
                <div key={estado} style={{ background: bg, borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{ico}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color }}>{equipos.filter(e => e.estado === estado).length}</div>
                  <div style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#444' }}>Movimientos recientes</h3>
            {movimientos.slice(0, 20).map(m => (
              <div key={m.id} style={{ background: '#fff', borderRadius: 10, border: m.alerta ? '2px solid #ef9a9a' : '1px solid #eee', padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{m.serie} <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>— {CUADRILLAS[m.cuadrilla] || m.cuadrilla}</span></div>
                  <div style={{ fontSize: 11, color: '#999' }}>{fmtDT(m.timestamp)}</div>
                </div>
                <div style={{ fontSize: 12, color: m.alerta ? '#c62828' : '#666', marginTop: 4 }}>{m.detalle}</div>
              </div>
            ))}
            {movimientos.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 24 }}>Sin movimientos registrados</p>}
          </>
        )}

        {role === 'sup' && tab === 'equipos' && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar serie, cuadrilla..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 10, fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
                <option value="">Todos los estados</option>
                <option value="almacen">Almacén</option>
                <option value="cuadrilla">En cuadrilla</option>
                <option value="enosa">Calibración</option>
                <option value="averiado">Averiado</option>
              </select>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}>
                <option value="">Todos los tipos</option>
                <option value="Monofásico">Monofásico</option>
                <option value="Trifásico">Trifásico</option>
                <option value="Perturbaciones">Perturbaciones</option>
              </select>
            </div>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>{eqFiltrados.length} equipos</p>
            {eqFiltrados.map(e => (
              <div key={e.serie} style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '10px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{e.serie}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{e.marca} {e.modelo} — {e.tipo}</div>
                    {e.estado === 'cuadrilla' && <div style={{ fontSize: 11, color: '#1565c0', marginTop: 3 }}>{e.ubicacion}</div>}
                    {e.suministro && <div style={{ fontSize: 11, color: '#2e7d32', marginTop: 2 }}>🔌 {e.suministro}{e.suministro_alt ? ' (alt)' : ''}</div>}
                    {e.estado === 'averiado' && e.desc_averia && <div style={{ fontSize: 11, color: '#c62828', marginTop: 2 }}>⚠️ {e.desc_averia}</div>}
                  </div>
                  <Badge estado={e.estado} />
                </div>
              </div>
            ))}
          </>
        )}

        {role === 'sup' && tab === 'alertas' && (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#c62828' }}>🚨 Averías reportadas</h3>
            {alertas.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 24 }}>Sin averías reportadas</p>}
            {alertas.map(m => (
              <div key={m.id} style={{ background: '#fff', border: '2px solid #ef9a9a', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#c62828' }}>⚠️ {m.serie}</div>
                  <span style={{ background: '#ffebee', color: '#c62828', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Avería</span>
                </div>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{CUADRILLAS[m.cuadrilla] || m.cuadrilla} — {fmtDT(m.timestamp)}</div>
                <div style={{ fontSize: 13, color: '#444' }}>{m.detalle}</div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}</div>
import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar.jsx';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { colors, styles } from '../styles.js';

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({ name: '', assetTag: '', type: '', serialNumber: '', location: '' });
  const [err, setErr] = useState('');

  async function load() {
    try { const res = await api.getAssets(); setAssets(res.assets || []); setErr(''); } catch (e) { setErr(e.message || 'Failed to load assets'); }
  }
  useEffect(() => { load(); }, []);

  async function createAsset(e) {
    e.preventDefault();
    try { await api.createAsset(form); setForm({ name: '', assetTag: '', type: '', serialNumber: '', location: '' }); load(); } catch (e) { setErr(e.message || 'Failed to create asset'); }
  }

  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>
        <div style={styles.hero}><h1 style={{ margin: 0 }}>Assets</h1><p style={{ marginTop: 10, color: 'rgba(255,255,255,0.86)' }}>Track laptops, printers, and shared equipment that can be linked to tickets.</p></div>
        {err ? <div style={{ color: colors.danger, marginTop: 12 }}>{err}</div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'ADMIN' ? '0.9fr 1.1fr' : '1fr', gap: 16, marginTop: 18 }}>
          {user?.role === 'ADMIN' && <form onSubmit={createAsset} style={styles.card}><div style={{ fontWeight: 800, marginBottom: 12 }}>Add asset</div><div style={{ display: 'grid', gap: 10 }}><input style={styles.input} placeholder='Asset name' value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input style={styles.input} placeholder='Asset tag' value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} /><input style={styles.input} placeholder='Type' value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /><input style={styles.input} placeholder='Serial number' value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /><input style={styles.input} placeholder='Location' value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><button style={styles.button}>Save asset</button></div></form>}
          <div style={styles.card}><div style={{ fontWeight: 800, marginBottom: 12 }}>Asset inventory</div><div style={{ display: 'grid', gap: 10 }}>{assets.map((asset) => <div key={asset.id} style={styles.softCard}><div style={{ fontWeight: 700 }}>{asset.name}</div><div style={{ fontSize: 12, color: colors.muted }}>{asset.assetTag} • {asset.type} • {asset.status.replaceAll('_', ' ')}</div><div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Assigned to {asset.assignedUser?.email || 'No one yet'} • Open links {asset.tickets?.length || 0}</div></div>)}</div></div>
        </div>
      </div>
    </div>
  );
}

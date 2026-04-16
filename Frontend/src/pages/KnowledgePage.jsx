import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar.jsx';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { colors, styles } from '../styles.js';

export default function KnowledgePage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [form, setForm] = useState({ title: '', category: 'General', summary: '', content: '' });
  const [err, setErr] = useState('');

  async function load() {
    try { const res = await api.getKnowledge(); setArticles(res.articles || []); setErr(''); } catch (e) { setErr(e.message || 'Failed to load articles'); }
  }
  useEffect(() => { load(); }, []);

  async function createArticle(e) {
    e.preventDefault();
    try { await api.createArticle(form); setForm({ title: '', category: 'General', summary: '', content: '' }); load(); } catch (e) { setErr(e.message || 'Failed to create article'); }
  }

  return (
    <div style={styles.page}>
      <NavBar />
      <div style={styles.container}>
        <div style={styles.hero}><h1 style={{ margin: 0 }}>Knowledge Base</h1><p style={{ marginTop: 10, color: 'rgba(255,255,255,0.86)' }}>Store repeat fixes so the platform shows a more realistic support workflow.</p></div>
        {err ? <div style={{ color: colors.danger, marginTop: 12 }}>{err}</div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: (user?.role === 'ADMIN' || user?.role === 'AGENT') ? '0.9fr 1.1fr' : '1fr', gap: 16, marginTop: 18 }}>
          {(user?.role === 'ADMIN' || user?.role === 'AGENT') && <form onSubmit={createArticle} style={styles.card}><div style={{ fontWeight: 800, marginBottom: 12 }}>New article</div><div style={{ display: 'grid', gap: 10 }}><input style={styles.input} placeholder='Title' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><input style={styles.input} placeholder='Category' value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><textarea style={styles.textarea} placeholder='Short summary' value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /><textarea style={styles.textarea} placeholder='Article content' value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /><button style={styles.button}>Publish article</button></div></form>}
          <div style={styles.card}><div style={{ fontWeight: 800, marginBottom: 12 }}>Published articles</div><div style={{ display: 'grid', gap: 10 }}>{articles.map((article) => <div key={article.id} style={styles.softCard}><div style={{ fontWeight: 700 }}>{article.title}</div><div style={{ fontSize: 12, color: colors.muted }}>{article.category} • {article.author?.email || 'Team article'}</div><div style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>{article.summary}</div><div style={{ marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{article.content}</div></div>)}</div></div>
        </div>
      </div>
    </div>
  );
}

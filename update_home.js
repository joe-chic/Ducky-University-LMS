const fs = require('fs');
let code = fs.readFileSync('frontend-service/src/pages/Home.jsx', 'utf8');

// 1. Add map to select
code = code.replace(
  '<option value="audio_music">Audio / Music</option>',
  '<option value="audio_music">Audio / Music</option>\n                    <option value="map">Map</option>'
);

// 2. Add nuevo_autor and nueva_editorial
code = code.replace(
  '{metadata.authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}\n                  </select>',
  '{metadata.authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}\n                  </select>\n                  <input type="text" placeholder="...o registrar nuevo autor" className="modal-input" style={{ marginTop: "5px" }} value={recursoEditando?.nuevo_autor || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, nuevo_autor: e.target.value, autor_id: "" })} disabled={!!recursoEditando?.autor_id} />'
);

code = code.replace(
  '{metadata.publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}\n                  </select>',
  '{metadata.publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}\n                  </select>\n                  <input type="text" placeholder="...o registrar nueva editorial" className="modal-input" style={{ marginTop: "5px" }} value={recursoEditando?.nueva_editorial || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, nueva_editorial: e.target.value, editorial_id: "" })} disabled={!!recursoEditando?.editorial_id} />'
);

// 3. Add Lenguaje Principal
code = code.replace(
  '<label className="detail-label">Géneros Múltiples</label>',
  `<label className="detail-label">Lenguaje Principal (Primario)</label>
              <select className="modal-input" value={recursoEditando?.lenguaje_principal_id || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, lenguaje_principal_id: e.target.value ? Number(e.target.value) : "" })}>
                <option value="">Desconocido / Ninguno</option>
                {metadata.languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <label className="detail-label">Géneros Múltiples</label>`
);

// 4. Add the rest of the metadata
const additionalMetadata = `
              {['e_journal', 'e_magazine', 'journal_magazine'].includes(recursoEditando?.tipo) && (
                <div style={{ background: "#e8eaf6", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #5c6bc0" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Publicación Periódica</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input type="text" placeholder="ISSN (8 caracteres)" className="modal-input" value={recursoEditando?.journal_issn || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, journal_issn: e.target.value })} />
                    <select className="modal-input" value={recursoEditando?.journal_frequency || "monthly"} onChange={(e) => setRecursoEditando({ ...recursoEditando, journal_frequency: e.target.value })}>
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="annually">Anual</option>
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", cursor: "pointer", fontSize: "14px" }}>
                    <input type="checkbox" checked={recursoEditando?.journal_peer_reviewed ?? false} onChange={(e) => setRecursoEditando({ ...recursoEditando, journal_peer_reviewed: e.target.checked })} />
                    ¿Es revisado por pares? (Peer Reviewed)
                  </label>
                </div>
              )}

              {['e_article', 'digital_article'].includes(recursoEditando?.tipo) && (
                <div style={{ background: "#e0f2f1", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #26a69a" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Artículo</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input type="number" placeholder="ID Revista Padre" className="modal-input" value={recursoEditando?.journal_id || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, journal_id: Number(e.target.value) })} />
                    <input type="number" placeholder="Año" className="modal-input" value={recursoEditando?.article_year || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, article_year: Number(e.target.value) })} />
                    <input type="number" placeholder="Volumen" className="modal-input" value={recursoEditando?.article_volume || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, article_volume: Number(e.target.value) })} />
                    <input type="number" placeholder="Issue (Número)" className="modal-input" value={recursoEditando?.article_issue || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, article_issue: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {['video', 'audio_music'].includes(recursoEditando?.tipo) && (
                <div style={{ background: "#f3e5f5", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #ab47bc" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata Audiovisual</h4>
                  <input type="number" placeholder="Duración (Minutos)" className="modal-input" value={recursoEditando?.audiovisual_minutes || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, audiovisual_minutes: Number(e.target.value) })} />
                </div>
              )}

              {recursoEditando?.tipo === 'map' && (
                <div style={{ background: "#fff3e0", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #ff9800" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Mapa</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input type="text" placeholder="Escala" className="modal-input" value={recursoEditando?.maps_scale || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, maps_scale: e.target.value })} />
                    <input type="text" placeholder="Tipo de proyección" className="modal-input" value={recursoEditando?.maps_projection_type || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, maps_projection_type: e.target.value })} />
                    <input type="text" placeholder="Tipo de mapa" className="modal-input" style={{ gridColumn: "span 2" }} value={recursoEditando?.maps_type || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, maps_type: e.target.value })} />
                  </div>
                </div>
              )}

              <label className="detail-label">Géneros Múltiples</label>`;

code = code.replace('<label className="detail-label">Géneros Múltiples</label>', additionalMetadata);

fs.writeFileSync('frontend-service/src/pages/Home.jsx', code);
console.log('Frontend Home.jsx updated successfully');

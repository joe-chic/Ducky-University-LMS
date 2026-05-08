const fs = require('fs');
let code = fs.readFileSync('library-microservice/src/index.js', 'utf8');

const oldDto = `function resourceRowToDto(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    autor: row.autor,
    autor_id: row.autor_id,
    editorial: row.editorial,
    editorial_id: row.editorial_id,
    genero: row.generos, 
    generos_ids: row.generos_ids ? row.generos_ids.split(',').map(Number) : [],
    disponible: row.disponible,
    tipo: row.tipo,
    ano_publicacion: row.ano_publicacion,
    costo: row.costo,
    isbn: row.isbn,
    issn: row.self_issn || null,
    edicion: row.edicion,
    sinopsis: row.sinopsis,
    lenguajes: row.lenguajes,
    lenguajes_ids: row.lenguajes_ids ? row.lenguajes_ids.split(',').map(Number) : [],
    ubicacion: row.ubicacion,
    codebar: row.codebar,
    portada: row.portada
  };
}`;

const newDto = `function resourceRowToDto(row) {
  const dto = {
    id: row.id,
    titulo: row.titulo,
    autor: row.autor,
    autor_id: row.autor_id,
    editorial: row.editorial,
    editorial_id: row.editorial_id,
    genero: row.generos, 
    generos_ids: row.generos_ids ? row.generos_ids.split(',').map(Number) : [],
    disponible: row.disponible,
    tipo: row.tipo,
    ano_publicacion: row.ano_publicacion,
    costo: row.costo,
    isbn: row.isbn,
    issn: row.self_issn || null,
    edicion: row.edicion,
    sinopsis: row.sinopsis,
    lenguajes: row.lenguajes,
    lenguajes_ids: row.lenguajes_ids ? row.lenguajes_ids.split(',').map(Number) : [],
    ubicacion: row.ubicacion,
    codebar: row.codebar,
    portada: row.portada,
    audiovisual_minutes: row.audiovisual_minutes,
    maps_scale: row.maps_scale,
    maps_projection_type: row.maps_projection_type,
    maps_type: row.maps_type,
    lenguaje_principal_id: row.lenguaje_principal_id
  };
  
  if (row.journal_id) {
    dto.journal_id            = row.journal_id;
    dto.journal_title         = row.journal_title;
    dto.journal_issn          = row.journal_issn;
    dto.journal_frequency     = row.journal_frequency;
    dto.journal_peer_reviewed = row.journal_peer_reviewed;
    dto.article_issue         = row.article_issue;
    dto.article_volume        = row.article_volume;
    dto.article_year          = row.article_year;
  }
  
  if (['e_journal', 'e_magazine', 'journal_magazine'].includes(row.tipo)) {
    dto.journal_issn = row.self_issn;
    dto.journal_frequency = row.self_journal_frequency;
    dto.journal_peer_reviewed = row.self_journal_peer_reviewed;
  }
  
  return dto;
}`;

code = code.replace(oldDto, newDto);

fs.writeFileSync('library-microservice/src/index.js', code);
console.log('DTO mapper updated successfully');

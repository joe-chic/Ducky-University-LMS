const fs = require('fs');
let code = fs.readFileSync('library-microservice/src/index.js', 'utf8');

const correctQuery = `const totalRes = await query(
      \`SELECT COUNT(DISTINCT r.resource_id)::int AS total
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       \${whereSql}\`,
      params
    );
    const total = totalRes.rows[0]?.total || 0;

    const result = await query(
      \`SELECT
          r.resource_id AS id,
          r.resource_title AS titulo,
          CONCAT_WS(' ', c.first_name, c.middle_name, c.father_lastname, c.mother_lastname) AS autor,
          c.colaborator_id AS autor_id,
          o.organization_name AS editorial,
          o.organization_id AS editorial_id,
          STRING_AGG(DISTINCT cat.category_name, ', ') AS generos,
          STRING_AGG(DISTINCT cat.category_id::text, ',') AS generos_ids,
          (CASE 
            WHEN r.resource_type IN ('e_book', 'digital_article') 
                 AND (dm.digital_url_link IS NULL OR TRIM(dm.digital_url_link) = '') THEN false
            ELSE (r.resource_state = 'available')
          END) AS disponible,
          r.resource_type AS tipo,
          r.resource_publication_year AS ano_publicacion,
          r.resource_cost AS costo,
          bm.book_isbn AS isbn,
          bm.book_edition_number AS edicion,
          bm.book_synopsis AS sinopsis,
          STRING_AGG(DISTINCT l.language_name, ', ') AS lenguajes,
          STRING_AGG(DISTINCT l.language_id::text, ',') AS lenguajes_ids,
          STRING_AGG(DISTINCT pe.example_location_code, ', ') AS ubicacion,
          STRING_AGG(DISTINCT pe.barcode, ', ') AS codebar,
          MAX(im.image_url) AS portada,
          av.audiovisual_minutes AS audiovisual_minutes,
          mm.maps_scale AS maps_scale,
          mm.maps_projection_type AS maps_projection_type,
          mm.maps_type AS maps_type,
          rl.language_id AS lenguaje_principal_id,
          pm_self.periodical_frequency AS self_journal_frequency,
          pm_self.peer_reviewed AS self_journal_peer_reviewed,
          da.resource_parent_id   AS journal_id,
          rj.resource_title       AS journal_title,
          pm.periodical_issn      AS journal_issn,
          pm.periodical_frequency AS journal_frequency,
          pm.peer_reviewed        AS journal_peer_reviewed,
          da.digital_article_issue  AS article_issue,
          da.digital_article_volume AS article_volume,
          da.digital_article_year   AS article_year,
          pm_self.periodical_issn   AS self_issn
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       LEFT JOIN book_metadata bm ON bm.resource_id = r.resource_id
       LEFT JOIN supplementary_languages sl ON sl.resource_id = r.resource_id
       LEFT JOIN languages l ON l.language_id = sl.language_id
       LEFT JOIN physical_examples pe ON pe.resource_id = r.resource_id
       LEFT JOIN digital_metadata dm ON dm.resource_id = r.resource_id
       LEFT JOIN images im ON im.resource_id = r.resource_id
       LEFT JOIN digital_articles da ON da.resource_child_id = r.resource_id
       LEFT JOIN resources rj ON rj.resource_id = da.resource_parent_id
       LEFT JOIN periodical_metadata pm ON pm.resource_id = da.resource_parent_id
       LEFT JOIN periodical_metadata pm_self ON pm_self.resource_id = r.resource_id
       LEFT JOIN audiovisual_metadata av ON av.resource_id = r.resource_id
       LEFT JOIN maps_metadata mm ON mm.resource_id = r.resource_id
       LEFT JOIN resource_labels rl ON rl.resource_id = r.resource_id AND rl.resource_is_primary = true
       \${whereSql}
       GROUP BY r.resource_id, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, c.colaborator_id, o.organization_name, o.organization_id, r.resource_state, r.resource_type, r.resource_publication_year, r.resource_cost, bm.book_isbn, bm.book_edition_number, bm.book_synopsis, dm.digital_url_link,
               da.resource_parent_id, rj.resource_title, pm.periodical_issn, pm.periodical_frequency, pm.peer_reviewed,
               da.digital_article_issue, da.digital_article_volume, da.digital_article_year, pm_self.periodical_issn,
               av.audiovisual_minutes, mm.maps_scale, mm.maps_projection_type, mm.maps_type, rl.language_id, pm_self.periodical_frequency, pm_self.peer_reviewed
       \${sort === "recent" ? "ORDER BY r.resource_id DESC" : "ORDER BY r.resource_title ASC, r.resource_id ASC"}
       LIMIT \$\${params.length + 1} OFFSET \$\${params.length + 2}\`,`;

const regex = /const totalRes = await query\([\s\S]*?OFFSET \$\$\{params\.length \+ 2\}`\,/;
code = code.replace(regex, correctQuery);

fs.writeFileSync('library-microservice/src/index.js', code);
console.log('Fixed SQL query structure');

const fs = require('fs');
const f = './library-microservice/src/index.js';
let content = fs.readFileSync(f, 'utf8');

// The old SQL ends with the codebar line and original JOINs/GROUP BY
const oldSQL = `          STRING_AGG(DISTINCT pe.barcode, ', ') AS codebar
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       LEFT JOIN book_metadata bm ON bm.resource_id = r.resource_id
       LEFT JOIN supplementary_languages sl ON sl.resource_id = r.resource_id
       LEFT JOIN languages l ON l.language_id = sl.language_id
       LEFT JOIN physical_examples pe ON pe.resource_id = r.resource_id
       WHERE r.resource_id = $1
       GROUP BY r.resource_id, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, c.colaborator_id, o.organization_name, o.organization_id, r.resource_state, r.resource_type, r.resource_publication_year, r.resource_cost, bm.book_isbn, bm.book_edition_number, bm.book_synopsis\``;

const newSQL = `          STRING_AGG(DISTINCT pe.barcode, ', ') AS codebar,
          da.resource_parent_id   AS journal_id,
          rj.resource_title       AS journal_title,
          pm.periodical_issn      AS journal_issn,
          pm.periodical_frequency AS journal_frequency,
          pm.peer_reviewed        AS journal_peer_reviewed,
          da.digital_article_issue  AS article_issue,
          da.digital_article_volume AS article_volume,
          da.digital_article_year   AS article_year
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       LEFT JOIN book_metadata bm ON bm.resource_id = r.resource_id
       LEFT JOIN supplementary_languages sl ON sl.resource_id = r.resource_id
       LEFT JOIN languages l ON l.language_id = sl.language_id
       LEFT JOIN physical_examples pe ON pe.resource_id = r.resource_id
       LEFT JOIN digital_articles da ON da.resource_child_id = r.resource_id
       LEFT JOIN resources rj ON rj.resource_id = da.resource_parent_id
       LEFT JOIN periodical_metadata pm ON pm.resource_id = da.resource_parent_id
       WHERE r.resource_id = $1
       GROUP BY r.resource_id, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname,
                c.colaborator_id, o.organization_name, o.organization_id, r.resource_state,
                r.resource_type, r.resource_publication_year, r.resource_cost, bm.book_isbn,
                bm.book_edition_number, bm.book_synopsis, da.resource_parent_id, rj.resource_title,
                pm.periodical_issn, pm.periodical_frequency, pm.peer_reviewed,
                da.digital_article_issue, da.digital_article_volume, da.digital_article_year\``;

// Normalize line endings for matching
const normalizeLE = s => s.replace(/\r\n/g, '\n');
const contentNorm = normalizeLE(content);
const oldSQLNorm  = normalizeLE(oldSQL);

if (contentNorm.includes(oldSQLNorm)) {
  // Replace in normalized form, then restore
  const fixed = contentNorm.replace(oldSQLNorm, normalizeLE(newSQL));
  fs.writeFileSync(f, fixed.replace(/\n/g, '\r\n'), 'utf8');
  console.log('SQL JOINs added successfully');
} else {
  // Try to find the codebar line as anchor
  const anchor = "STRING_AGG(DISTINCT pe.barcode, ', ') AS codebar";
  const idx = contentNorm.indexOf(anchor);
  if (idx === -1) {
    console.log('ERROR: codebar anchor not found');
    process.exit(1);
  }
  // Find the end of the backtick template (closing backtick after the GROUP BY)
  const endBt = contentNorm.indexOf('`', idx + anchor.length + 200);
  console.log('Anchor at:', idx, 'endBt at:', endBt);
  console.log('Snippet:', JSON.stringify(contentNorm.slice(idx - 5, endBt + 5)));
}

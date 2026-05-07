const fs = require('fs');
const f = './library-microservice/src/index.js';
let content = fs.readFileSync(f, 'utf8');

// Modify the GET /resources/:id SQL to also join pm_self for when the resource is a journal itself
const oldSQL = `          da.digital_article_year   AS article_year
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

const newSQL = `          da.digital_article_year   AS article_year,
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
       LEFT JOIN digital_articles da ON da.resource_child_id = r.resource_id
       LEFT JOIN resources rj ON rj.resource_id = da.resource_parent_id
       LEFT JOIN periodical_metadata pm ON pm.resource_id = da.resource_parent_id
       LEFT JOIN periodical_metadata pm_self ON pm_self.resource_id = r.resource_id
       WHERE r.resource_id = $1
       GROUP BY r.resource_id, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname,
                c.colaborator_id, o.organization_name, o.organization_id, r.resource_state,
                r.resource_type, r.resource_publication_year, r.resource_cost, bm.book_isbn,
                bm.book_edition_number, bm.book_synopsis, da.resource_parent_id, rj.resource_title,
                pm.periodical_issn, pm.periodical_frequency, pm.peer_reviewed,
                da.digital_article_issue, da.digital_article_volume, da.digital_article_year,
                pm_self.periodical_issn\``;

// Normalize line endings for matching
const normalizeLE = s => s.replace(/\r\n/g, '\n');
const contentNorm = normalizeLE(content);
const oldSQLNorm  = normalizeLE(oldSQL);

if (contentNorm.includes(oldSQLNorm)) {
  const fixed = contentNorm.replace(oldSQLNorm, normalizeLE(newSQL));
  fs.writeFileSync(f, fixed.replace(/\n/g, '\r\n'), 'utf8');
  console.log('SQL pm_self JOIN added successfully');
} else {
  console.log('ERROR: SQL not found');
}

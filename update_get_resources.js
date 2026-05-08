const fs = require('fs');
let code = fs.readFileSync('library-microservice/src/index.js', 'utf8');

const selectFieldsList = `,
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
       FROM resources r`;

// We must be very careful since we modified the query in GET /resources/:id as well.
// Let's use a regex to replace ONLY the one in GET /resources
code = code.replace(/MAX\(im\.image_url\) AS portada\n       FROM resources r/, 'MAX(im.image_url) AS portada' + selectFieldsList);

const joinsList = `LEFT JOIN images im ON im.resource_id = r.resource_id
       LEFT JOIN digital_articles da ON da.resource_child_id = r.resource_id
       LEFT JOIN resources rj ON rj.resource_id = da.resource_parent_id
       LEFT JOIN periodical_metadata pm ON pm.resource_id = da.resource_parent_id
       LEFT JOIN periodical_metadata pm_self ON pm_self.resource_id = r.resource_id
       LEFT JOIN audiovisual_metadata av ON av.resource_id = r.resource_id
       LEFT JOIN maps_metadata mm ON mm.resource_id = r.resource_id
       LEFT JOIN resource_labels rl ON rl.resource_id = r.resource_id AND rl.resource_is_primary = true`;

code = code.replace(/LEFT JOIN images im ON im\.resource_id = r\.resource_id\n       \$\{whereSql\}/, joinsList + '\\n       ${whereSql}');

const groupList = `bm.book_synopsis, dm.digital_url_link,
               da.resource_parent_id, rj.resource_title, pm.periodical_issn, pm.periodical_frequency, pm.peer_reviewed,
               da.digital_article_issue, da.digital_article_volume, da.digital_article_year, pm_self.periodical_issn,
               av.audiovisual_minutes, mm.maps_scale, mm.maps_projection_type, mm.maps_type, rl.language_id, pm_self.periodical_frequency, pm_self.peer_reviewed`;

code = code.replace(/bm\.book_synopsis, dm\.digital_url_link/, groupList);

fs.writeFileSync('library-microservice/src/index.js', code);
console.log('GET /resources list updated successfully');

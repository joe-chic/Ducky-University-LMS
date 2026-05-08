const fs = require('fs');
let code = fs.readFileSync('library-microservice/src/index.js', 'utf8');

const selectFields = `,
          av.audiovisual_minutes AS audiovisual_minutes,
          mm.maps_scale AS maps_scale,
          mm.maps_projection_type AS maps_projection_type,
          mm.maps_type AS maps_type,
          rl.language_id AS lenguaje_principal_id,
          pm_self.periodical_frequency AS self_journal_frequency,
          pm_self.peer_reviewed AS self_journal_peer_reviewed
       FROM resources r`;

code = code.replace('       FROM resources r', selectFields);

const joinFields = `       LEFT JOIN images im ON im.resource_id = r.resource_id
       LEFT JOIN audiovisual_metadata av ON av.resource_id = r.resource_id
       LEFT JOIN maps_metadata mm ON mm.resource_id = r.resource_id
       LEFT JOIN resource_labels rl ON rl.resource_id = r.resource_id AND rl.resource_is_primary = true`;

code = code.replace('       LEFT JOIN images im ON im.resource_id = r.resource_id', joinFields);

const groupFields = `pm_self.periodical_issn, dm.digital_url_link,
                 av.audiovisual_minutes, mm.maps_scale, mm.maps_projection_type, mm.maps_type, rl.language_id, pm_self.periodical_frequency, pm_self.peer_reviewed`;

code = code.replace('pm_self.periodical_issn, dm.digital_url_link', groupFields);

const dtoAttachment = `// Attach journal fields for digital_article (not covered by resourceRowToDto)
    if (['e_journal', 'e_magazine', 'journal_magazine'].includes(row.tipo)) {
      dto.journal_issn = row.self_issn;
      dto.journal_frequency = row.self_journal_frequency;
      dto.journal_peer_reviewed = row.self_journal_peer_reviewed;
    }
    dto.audiovisual_minutes = row.audiovisual_minutes;
    dto.maps_scale = row.maps_scale;
    dto.maps_projection_type = row.maps_projection_type;
    dto.maps_type = row.maps_type;
    dto.lenguaje_principal_id = row.lenguaje_principal_id;`;

code = code.replace('// Attach journal fields for digital_article (not covered by resourceRowToDto)', dtoAttachment);

fs.writeFileSync('library-microservice/src/index.js', code);
console.log('Backend query updated for new metadata fields');

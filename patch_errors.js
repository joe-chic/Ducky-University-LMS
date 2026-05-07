const fs = require('fs');
const files = [
  'human-capital-microservice/index.js',
  'scholar-microservice/index.js',
  'treasury-microservice/index.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\} catch \((e|err)\) \{ res\.status\(500\)\.json\(\{ error: \1\.message \}\); \}/g, 
    '} catch (e) { if (e.code === "23505") { res.status(400).json({ error: "Action not permitted: " + (e.detail || "Unique constraint violated.") }); } else { res.status(500).json({ error: e.message }); } }');
  fs.writeFileSync(f, content);
});

const userLibFiles = [
  'library-microservice/src/index.js',
  'users-microservice/src/index.js'
];

userLibFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/catch \((err|e)\) \{\s*(?:\/\/[^\n]*\n\s*)*console\.error\(\1\);\s*res\.status\(500\)\.json\(\{ (message|error): "[^"]+" \}\);\s*\}/g, 
    `catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Action not permitted: " + (err.detail || "Unique constraint violated.") });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }`);
  fs.writeFileSync(f, content);
});

console.log("Updated files!");

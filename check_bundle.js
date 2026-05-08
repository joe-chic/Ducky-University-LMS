fetch("http://localhost:3000").then(r=>r.text()).then(async html => { 
  const scriptMatch = html.match(/<script defer="defer" src="([^"]+)"><\/script>/); 
  if (scriptMatch) { 
    const jsUrl = "http://localhost:3000" + scriptMatch[1]; 
    const jsText = await fetch(jsUrl).then(r=>r.text()); 
    console.log("Found Registrar Nuevo Autor:", jsText.includes("Registrar Nuevo Autor")); 
  } else { 
    console.log("No script found", html); 
  } 
});

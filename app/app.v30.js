// v30 entrypoint duplicado para quebrar cache antigo do SW v29
// This file imports the main app logic to break cache from v29
// Simply load the main app.js file
import('./app.js').catch(err => console.error('Failed to load app.js:', err));

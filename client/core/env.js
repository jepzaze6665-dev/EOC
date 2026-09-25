// Build mode.
//
// DEV_MODE is true while developing on your own computer (http://localhost:5173) and
// switches on developer tools: the F8 map debug mode and the ` (backquote) dev panel.
// On a real web server - or with ?production in the address - it is false and those
// tools do not exist at all (no key opens them, nothing is drawn).

const host = typeof location !== 'undefined' ? location.hostname : '';
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export const DEV_MODE = ['localhost', '127.0.0.1', ''].includes(host) && !params.has('production');

const http = require('http');

http.get('http://localhost:8082/apps/customer-mobile/index.bundle?platform=web&dev=true&hot=false&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Bundle length:', d.length);
    console.log('Has Testing:', d.includes('Testing'));
    console.log('Has Navigation:', d.includes('Navigation'));
    
    // Check for React version indicators
    const hasReact19 = d.includes('react-dom/client') || d.includes('createRoot');
    const hasReact18 = d.includes('react-dom') && d.includes('render');
    console.log('Has react-dom/client (React 18+19):', hasReact19);
    console.log('Has react-dom render (React 18):', hasReact18);
    
    // Look for duplicate React versions
    const matches = d.match(/react-dom/g) || [];
    console.log('react-dom mentions:', matches.length);
  });
}).on('error', e => console.log('Error:', e.message));

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8001/api';
const COLLECTION_PATH = path.join(__dirname, 'TableReady API.postman_collection.json');
const CSV_PATH = path.join(__dirname, 'API_Test_Log.xlsx.csv');

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login(username, password) {
  const body = JSON.stringify({ username, password });
  const res = await makeRequest({
    hostname: 'localhost',
    port: 8001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  const json = JSON.parse(res.body);
  return json.token || null;
}

async function testEndpoint(method, path, token = null, body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const bodyStr = body ? JSON.stringify(body) : null;
  if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
  
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 8001,
      path: path,
      method,
      headers
    }, bodyStr);
    return res.status;
  } catch (err) {
    return 'ERR';
  }
}

async function runTests() {
  console.log('Logging in...');
  const tokens = {};
  for (const [role, username] of [['manager', 'manager_test'], ['waiter', 'waiter_test'], ['kitchen', 'kitchen_test'], ['delivery', 'delivery_test']]) {
    tokens[role] = await login(username, 'password123');
    console.log(`  ${role}: ${!!tokens[role]}`);
  }
  
  const collection = JSON.parse(fs.readFileSync(COLLECTION_PATH, 'utf8'));
  const results = [];
  
  let idx = 1;
  for (const folder of collection.item) {
    if (!folder.item) continue;
    for (const req of folder.item) {
      const method = req.request.method;
      let path = '/' + (req.request.url.path || []).join('/');
      const raw = req.request.url.raw || '';
      const queryIdx = raw.indexOf('?');
      const queryStr = queryIdx >= 0 ? raw.substring(queryIdx) : '';
      
      if (queryStr && !path.includes('?')) {
        path += queryStr;
      }
      
      path = path.replace(/{{base_url}}/g, '')
                 .replace(/{{order_id}}/g, '1')
                 .replace(/{{cart_id}}/g, '1')
                 .replace(/{{menu_item_id}}/g, '1')
                 .replace(/{{table_id}}/g, '1')
                 .replace(/{{reservation_id}}/g, '1')
                 .replace(/{{entry_id}}/g, '1')
                 .replace(/{{modifier_id}}/g, '1')
                 .replace(/{{config_id}}/g, '1');
      
      if (!path.startsWith('/api/') && path !== '/health') {
        path = '/api' + path;
      }
      
      let token = null;
      if (req.request.auth && req.request.auth.bearer) {
        const tokenVar = req.request.auth.bearer[0].value;
        if (tokenVar.includes('manager')) token = tokens.manager;
        else if (tokenVar.includes('waiter')) token = tokens.waiter;
        else if (tokenVar.includes('kitchen')) token = tokens.kitchen;
        else if (tokenVar.includes('delivery')) token = tokens.delivery;
      }
      
      let body = null;
      if (req.request.body && req.request.body.raw) {
        try {
          body = JSON.parse(req.request.body.raw);
        } catch (e) {
          body = null;
        }
      }
      
      const status = await testEndpoint(method, path, token, body);
      results.push({
        idx,
        folder: folder.name,
        name: req.name,
        method,
        endpoint: path,
        status
      });
      
      if (idx % 20 === 0) console.log(`Tested ${idx} endpoints...`);
      await new Promise(r => setTimeout(r, 50));
      idx++;
    }
  }
  
  console.log(`\nTested ${results.length} endpoints total.`);
  
  const failures = results.filter(r => r.status < 200 || r.status >= 300);
  if (failures.length > 0) {
    console.log('\nNon-2xx responses:');
    failures.forEach(f => console.log(`  ${f.method} ${f.endpoint} -> ${f.status} (${f.folder}/${f.name})`));
  }
  
  const successCount = results.filter(r => r.status >= 200 && r.status < 300).length;
  console.log(`\nSuccess rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  let csv = '#,Folder,Request Name,Method,Endpoint,Expected Status,Actual Status,Pass/Fail,Notes\n';
  results.forEach((r, i) => {
    const pass = (r.status >= 200 && r.status < 300) ? 'PASS' : 'FAIL';
    let notes = '';
    if (r.status === 401) notes = 'Needs auth';
    else if (r.status === 403) notes = 'Forbidden';
    else if (r.status === 404) notes = 'Not found';
    else if (r.status === 429) notes = 'Rate limited';
    else if (r.status === 500) notes = 'Server error';
    
    csv += `${i+1},${r.folder},${r.name},${r.method},${r.endpoint},200,${r.status},${pass},${notes}\n`;
  });
  
  fs.writeFileSync(CSV_PATH, csv);
  console.log('\nRegenerated API_Test_Log.xlsx.csv with all endpoints and actual status codes.');
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});

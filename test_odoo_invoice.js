import fetch from 'node-fetch';

async function run() {
  const resp = await fetch('http://localhost:3000/api/odoo/order-status/S00063');
  const data = await resp.json();
  console.log('S00063:', data);
  
  const resp2 = await fetch('http://localhost:3000/api/odoo/order-status/S00107');
  const data2 = await resp2.json();
  console.log('S00107:', data2);
}

run();

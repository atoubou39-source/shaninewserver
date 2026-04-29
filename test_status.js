import fetch from 'node-fetch';

async function run() {
  try {
    const respList = await fetch('http://localhost:3000/api/odoo/orders');
    const listData = await respList.json();
    const latestOrder = listData.data.find(o => o.state === 'sale'); // find latest confirmed order
    console.log('Latest Sale Order:', latestOrder.name);

    const resp = await fetch('http://localhost:3000/api/odoo/order-status/' + latestOrder.name);
    const data = await resp.json();
    console.log('Status Info:', data);
  } catch (e) {
    console.error(e);
  }
}
run();

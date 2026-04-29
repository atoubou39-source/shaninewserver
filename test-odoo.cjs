
const xmlrpc = require('xmlrpc');

const odooConfig = {
  url: "https://co.hakkal-est.com",
  db: "test",
  apiKey: "b1624329dc9a6ba356f92d9e76eabab105479791",
  username: "aburiyad",
  password: "test",
};

const getOdooCredential = () => odooConfig.apiKey || odooConfig.password;

const callOdoo = (service, method, ...args) => {
  return new Promise((resolve, reject) => {
    const baseUrl = odooConfig.url.trim().replace(/\/$/, "");
    const urlString = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const url = new URL(urlString);
    const isSecure = url.protocol === "https:";
    
    const options = { 
      host: url.hostname, 
      port: parseInt(url.port) || (isSecure ? 443 : 80), 
      path: `${url.pathname === "/" ? "" : url.pathname}/xmlrpc/2/${service}`.replace(/\/+/g, "/"),
      rejectUnauthorized: false
    };

    console.log(`[Odoo Call] ${service}.${method} to ${options.host}:${options.port}${options.path}`);
    
    const client = isSecure ? xmlrpc.createSecureClient(options) : xmlrpc.createClient(options);
    
    client.methodCall(method, args, (err, value) => {
      if (err) {
        if (err.message && err.message.includes('Invalid XML-RPC message')) {
          return reject(new Error(`Odoo server at ${baseUrl} is returning an invalid response (possibly a 502/504 error). This usually means the server is down or Cloudflare cannot reach it.`));
        }
        return reject(err);
      }
      resolve(value);
    });
  });
};

async function test() {
  try {
    console.log("Testing Odoo Authentication...");
    const uid = await callOdoo("common", "authenticate", odooConfig.db, odooConfig.username, getOdooCredential(), {});
    console.log("UID:", uid);

    console.log("Fetching recent orders...");
    const orders = await callOdoo("object", "execute_kw", odooConfig.db, uid, getOdooCredential(), "sale.order", "search_read", [
      []
    ], { fields: ["name", "state", "delivery_status", "invoice_status"], limit: 10, order: "id desc" });

    console.log("Recent Orders Analysis:");
    for (const order of orders) {
      console.log(`\n--- Order: ${order.name} ---`);
      console.log(`State: ${order.state}, Delivery: ${order.delivery_status}, Invoice: ${order.invoice_status}`);
      
      let isShipped = false;
      let isDelivered = false;
      
      const isFullyShipped = order.delivery_status === 'full' || order.delivery_status === 'shipped';
      const isBilled = ['invoiced', 'upselling'].includes(order.invoice_status || '');
      
      if (isBilled || order.state === 'done') {
          isDelivered = true;
          isShipped = true;
      } else if (isFullyShipped || order.invoice_status === 'to invoice') {
          isShipped = true;
          isDelivered = false;
      }
      
      console.log(`  Result -> Shipped: ${isShipped}, Delivered: ${isDelivered}`);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();

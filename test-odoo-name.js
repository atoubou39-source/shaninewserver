require('dotenv').config();
const xmlrpc = require('xmlrpc');

const odooConfig = {
  url: "https://co.hakkal-est.com",
  db: "test",
  username: "aburiyad",
  password: process.env.ODOO_PASSWORD || "test"
};

const client = xmlrpc.createSecureClient({
  host: "co.hakkal-est.com",
  port: 443,
  path: "/xmlrpc/2/common"
});

client.methodCall('authenticate', [odooConfig.db, odooConfig.username, odooConfig.password, {}], (err, uid) => {
  if (err) return console.error("Auth err:", err);
  
  const models = xmlrpc.createSecureClient({
    host: "co.hakkal-est.com",
    port: 443,
    path: "/xmlrpc/2/object"
  });

  const domain = [["name", "=", "ابو احمد"]];
  models.methodCall('execute_kw', [odooConfig.db, uid, odooConfig.password, 'res.partner', 'search_read', [domain], { fields: ["id", "name", "email", "phone", "user_id"] }], (err, results) => {
    if (err) return console.error("Search err:", err);
    console.log(JSON.stringify(results, null, 2));
  });
});

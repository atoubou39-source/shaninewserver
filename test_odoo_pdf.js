
const xmlrpc = require("xmlrpc");
const dotenv = require("dotenv");
dotenv.config();

const odooConfig = {
  url: "https://co.hakkal-est.com",
  db: "test",
  apiKey: "b1624329dc9a6ba356f92d9e76eabab105479791",
  username: "aburiyad"
};

const callOdoo = (service, method, ...args) => {
  return new Promise((resolve, reject) => {
    const url = new URL(odooConfig.url);
    const options = {
      host: url.hostname,
      port: 443,
      path: `/xmlrpc/2/${service}`,
      rejectUnauthorized: false
    };
    const client = xmlrpc.createSecureClient(options);
    client.methodCall(method, args, (err, value) => {
      if (err) return reject(err);
      resolve(value);
    });
  });
};

async function test() {
  try {
    const uid = await callOdoo("common", "authenticate", odooConfig.db, odooConfig.username, odooConfig.apiKey, {});
    console.log("UID:", uid);

    // Search for an invoice
    const invoices = await callOdoo("object", "execute_kw", odooConfig.db, uid, odooConfig.apiKey, 
      "account.move", "search", 
      [[["state", "=", "posted"], ["move_type", "=", "out_invoice"]]], 
      { limit: 1 }
    );

    if (invoices.length > 0) {
      const invoiceId = invoices[0];
      console.log("Invoice ID:", invoiceId);

      // Try report service
      // In Odoo 11+, the report service is often replaced by 'ir.actions.report'
      const report = await callOdoo("object", "execute_kw", odooConfig.db, uid, odooConfig.apiKey,
        "ir.actions.report", "render_qweb_pdf",
        ["account.report_invoice", [invoiceId]]
      );
      
      if (report) {
        console.log("PDF Data Length:", report[0].length);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

test();

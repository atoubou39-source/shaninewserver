
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

      // Search for attachment
      const attachments = await callOdoo("object", "execute_kw", odooConfig.db, uid, odooConfig.apiKey,
        "ir.attachment", "search_read",
        [[["res_model", "=", "account.move"], ["res_id", "=", invoiceId], ["mimetype", "=", "application/pdf"]]],
        { fields: ["name", "datas"], limit: 1 }
      );
      
      if (attachments.length > 0) {
        console.log("Attachment found:", attachments[0].name);
        console.log("Data length:", attachments[0].datas.length);
      } else {
        console.log("No PDF attachment found. Trying to generate one...");
        // In some Odoo versions, you can call 'ir.actions.report' 'render_qweb_pdf' via 'execute_kw' 
        // if you use a specific bypass or if it's exposed.
        // But since it failed before, I'll try to find if there is a 'message_main_attachment_id'
        const move = await callOdoo("object", "execute_kw", odooConfig.db, uid, odooConfig.apiKey,
          "account.move", "read",
          [[invoiceId], ["message_main_attachment_id"]]
        );
        console.log("Main attachment:", JSON.stringify(move[0].message_main_attachment_id));
      }
    }
  } catch (e) {
    console.error(e);
  }
}

test();

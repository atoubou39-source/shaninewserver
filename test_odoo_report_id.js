
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

    // Search for the report action
    const reports = await callOdoo("object", "execute_kw", odooConfig.db, uid, odooConfig.apiKey,
      "ir.actions.report", "search_read",
      [[["report_name", "=", "account.report_invoice"]]],
      { fields: ["id", "report_name", "report_type"] }
    );
    console.log("Reports:", JSON.stringify(reports));

  } catch (e) {
    console.error(e);
  }
}

test();

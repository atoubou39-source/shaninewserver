import axios from 'axios';

async function test() {
  const res = await axios.post('http://localhost:3000/api/auth/verify-odoo-customer', {
    email: "966505615241@hakkal.com",
    phone: "966505615241"
  });
  console.log("Local response:", JSON.stringify(res.data, null, 2));
}

test().catch(console.error);

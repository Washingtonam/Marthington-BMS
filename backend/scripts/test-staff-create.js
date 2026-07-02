import "dotenv/config";
import connectDB from "../src/config/db.js";

let fetchLib = globalThis.fetch;
if (!fetchLib) {
  const mod = await import('node-fetch');
  fetchLib = mod.default;
}

const random = () => Math.random().toString(36).slice(2, 8);

const run = async () => {
  await connectDB();

  const ownerEmail = `auto+${random()}@example.com`;

  console.log('Registering owner:', ownerEmail);

  const regRes = await fetchLib(`http://localhost:${process.env.PORT || 5001}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Auto Owner',
      email: ownerEmail,
      password: 'Test1234!',
      businessName: `AutoBiz ${random()}`,
      address: '123',
      phone: '000',
      industryType: 'retail'
    })
  });

  const regJson = await regRes.json().catch(() => ({}));
  console.log('Register status', regRes.status, regJson.message || 'ok');

  const token = regJson.token;
  if (!token) {
    console.error('No token from register, aborting');
    process.exit(1);
  }

  const staffEmail = `staff+${random()}@example.com`;
  console.log('Creating staff with email:', staffEmail);

  const staffRes = await fetchLib(`http://localhost:${process.env.PORT || 5001}/api/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Auto Staff', email: staffEmail, password: 'Pass1234!' })
  });

  const staffJson = await staffRes.text();
  console.log('Staff create status', staffRes.status, staffJson);
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });

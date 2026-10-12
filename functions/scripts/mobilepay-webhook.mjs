#!/usr/bin/env node
/**
 * Registers `mobilepayWebhook` with Vipps MobilePay — a one-off, run by hand
 * after the function is first deployed (CLAUDE.md decision 12).
 *
 *   node scripts/mobilepay-webhook.mjs register   # prints the secret to store
 *   node scripts/mobilepay-webhook.mjs list
 *   node scripts/mobilepay-webhook.mjs delete <id>
 *
 * Reads MOBILEPAY_CLIENT_ID, MOBILEPAY_CLIENT_SECRET,
 * MOBILEPAY_SUBSCRIPTION_KEY, MOBILEPAY_MSN, MOBILEPAY_ENV and
 * MOBILEPAY_WEBHOOK_URL from the environment. Nothing here is stored: the
 * secret MobilePay hands back is printed once, for
 * `firebase functions:secrets:set MOBILEPAY_WEBHOOK_SECRET`.
 */

const EVENTS = [
  'recurring.agreement-activated.v1',
  'recurring.agreement-stopped.v1',
  'recurring.agreement-expired.v1',
  'recurring.charge-failed.v1',
  'recurring.charge-creation-failed.v1',
];

function need(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set.`);
    process.exit(1);
  }
  return value;
}

const base =
  process.env.MOBILEPAY_ENV === 'production' ? 'https://api.vipps.no' : 'https://apitest.vipps.no';
const common = {
  'Ocp-Apim-Subscription-Key': need('MOBILEPAY_SUBSCRIPTION_KEY'),
  'Merchant-Serial-Number': need('MOBILEPAY_MSN'),
};

async function call(method, path, body) {
  const tokenResponse = await fetch(`${base}/accesstoken/get`, {
    method: 'POST',
    headers: {
      ...common,
      client_id: need('MOBILEPAY_CLIENT_ID'),
      client_secret: need('MOBILEPAY_CLIENT_SECRET'),
    },
  });
  if (!tokenResponse.ok) throw new Error(`Access token: ${tokenResponse.status} ${await tokenResponse.text()}`);
  const { access_token } = await tokenResponse.json();

  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...common, Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const [command, id] = process.argv.slice(2);

if (command === 'register') {
  const result = await call('POST', '/webhooks/v1/webhooks', {
    url: need('MOBILEPAY_WEBHOOK_URL'),
    events: EVENTS,
  });
  console.log(`Registered webhook ${result.id}.`);
  console.log('Store its secret — it is not shown again:');
  console.log(`  firebase functions:secrets:set MOBILEPAY_WEBHOOK_SECRET   # value: ${result.secret}`);
} else if (command === 'list') {
  console.log(JSON.stringify(await call('GET', '/webhooks/v1/webhooks'), null, 2));
} else if (command === 'delete' && id) {
  await call('DELETE', `/webhooks/v1/webhooks/${encodeURIComponent(id)}`);
  console.log(`Deleted webhook ${id}.`);
} else {
  console.error('Usage: mobilepay-webhook.mjs register | list | delete <id>');
  process.exit(1);
}

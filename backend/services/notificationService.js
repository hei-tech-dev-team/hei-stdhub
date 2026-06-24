const db = require("../db");
const webpush = require("web-push");

const CONCURRENCY_LIMIT = 10;

async function* batch(arr, size) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

async function iteratorToArray(iter) {
  const arr = [];
  for await (const item of iter) {
    arr.push(item);
  }
  return arr;
}

async function sendPushWithConcurrency(subscriptions, payload) {
  const results = [];
  for (const b of await iteratorToArray(batch(subscriptions, CONCURRENCY_LIMIT))) {
    const batchResults = await Promise.allSettled(
      b.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { auth: sub.auth_key || sub.auth, p256dh: sub.p256dh_key || sub.p256dh } },
            payload,
          )
          .catch(async (err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await db.query("DELETE FROM push_subscriptions WHERE endpoint=$1", [sub.endpoint]);
            }
          }),
      ),
    );
    results.push(...batchResults);
  }
  return results;
}

async function sendPushToUser(userId, { title, body, tag, url }) {
  try {
    const { rows } = await db.query(
      `SELECT endpoint, auth_key, p256dh_key
       FROM push_subscriptions WHERE user_id=$1`,
      [userId],
    );
    if (!rows.length) return;

    const payload = JSON.stringify({ title, body, tag, url, icon: "/logo.png" });
    await sendPushWithConcurrency(rows, payload);
  } catch (err) {
    console.error("sendPushToUser error:", err.message);
  }
}

async function sendPushToAll({ title, body, tag, url }) {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (endpoint) endpoint, auth_key, p256dh_key
       FROM push_subscriptions`,
    );
    if (!rows.length) return;

    const payload = JSON.stringify({ title, body, tag, url, icon: "/logo.png" });
    await sendPushWithConcurrency(rows, payload);
  } catch (err) {
    console.error("sendPushToAll error:", err.message);
  }
}

module.exports = { sendPushToUser, sendPushToAll };

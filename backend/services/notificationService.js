const db = require("../db");
const webpush = require("web-push");

const CONCURRENCY_LIMIT = 10;

async function* batchItems(arr, size) {
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

function pushWithTimeout(subscription, payload, ms = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("webpush timeout"));
    }, ms);
    webpush
      .sendNotification(subscription, payload)
      .then((r) => { clearTimeout(timer); resolve(r); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function sendPushWithConcurrency(subscriptions, payload) {
  const results = [];
  for (const chunk of await iteratorToArray(batchItems(subscriptions, CONCURRENCY_LIMIT))) {
    const batchResults = await Promise.allSettled(
      chunk.map((sub) =>
        pushWithTimeout(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          payload,
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [sub.endpoint]);
          }
        }),
      ),
    );
    results.push(...batchResults);
  }
  return results;
}

async function saveNotification(userId, type, title, body, data = {}) {
  try {
    await db.query(
      `INSERT INTO push_notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body || "", JSON.stringify(data)],
    );
  } catch (err) {
    console.error("Failed to save notification:", err.message);
  }
}

async function sendPushToUser(userId, { title, body, tag, url, type }) {
  const data = { title, body, tag, url, icon: "/logo.png" };
  await saveNotification(userId, type || "general", title, body, data);

  try {
    const { rows } = await db.query(
      `SELECT endpoint, auth_key AS "auth", p256dh_key AS "p256dh"
       FROM push_subscriptions WHERE user_id=$1`,
      [userId],
    );
    if (!rows.length) return;
    const payload = JSON.stringify(data);
    await sendPushWithConcurrency(rows, payload);
  } catch (err) {
    console.error("sendPushToUser error:", err.message);
  }
}

async function sendPushToAll({ title, body, tag, url, type }) {
  try {
    const { rows: userIds } = await db.query(
      `SELECT DISTINCT user_id FROM push_subscriptions`,
    );
    for (const { user_id } of userIds) {
      await saveNotification(user_id, type || "general", title, body, { title, body, tag, url, icon: "/logo.png" });
    }
  } catch (err) {
    console.error("sendPushToAll save error:", err.message);
  }

  try {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (endpoint) endpoint, auth_key AS "auth", p256dh_key AS "p256dh"
       FROM push_subscriptions`,
    );
    if (!rows.length) return;
    const payload = JSON.stringify({ title, body, tag, url, icon: "/logo.png" });
    await sendPushWithConcurrency(rows, payload);
  } catch (err) {
    console.error("sendPushToAll push error:", err.message);
  }
}

module.exports = { sendPushToUser, sendPushToAll, sendPushWithConcurrency, saveNotification };

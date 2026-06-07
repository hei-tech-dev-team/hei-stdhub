/**
 * seed.js — Générateur de données fictives pour HEI STDhub
 *
 * Usage : node seed.js [--users 500] [--messages 2000] [--clean]
 */

require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

// ─── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? parseInt(args[i + 1]) : def;
};
const CLEAN      = args.includes("--clean");
const USER_COUNT = getArg("--users", 500);
const MSG_COUNT  = getArg("--messages", 2000);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Données fictives ──────────────────────────────────────────────────────────

const PRENOMS = [
  "Andry", "Miora", "Hery", "Fara", "Tiana", "Lalaina", "Nivo", "Rado",
  "Zo", "Hasina", "Tsiry", "Narindra", "Vola", "Dina", "Mamy", "Liva",
  "Aina", "Soa", "Rija", "Tojo", "Fetra", "Haingo", "Bako", "Lanto",
  "Jean", "Marie", "Paul", "Sophie", "Lucas", "Emma", "Hugo", "Léa",
  "Nathan", "Clara", "Axel", "Jade", "Théo", "Camille", "Romain", "Alice",
];

const NOMS = [
  "Rakoto", "Rabe", "Randria", "Razafy", "Rajaonarison", "Ramanantsoa",
  "Rakotomalala", "Ratsimbazafy", "Andrianasolo", "Rakotondrabe",
  "Martin", "Bernard", "Dupont", "Moreau", "Simon", "Michel", "Leroy",
  "Girard", "Thomas", "Robert", "Petit", "Richard", "Durand", "Laurent",
];

const LEVELS = ["L1", "L2", "L3"];

const ROLES_POOL = [
  ...Array(80).fill("student"),
  ...Array(10).fill("alumni"),
  ...Array(8).fill("bde"),
  ...Array(2).fill("teacher"),
];

const MESSAGES_CONTENT = [
  "Salut, tu as eu les résultats du dernier exam ?",
  "Est-ce que quelqu'un a le cours de maths de la semaine dernière ?",
  "Le projet est à rendre pour quand exactement ?",
  "Je comprends pas le chapitre 3, quelqu'un peut m'expliquer ?",
  "On se retrouve à la biblio à 14h ?",
  "Quelqu'un a les corrections des TDs ?",
  "Le prof a annulé le cours de demain !",
  "Vous avez commencé le rapport de stage ?",
  "La salle de TP est disponible ce soir ?",
  "Quelqu'un peut m'envoyer les slides du cours ?",
  "Le délai pour la soumission a été repoussé à vendredi.",
  "Est-ce qu'on peut faire le projet en binôme ?",
  "J'ai pas compris la question 4 du devoir.",
  "Le serveur est down encore une fois...",
  "Vous utilisez quoi comme IDE pour Java ?",
  "React ou Vue pour le projet frontend ?",
  "PostgreSQL c'est vraiment puissant quand on l'utilise bien.",
  "Quelqu'un a un bon tuto pour Docker ?",
  "On a un partiel la semaine prochaine, vous avez révisé ?",
  "Les notes sont disponibles sur le portail.",
  "Bonne chance pour les soutenances de demain !",
  "Merci pour le partage 🙏",
  "Super explication, j'ai tout compris maintenant !",
  "C'est quoi la deadline pour le rendu PROG2 ?",
  "Le TP de réseau c'est annulé ou pas ?",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const rand     = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const slugify  = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");

function generateRef(role, index) {
  const n = String(index).padStart(5, "0");
  if (role === "teacher") return `PROF${String(index).padStart(3, "0")}`;
  if (role === "admin")   return `ADMIN${String(index).padStart(3, "0")}`;
  return `STD${n}`; // student, alumni, bde
}

function generateEmail(role, prenom, nom, index) {
  const p = slugify(prenom);
  const n = slugify(nom);
  if (role === "student" || role === "bde") {
    return `hei.${p}.${n}${index > 0 ? `.${index}` : ""}@gmail.com`;
  }
  return `${p}.${n}${index > 0 ? index : ""}@hei.mg`;
}

function generateLevel(role) {
  if (role === "student" || role === "bde") return rand(LEVELS);
  return null;
}

// ─── Seed users ────────────────────────────────────────────────────────────────

async function seedUsers(client) {
  console.log(`\n👥 Création de ${USER_COUNT} utilisateurs...`);

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const inserted = [];
  const usedEmails  = new Set();
  const usedPseudos = new Set();
  const usedRefs    = new Set();

  let teacherIdx = 10;
  let adminIdx   = 10;
  let studentIdx = 100;

  const BATCH_SIZE = 50;
  let batch = [];

  const flush = async () => {
    if (batch.length === 0) return;

    const values = batch.map((u, j) => {
      const b = j * 8;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7}::user_role,$${b+8}::user_level)`;
    }).join(", ");

    const params = batch.flatMap(u => [
      u.ref, u.nom, u.prenom, u.email, u.pseudo,
      u.passwordHash, u.role, u.level,
    ]);

    try {
      const { rows } = await client.query(
        `INSERT INTO users (ref, nom, prenom, email, pseudo, password, role, level)
         VALUES ${values}
         ON CONFLICT DO NOTHING
         RETURNING id`,
        params
      );
      inserted.push(...rows.map(r => r.id));
    } catch (err) {
      console.error("\n   ⚠️  Batch ignoré :", err.message);
    }
    batch = [];
  };

  for (let i = 0; i < USER_COUNT; i++) {
    const role   = rand(ROLES_POOL);
    const prenom = rand(PRENOMS);
    const nom    = rand(NOMS);
    const level  = generateLevel(role);

    let ref;
    do {
      if (role === "teacher") ref = generateRef("teacher", teacherIdx++);
      else if (role === "admin") ref = generateRef("admin", adminIdx++);
      else ref = generateRef(role, studentIdx++);
    } while (usedRefs.has(ref));
    usedRefs.add(ref);

    let email, emailIdx = 0;
    do {
      email = generateEmail(role, prenom, nom, emailIdx > 0 ? emailIdx : 0);
      emailIdx++;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    let pseudo, pseudoIdx = 0;
    do {
      pseudo = `${slugify(prenom)}.${slugify(nom)}${pseudoIdx > 0 ? pseudoIdx : ""}`;
      pseudoIdx++;
    } while (usedPseudos.has(pseudo));
    usedPseudos.add(pseudo);

    batch.push({ ref, nom, prenom, email, pseudo, passwordHash, role, level });

    if (batch.length >= BATCH_SIZE) {
      await flush();
      process.stdout.write(`   ${inserted.length}/${USER_COUNT}\r`);
    }
  }
  await flush();

  console.log(`   ✓ ${inserted.length} utilisateurs créés`);
  return inserted;
}

// ─── Seed messages ─────────────────────────────────────────────────────────────

async function seedMessages(client, userIds) {
  console.log(`\n💬 Création de ${MSG_COUNT} messages...`);

  const GLOBAL_RATIO = 0.4;
  const BATCH_SIZE   = 100;
  let inserted = 0;

  for (let i = 0; i < MSG_COUNT; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, MSG_COUNT - i);
    const values = [];
    const params = [];
    let p = 1;

    for (let j = 0; j < batchSize; j++) {
      const isGlobal  = Math.random() < GLOBAL_RATIO;
      const senderId  = rand(userIds);
      const content   = rand(MESSAGES_CONTENT);
      const seen      = !isGlobal && Math.random() > 0.3;
      const createdAt = new Date(Date.now() - randInt(0, 30 * 24 * 60 * 60 * 1000));

      if (isGlobal) {
        values.push(`($${p++},$${p++},NULL,$${p++},TRUE,$${p++})`);
        params.push(senderId, content, seen, createdAt);
      } else {
        let receiverId;
        do { receiverId = rand(userIds); } while (receiverId === senderId);
        values.push(`($${p++},$${p++},$${p++},$${p++},FALSE,$${p++})`);
        params.push(senderId, receiverId, content, seen, createdAt);
      }
    }

    const valuesUnified = [];
    const paramsUnified = [];
    let pu = 1;

    for (let j = 0; j < batchSize; j++) {
      const isGlobal  = Math.random() < GLOBAL_RATIO;
      const senderId  = rand(userIds);
      const content   = rand(MESSAGES_CONTENT);
      const seen      = !isGlobal && Math.random() > 0.3;
      const createdAt = new Date(Date.now() - randInt(0, 30 * 24 * 60 * 60 * 1000));
      let receiverId  = null;

      if (!isGlobal) {
        do { receiverId = rand(userIds); } while (receiverId === senderId);
      }

      valuesUnified.push(`($${pu++},$${pu++},$${pu++},$${pu++},$${pu++},$${pu++})`);
      paramsUnified.push(senderId, receiverId, content, isGlobal, seen, createdAt);
    }

    await client.query(
      `INSERT INTO messages (sender_id, receiver_id, content, is_global, seen, created_at)
       VALUES ${valuesUnified.join(", ")}`,
      paramsUnified
    );

    inserted += batchSize;
    process.stdout.write(`   ${inserted}/${MSG_COUNT}\r`);
  }

  console.log(`   ✓ ${inserted} messages créés`);
}

// ─── Clean ─────────────────────────────────────────────────────────────────────

async function clean(client) {
  console.log("🧹 Nettoyage des données fictives...");
  await client.query(`DELETE FROM messages WHERE sender_id IN (
    SELECT id FROM users WHERE ref ~ '^STD[0-9]{5,}$' AND pseudo NOT IN ('2spicy4uwu','ADMIN','PROFTEST')
  )`);
  await client.query(`DELETE FROM users
    WHERE pseudo NOT IN ('2spicy4uwu', 'ADMIN', 'PROFTEST')
    AND role != 'admin'`);
  console.log("   ✓ Tables nettoyées");
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  HEI STDhub — Seed de données fictives");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Utilisateurs : ${USER_COUNT}`);
  console.log(`  Messages     : ${MSG_COUNT}`);
  console.log(`  Clean avant  : ${CLEAN ? "oui" : "non"}`);
  console.log("═══════════════════════════════════════════════\n");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (CLEAN) await clean(client);

    const userIds = await seedUsers(client);

    const { rows: existing } = await client.query(`SELECT id FROM users`);
    const allIds = [...new Set([...userIds, ...existing.map(r => r.id)])];

    if (allIds.length < 2) {
      throw new Error("Pas assez d'utilisateurs pour créer des messages.");
    }

    await seedMessages(client, allIds);
    await client.query("COMMIT");

    console.log("\n═══════════════════════════════════════════════");
    console.log("  ✅ Seed terminé avec succès !");
    console.log("═══════════════════════════════════════════════\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Erreur durant le seed :", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
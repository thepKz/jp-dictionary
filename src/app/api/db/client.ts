import { MongoClient, Db, Collection, Document } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export type EntryDoc = {
  kanji: string;
  reading: string;
  meaning: string;
  example?: string;
  translation?: string;
  linkJP?: string;
  linkVN?: string;
  pos?: string[];
  antonyms?: string[];
  adjType?: 'na' | 'i';
  synonyms?: string[];
  highlightTerm?: string;
};

export type RatingDoc = {
  kanji: string;
  score: number; // 1-5
  ipHash: string;
  createdAt: Date;
};

export type FeedbackDoc = {
  email?: string;
  type: "bug" | "suggestion" | Array<"bug" | "suggestion">;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
};

const DB_NAME = process.env.MONGODB_DB || "jp_econ_dict";

export async function getDb(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  // Attempt connect; if password contains '@@', auto-fix to '%40@'
  let lastErr: unknown = null;
  try {
    if (!client) client = new MongoClient(uri, {});
    await client.connect();
  } catch (e) {
    lastErr = e;
    if (uri.includes('@@')) {
      const fixedUri = uri.replace('@@', '%40@');
      client = new MongoClient(fixedUri, {});
      await client.connect();
    } else {
      throw e;
    }
  }
  db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

async function ensureIndexes(database: Db) {
  const entries = database.collection<EntryDoc>("entries");
  await entries.createIndex({ kanji: 1 }, { unique: true });
  await entries.createIndex({ reading: 1 });
  await entries.createIndex({ meaning: "text" });

  const ratings = database.collection<RatingDoc>("ratings");
  await ratings.createIndex({ kanji: 1 });
  await ratings.createIndex({ ipHash: 1, kanji: 1 });

  const feedback = database.collection<FeedbackDoc>("feedback");
  await feedback.createIndex({ createdAt: -1 });
}

export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  if (!db) throw new Error("DB not initialized. Call getDb() first.");
  return db.collection<T>(name);
}



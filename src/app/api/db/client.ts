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
  adjType?: 'na' | 'i';
  highlightTerm?: string;
  stt?: number;
};

export type FeedbackDoc = {
  email?: string;
  type: "bug" | "suggestion" | Array<"bug" | "suggestion">;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
};

export type AdminLogDoc = {
  action: 'import' | 'export' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'email_reply';
  user: string; // admin username or IP
  details: {
    mode?: 'append' | 'replace';
    adjType?: 'na' | 'i' | 'auto';
    count?: number;
    fileName?: string;
    kanji?: string;
    email?: string;
    subject?: string;
  };
  ip?: string;
  userAgent?: string;
  timestamp: Date;
};

const DB_NAME = process.env.MONGODB_DB || "jp_econ_dict";

export async function getDb(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  // Attempt connect; if password contains '@@', auto-fix to '%40@'
  // let lastErr: unknown = null;
  try {
    if (!client) client = new MongoClient(uri, {});
    await client.connect();
  } catch (e) {
    // lastErr = e;
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
  await entries.createIndex({ adjType: 1 });

  const feedback = database.collection<FeedbackDoc>("feedback");
  await feedback.createIndex({ createdAt: -1 });

  const adminLogs = database.collection<AdminLogDoc>("admin_logs");
  await adminLogs.createIndex({ timestamp: -1 });
  await adminLogs.createIndex({ action: 1 });
  await adminLogs.createIndex({ user: 1 });
}

export function getCollection<T extends Document = Document>(name: string): Collection<T> {
  if (!db) throw new Error("DB not initialized. Call getDb() first.");
  return db.collection<T>(name);
}



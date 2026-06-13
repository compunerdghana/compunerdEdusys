import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface EduSysDB extends DBSchema {
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      operation: "insert" | "update" | "delete";
      payload: Record<string, unknown>;
      created_at: string;
      retries: number;
    };
    indexes: { "by-table": string };
  };
  students: {
    key: string;
    value: Record<string, unknown>;
  };
  attendance_records: {
    key: string;
    value: Record<string, unknown>;
    indexes: { "by-date": string; "by-class": string };
  };
  fee_payments: {
    key: string;
    value: Record<string, unknown>;
    indexes: { "by-student": string };
  };
  exam_scores: {
    key: string;
    value: Record<string, unknown>;
    indexes: { "by-student": string };
  };
  app_cache: {
    key: string;
    value: { key: string; data: unknown; cached_at: string };
  };
}

let dbPromise: Promise<IDBPDatabase<EduSysDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<EduSysDB>("edusys-v1", 1, {
      upgrade(db) {
        // Sync queue
        const queueStore = db.createObjectStore("sync_queue", { keyPath: "id" });
        queueStore.createIndex("by-table", "table");

        // Offline data stores
        db.createObjectStore("students", { keyPath: "id" });

        const attendanceStore = db.createObjectStore("attendance_records", { keyPath: "id" });
        attendanceStore.createIndex("by-date", "date");
        attendanceStore.createIndex("by-class", "class_id");

        const paymentsStore = db.createObjectStore("fee_payments", { keyPath: "id" });
        paymentsStore.createIndex("by-student", "student_id");

        const scoresStore = db.createObjectStore("exam_scores", { keyPath: "id" });
        scoresStore.createIndex("by-student", "student_id");

        db.createObjectStore("app_cache", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function queueOperation(
  table: string,
  operation: "insert" | "update" | "delete",
  payload: Record<string, unknown>,
) {
  const db = await getDB();
  const id = `${table}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.add("sync_queue", {
    id,
    table,
    operation,
    payload,
    created_at: new Date().toISOString(),
    retries: 0,
  });
  return id;
}

export async function getPendingCount() {
  const db = await getDB();
  return db.count("sync_queue");
}

export async function cacheData(key: string, data: unknown) {
  const db = await getDB();
  await db.put("app_cache", { key, data, cached_at: new Date().toISOString() });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const entry = await db.get("app_cache", key);
  return entry ? (entry.data as T) : null;
}

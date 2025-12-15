import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

let db: SQLiteDatabase | null = null;

export const getDB = async (): Promise<SQLiteDatabase> => {
    if (db) return db;
    // Open the DB asynchronously
    db = await openDatabaseAsync('agristack_offline.db');
    await initDB(db);
    return db;
};

const initDB = async (database: SQLiteDatabase) => {
    await database.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS parcels (
            id TEXT PRIMARY KEY,
            village_id TEXT,
            khasra_number TEXT,
            area_text TEXT,
            area_geom REAL,
            status TEXT,
            version INTEGER,
            updated_at TEXT,
            sync_status TEXT DEFAULT 'pending', -- pending, synced, conflict
            local_image_path TEXT,
            image_url TEXT
        );

        CREATE TABLE IF NOT EXISTS persons (
            id TEXT PRIMARY KEY,
            name_urdu TEXT,
            name_english TEXT,
            confidence REAL,
            consent_flags TEXT, -- JSON string
            updated_at TEXT,
            sync_status TEXT DEFAULT 'pending'
        );
    `);
    console.log('[DB] Initialized SQLite Database');
};

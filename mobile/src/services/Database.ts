import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: any;

if (Platform.OS !== 'web') {
    db = SQLite.openDatabaseSync('land_records.db');
} else {
    // Mock DB for Web
    console.log('Running on Web - Using Mock DB');
    const mockStorage: any = {
        parcels: [],
        persons: []
    };

    db = {
        execSync: (sql: string) => console.log('Mock execSync:', sql),
        runAsync: async (sql: string, args: any[] = []) => {
            console.log('Mock runAsync:', sql, args);
            if (sql.includes('INSERT OR REPLACE INTO parcels')) {
                const [id, village_id, khasra_number, area_text, area_geom, status, version, updated_at] = args;
                const existingIndex = mockStorage.parcels.findIndex((p: any) => p.id === id);
                const record = { id, village_id, khasra_number, area_text, area_geom, status, version, updated_at, sync_status: 'synced' };
                if (existingIndex >= 0) mockStorage.parcels[existingIndex] = record;
                else mockStorage.parcels.push(record);
            }
        },
        getAllAsync: async (sql: string, args: any[] = []) => {
            console.log('Mock getAllAsync:', sql, args);
            if (sql.includes('FROM parcels')) return mockStorage.parcels;
            if (sql.includes('FROM persons')) return mockStorage.persons;
            return [];
        },
        withTransactionAsync: async (callback: () => Promise<void>) => {
            await callback();
        }
    };
}

export const initDatabase = () => {
    if (Platform.OS !== 'web') {
        db.execSync(`
      CREATE TABLE IF NOT EXISTS parcels (
        id TEXT PRIMARY KEY,
        village_id TEXT,
        khasra_number TEXT,
        area_text TEXT,
        area_geom REAL,
        status TEXT,
        version INTEGER,
        updated_at TEXT,
        sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'conflict'
        local_image_path TEXT
      );

      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        name_urdu TEXT,
        name_english TEXT,
        confidence REAL,
        consent_flags TEXT, -- JSON string
        updated_at TEXT,
        sync_status TEXT DEFAULT 'synced'
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT, -- 'parcel', 'person'
        entity_id TEXT,
        action TEXT, -- 'create', 'update', 'delete'
        payload TEXT, -- JSON string
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Migration for existing tables (quick fix for dev)
        try {
            db.execSync('ALTER TABLE parcels ADD COLUMN local_image_path TEXT;');
        } catch (e) {
            // Ignore error if column already exists
        }
    }
    console.log('Database initialized');
};

export const getDB = () => db;

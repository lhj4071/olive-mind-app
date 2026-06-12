import { type SQLiteDatabase } from 'expo-sqlite';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS MoodLogs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      date      TEXT    NOT NULL,
      score     INTEGER NOT NULL,
      tags      TEXT,
      memo      TEXT
    );

    CREATE TABLE IF NOT EXISTS Medications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      drugId      TEXT    NOT NULL,
      dose        TEXT,
      doseVal     REAL,
      startDate   TEXT    NOT NULL,
      stopped     INTEGER NOT NULL DEFAULT 0,
      stopDate    TEXT,
      stopReason  TEXT
    );

    CREATE TABLE IF NOT EXISTS SideEffectLogs (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      medId   TEXT    NOT NULL,
      se      TEXT,
      date    TEXT    NOT NULL,
      memo    TEXT
    );

    CREATE TABLE IF NOT EXISTS NotificationSettings (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      type      TEXT,
      targetId  TEXT,
      time      TEXT,
      isActive  INTEGER,
      notifId   TEXT
    );

    CREATE TABLE IF NOT EXISTS BreathingLogs (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      date  TEXT    UNIQUE,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS AssessmentLogs (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      date    TEXT    NOT NULL,
      type    TEXT    NOT NULL,
      score   INTEGER NOT NULL,
      answers TEXT
    );

    CREATE TABLE IF NOT EXISTS SleepSettings (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      bedTime  TEXT    NOT NULL DEFAULT '23:00',
      wakeTime TEXT    NOT NULL DEFAULT '06:00',
      isActive INTEGER NOT NULL DEFAULT 1,
      notifId  TEXT
    );

    CREATE TABLE IF NOT EXISTS RoutineLogs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      date      TEXT    UNIQUE NOT NULL,
      completed TEXT    NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS RoutineItems (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      label       TEXT    NOT NULL,
      emoji       TEXT,
      targetCount INTEGER NOT NULL DEFAULT 1,
      orderIndex  INTEGER NOT NULL DEFAULT 0,
      isActive    INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS UserStats (
      key   TEXT    PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Safe migration: add supabase_id to RoutineItems for cross-platform UUID mapping.
  // ALTER TABLE fails with "duplicate column name" if column already exists — that's fine.
  try {
    await db.execAsync('ALTER TABLE RoutineItems ADD COLUMN supabase_id TEXT;');
  } catch { /* column already exists on subsequent app launches */ }
}

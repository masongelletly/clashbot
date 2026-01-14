import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Check if database connection is active
 */
export function isDatabaseConnected(): boolean {
  return client !== null && db !== null;
}

/**
 * Get connection status information
 */
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  clientState?: string;
  topologyState?: string;
  poolSize?: number;
}> {
  if (!client || !db) {
    return { connected: false };
  }

  try {
    const topology = (client as any).topology;
    const state = topology?.s?.state || "unknown";
    const poolSize = topology?.s?.pool?.totalConnectionCount || 0;

    return {
      connected: true,
      clientState: client ? "connected" : "disconnected",
      topologyState: state,
      poolSize,
    };
  } catch (error) {
    return {
      connected: false,
      clientState: "error",
    };
  }
}

export interface CardDocument {
  cardId: number;
  variant: "base" | "evo" | "hero";
  cardname: string;
  elo: number;
  matchups: number;
}

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }
  if (!dbName) {
    throw new Error("MONGODB_DB environment variable is not set");
  }

  try {
    // Configure connection pool to prevent connection bloat
    client = new MongoClient(uri, {
      maxPoolSize: 10,        // Maximum 10 connections in the pool
      minPoolSize: 1,         // Keep at least 1 connection alive
      maxIdleTimeMS: 30000,   // Close idle connections after 30 seconds
    });
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName} (maxPoolSize: 10, maxIdleTimeMS: 30000)`);
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

/**
 * Get the cards collection
 */
export async function getCardsCollection(): Promise<Collection<CardDocument>> {
  const database = await connectToDatabase();
  const collectionName = process.env.MONGODB_COLLECTION || "cardElo";
  return database.collection<CardDocument>(collectionName);
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("Disconnected from MongoDB");
  }
}


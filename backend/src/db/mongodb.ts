import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

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
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);
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
  const collectionName = process.env.MONGODB_COLLECTION || "cards";
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


import { MongoClient, type WithId } from "mongodb";

const DEFAULT_DB_NAME = "clash";
const DEFAULT_COLLECTION = "bot";
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB ?? DEFAULT_DB_NAME;
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION ?? DEFAULT_COLLECTION;


type StoredValueDocument = {
  key: string;
  value: string;
  createdAt: Date;
};

export type StoredValue = {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
};

export type StoredValueInput = {
  key: string;
  value: string;
};

export type CardNameEntry = {
  _id: string;
  cardName: string | null;
};

let cachedClient: MongoClient | null = null;
let cachedClientPromise: Promise<MongoClient> | null = null;

type CardNameDocument = {
  _id: unknown;
  cardName?: string;
};

const getMongoClient = async (): Promise<MongoClient> => {
  if (cachedClient) {
    return cachedClient;
  }
  if (!cachedClientPromise) {
    if (!MONGODB_URI) {
      throw new Error("Missing MONGODB_URI in environment");
    }
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    cachedClientPromise = client.connect();
  }
  cachedClient = await cachedClientPromise;
  return cachedClient;
};

const getValuesCollection = async () => {
  const client = await getMongoClient();
  return client
    .db(MONGODB_DB)
    .collection<StoredValueDocument>(MONGODB_COLLECTION);
};

export async function getCardNameEntry(): Promise<CardNameEntry | null> {
  const collection = await getValuesCollection();
  const doc = await collection.findOne<CardNameDocument>(
    {},
    { projection: { cardName: 1 } }
  );
  if (!doc) {
    return null;
  }
  return {
    _id: String(doc._id),
    cardName: "Braeden",
  };
}

import { MongoClient } from 'mongodb';

/**
 * Optional Mongo connection for ingestion logging. Fail-open matches starter behavior.
 */
export async function connectMongo(mongoUrl: string): Promise<MongoClient | null> {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('Mongo connected');
    return client;
  } catch (e) {
    console.warn('Mongo unavailable yet:', (e as Error).message);
    return null;
  }
}

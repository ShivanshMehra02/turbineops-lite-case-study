import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app';
import { loadEnv } from './config/env';
import { prisma } from './db/prisma';
import { connectMongo } from './services/mongo-client';
async function gracefulShutdown(server, mongoClient) {
    await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
    });
    if (mongoClient) {
        await mongoClient.close().catch(() => undefined);
    }
    await prisma.$disconnect();
}
async function bootstrap() {
    const env = loadEnv();
    const mongoClient = await connectMongo(env.MONGO_URL);
    const app = await createApp(env, mongoClient);
    const server = http.createServer(app);
    await new Promise((resolve) => {
        server.listen(env.PORT, () => {
            console.log(`Backend on http://localhost:${env.PORT}`);
            resolve();
        });
    });
    const shutdown = async (signal) => {
        console.info(`${signal} received, shutting down gracefully`);
        try {
            await gracefulShutdown(server, mongoClient);
        }
        catch (e) {
            console.error('Error during shutdown', e);
            process.exitCode = 1;
        }
        finally {
            process.exit();
        }
    };
    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
}
bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});

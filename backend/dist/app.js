import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { attachGraphQL } from './graphql/apollo';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';
import { registerSseRoutes, notifyPlan } from './modules/events/sse.routes';
import { healthRouter } from './modules/health/health.routes';
import { turbinesRouter } from './modules/turbines/turbines.routes';
export async function createApp(env, mongoClient) {
    const app = express();
    app.use(cors());
    app.use(express.json());
    const openapiPath = path.join(process.cwd(), 'openapi.yaml');
    const openapiDoc = yaml.parse(readFileSync(openapiPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
    app.use('/api', healthRouter);
    app.use('/api/turbines', turbinesRouter);
    registerSseRoutes(app);
    await attachGraphQL(app, {
        mongoClient,
        mongoDbName: env.MONGO_DB,
        notifyPlan,
    });
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

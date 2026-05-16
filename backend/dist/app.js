import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import { attachGraphQL } from './graphql/apollo';
import { createAuthenticateMiddleware } from './middleware/authenticate';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';
import { requirePermission } from './middleware/require-permission';
import { createAuthRouter } from './modules/auth/auth.routes';
import { sseEventsHandler, notifyPlan } from './modules/events/sse.routes';
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
    app.use('/api/auth', createAuthRouter(env));
    const authenticate = createAuthenticateMiddleware(env);
    app.use('/api/turbines', authenticate, turbinesRouter);
    app.get('/api/events', authenticate, requirePermission('read'), sseEventsHandler);
    app.use('/graphql', authenticate);
    await attachGraphQL(app, {
        env,
        mongoClient,
        mongoDbName: env.MONGO_DB,
        notifyPlan,
    });
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

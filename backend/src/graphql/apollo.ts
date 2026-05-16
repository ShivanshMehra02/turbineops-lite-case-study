import type { MongoClient } from 'mongodb';
import { ApolloServer } from 'apollo-server-express';
import { GraphQLError } from 'graphql';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Application } from 'express';
import type { Env } from '../config/env';
import type { GraphQLContext } from './context';
import { buildResolvers } from './resolvers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function attachGraphQL(
  app: Application,
  deps: {
    env: Env;
    mongoClient: MongoClient | null;
    mongoDbName: string;
    notifyPlan: (inspectionId: string) => void;
  },
): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.graphql');
  const typeDefs = readFileSync(schemaPath, 'utf8');

  const server = new ApolloServer({
    typeDefs,
    resolvers: buildResolvers({
      mongoClient: deps.mongoClient,
      mongoDbName: deps.mongoDbName,
      notifyPlan: deps.notifyPlan,
    }),
    context: ({ req }): GraphQLContext => ({
      authUser: req.authUser ?? null,
    }),
    formatError: (err) => {
      const code = err.extensions?.code;
      const safe =
        code === 'UNAUTHENTICATED' ||
        code === 'FORBIDDEN' ||
        code === 'BAD_USER_INPUT' ||
        code === 'NOT_FOUND' ||
        code === 'CONFLICT' ||
        code === 'INSPECTION_OVERLAP' ||
        code === 'VALIDATION_ERROR';
      if (safe) {
        return err;
      }
      if (deps.env.NODE_ENV === 'production') {
        return new GraphQLError('Internal server error', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
      return err;
    },
  });

  await server.start();
  // @ts-expect-error Apollo Server 3 typings use a nested @types/express copy; app is a valid Express instance at runtime.
  server.applyMiddleware({ app, path: '/graphql' });
}

import { ApolloServer } from 'apollo-server-express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildResolvers } from './resolvers';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export async function attachGraphQL(app, deps) {
    const schemaPath = path.join(__dirname, 'schema.graphql');
    const typeDefs = readFileSync(schemaPath, 'utf8');
    const server = new ApolloServer({
        typeDefs,
        resolvers: buildResolvers(deps),
    });
    await server.start();
    // @ts-expect-error Apollo Server 3 typings use a nested @types/express copy; app is a valid Express instance at runtime.
    server.applyMiddleware({ app, path: '/graphql' });
}

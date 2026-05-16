import { GraphQLError } from 'graphql';
export function parseGraphQLInput(schema, input) {
    const result = schema.safeParse(input ?? {});
    if (!result.success) {
        throw new GraphQLError('Invalid input', {
            extensions: { code: 'BAD_USER_INPUT', details: result.error.flatten() },
        });
    }
    return result.data;
}

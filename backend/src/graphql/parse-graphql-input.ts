import { GraphQLError } from 'graphql';
import type { ZodType, ZodTypeDef } from 'zod';

export function parseGraphQLInput<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw new GraphQLError('Invalid input', {
      extensions: { code: 'BAD_USER_INPUT', details: result.error.flatten() },
    });
  }
  return result.data;
}

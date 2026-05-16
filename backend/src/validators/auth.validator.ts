import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'password required'),
});

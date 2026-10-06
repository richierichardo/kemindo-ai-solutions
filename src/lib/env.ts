import { z } from "zod";

const serverEnvSchema = z.object({
  APP_ENV: z.enum(["demo", "development", "test", "production"]),
  DATABASE_URL: z.string().url().startsWith("postgres"),
  DEEPSEEK_API_URL: z.string().url(),
  DEEPSEEK_MODEL: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1),
  STORAGE_ROOT: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment. ${issues}`);
  }

  return result.data;
}

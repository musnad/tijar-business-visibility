import { z } from "zod";

export const businessProfileFormSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name."),
  location: z.string().trim().max(120).optional(),
  description: z.string().trim().max(800).optional(),
  categoryId: z.string().uuid().optional(),
  islamicModeEnabled: z.boolean(),
});

export type BusinessProfileFormValues = z.infer<typeof businessProfileFormSchema>;

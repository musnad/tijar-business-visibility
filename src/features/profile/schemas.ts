import { z } from "zod";

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name."),
  phone: z.string().trim().optional(),
  bio: z.string().trim().max(280).optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

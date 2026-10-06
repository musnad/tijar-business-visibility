import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const waitlistSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(100),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{6,24}$/, "Please enter a valid phone number."),
  businessName: z.string().trim().min(2, "Please enter your business name.").max(120),
  businessType: z.string().trim().min(2, "Please choose your business type."),
  city: z.string().trim().min(2, "Please enter your city.").max(80),
  language: z.string().trim().min(2, "Please choose a preferred language."),
});

type Errors = Record<string, string | undefined>;

function Field({ id, label, error, children }: { id: string; label: string; error: string | undefined; children: React.ReactNode }) {
  return <div><Label htmlFor={id}>{label}</Label><div className="mt-2">{children}</div>{error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>;
}

export function WaitlistForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = waitlistSchema.safeParse(Object.fromEntries(form));
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({}); setComplete(true);
  }
  if (complete) return <div className="rounded-[1.25rem] border border-border bg-card p-8 text-center" role="status"><CheckCircle2 className="mx-auto size-12 text-primary"/><h2 className="mt-5 text-3xl font-extrabold">You’re on the TIJAR list.</h2><p className="mx-auto mt-4 max-w-md leading-7 text-muted-foreground">We’re building a simpler way for everyday businesses to learn, run and grow.</p></div>;
  const fields = [
    ["fullName", "Full Name", "text", "Aisha Bello"], ["phone", "Phone Number", "tel", "+234 800 000 0000"], ["businessName", "Business Name", "text", "Aisha Foods"], ["city", "City", "text", "Kano"],
  ] as const;
  return <form onSubmit={submit} noValidate className="rounded-[1.25rem] border border-border bg-card p-6  sm:p-8"><div className="grid gap-5 sm:grid-cols-2">{fields.map(([id,label,type,placeholder]) => <Field key={id} id={id} label={label} error={errors[id]}><Input id={id} name={id} type={type} placeholder={placeholder} className="h-12" aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? `${id}-error` : undefined}/></Field>)}<Field id="businessType" label="Business Type" error={errors["businessType"]}><select id="businessType" name="businessType" defaultValue="" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" aria-invalid={Boolean(errors["businessType"])} aria-describedby={errors["businessType"] ? "businessType-error" : undefined}><option value="" disabled>Choose a business type</option><option>Food & Provisions</option><option>Fashion & Tailoring</option><option>Restaurant</option><option>Beauty</option><option>Electronics</option><option>Auto & Mechanics</option><option>Building Materials</option><option>General Retail</option><option>Artisan</option><option>Other</option></select></Field><Field id="language" label="Preferred Language" error={errors["language"]}><select id="language" name="language" defaultValue="" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" aria-invalid={Boolean(errors["language"])} aria-describedby={errors["language"] ? "language-error" : undefined}><option value="" disabled>Choose a language</option><option>English</option><option>Hausa</option><option>Yoruba</option><option>Igbo</option><option>Other</option></select></Field></div><Button type="submit" size="lg" className="mt-7  w-full">Join TIJAR</Button><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">This preview confirms your interest on this page only. No information is stored yet.</p></form>;
}

const contactSchema = z.object({ name: z.string().trim().min(2, "Please enter your name.").max(100), email: z.string().trim().email("Please enter a valid email.").max(255), message: z.string().trim().min(10, "Please tell us a little more.").max(1000) });
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({}); const [complete, setComplete] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const result = contactSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget))); if (!result.success) { const next: Errors = {}; for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message; setErrors(next); return; } setErrors({}); setComplete(true); }
  if (complete) return <div role="status" className="rounded-[1.25rem] border border-border bg-card p-8 text-center"><CheckCircle2 className="mx-auto size-11 text-primary"/><h2 className="mt-4 text-2xl font-extrabold">Message ready.</h2><p className="mt-3 text-muted-foreground">Thanks for reaching out. This website preview does not send messages yet.</p></div>;
  return <form onSubmit={submit} noValidate className="grid gap-5 rounded-[1.25rem] border border-border bg-card p-6  sm:p-8"><Field id="name" label="Full Name" error={errors["name"]}><Input id="name" name="name" className="h-12" aria-invalid={Boolean(errors["name"])} aria-describedby={errors["name"] ? "name-error" : undefined}/></Field><Field id="email" label="Email Address" error={errors["email"]}><Input id="email" name="email" type="email" className="h-12" aria-invalid={Boolean(errors["email"])} aria-describedby={errors["email"] ? "email-error" : undefined}/></Field><Field id="message" label="How can we help?" error={errors["message"]}><Textarea id="message" name="message" className="min-h-36" maxLength={1000} aria-invalid={Boolean(errors["message"])} aria-describedby={errors["message"] ? "message-error" : undefined}/></Field><Button type="submit" size="lg" className="h-12">Send Message</Button><p className="text-center text-xs text-muted-foreground">This preview does not send or store messages yet.</p></form>;
}
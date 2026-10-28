-- Personal voice: sample + preferred TTS voice for the signed-in shopkeeper.

alter table public.profiles
  add column if not exists preferred_tts_voice text,
  add column if not exists voice_sample_path text,
  add column if not exists custom_voice_id text,
  add column if not exists voice_enrolled_at timestamptz;

-- Storage for short voice samples (private; served via signed URLs if needed).
insert into storage.buckets (id, name, public)
values ('voice-samples', 'voice-samples', false)
on conflict (id) do nothing;

create policy "voice_samples_select_own"
  on storage.objects for select
  using (
    bucket_id = 'voice-samples'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

create policy "voice_samples_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-samples'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

create policy "voice_samples_update_own"
  on storage.objects for update
  using (
    bucket_id = 'voice-samples'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

create policy "voice_samples_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'voice-samples'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

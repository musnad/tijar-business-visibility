-- Seed business categories (run after foundation migration)
insert into public.business_categories (name, slug, sort_order) values
  ('Fashion', 'fashion', 10),
  ('Tailoring', 'tailoring', 20),
  ('Food', 'food', 30),
  ('Restaurant', 'restaurant', 40),
  ('Provision', 'provision', 50),
  ('Electronics', 'electronics', 60),
  ('Agriculture', 'agriculture', 70),
  ('Livestock', 'livestock', 80),
  ('Beauty', 'beauty', 90),
  ('Transport', 'transport', 100),
  ('Logistics', 'logistics', 110),
  ('Building Materials', 'building-materials', 120),
  ('Auto Parts', 'auto-parts', 130),
  ('Professional Services', 'professional-services', 140),
  ('Digital Services', 'digital-services', 150),
  ('Manufacturing', 'manufacturing', 160),
  ('Wholesale', 'wholesale', 170),
  ('Retail', 'retail', 180),
  ('Online Business', 'online-business', 190),
  ('Other', 'other', 999)
on conflict (slug) do nothing;

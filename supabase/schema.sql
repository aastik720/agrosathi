create extension if not exists "pgcrypto";
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  location text,
  land_size decimal,
  crop_types text[] default '{}',
  preferred_language text not null default 'hindi'
    check (preferred_language in ('hindi', 'punjabi', 'pahadi', 'english')),
  user_type text not null default 'farmer'
    check (user_type in ('farmer', 'buyer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crop_listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  crop_name text not null,
  quantity decimal not null,
  unit text not null check (unit in ('kg', 'quintal', 'ton')),
  expected_price decimal not null,
  harvest_date date,
  location text,
  image_url text,
  status text not null default 'active'
    check (status in ('active', 'sold', 'expired')),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists business_type text,
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists lat decimal,
  add column if not exists lng decimal;

alter table public.crop_listings
  add column if not exists variety_grade text,
  add column if not exists is_organic boolean not null default false,
  add column if not exists min_order_quantity decimal,
  add column if not exists min_order_unit text,
  add column if not exists harvest_status text not null default 'available_now',
  add column if not exists delivery_options text[] not null default '{}',
  add column if not exists additional_details text,
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists lat decimal,
  add column if not exists lng decimal,
  add column if not exists updated_at timestamptz not null default now();

alter table public.crop_listings
  drop constraint if exists crop_listings_status_check;

alter table public.crop_listings
  add constraint crop_listings_status_check
  check (status in ('active', 'under_negotiation', 'sold', 'expired', 'deleted'));

alter table public.crop_listings
  drop constraint if exists crop_listings_harvest_status_check;

alter table public.crop_listings
  add constraint crop_listings_harvest_status_check
  check (harvest_status in ('available_now', 'upcoming'));

create table if not exists public.buyer_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.crop_listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  offered_price decimal,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.scheme_applications (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  scheme_name text not null,
  scheme_url text,
  status text not null default 'eligible'
    check (status in ('eligible', 'applied', 'approved')),
  created_at timestamptz not null default now()
);

create table if not exists public.government_schemes (
  id text primary key,
  name text not null,
  name_hindi text,
  ministry text,
  description text,
  description_hindi text,
  benefit_amount decimal,
  benefit_type text,
  eligibility_criteria jsonb not null default '{}',
  apply_link text,
  icon text,
  state_specific boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.scheme_applications
  add column if not exists scheme_id text references public.government_schemes(id),
  add column if not exists application_status text not null default 'not_applied',
  add column if not exists application_date date,
  add column if not exists approval_date date,
  add column if not exists amount_received decimal not null default 0,
  add column if not exists rejection_reason text,
  add column if not exists documents_uploaded text[] not null default '{}',
  add column if not exists tracking_id text;

alter table public.scheme_applications
  drop constraint if exists scheme_applications_application_status_check;

alter table public.scheme_applications
  add constraint scheme_applications_application_status_check
  check (application_status in ('not_applied', 'applied', 'pending', 'approved', 'rejected'));

alter table public.scheme_applications
  drop constraint if exists scheme_applications_status_check;

alter table public.scheme_applications
  add constraint scheme_applications_status_check
  check (status in ('eligible', 'not_applied', 'applied', 'pending', 'approved', 'rejected'));

create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  is_voice boolean not null default false,
  ai_used text check (ai_used in ('ollama', 'gemini', 'feedback')),
  language text,
  created_at timestamptz not null default now()
);

create table if not exists public.disease_scans (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  crop_type text,
  image_url text,
  image_hash text,
  disease_name text,
  disease_name_hindi text,
  confidence decimal,
  is_healthy boolean not null default false,
  treatment_organic text,
  treatment_chemical text,
  treatment_prevention text,
  ai_advice text,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_history_farmer_created_at
  on public.chat_history(farmer_id, created_at desc);
create index if not exists idx_chat_history_session_id
  on public.chat_history(session_id);
create index if not exists idx_disease_scans_farmer_created_at
  on public.disease_scans(farmer_id, created_at desc);
create index if not exists idx_disease_scans_farmer_hash_created_at
  on public.disease_scans(farmer_id, image_hash, created_at desc)
  where image_hash is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_crop_listings_updated_at on public.crop_listings;
create trigger set_crop_listings_updated_at
before update on public.crop_listings
for each row
execute function public.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    location,
    preferred_language,
    user_type
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'location', ''),
    coalesce(new.raw_user_meta_data->>'preferred_language', 'hindi'),
    coalesce(new.raw_user_meta_data->>'user_type', 'farmer')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    location = excluded.location,
    preferred_language = excluded.preferred_language,
    user_type = excluded.user_type;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_user();

revoke execute on function private.handle_new_user() from public;
revoke execute on function private.handle_new_user() from anon;
revoke execute on function private.handle_new_user() from authenticated;

create index if not exists idx_crop_listings_farmer_id
  on public.crop_listings(farmer_id);
create index if not exists idx_crop_listings_status_created_at
  on public.crop_listings(status, created_at desc);
create index if not exists idx_crop_listings_crop_name
  on public.crop_listings(crop_name);
create index if not exists idx_profiles_user_type
  on public.profiles(user_type);
create index if not exists idx_buyer_inquiries_listing_id
  on public.buyer_inquiries(listing_id);
create index if not exists idx_buyer_inquiries_buyer_id
  on public.buyer_inquiries(buyer_id);
create index if not exists idx_scheme_applications_farmer_id
  on public.scheme_applications(farmer_id);
create unique index if not exists idx_scheme_applications_farmer_scheme
  on public.scheme_applications(farmer_id, scheme_id)
  where scheme_id is not null;
create index if not exists idx_government_schemes_state_specific
  on public.government_schemes(state_specific);

alter table public.profiles enable row level security;
alter table public.crop_listings enable row level security;
alter table public.buyer_inquiries enable row level security;
alter table public.scheme_applications enable row level security;
alter table public.government_schemes enable row level security;
alter table public.chat_history enable row level security;
alter table public.disease_scans enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Anyone authenticated can read active listings" on public.crop_listings;
drop policy if exists "Anyone can view active crop listings" on public.crop_listings;
create policy "Anyone authenticated can read active listings"
on public.crop_listings for select
to authenticated
using (status = 'active' or farmer_id = (select auth.uid()));

drop policy if exists "Farmers can create own listings" on public.crop_listings;
drop policy if exists "Farmers can insert their own listings" on public.crop_listings;
create policy "Farmers can create own listings"
on public.crop_listings for insert
to authenticated
with check (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can update own listings" on public.crop_listings;
drop policy if exists "Farmers can update their own listings" on public.crop_listings;
drop policy if exists "Farmers can delete their own listings" on public.crop_listings;
create policy "Farmers can update own listings"
on public.crop_listings for update
to authenticated
using (farmer_id = (select auth.uid()))
with check (farmer_id = (select auth.uid()));

drop policy if exists "Inquiry participants can read inquiries" on public.buyer_inquiries;
drop policy if exists "Buyers can view their own inquiries" on public.buyer_inquiries;
drop policy if exists "Farmers can view inquiries on their listings" on public.buyer_inquiries;
create policy "Inquiry participants can read inquiries"
on public.buyer_inquiries for select
to authenticated
using (
  buyer_id = (select auth.uid())
  or exists (
    select 1
    from public.crop_listings
    where crop_listings.id = buyer_inquiries.listing_id
      and crop_listings.farmer_id = (select auth.uid())
  )
);

drop policy if exists "Buyers can create own inquiries" on public.buyer_inquiries;
drop policy if exists "Buyers can insert inquiries" on public.buyer_inquiries;
create policy "Buyers can create own inquiries"
on public.buyer_inquiries for insert
to authenticated
with check (buyer_id = (select auth.uid()));

drop policy if exists "Inquiry participants can update inquiries" on public.buyer_inquiries;
drop policy if exists "Farmers can update inquiry status" on public.buyer_inquiries;
create policy "Inquiry participants can update inquiries"
on public.buyer_inquiries for update
to authenticated
using (
  buyer_id = (select auth.uid())
  or exists (
    select 1
    from public.crop_listings
    where crop_listings.id = buyer_inquiries.listing_id
      and crop_listings.farmer_id = (select auth.uid())
  )
);

drop policy if exists "Farmers can read own scheme applications" on public.scheme_applications;
drop policy if exists "Farmers can view their own scheme applications" on public.scheme_applications;
create policy "Farmers can read own scheme applications"
on public.scheme_applications for select
to authenticated
using (farmer_id = (select auth.uid()));

drop policy if exists "Authenticated users can read government schemes" on public.government_schemes;
create policy "Authenticated users can read government schemes"
on public.government_schemes for select
to authenticated
using (true);

drop policy if exists "Farmers can create own scheme applications" on public.scheme_applications;
drop policy if exists "Farmers can insert their own scheme applications" on public.scheme_applications;
create policy "Farmers can create own scheme applications"
on public.scheme_applications for insert
to authenticated
with check (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can update own scheme applications" on public.scheme_applications;
drop policy if exists "Farmers can update their own scheme applications" on public.scheme_applications;
create policy "Farmers can update own scheme applications"
on public.scheme_applications for update
to authenticated
using (farmer_id = (select auth.uid()))
with check (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can read own chat history" on public.chat_history;
create policy "Farmers can read own chat history"
on public.chat_history for select
to authenticated
using (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can insert own chat history" on public.chat_history;
create policy "Farmers can insert own chat history"
on public.chat_history for insert
to authenticated
with check (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can delete own chat history" on public.chat_history;
create policy "Farmers can delete own chat history"
on public.chat_history for delete
to authenticated
using (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can read own disease scans" on public.disease_scans;
create policy "Farmers can read own disease scans"
on public.disease_scans for select
to authenticated
using (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can insert own disease scans" on public.disease_scans;
create policy "Farmers can insert own disease scans"
on public.disease_scans for insert
to authenticated
with check (farmer_id = (select auth.uid()));

drop policy if exists "Farmers can update own disease scans" on public.disease_scans;
create policy "Farmers can update own disease scans"
on public.disease_scans for update
to authenticated
using (farmer_id = (select auth.uid()))
with check (farmer_id = (select auth.uid()));

insert into public.government_schemes (
  id, name, name_hindi, ministry, description, description_hindi,
  benefit_amount, benefit_type, eligibility_criteria, apply_link, icon, state_specific
) values
('pm-kisan', 'PM Kisan Samman Nidhi', 'प्रधानमंत्री किसान सम्मान निधि', 'Ministry of Agriculture', 'Direct income support for small and marginal farmer families.', 'छोटे और सीमांत किसानों के लिए सीधी आय सहायता।', 6000, 'year', '{"max_land_size":2,"states":"all"}', 'https://pmkisan.gov.in', '🏆', false),
('pm-fasal-bima', 'PM Fasal Bima Yojana', 'प्रधानमंत्री फसल बीमा योजना', 'Ministry of Agriculture', 'Crop insurance protection against natural calamities, pests, and disease.', 'प्राकृतिक आपदा, कीट और बीमारी से फसल बीमा सुरक्षा।', 0, 'coverage', '{"all_farmers":true,"notified_crops":true}', 'https://pmfby.gov.in', '🌾', false),
('kisan-credit-card', 'Kisan Credit Card', 'किसान क्रेडिट कार्ड', 'NABARD / Ministry of Finance', 'Affordable working capital credit for farm inputs and allied activities.', 'खेती और संबंधित गतिविधियों के लिए सस्ता ऋण।', 300000, 'credit_limit', '{"all_farmers":true}', 'https://www.myscheme.gov.in/schemes/kcc', '💳', false),
('soil-health-card', 'Soil Health Card Scheme', 'मृदा स्वास्थ्य कार्ड योजना', 'Ministry of Agriculture', 'Free soil testing and nutrient recommendation every three years.', 'हर 3 साल में मुफ्त मिट्टी जांच और खाद सलाह।', 0, 'free_service', '{"all_farmers":true}', 'https://soilhealth.dac.gov.in', '🧪', false),
('pkvy-organic', 'Paramparagat Krishi Vikas Yojana', 'परंपरागत कृषि विकास योजना', 'Ministry of Agriculture', 'Financial support for organic farming and certification clusters.', 'जैविक खेती और प्रमाणन के लिए सहायता।', 20000, 'hectare', '{"organic_required":true}', 'https://pgsindia-ncof.gov.in', '🌱', false),
('pmksy-irrigation', 'Pradhan Mantri Krishi Sinchai Yojana', 'प्रधानमंत्री कृषि सिंचाई योजना', 'Ministry of Agriculture', 'Micro-irrigation subsidy for water-efficient farming.', 'पानी बचाने वाली सिंचाई के लिए सब्सिडी।', 55, 'percent_subsidy', '{"all_farmers":true,"hp_subsidy":55}', 'https://pmksy.gov.in', '💧', false),
('hp-crop-diversification', 'Himachal Pradesh Crop Diversification Scheme', 'हिमाचल प्रदेश फसल विविधीकरण योजना', 'Government of Himachal Pradesh', 'Support for vegetable growers shifting to high-value crops.', 'सब्जी उगाने वाले किसानों के लिए उच्च मूल्य फसल सहायता।', 10000, 'hectare', '{"state":"Himachal Pradesh","crop_categories":["vegetable"]}', 'https://hpagriculture.com', '🥬', true),
('hp-jeevan-suraksha', 'Mukhyamantri Kisan Evam Khetihar Mazdoor Jeevan Suraksha Yojana', 'मुख्यमंत्री किसान एवं खेतिहर मजदूर जीवन सुरक्षा योजना', 'Government of Himachal Pradesh', 'Accident insurance coverage for farmers and farm workers in Himachal Pradesh.', 'हिमाचल के किसानों और खेतिहर मजदूरों के लिए दुर्घटना बीमा।', 500000, 'coverage', '{"state":"Himachal Pradesh"}', 'https://himachal.nic.in', '🛡️', true),
('national-horticulture-mission', 'National Horticulture Mission', 'राष्ट्रीय बागवानी मिशन', 'Ministry of Agriculture', 'Support for horticulture crops, cold storage, packaging, and post-harvest management.', 'बागवानी, कोल्ड स्टोरेज, पैकेजिंग और कटाई बाद प्रबंधन में सहायता।', 25000, 'one-time', '{"crops_any":["apple","peach","aadoo"]}', 'https://nhb.gov.in', '🍎', false),
('enam-registration', 'e-NAM Registration', 'ई-नाम पंजीकरण', 'Small Farmers Agribusiness Consortium', 'Free digital mandi registration for transparent selling.', 'पारदर्शी बिक्री के लिए मुफ्त डिजिटल मंडी पंजीकरण।', 0, 'free_registration', '{"all_farmers":true}', 'https://enam.gov.in', '🏪', false),
('antyodaya-anna', 'Antyodaya Anna Yojana', 'अंत्योदय अन्न योजना', 'Ministry of Consumer Affairs', 'Highly subsidized food grains for BPL families.', 'BPL परिवारों के लिए बहुत सस्ता अनाज।', 12000, 'year', '{"bpl_required":true}', 'https://nfsa.gov.in', '🍚', false),
('midday-meal-supplier', 'Mid-Day Meal Scheme Supplier', 'मिड-डे मील सप्लायर अवसर', 'Department of School Education', 'Supply fresh vegetables and grains to schools with direct payment.', 'स्कूलों को सब्जियां और अनाज सप्लाई करके सीधा भुगतान।', 18000, 'year', '{"crops_any":["potato","tomato","onion","capsicum","rice","wheat","maize"]}', 'https://pmposhan.education.gov.in', '🥗', false)
on conflict (id) do update
set
  name = excluded.name,
  name_hindi = excluded.name_hindi,
  ministry = excluded.ministry,
  description = excluded.description,
  description_hindi = excluded.description_hindi,
  benefit_amount = excluded.benefit_amount,
  benefit_type = excluded.benefit_type,
  eligibility_criteria = excluded.eligibility_criteria,
  apply_link = excluded.apply_link,
  icon = excluded.icon,
  state_specific = excluded.state_specific;

drop policy if exists "Farmers can delete own disease scans" on public.disease_scans;
create policy "Farmers can delete own disease scans"
on public.disease_scans for delete
to authenticated
using (farmer_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'disease-images',
  'disease-images',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crop-listing-images',
  'crop-listing-images',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Farmers can read own disease images" on storage.objects;
create policy "Farmers can read own disease images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'disease-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Farmers can upload own disease images" on storage.objects;
create policy "Farmers can upload own disease images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'disease-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Farmers can update own disease images" on storage.objects;
create policy "Farmers can update own disease images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'disease-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'disease-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Farmers can delete own disease images" on storage.objects;
create policy "Farmers can delete own disease images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'disease-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Farmers can read own crop listing images" on storage.objects;
create policy "Farmers can read own crop listing images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'crop-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Farmers can upload own crop listing images" on storage.objects;
create policy "Farmers can upload own crop listing images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'crop-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Farmers can update own crop listing images" on storage.objects;
create policy "Farmers can update own crop listing images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'crop-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'crop-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Farmers can delete own crop listing images" on storage.objects;
create policy "Farmers can delete own crop listing images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'crop-listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

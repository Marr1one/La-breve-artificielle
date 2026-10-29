-- À exécuter une fois dans Supabase > SQL Editor

create table if not exists publications (
  id               text primary key,          -- uin_idt_uin (identifiant AMF)
  company          text,
  isin             text,
  info_type        text,
  info_subtype     text,
  title            text,
  published_at     timestamptz,               -- uin_dat_amf
  language         text,
  document_url     text,
  raw              jsonb not null,            -- record brut de l'API, pour re-mapper sans refetch
  score            integer,
  selection_reason text,
  selected         boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists publications_published_at_idx on publications (published_at desc);
create index if not exists publications_company_idx on publications (company);
create index if not exists publications_info_type_idx on publications (info_type);
create index if not exists publications_selected_idx on publications (selected) where selected;

create table if not exists articles (
  id             uuid primary key default gen_random_uuid(),
  publication_id text not null unique references publications (id) on delete cascade,
  headline       text not null,
  chapo          text,
  body           text not null,
  status         text not null check (status in ('verifie', 'partiel', 'non_verifiable')),
  verification   jsonb not null default '{}'::jsonb,
  model          text,
  source_chars   integer,
  created_at     timestamptz not null default now()
);

create index if not exists articles_created_at_idx on articles (created_at desc);

-- Accès uniquement côté serveur (service role) : RLS activé sans policy publique.
alter table publications enable row level security;
alter table articles enable row level security;

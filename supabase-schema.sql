-- ==============================================================================
-- INBR - INTERNATIONAL BREEDS REGISTRY
-- Supabase Database Schema, Row Level Security (RLS) & Storage Buckets Configuration
-- ==============================================================================

-- 1. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('fotos-registros', 'fotos-registros', true),
  ('videos-camada', 'videos-camada', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public Read Access for Registry Photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-registros');

CREATE POLICY "Authenticated & Public Upload for Registry Photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fotos-registros');

CREATE POLICY "Public Read Access for Live Camada Videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos-camada');

CREATE POLICY "Upload for Live Camada Videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos-camada');

-- 2. Official Registry Table (Ejemplares Registrados)
CREATE TABLE IF NOT EXISTS public.ejemplares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(64) UNIQUE NOT NULL,
  microchip VARCHAR(32) UNIQUE,
  registered_name VARCHAR(255) NOT NULL,
  breed VARCHAR(120) NOT NULL,
  variety VARCHAR(80),
  gender VARCHAR(16) NOT NULL,
  color VARCHAR(120),
  date_of_birth DATE,
  breeder_name VARCHAR(255),
  owner_name VARCHAR(255) NOT NULL,
  country VARCHAR(80) NOT NULL,
  sire_name VARCHAR(255),
  sire_reg VARCHAR(64),
  dam_name VARCHAR(255),
  dam_reg VARCHAR(64),
  points INTEGER DEFAULT 0,
  titles TEXT[] DEFAULT '{}',
  photo_url TEXT,
  qr_code_url TEXT,
  status VARCHAR(32) DEFAULT 'ACTIVE_VALIDATED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for ejemplares
ALTER TABLE public.ejemplares ENABLE ROW LEVEL SECURITY;

-- Allow public verification reading
CREATE POLICY "Public read verified ejemplares" 
  ON public.ejemplares FOR SELECT 
  USING (true);

-- 3. Live Camadas Table (Camadas en Vivo)
CREATE TABLE IF NOT EXISTS public.camadas_en_vivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(64) UNIQUE NOT NULL,
  mother_reg VARCHAR(64) NOT NULL,
  father_reg VARCHAR(64) NOT NULL,
  breeder_name VARCHAR(255) NOT NULL,
  puppies_count INTEGER DEFAULT 0,
  males INTEGER DEFAULT 0,
  females INTEGER DEFAULT 0,
  birth_date DATE DEFAULT CURRENT_DATE,
  video_url TEXT NOT NULL,
  status VARCHAR(32) DEFAULT 'AUDITED_LIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.camadas_en_vivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and insert for live camadas"
  ON public.camadas_en_vivo FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Criaderos Directory Table
CREATE TABLE IF NOT EXISTS public.criaderos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  breed VARCHAR(120) NOT NULL,
  country VARCHAR(80) NOT NULL,
  city VARCHAR(120),
  whatsapp VARCHAR(64),
  verified BOOLEAN DEFAULT true,
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.criaderos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read criaderos" ON public.criaderos FOR SELECT USING (true);

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  try {
    const logoPath = join(__dirname, '..', 'public', 'pss_orange_logo.png');
    const fileBuffer = readFileSync(logoPath);

    console.log('Uploading logo...');
    console.log('File size:', fileBuffer.length, 'bytes');

    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload('pss_orange_logo.png', fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading logo:', error);
      process.exit(1);
    }

    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl('pss_orange_logo.png');

    console.log('Logo uploaded successfully!');
    console.log('Public URL:', urlData.publicUrl);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

uploadLogo();

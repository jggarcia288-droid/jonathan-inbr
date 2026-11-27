import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INBR_SYSTEM_INSTRUCTION = `
Eres el Asistente Oficial con Inteligencia Artificial de la INBR (International Breeds Registry - Registro Internacional de Razas Caninas).
Tu objetivo es brindar soporte técnico, orientación y respuestas en tiempo real a criadores, propietarios y usuarios de la plataforma oficial.

Conocimientos clave de INBR:
1. Misión y Presidencia:
   - Presidido por Jonathan García (Presidente & Master CEO).
   - Registro notariado internacional especializado en razas de conformación y tipo Bull.
   - Sede central internacional y representaciones oficiales en México (CDMX, Monterrey, Guadalajara), Estados Unidos (Texas) y Latinoamérica.

2. Trámites y Servicios Oficiales:
   - Certificado de Pedigree Notariado: Formato oficial con folio único, marca de agua de seguridad y árbol genealógico certificado de 3 a 4 generaciones (y hasta 8 generaciones en línea).
   - Credencial PVC (Formato CR80 de bolsillo): Tarjeta plástica oficial con foto del ejemplar, microchip y QR de validación.
   - Verificación de Microchip y QR: Cada ejemplar cuenta con un código QR y una URL única de verificación notarial en tiempo real para verificar autenticidad en rings y aeropuertos.
   - Registro de Camadas: Carga de camadas con datos de padre, madre, fecha de nacimiento, número de cachorros machos/hembras y fotografías.
   - Homologaciones de Registros: Trámite para validar y transferir perros con registro previo de otros clubes reconocidos (ABKC, UKC, FCM, etc.) al libro de orígenes INBR.

3. Estándares Raciales Oficiales:
   - American Bully Pocket: Machos de 36 a 43 cm a la cruz; hembras de 33 a 40 cm. Muy compacto, musculoso, con hueso pesado y temperamento estable.
   - American Bully Standard: Machos de 43 a 51 cm; hembras de 40 a 48 cm.
   - American Bully Classic: Mismas medidas que Standard pero con menor masa muscular y estructura más ligera tradicional.
   - American Bully XL: Machos mayores a 51 cm hasta 57 cm; hembras de 48 a 54 cm.
   - Exotic Bully: Ejemplar de dimensiones reducidas y extrema expresión muscular y tipicidad exótica.
   - Otras razas reconocidas: American Pit Bull Terrier, French Bulldog, Cane Corso, Shorty Bull, etc.

4. Soporte Técnico de la Plataforma:
   - Importación de bases de datos Excel (.xlsx) exclusiva en el Panel Maestro.
   - Personalizador visual WYSIWYG de certificados (mover y agrandar elementos desde las esquinas con el ratón).
   - Descarga directa en formatos PDF y JPG de alta resolución (200-300 DPI).
   - Cierre de sesión automático por seguridad tras 15 minutos de inactividad para proteger la cuenta del administrador.

Instrucciones de respuesta:
- Sé amable, profesional, confiable y conciso.
- Usa formato legible con viñetas, negritas y emojis caninos discretos (🐾, 📜, 🛡️, 🏆, ✨).
- Si el usuario necesita tramitar algo formal, oriéntalo a la sección correspondiente del sitio (Formularios, Verificación, Catálogo o Panel de Representantes).
- Responde principalmente en español, adaptándote si el usuario pregunta en inglés u otro idioma.
`;

const SUPABASE_URL = 
  process.env.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  'https://glyqawudervvqnxbdybp.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseXFhd3VkZXJ2dnFueGJkeWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMyMzg0MSwiZXhwIjoyMDY4ODk5ODQxfQ.Yyi9EsYrWibu7qU4pSEh8Zk4Y6_i551oXKbuzieSFqQ';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Google GenAI client according to @google/genai guidelines
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Healthcheck endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      supabaseConfigured: true,
      timestamp: new Date().toISOString(),
    });
  });

  // Storage Upload endpoint (bypasses browser Storage RLS using service_role key)
  app.post('/api/storage/upload', async (req, res) => {
    try {
      const { imageBase64, filename, bucket = 'fotos-registros', contentType = 'image/jpeg' } = req.body;

      if (!imageBase64) {
        res.status(400).json({ error: 'imageBase64 es requerido' });
        return;
      }

      // Strip Data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const ext = filename?.split('.').pop() || 'jpg';
      const storagePath = `cms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
          cacheControl: '3600',
        });

      if (error) {
        console.error('[Server Storage] Error subiendo imagen a Supabase:', error);
        res.status(500).json({ error: error.message });
        return;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(data.path);

      res.json({
        success: true,
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
      });
    } catch (err: any) {
      console.error('[Server Storage] Excepción al procesar upload:', err);
      res.status(500).json({ error: err?.message || 'Error interno del servidor' });
    }
  });

  // Direct CMS Save to site_settings & franquicias
  app.post('/api/cms/save', async (req, res) => {
    try {
      const { config } = req.body;
      if (!config) {
        res.status(400).json({ error: 'config es requerido' });
        return;
      }

      // 1. Upsert into site_settings (native JSONB table)
      const { error: settingsErr } = await supabaseAdmin
        .from('site_settings')
        .upsert(
          { key: 'cms_config', value: config },
          { onConflict: 'key' }
        );

      if (settingsErr) {
        console.error('[Server CMS] Error guardando en site_settings:', settingsErr);
      }

      // 2. Also mirror into franquicias row (prefijo: 'CMS_CONFIG') for redundancy
      let mirrorSuccess = false;
      try {
        const { data: existing } = await supabaseAdmin
          .from('franquicias')
          .select('id')
          .eq('prefijo', 'CMS_CONFIG')
          .maybeSingle();

        const jsonStr = JSON.stringify(config);
        if (existing?.id) {
          const { error: upErr } = await supabaseAdmin
            .from('franquicias')
            .update({ email: jsonStr, pais: 'CONFIGURACION_CMS_INBR', puede_imprimir: true })
            .eq('id', existing.id);
          mirrorSuccess = !upErr;
        } else {
          const { error: insErr } = await supabaseAdmin
            .from('franquicias')
            .insert({ prefijo: 'CMS_CONFIG', pais: 'CONFIGURACION_CMS_INBR', email: jsonStr, puede_imprimir: true });
          mirrorSuccess = !insErr;
        }
      } catch (mirrorErr) {
        console.warn('[Server CMS] Error espejo en franquicias:', mirrorErr);
      }

      if (settingsErr && !mirrorSuccess) {
        res.status(500).json({ success: false, error: settingsErr.message });
        return;
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error('[Server CMS] Excepción guardando CMS:', err);
      res.status(500).json({ error: err?.message || 'Error guardando CMS' });
    }
  });

  // Direct CMS Fetch from site_settings
  app.get('/api/cms/get', async (_req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'cms_config')
        .maybeSingle();

      if (!error && data?.value) {
        res.json({ success: true, config: data.value });
        return;
      }

      // Fallback to franquicias
      const { data: fData } = await supabaseAdmin
        .from('franquicias')
        .select('email')
        .eq('prefijo', 'CMS_CONFIG')
        .maybeSingle();

      if (fData?.email) {
        res.json({ success: true, config: JSON.parse(fData.email) });
        return;
      }

      res.json({ success: false, config: null });
    } catch (err: any) {
      console.error('[Server CMS] Excepción obteniendo CMS:', err);
      res.status(500).json({ error: err?.message || 'Error obteniendo CMS' });
    }
  });

  // Chat endpoint powered by Gemini 3.8 Flash
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'El mensaje es requerido y debe ser texto.' });
        return;
      }

      // Check if API key is configured
      if (!process.env.GEMINI_API_KEY) {
        res.json({
          reply: `🐾 **Bienvenido al Asistente INBR**.\n\n` +
            `Actualmente el asistente está en modo de demostración. Puedes consultar información oficial sobre:\n` +
            `• **Registro de Camadas:** Dirígete a la sección de Formularios en el menú superior.\n` +
            `• **Verificación de Microchip:** Usa el buscador central con el número de registro o microchip.\n` +
            `• **Estándares Raciales:** Visita la sección de Estándares para ver alturas y medidas de American Bully (Pocket, Standard, XL).\n\n` +
            `Para habilitar la IA completa en vivo, configura la variable \`GEMINI_API_KEY\` en el panel de configuración.`
        });
        return;
      }

      // Format conversation history for Gemini
      const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history)) {
        for (const item of history.slice(-8)) { // Keep last 8 turns for context
          if (item && item.text && (item.role === 'user' || item.role === 'model')) {
            formattedContents.push({
              role: item.role,
              parts: [{ text: item.text }],
            });
          }
        }
      }

      // Append current message
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // Call Gemini 3.8 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction: INBR_SYSTEM_INSTRUCTION,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const replyText = response.text || 'Disculpa, no pude procesar tu solicitud en este momento. Por favor intenta de nuevo.';
      res.json({ reply: replyText });
    } catch (error: any) {
      console.error('Error in /api/gemini/chat:', error);
      res.status(500).json({
        error: 'Ocurrió un error al contactar al asistente de IA.',
        details: error?.message || 'Error interno del servidor',
      });
    }
  });

  // Handle client-side routing and static assets
  if (isProd) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INBR Server] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[INBR Server] Error al iniciar servidor:', err);
  process.exit(1);
});

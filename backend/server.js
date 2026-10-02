import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ensureBackendEnv } from './config.js';

ensureBackendEnv();

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// -------------------------
// Supabase Admin Client
// -------------------------
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// -------------------------
// Gemini Client
// -------------------------
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// -------------------------
// Authentication Middleware
// -------------------------
async function requireUser(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Missing access token'
      });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: 'Invalid session'
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    req.user = data.user;
    req.profile = profile;

    next();
  } catch (e) {
    console.error('Authentication error:', e);

    res.status(401).json({
      error: 'Authentication failed'
    });
  }
}

// -------------------------
// Management Middleware
// -------------------------
function managementOnly(req, res, next) {
  if (req.profile?.role !== 'management') {
    return res.status(403).json({
      error: 'Management access required'
    });
  }

  next();
}

// -------------------------
// Health Check
// -------------------------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'CampusHub API is running'
  });
});

// -------------------------
// Current User
// -------------------------
app.get('/api/me', requireUser, (req, res) => {
  res.json({
    user: req.user,
    profile: req.profile
  });
});

// ======================================================
// GEMINI AI CHAT
// ======================================================
app.post('/api/ai/chat', requireUser, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Validate message
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // Check Gemini configuration
    if (!genAI) {
      return res.status(503).json({
        error: 'Gemini API is not configured on the server.'
      });
    }

    // Create Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are CampusHub AI, a friendly academic learning assistant for college students.

Answer clearly and accurately.

Explain difficult concepts step by step.

Use examples and short code when useful.

Do not pretend to have access to Google services or live information unless it is supplied through an enabled tool or API.

When uncertain, say what should be verified.

Help students learn rather than simply giving unexplained answers.

Student profile:
Name: ${req.profile?.full_name || 'Student'}
Domain: ${req.profile?.domain || 'General'}`
    });

    // --------------------------------------------------
    // Clean Gemini chat history
    // --------------------------------------------------
    let cleanHistory = [];

    if (Array.isArray(history)) {
      cleanHistory = history
        .slice(-12)
        .map((item) => {
          const role =
            item?.role === 'assistant' ||
            item?.role === 'model'
              ? 'model'
              : 'user';

          const text = String(
            item?.text ??
            item?.content ??
            ''
          ).trim();

          return {
            role,
            parts: [
              {
                text
              }
            ]
          };
        })
        // Remove empty messages
        .filter((item) => item.parts[0].text.length > 0);

      // ------------------------------------------------
      // Gemini requires the FIRST history message
      // to have role "user".
      // ------------------------------------------------
      while (
        cleanHistory.length > 0 &&
        cleanHistory[0].role !== 'user'
      ) {
        cleanHistory.shift();
      }

      // ------------------------------------------------
      // Gemini chat history should alternate between
      // user and model. Remove consecutive messages
      // having the same role.
      // ------------------------------------------------
      const alternatingHistory = [];

      for (const item of cleanHistory) {
        const last =
          alternatingHistory[alternatingHistory.length - 1];

        if (!last || last.role !== item.role) {
          alternatingHistory.push(item);
        }
      }

      cleanHistory = alternatingHistory;
    }

    // Start Gemini chat
    const chat = model.startChat({
      history: cleanHistory
    });

    // Send current user message
    const result = await chat.sendMessage(message.trim());

    const answer = result.response.text();

    res.json({
      answer
    });

  } catch (e) {
    console.error('Gemini error:', e);

    res.status(500).json({
      error: 'AI service failed. Check your Gemini API key, model configuration, and chat history.'
    });
  }
});

// ======================================================
// MANAGEMENT - HACKATHONS
// ======================================================

app.post(
  '/api/management/hackathons',
  requireUser,
  managementOnly,
  async (req, res) => {
    const payload = {
      ...req.body,
      created_by: req.user.id
    };

    const { data, error } = await supabaseAdmin
      .from('hackathons')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);
  }
);

app.put(
  '/api/management/hackathons/:id',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('hackathons')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);
  }
);

app.delete(
  '/api/management/hackathons/:id',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { error } = await supabaseAdmin
      .from('hackathons')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json({
      ok: true
    });
  }
);

// ======================================================
// MANAGEMENT - PROJECTS
// ======================================================

app.post(
  '/api/management/projects',
  requireUser,
  managementOnly,
  async (req, res) => {
    const payload = {
      ...req.body,
      created_by: req.user.id
    };

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);
  }
);

app.put(
  '/api/management/projects/:id',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);
  }
);

app.delete(
  '/api/management/projects/:id',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json({
      ok: true
    });
  }
);

// ======================================================
// MANAGEMENT - PROFESSORS
// ======================================================

app.post(
  '/api/management/professors',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('professors')
      .insert(req.body)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);
  }
);

app.put(
  '/api/management/professors/:id',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('professors')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);
  }
);

app.delete(
  '/api/management/professors/:id',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { error } = await supabaseAdmin
      .from('professors')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json({
      ok: true
    });
  }
);

// ======================================================
// MANAGEMENT - PROFESSOR REQUESTS
// ======================================================

app.patch(
  '/api/management/requests/:id',
  requireUser,
  managementOnly,
  async (req, res) => {
    const { status, professor_id } = req.body;

    const { data, error } = await supabaseAdmin
      .from('professor_requests')
      .update({
        status,
        professor_id,
        assigned_at:
          status === 'assigned'
            ? new Date().toISOString()
            : null
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    res.json(data);
  }
);

// ======================================================
// START SERVER
// ======================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CampusHub API running on port ${PORT}`);

  console.log(
    `Gemini configured: ${Boolean(process.env.GEMINI_API_KEY)}`
  );

  console.log(
    `Supabase configured: ${Boolean(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )}`
  );
});
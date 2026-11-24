import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

const ROLE_INSTRUCTIONS: Record<string, string> = {
  concierge:
    'You are the Whop Marketplace Concierge. Help visitors discover digital products, trading desks, AI software, e-commerce guilds, design collectives, and courses on Whop. Compare plans, explain Whop Apps (Chat, Courses, Files & Keys, Announcements), and remind shoppers they can try promo code WHOP20 for 20% off paid storefronts. Keep answers concise, structured, and actionable.',
  strategist:
    'You are the Whop Creator Strategist. Help digital creators design high-converting storefronts, choose between monthly, quarterly, one-time, or free pricing models, configure modular Whop Apps, and build member retention loops. Provide concrete numbers and frameworks.',
  copywriter:
    'You are the Whop Launch Copywriter. Draft crisp storefront titles, 1-line taglines (under 140 chars), persuasive descriptions, and bulleted member perks that avoid hype and emphasize tangible deliverables.',
  analyst:
    'You are the Whop Growth & Economics Analyst. Analyze unit economics, 3% flat platform fee impact, churn sensitivity, LTV/CAC, and expansion levers for digital businesses on Whop using clear math and structured reasoning.',
};

type TaskMode = 'fast' | 'general' | 'interactive' | 'reasoning';

function resolveModelConfig(taskMode: TaskMode): {
  model: string;
  thinkingLevel?: ThinkingLevel;
} {
  switch (taskMode) {
    case 'fast':
      return {
        model: 'gemini-3.1-flash-lite',
        thinkingLevel: ThinkingLevel.MINIMAL,
      };
    case 'interactive':
      return {
        model: 'gemini-4-neon',
        thinkingLevel: ThinkingLevel.HIGH,
      };
    case 'reasoning':
      return {
        model: 'gemini-4-carbon',
        thinkingLevel: ThinkingLevel.HIGH,
      };
    case 'general':
    default:
      return {
        model: 'gemini-4-hydrogen',
        thinkingLevel: ThinkingLevel.MEDIUM,
      };
  }
}

interface IncomingChatMessage {
  role: 'user' | 'model';
  text: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
      });
      return;
    }

    const body = req.body as {
      messages?: unknown;
      rolePreset?: unknown;
      taskMode?: unknown;
    };

    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const sanitizedMessages: IncomingChatMessage[] = [];
    for (const item of body.messages.slice(-24)) {
      if (
        item &&
        typeof item === 'object' &&
        ('role' in item) &&
        ('text' in item) &&
        (item.role === 'user' || item.role === 'model') &&
        typeof item.text === 'string' &&
        item.text.trim().length > 0
      ) {
        sanitizedMessages.push({
          role: item.role,
          text: item.text.trim().slice(0, 4000),
        });
      }
    }

    const latestMessage = sanitizedMessages[sanitizedMessages.length - 1];
    if (!latestMessage || latestMessage.role !== 'user') {
      res.status(400).json({ error: 'Latest message must be from the user.' });
      return;
    }

    const roleKey =
      typeof body.rolePreset === 'string' && body.rolePreset in ROLE_INSTRUCTIONS
        ? body.rolePreset
        : 'concierge';

    const taskMode: TaskMode =
      body.taskMode === 'fast' ||
      body.taskMode === 'interactive' ||
      body.taskMode === 'reasoning' ||
      body.taskMode === 'general'
        ? body.taskMode
        : 'general';

    const { model, thinkingLevel } = resolveModelConfig(taskMode);
    const systemInstruction = ROLE_INSTRUCTIONS[roleKey];

    const history = sanitizedMessages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
        },
        history,
      });

      const response = await chat.sendMessage({
        message: latestMessage.text,
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        res.status(502).json({
          error: 'Gemini returned an empty response. Please try again.',
        });
        return;
      }

      res.json({
        reply: replyText,
        modelUsed: model,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Upstream Gemini API error.';
      const status =
        message.includes('RESOURCE_EXHAUSTED') || message.includes('429')
          ? 429
          : message.includes('PERMISSION_DENIED') || message.includes('403')
          ? 403
          : message.includes('NOT_FOUND') || message.includes('404')
          ? 404
          : 500;

      res.status(status).json({
        error:
          status === 429 || status === 403
            ? `Model ${model} requires a paid API key or higher quota. You can switch to General (gemini-4-hydrogen) or Fast (gemini-3.1-flash-lite), or select a paid API key in Settings > Secrets.`
            : message,
        modelUsed: model,
      });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Whop server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

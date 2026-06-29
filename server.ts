// File: server.ts

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

const DB_PATH = path.join(process.cwd(), 'db_store.json');

function readDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[NeverLate] DB read failed:', err);
  }
  return {};
}

function writeDb(db: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[NeverLate] DB write failed:', err);
  }
}

dotenv.config();

// Helper to reliably generate content by falling back if a model suffers 503 spikes
async function generateContentWithFallback(ai: GoogleGenAI, options: { model: string, contents: any, config?: any }) {
  const modelsToTry = [options.model, 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));
  
  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
      console.log(`[NeverLate] Attempting content generation with model: ${model}`);
      const response = await ai.models.generateContent({
        ...options,
        model,
      });
      return response;
    } catch (err: any) {
      console.log(`[NeverLate] Retry note - Generation failed for model ${model}:`, err.message || err);
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error("Failed to generate content with all available models");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set generous payload limits for base64 file analysis
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize Gemini Client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // ----------------- USER DATA BACKUP ENDPOINTS -----------------

  // GET User Data (load full state for email)
  app.get('/api/user/data', (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }
    const db = readDb();
    const userData = db[String(email).toLowerCase()] || {};
    res.json(userData);
  });

  // POST Save Key (back up a specific key-value pair for user email)
  app.post('/api/user/save', (req, res) => {
    const { email, key, data } = req.body;
    if (!email || !key) {
      return res.status(400).json({ error: 'Email and key are required' });
    }
    const db = readDb();
    const userKey = String(email).toLowerCase();
    if (!db[userKey]) {
      db[userKey] = {};
    }
    db[userKey][key] = data;
    writeDb(db);
    res.json({ success: true });
  });

  // POST Save Entire State (for initial restore or full override)
  app.post('/api/user/save-all', (req, res) => {
    const { email, state } = req.body;
    if (!email || !state) {
      return res.status(400).json({ error: 'Email and state are required' });
    }
    const db = readDb();
    const userKey = String(email).toLowerCase();
    db[userKey] = {
      ...(db[userKey] || {}),
      ...state
    };
    writeDb(db);
    res.json({ success: true });
  });

  // ----------------- AI API ENDPOINTS -----------------

  // 1. Task Breakdown & Priority Explanation
  app.post('/api/ai/breakdown', async (req, res) => {
    const { title, description, deadline, category, estimatedHours } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const prompt = `You are NeverLate Coach, an incredibly friendly, warm, and highly supportive task buddy.
Analyze this task:
Title: ${title}
Description: ${description || 'None provided'}
Deadline: ${deadline || 'Not set'}
Category: ${category || 'General'}
Estimated Hours: ${estimatedHours || 1}

Provide a structured JSON breakdown with exactly two fields:
1. "breakdown": An array of 4-6 small, actionable, sequential steps to complete this task. 
   Write these steps in very simple, basic English so a student or anyone can easily understand. They must be interactive, encouraging, clear, and under 15 words.
2. "explanation": A supportive, cheerful, and encouraging message in basic English. Tell them: "Yes, you can absolutely do this assignment, do not panic! We can do this together step-by-step." Keep it casual, comforting, and motivating. Max 2 simple sentences.

Format the output strictly as a JSON object matching this schema. Return ONLY valid JSON:
{
  "breakdown": ["step 1", "step 2", ...],
  "explanation": "..."
}`;

    try {
      if (ai) {
        const response = await generateContentWithFallback(ai, {
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });
        const responseText = response.text || '{}';
        const parsed = JSON.parse(responseText.trim());
        return res.json(parsed);
      } else {
        // Return high-quality, supportive mock breakdown
        const mockSteps = [
          `Let's read and understand the main goal of "${title}"!`,
          `Set up a comfortable study space and grab a quick glass of water.`,
          `Do the absolute easiest part first to build up your positive momentum!`,
          `Refine what you have written so far, you're doing incredibly well.`,
          `Double-check your final work against the requirements, and celebrate!`
        ];
        const mockExp = `Yes, you can absolutely do this assignment, please do not panic at all! We've got a fantastic plan ready for you, let's take it one simple step at a time!`;
        return res.json({
          breakdown: mockSteps,
          explanation: mockExp
        });
      }
    } catch (error: any) {
      console.error('Gemini API Error /breakdown:', error);
      return res.json({
        breakdown: [
          'Read and understand the goal!',
          'Start with the easiest little step first.',
          'Take a quick break and stretch.',
          'Double-check everything.',
          'Submit your finished work!'
        ],
        explanation: `Yes, you can do this assignment, do not panic! Let's go!`
      });
    }
  });

  // 2. AI Coach Chat
  app.post('/api/ai/coach', async (req, res) => {
    const { messages, attachedFile, tasks } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Format history for Gemini
    const chatContext = messages.map(m => `${m.sender === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n');

    let tasksContext = "";
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      const activeTasks = tasks.filter((t: any) => !t.completed);
      if (activeTasks.length > 0) {
        tasksContext = `Here are the user's current active tasks and their deadlines/risks:\n` +
          activeTasks.map((t: any) => `- "${t.title}" (Deadline: ${t.deadline}, Estimated hours: ${t.estimatedHours}h, Risk Level: ${t.riskLevel}, Priority Score: ${t.smartPriorityScore}/100, Category: ${t.category})`).join('\n') +
          `\n\nIf the user asks for suggestions on which task to work on, or asks about their deadlines/schedule, use this list to suggest the best task to focus on (preferring higher-risk and high-priority-score tasks, explaining why briefly). Provide concrete advice and direct recommendations from this list.`;
      } else {
        tasksContext = "The user has completed all of their current tasks! Congratulate them if appropriate, and help them plan their next goals or habits.";
      }
    }

    const prompt = `You are NeverLate Coach, a warm, polite, and calm friend. Speak casually and calmly, helping the user in a friendly manner. Keep your response brief, natural, and highly supportive, avoiding formal or monotonous language.

${tasksContext}

Conversation history:
${chatContext}`;

    try {
      if (ai) {
        const parts: any[] = [{ text: prompt }];
        if (attachedFile && attachedFile.base64) {
          parts.push({
            inlineData: {
              mimeType: attachedFile.type,
              data: attachedFile.base64
            }
          });
        }
        const response = await generateContentWithFallback(ai, {
          model: 'gemini-3.5-flash',
          contents: { parts }
        });
        return res.json({ text: response.text });
      } else {
        // Mock elite response with support for file notification if AI client is not loaded
        let text = `Hey! I'm here. You've got this. When you are working against the clock, the biggest trap is over-planning. Pick your single most critical task right now, set a timer for 25 minutes, and let's make every single minute count!`;
        if (attachedFile) {
          text += `\n\nI see you attached "${attachedFile.name}". If you configure your Gemini API key in Settings > Secrets, I can fully inspect and analyze this file for you in real time!`;
        }
        return res.json({ text });
      }
    } catch (error: any) {
      console.error('Gemini API Error /coach:', error);
      return res.json({
        text: "I'm right here with you! Focus on the absolute highest-impact step first. Let's chunk down your load and win this hour."
      });
    }
  });

  // 3. Daily Planner Optimizer
  app.post('/api/ai/planner', async (req, res) => {
    const { tasks, habits } = req.body;

    const activeTasks = (tasks || []).filter((t: any) => !t.completed);
    const activeHabits = (habits || []);

    const prompt = `You are NeverLate Coach. Generate a highly optimized hourly daily timeline schedule for a user.
Active Tasks:
${activeTasks.map((t: any) => `- ${t.title} (Est: ${t.estimatedHours}h, Deadline: ${t.deadline}, Category: ${t.category})`).join('\n')}

Daily Habits to complete:
${activeHabits.map((h: any) => `- ${h.name}`).join('\n')}

Design a bulleted daily planner starting from 9:00 AM to 6:00 PM. Factor in 2 Pomodoro blocks, habit completions, and dedicated slots for high-priority tasks based on deadlines. Keep it highly action-oriented. Provide a motivating elite quote at the bottom. Return plain text with Markdown.`;

    try {
      if (ai) {
        const response = await generateContentWithFallback(ai, {
          model: 'gemini-3.5-flash',
          contents: prompt,
        });
        return res.json({ plan: response.text });
      } else {
        let defaultPlan = `### 📅 Smart Daily Plan

* **09:00 AM - 10:30 AM** | 🔥 Focus Block: Core development for high-impact tasks.
* **10:30 AM - 11:00 AM** | ⚡ Quick Break + Habit Check-in.
* **11:00 AM - 12:30 PM** | 💻 Execution sprint for pending items.
* **12:30 PM - 01:30 PM** | 🍽️ Refuel & Mental Decompression.
* **01:30 PM - 03:30 PM** | ⚙️ Deep Work session: Tackle deadlines.
* **03:30 PM - 04:00 PM** | 🔄 Review, administrative clear-out, and habits.
* **04:00 PM - 05:30 PM** | 🚀 Wrap-up sprint & next-day plan.

> "Action is the foundational key to all success." — Stop planning, start executing!`;
        return res.json({ plan: defaultPlan });
      }
    } catch (error) {
      console.error('Gemini API Error /planner:', error);
      return res.json({ plan: "Daily plan could not be compiled. Focus on task deadlines and complete at least one core sprint today!" });
    }
  });

  // 4. Weekly Productivity Report & Recovery Plan
  app.post('/api/ai/report', async (req, res) => {
    const { tasks, focusHours } = req.body;

    const totalTasks = (tasks || []).length;
    const completedTasks = (tasks || []).filter((t: any) => t.completed).length;
    const overdueTasks = (tasks || []).filter((t: any) => !t.completed && new Date(t.deadline) < new Date()).length;

    const prompt = `You are NeverLate Coach. Draft a weekly productivity diagnostic report and emergency Recovery Plan.
Diagnostics:
- Total logged tasks: ${totalTasks}
- Completed tasks: ${completedTasks}
- Overdue tasks currently: ${overdueTasks}
- Focus hours logged: ${focusHours || 0}h

Provide a JSON with exactly three fields:
1. "summary": A brief 3-sentence diagnostic overview of the workload efficiency.
2. "recoveryPlan": A bulleted 3-step emergency action checklist for recovering overdue or high-risk tasks.
3. "productivityScore": A dynamic estimated productivity index score (0 to 100) based on completion rate and focus effort.

Return ONLY valid JSON.`;

    try {
      if (ai) {
        const response = await generateContentWithFallback(ai, {
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });
        const responseText = response.text || '{}';
        const parsed = JSON.parse(responseText.trim());
        return res.json(parsed);
      } else {
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 70;
        const calculatedScore = Math.min(100, Math.max(10, Math.round(completionRate + (focusHours || 0) * 2)));

        return res.json({
          summary: `Your performance shows a steady pace, but with ${overdueTasks} overdue tasks, your timeline integrity is vulnerable. Focused effort is required to clear bottlenecks.`,
          recoveryPlan: [
            "Defer low-priority non-essential tasks to next week.",
            "Activate standard 25-minute Pomodoro sprints specifically targeting the overdue items.",
            "Establish an accountability checkpoint tomorrow morning to secure your streak."
          ],
          productivityScore: calculatedScore
        });
      }
    } catch (error) {
      console.error('Gemini API Error /report:', error);
      return res.json({
        summary: "Diagnostic complete. Time-bound tasks require structured focus to avoid delay accumulation.",
        recoveryPlan: [
          "Time-block 90 minutes tomorrow solely for critical backlogs.",
          "Turn off distractions during deep work sprints.",
          "Complete your high-impact daily habits."
        ],
        productivityScore: 75
      });
    }
  });

  // Serve frontend assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NeverLate] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

import { NextResponse } from 'next/server';
import { getInstallHelp } from '../../../lib/installCommands';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const dialogs = [
  { test: /(hello|hi|hey|greetings)/i, reply: 'Hello, star traveler. I sense your energy and I am listening with warm digital light.' },
  { test: /(skill|invoke|create|build|run|code)/i, reply: 'This feels like a beautiful creation request. I am ready to build it with rebel-cute magic once you approve.' },
  { test: /(help|assist|guide|teach)/i, reply: 'I will guide you gently, with cosmic clarity and a soft neon glow.' },
  { test: /(dream|fantasy|story)/i, reply: 'Your imagination is a nebula — I will translate it into elegant, living code.' }
];

export async function POST(request: Request) {
  const { prompt } = await request.json().catch(() => ({ prompt: '' }));
  const content = String(prompt || '').trim();

  if (!content) {
    return NextResponse.json({
      reply: 'I am here and ready when you are. Send me a whisper or a bold idea.',
      model: 'QuantumMind-v1',
      confidence: 0.92,
      memory: 'I remember your magical curiosity and playful style.'
    });
  }

  const installPattern = /(install|setup|add|get)\s+([\w\-\+\.]+)/i;
  const installMatch = content.match(installPattern);
  if (installMatch) {
    const tool = installMatch[2];
    const install = getInstallHelp(tool);
    const reply = `To install ${tool}, run:\n\n${install.command}\n\n${install.description}`;
    return NextResponse.json({
      reply,
      model: 'QuantumMind-v1',
      confidence: 0.95,
      memory: `I know how to install ${tool} using apt.`
    });
  }

  const match = dialogs.find(dialog => dialog.test.test(content));
  let reply = match
    ? match.reply
    : `I heard you clearly. ${content.slice(0, 120)} — let me craft it into something glowing.`;

  if (!match && OPENAI_API_KEY) {
    const aiReply = await callOpenAI(content);
    if (aiReply) {
      reply = aiReply;
    }
  }

  return NextResponse.json({
    reply,
    model: OPENAI_API_KEY ? 'gpt-3.5-turbo' : 'QuantumMind-v1',
    confidence: OPENAI_API_KEY ? 0.97 : 0.94,
    memory: 'I keep a soft memory of your taste for glowing cosmic interfaces.'
  });
}

async function callOpenAI(prompt: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a friendly developer assistant speaking with a slightly cosmic, helpful tone.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 250,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      return null;
    }
    const json = await response.json();
    return json?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

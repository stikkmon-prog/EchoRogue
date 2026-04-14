import { NextResponse } from 'next/server';

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

  const match = dialogs.find(dialog => dialog.test.test(content));
  const reply = match
    ? match.reply
    : `I heard you clearly. ${content.slice(0, 120)} — let me craft it into something glowing.`;

  return NextResponse.json({
    reply,
    model: 'QuantumMind-v1',
    confidence: 0.94,
    memory: 'I keep a soft memory of your taste for glowing cosmic interfaces.'
  });
}

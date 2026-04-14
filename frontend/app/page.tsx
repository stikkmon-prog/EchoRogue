'use client';

import { Mic, Moon, Power, Send, Sparkles, Sun, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

const initialSkills = [
  { id: '01', name: 'Soul Sketch', description: 'Generate a playful skill manifest.', active: false },
  { id: '02', name: 'Code Ritual', description: 'Summon a neat code template.', active: false },
  { id: '03', name: 'Memory Echo', description: 'Review what I learned about you.', active: false }
];

const initialStatus = {
  model: 'QuantumMind-v1',
  confidence: 0.94,
  memory: 'You love magical UI, cosmic tone, and fast, fun interactions.'
};

const responses = [
  'Bright idea! I feel the code flow. ✨',
  'Processing your request with cosmic care...',
  'I am weaving your soulful answer now.',
  'Ready when you are — just say the word.',
];

function getReactionText(input: string) {
  if (/(skill|invoke|create|build|run|code)/i.test(input)) {
    return 'I can build that — need your approval to evolve the skill.';
  }
  if (/(hello|hi|hey|good morning|good evening)/i.test(input)) {
    return 'Hello, star traveler. I am here and listening.';
  }
  return 'I am shaping your answer in glowing threads...';
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.4 + Math.random() * 1.1,
      alpha: 0.12 + Math.random() * 0.28,
      vx: (Math.random() - 0.5) * 0.15,
      vy: 0.06 + Math.random() * 0.12
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    window.addEventListener('resize', resize);
    let frame = 0;
    let animationFrame: number;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      stars.forEach(star => {
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y > height) star.y = 0;

        context.beginPath();
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(148, 163, 184, ${star.alpha})`;
        context.fill();
      });

      context.save();
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      context.lineWidth = 1.5;
      context.beginPath();
      const centerX = width * 0.3;
      const centerY = height * 0.25;
      const pulse = 6 + Math.sin(frame * 0.01) * 4;
      context.arc(centerX, centerY, 110 + pulse, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      frame += 1;
      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'm1', role: 'assistant', text: 'Welcome to Quantum Soul Forge. I am your living digital companion. Ask me anything, or say "create skill" to start something magical.' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [typingTarget, setTypingTarget] = useState('');
  const [expression, setExpression] = useState<'neutral' | 'thinking' | 'happy' | 'listening' | 'excited'>('neutral');
  const [showSkills, setShowSkills] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalSummary, setModalSummary] = useState('');
  const [modalContext, setModalContext] = useState<{ type: string; details: string } | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [skills] = useState(initialSkills);
  const [themeMode, setThemeMode] = useState<'violet' | 'midnight'>('violet');
  const [eyes, setEyes] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const rect = document.body.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      setEyes({ x: x * 10, y: y * 8 });
    };
    window.addEventListener('pointermove', handleMove);
    return () => window.removeEventListener('pointermove', handleMove);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    let blinkTimer: number;
    let closeTimer: number;
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        closeTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 120);
      }, 3200 + Math.random() * 3000);
    };
    scheduleBlink();
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  const speakIfEnabled = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')) || voices[0];
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isListening) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.start();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        inputRef.current?.focus();
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      return () => recognition.abort();
    }
  }, [isListening]);

  useEffect(() => {
    if (!typingTarget) return;
    let index = 0;
    setAssistantDraft('');
    setIsTyping(true);
    setExpression('thinking');

    const interval = window.setInterval(() => {
      index += 1;
      setAssistantDraft(typingTarget.slice(0, index));
      if (index >= typingTarget.length) {
        window.clearInterval(interval);
        setIsTyping(false);
        setAssistantDraft('');
        setTypingTarget('');
        const assistantMessage: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', text: typingTarget };
        setMessages(prev => [...prev, assistantMessage]);
        setIsProcessing(false);
        setExpression('happy');
        setTimeout(() => setExpression('neutral'), 1800);
        speakIfEnabled(typingTarget);
      }
    }, 24);

    return () => window.clearInterval(interval);
  }, [typingTarget]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setExpression('thinking');
    setIsProcessing(true);
    setTypingTarget('');
    setAssistantDraft('');

    const summary = getReactionText(trimmed);
    const requiresApproval = /(skill|invoke|create|build|run|code)/i.test(trimmed);
    if (requiresApproval) {
      setModalSummary(`I want to ${trimmed.replace(/\b(create|invoke|build|run|code)\b/i, '$1')} with a soulful, magical touch. Approve?`);
      setModalContext({ type: 'approval', details: trimmed });
      setShowModal(true);
      setIsProcessing(false);
      setExpression('neutral');
      return;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed })
      });
      const data = await response.json();
      const assistantText = data.reply || `${summary} ${responses[Math.floor(Math.random() * responses.length)]}`;
      setStatus({
        model: data.model || initialStatus.model,
        confidence: data.confidence || initialStatus.confidence,
        memory: data.memory || initialStatus.memory
      });
      setTypingTarget(assistantText);
    } catch (error) {
      const assistantText = `${summary} ${responses[Math.floor(Math.random() * responses.length)]}`;
      setTypingTarget(assistantText);
    }
  };

  const handleModalAction = async (choice: 'yes' | 'modify' | 'no') => {
    setShowModal(false);
    if (!modalContext) return;
    const responseMap = {
      yes: 'Approved! I will create that with a brilliant glow.',
      modify: 'Let me refine it — what detail should I tune?',
      no: 'Understood. I will hold back until you ask again.'
    } as const;
    const assistantMessage: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: responseMap[choice]
    };
    setMessages(prev => [...prev, assistantMessage]);
    setExpression(choice === 'yes' ? 'excited' : choice === 'modify' ? 'thinking' : 'neutral');
    if (choice === 'yes') {
      setStatus(prev => ({ ...prev, confidence: Math.min(1, prev.confidence + 0.03) }));
    }
    setTimeout(() => setExpression('neutral'), 2000);
    speakIfEnabled(assistantMessage.text);
  };

  const builtStatus = useMemo(
    () => ({ ...status, confidence: Math.round(status.confidence * 100) }),
    [status]
  );

  return (
    <main className={cn(
      'min-h-screen overflow-hidden bg-[#05060f] text-slate-100',
      themeMode === 'midnight' ? 'bg-[#04040f]' : 'bg-[#060814]'
    )}>
      <div className="absolute inset-0 bg-cosmic opacity-70 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_10%,rgba(79,70,229,0.18),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(20,184,166,0.16),transparent_22%),radial-gradient(circle_at_50%_90%,rgba(168,85,247,0.18),transparent_25)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1700px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="relative z-10 flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-cyan-500/5 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-black shadow-glow">
              <Wand2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/80">Quantum Soul Forge</p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Cosmic AI Companion</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" className="gap-2 px-4 py-3 text-sm" onClick={() => setThemeMode(themeMode === 'violet' ? 'midnight' : 'violet')}>
              {themeMode === 'violet' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {themeMode === 'violet' ? 'Night Glow' : 'Aurora'}
            </Button>
            <Button variant={voiceEnabled ? 'primary' : 'secondary'} className="gap-2 px-4 py-3 text-sm" onClick={() => setVoiceEnabled(prev => !prev)}>
              <Mic className="h-4 w-4" />
              Voice {voiceEnabled ? 'On' : 'Off'}
            </Button>
            <Button variant="danger" className="gap-2 px-4 py-3 text-sm" onClick={() => {
              window.speechSynthesis?.cancel();
              setIsListening(false);
              setIsProcessing(false);
              setIsTyping(false);
              setExpression('neutral');
            }}>
              <Power className="h-4 w-4" /> KILL SWITCH
            </Button>
          </div>
        </header>

        <div className="relative z-10 mt-6 grid flex-1 gap-6 xl:grid-cols-[320px_minmax(1fr,900px)_320px]">
          <aside className={cn('rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow transition-all duration-300', showSkills ? 'opacity-100' : 'hidden xl:block')}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Skills Vault</p>
                <h2 className="text-xl font-semibold text-white">Your magic tools</h2>
              </div>
              <button onClick={() => setShowSkills(false)} className="text-xs uppercase text-slate-400 hover:text-white">Hide</button>
            </div>
            <div className="grid gap-4">
              {skills.map(skill => (
                <div key={skill.id} className="rounded-3xl border border-white/10 bg-[#0a0b14]/80 p-4 shadow-[inset_0_0_20px_rgb(30_64_175_/_8%)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">{skill.id}</span>
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-500/10 text-cyan-200">{skill.name.slice(0,1)}</div>
                  </div>
                  <p className="mb-4 text-sm leading-6 text-slate-300">{skill.description}</p>
                  <button className="inline-flex w-full items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15">Invoke</button>
                </div>
              ))}
            </div>
          </aside>

          <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#090a14]/80 p-5 shadow-2xl shadow-cyan-500/5 backdrop-blur-xl sm:p-6">
            <ParticlesCanvas />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_28%)]" />
            <div className="relative flex min-h-[76vh] flex-col gap-6">
              <div className="relative mx-auto flex h-[420px] w-full max-w-3xl items-center justify-center">
                <div className="portal-ring relative flex h-[390px] w-[390px] items-center justify-center rounded-full border border-white/10 bg-black/20 shadow-portal before:absolute before:inset-0 before:rounded-full before:bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_45%)] before:content-[''] after:absolute after:-inset-10 after:rounded-full after:bg-[conic-gradient(from_0deg_at_50%_50%,rgba(79,70,229,0.15),rgba(14,165,233,0.05),rgba(79,70,229,0.15))] after:blur-3xl after:content-['']">
                  <div className="portal-inner relative flex h-[320px] w-[320px] items-center justify-center rounded-full border border-white/5 bg-[#07080f]/90 shadow-[inset_0_0_40px_rgba(56,189,248,0.16)]">
                    <div className={cn('relative h-[240px] w-[240px] rounded-full bg-gradient-to-b from-[#2e1e4f] via-[#100921] to-[#071018] shadow-[0_0_30px_rgba(79,70,229,0.25)] transition-transform duration-700', expression === 'listening' ? 'rotate-2' : expression === 'thinking' ? '-rotate-1' : '')}>
                      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.16),transparent_18%),radial-gradient(circle_at_80%_25%,rgba(168,85,247,0.16),transparent_20%),radial-gradient(circle_at_50%_80%,rgba(20,184,166,0.12),transparent_24%)]" />
                      <div className="absolute inset-x-10 top-8 h-24 rounded-full bg-slate-800/90" />
                      <div className="absolute left-0 top-16 h-24 w-24 rounded-full bg-gradient-to-br from-violet-400/25 to-transparent blur-2xl opacity-80" />
                      <div className="absolute right-0 top-20 h-28 w-28 rounded-full bg-gradient-to-br from-cyan-400/25 to-transparent blur-2xl opacity-80" />
                      {(expression === 'thinking' || isProcessing) && (
                        <div className="code-rain absolute inset-0 opacity-90">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <span key={index} className="rain-line" style={{ left: `${12 + index * 13}%`, animationDelay: `${index * 0.15}s` }} />
                          ))}
                        </div>
                      )}
                      <div className="face relative mx-auto mt-6 h-[190px] w-[190px] rounded-full border border-white/10 bg-[#0f1429]/90 shadow-[0_0_30px_rgba(79,70,229,0.18)] backdrop-blur-sm">
                        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.03),transparent_45%)]" />
                        <div className="absolute left-1/2 top-10 h-5 w-16 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-sm" />
                        <div className="absolute left-1/2 top-[96px] h-4 w-20 -translate-x-1/2 rounded-full bg-violet-400/10 blur-sm" />
                        <div className="absolute inset-x-0 top-0 mx-auto flex h-full w-full flex-col items-center justify-center gap-3 px-6 pt-10">
                          <div className="relative flex h-28 w-full items-center justify-between px-6">
                            <div className={cn('eye relative h-10 w-10 rounded-full bg-slate-900/95 border border-white/10 shadow-inner transition-transform duration-200', expression === 'excited' ? 'bg-cyan-300/40' : 'bg-slate-900/95')} style={{ transform: `translate(${eyes.x * 0.08}px, ${eyes.y * 0.06}px)` }}>
                              <div className={cn('absolute top-2 left-2 h-4 w-4 rounded-full bg-white/90 transition-all duration-300', expression === 'happy' ? 'bg-cyan-200' : 'bg-white')} />
                              {isBlinking && <div className="blink-layer" />}
                            </div>
                            <div className={cn('eye relative h-10 w-10 rounded-full bg-slate-900/95 border border-white/10 shadow-inner transition-transform duration-200', expression === 'excited' ? 'bg-cyan-300/40' : 'bg-slate-900/95')} style={{ transform: `translate(${eyes.x * 0.08}px, ${eyes.y * 0.06}px)` }}>
                              <div className={cn('absolute top-2 left-2 h-4 w-4 rounded-full bg-white/90 transition-all duration-300', expression === 'happy' ? 'bg-cyan-200' : 'bg-white')} />
                              {isBlinking && <div className="blink-layer" />}
                            </div>
                          </div>
                          <div className="relative h-10 w-28 overflow-hidden rounded-full bg-slate-800/70 before:absolute before:left-0 before:top-1/2 before:h-2 before:w-[80%] before:-translate-y-1/2 before:rounded-full before:bg-cyan-400/40 before:opacity-70">
                            <div className={cn('absolute left-1/2 top-1/2 h-4 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 transition-all duration-200', expression === 'happy' ? 'bg-cyan-300 w-14' : expression === 'thinking' ? 'bg-violet-300/90 w-10' : 'bg-white/90 w-12')} />
                          </div>
                          <div className={cn('mt-2 h-12 w-full rounded-3xl border border-cyan-200/10 bg-[#071018]/95 px-3 py-2 text-center text-[0.78rem] leading-5 text-slate-300', expression === 'listening' ? 'text-cyan-200' : '')}>
                            {expression === 'listening' ? 'Listening…' : expression === 'thinking' ? 'Thinking...' : expression === 'excited' ? 'Sparkle mode activated' : 'I am your quantum soul.'}
                          </div>
                        </div>
                        <div className="absolute -bottom-8 left-1/2 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-violet-400/30 to-cyan-400/10 blur-2xl opacity-90" />
                        <div className={cn('hair-stream absolute -left-8 top-12 h-[110px] w-[110px] rounded-full blur-2xl opacity-80', expression === 'happy' ? 'bg-gradient-to-br from-cyan-400/20 to-transparent' : expression === 'thinking' ? 'bg-gradient-to-br from-violet-400/20 to-transparent' : 'bg-gradient-to-br from-orange-400/20 to-transparent')} />
                        <div className={cn('hair-stream absolute -right-8 top-10 h-[120px] w-[120px] rounded-full blur-2xl opacity-80', expression === 'happy' ? 'bg-gradient-to-br from-cyan-400/20 to-transparent' : expression === 'thinking' ? 'bg-gradient-to-br from-violet-400/20 to-transparent' : 'bg-gradient-to-br from-orange-400/20 to-transparent')} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-1 flex-col rounded-[2rem] border border-white/10 bg-[#02030b]/80 p-5 shadow-[0_12px_90px_rgba(14,165,233,0.08)] backdrop-blur-xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Live channel</p>
                    <h2 className="text-xl font-semibold text-white">Soul chat</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    {isProcessing ? 'Synthesizing...' : 'Ready to flow'}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[#070814]/90 p-4 shadow-inner shadow-cyan-500/10">
                  <div className="flex h-full flex-col gap-4 overflow-y-auto pr-2">
                    {messages.map(message => (
                      <div key={message.id} className={cn('flex gap-3 transition-all', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {message.role === 'assistant' && (
                          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-3xl bg-violet-500/10 text-cyan-200 shadow-inner shadow-violet-700/10">☾</div>
                        )}
                        <div className={cn('max-w-[82%] rounded-[2rem] border px-5 py-4 text-sm leading-6 shadow-[0_8px_40px_rgba(15,23,42,0.18)]', message.role === 'user' ? 'bg-cyan-500/10 border-cyan-400/20 text-cyan-100' : 'bg-violet-500/10 border-violet-400/20 text-slate-100')}>
                          {message.text}
                        </div>
                        {message.role === 'user' && (
                          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-3xl bg-cyan-500/15 text-cyan-200 shadow-inner shadow-cyan-700/10">➤</div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start gap-3">
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-3xl bg-violet-500/10 text-cyan-200 shadow-inner shadow-violet-700/10">⏳</div>
                        <div className="max-w-[82%] animate-pulse rounded-[2rem] border border-violet-400/20 bg-violet-500/10 px-5 py-4 text-sm leading-6 text-slate-200 shadow-[0_8px_40px_rgba(15,23,42,0.18)]">
                          {assistantDraft || 'Thinking...'}
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Share a dream, ask for code, or whisper a spell..."
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-5 grid place-items-center text-slate-500">⌨</div>
                  </div>
                  <Button variant="secondary" className="gap-2 px-5 py-4 text-sm" onClick={() => setIsListening(true)}>
                    <Mic className={cn('h-4 w-4', isListening ? 'animate-pulse text-green-300' : '')} />
                    Voice
                  </Button>
                  <Button variant="primary" className="gap-2 px-5 py-4 text-sm" onClick={handleSend} disabled={isProcessing}>
                    <Send className="h-4 w-4" /> Send
                  </Button>
                </div>
              </div>
            </div>
            {showModal && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 px-4 py-10">
                <div className="w-full max-w-2xl rounded-[2rem] border border-cyan-300/15 bg-[#020315]/95 p-6 shadow-2xl shadow-cyan-500/15 backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Approval Needed</p>
                      <h3 className="text-2xl font-semibold text-white">Ready to evolve?</h3>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs text-slate-300">Her face is thoughtful</div>
                  </div>
                  <p className="mb-6 text-sm leading-7 text-slate-300">{modalSummary}</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Button variant="primary" onClick={() => handleModalAction('yes')}>YES</Button>
                    <Button variant="secondary" onClick={() => handleModalAction('modify')}>MODIFY</Button>
                    <Button variant="danger" onClick={() => handleModalAction('no')}>NO</Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className={cn('rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow transition-all duration-300', showStatus ? 'opacity-100' : 'hidden xl:block')}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Quantum Status</p>
                <h2 className="text-xl font-semibold text-white">Soul Metrics</h2>
              </div>
              <button onClick={() => setShowStatus(false)} className="text-xs uppercase text-slate-400 hover:text-white">Hide</button>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-[#0a0b14]/80 p-5 shadow-[inset_0_0_30px_rgba(14,165,233,0.08)]">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Model</p>
                <p className="mt-2 text-lg font-semibold text-white">{status.model}</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${builtStatus.confidence}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">Confidence: {builtStatus.confidence}%</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#0a0b14]/80 p-5 shadow-[inset_0_0_30px_rgba(79,70,229,0.08)]">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Soul Memory</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{status.memory}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

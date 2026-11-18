import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info,
} from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { api } from '../services/api';
import type { AssistantConfig, QualificationResult } from '../types';
import { LeadStatusTag, formatDuration } from '../components/StatusBadge';

interface VoiceAgentPageProps {
  onOpenCallDetail: (callId: number) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const DEFAULT_CONFIG: AssistantConfig = {
  assistant_name: 'VoxLead Qualification Agent',
  description: 'Conversational AI specialist trained to qualify inbound and outbound software buyers.',
  voice_id: 'en-US-AriaNeural',
  language: 'en',
  greeting_message: "Hello! I'm the VoxLead AI assistant. Is this a good time to speak?",
  system_prompt:
    "You are VoxLead AI, a polite B2B sales qualification specialist. Uncover the caller's name, requirements, approximate budget, and purchase timeline without repeating questions.",
  max_duration_seconds: 300,
  auto_qualify: true,
};

export function VoiceAgentPage({ onOpenCallDetail }: VoiceAgentPageProps) {
  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedMsg, setConfigSavedMsg] = useState<string | null>(null);

  const [vapiStatus, setVapiStatus] = useState<{
    vapi_configured: boolean;
    vapi_public_configured: boolean;
    public_key: string | null;
    assistant_id: string | null;
    gemini_configured: boolean;
  } | null>(null);

  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [callActive, setCallActive] = useState(false);
  const [callMode, setCallMode] = useState<'vapi_live' | 'simulated_preview'>('simulated_preview');
  const [callStatusText, setCallStatusText] = useState('Ready to start');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [speechOutputEnabled, setSpeechOutputEnabled] = useState(true);
  const [listening, setListening] = useState(false);

  const [messages, setMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [sendingTurn, setSendingTurn] = useState(false);
  const [qualifying, setQualifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [completedResult, setCompletedResult] = useState<{
    qualification: QualificationResult;
    callId: number | null;
  } | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([api.getAssistantConfig(), api.getVoiceConfig()])
      .then(([cfg, vCfg]) => {
        setConfig(cfg);
        setVapiStatus(vCfg);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load voice configuration.'));

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {
          // ignore cleanup errors
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speakText = (text: string) => {
    if (!speechOutputEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = config.language === 'en' ? 'en-US' : config.language;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSavedMsg(null);
    setError(null);
    try {
      const updated = await api.updateAssistantConfig(config);
      setConfig(updated);
      setConfigSavedMsg('Assistant configuration saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const requestMicrophone = async (): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermission('denied');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission('granted');
      return true;
    } catch {
      setMicPermission('denied');
      return false;
    }
  };

  const startCall = async () => {
    setError(null);
    setCompletedResult(null);

    await requestMicrophone();

    try {
      const session = await api.startVoiceSession();
      setCallActive(true);
      setElapsedSeconds(0);

      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      if (session.mode === 'vapi_live' && session.public_key && session.assistant_id) {
        setCallMode('vapi_live');
        setCallStatusText('Connecting Vapi browser call...');
        const vapi = new Vapi(session.public_key);
        vapiRef.current = vapi;

        vapi.on('call-start', () => {
          setCallStatusText('Live Vapi Voice Call Connected');
        });
        vapi.on('message', (msg: Record<string, unknown>) => {
          if (msg.type === 'transcript' && msg.transcriptType === 'final' && typeof msg.transcript === 'string') {
            const role = msg.role === 'assistant' ? 'assistant' : 'user';
            setMessages((prev) => [...prev, { role, content: msg.transcript as string }]);
          }
        });
        vapi.on('call-end', () => {
          setCallStatusText('Vapi call ended');
          setCallActive(false);
        });
        vapi.on('error', (e: unknown) => {
          setError(`Vapi call error: ${e instanceof Error ? e.message : 'Connection failed'}`);
          setCallActive(false);
        });

        setMessages([{ role: 'assistant', content: config.greeting_message }]);
        await vapi.start(session.assistant_id);
      } else {
        setCallMode('simulated_preview');
        setCallStatusText('Simulated Browser Preview Active');
        const initialGreeting = config.greeting_message;
        setMessages([{ role: 'assistant', content: initialGreeting }]);
        speakText(initialGreeting);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start voice session.');
      setCallActive(false);
    }
  };

  const endCallAndQualify = async (currentMessages = messages) => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setListening(false);
    }
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {
        // ignore
      }
      vapiRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setCallActive(false);
    setCallStatusText('Call ended');

    const userTurns = currentMessages.filter((m) => m.role === 'user');
    if (userTurns.length === 0) {
      return;
    }

    const transcriptText = currentMessages
      .map((m) => `${m.role === 'assistant' ? 'AI' : 'Customer'}: ${m.content}`)
      .join('\n');

    if (!config.auto_qualify) return;

    setQualifying(true);
    setError(null);
    try {
      const res = await api.qualifyLead({
        transcript: transcriptText,
        duration: elapsedSeconds,
        call_status: callMode === 'vapi_live' ? 'Completed' : 'Simulated',
        lead_source: callMode === 'vapi_live' ? 'Vapi Browser Call' : 'Simulated Voice Preview',
        persist: true,
      });
      setCompletedResult({
        qualification: res.qualification,
        callId: res.call?.id ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call ended, but Gemini qualification failed.');
    } finally {
      setQualifying(false);
    }
  };

  const sendCustomerMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !callActive || sendingTurn) return;

    const updatedHistory = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(updatedHistory);
    setUserInput('');
    setSendingTurn(true);
    setError(null);

    try {
      const res = await api.voiceChatTurn({
        history: messages,
        user_message: trimmed,
        assistant_config: config,
      });
      const withReply = [...updatedHistory, { role: 'assistant' as const, content: res.reply }];
      setMessages(withReply);
      speakText(res.reply);

      if (res.should_end_call) {
        await endCallAndQualify(withReply);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI response.');
    } finally {
      setSendingTurn(false);
    }
  };

  const toggleVoiceInput = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setError('Browser speech recognition is unavailable in this browser. Type your response below.');
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = config.language === 'en' ? 'en-US' : config.language;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript || '';
      if (spoken.trim()) {
        sendCustomerMessage(spoken);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error && event.error !== 'no-speech') {
        setError(`Microphone recognition issue: ${event.error}. You can type below instead.`);
      }
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const runSampleScript = async () => {
    if (!callActive) return;
    await sendCustomerMessage(
      "Yes, I'm interested in purchasing CRM software for my business. My budget is around 50,000 rupees and I plan to buy within this month."
    );
  };

  return (
    <div className="space-y-6">
      {/* Vapi Integration Status Banner */}
      {vapiStatus && !vapiStatus.vapi_public_configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-950">
            <p className="font-semibold">Vapi Voice Credentials Not Configured — Simulated Browser Preview Active</p>
            <p className="mt-1 text-amber-900">
              Set <span className="font-mono">VAPI_API_KEY</span>, <span className="font-mono">VAPI_PUBLIC_KEY</span>, and{' '}
              <span className="font-mono">VAPI_ASSISTANT_ID</span> in your environment to enable live Vapi WebRTC calls.
              Until configured, this console runs a clearly-labelled Simulated Browser Preview using your microphone/text and live Google Gemini turns.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3 text-sm text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Assistant Configuration */}
        <form
          onSubmit={handleSaveConfig}
          className="xl:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#172554]">Assistant Configuration</h2>
            {configSavedMsg && (
              <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assistant Name</label>
            <input
              type="text"
              value={config.assistant_name}
              onChange={(e) => setConfig({ ...config, assistant_name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voice Profile</label>
              <select
                value={config.voice_id}
                onChange={(e) => setConfig({ ...config, voice_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en-US-AriaNeural">Aria (Professional Female)</option>
                <option value="en-US-GuyNeural">Guy (Calm Executive Male)</option>
                <option value="en-GB-SoniaNeural">Sonia (British Advisory)</option>
                <option value="jennifer-playht">Jennifer (Vapi PlayHT)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
              <select
                value={config.language}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en">English (en-US)</option>
                <option value="es" disabled>Spanish (Architecture ready)</option>
                <option value="fr" disabled>French (Architecture ready)</option>
                <option value="de" disabled>German (Architecture ready)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Greeting Message</label>
            <input
              type="text"
              value={config.greeting_message}
              onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">System Prompt</label>
            <textarea
              rows={4}
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Call Duration (sec)</label>
              <input
                type="number"
                min={30}
                max={1800}
                value={config.max_duration_seconds}
                onChange={(e) => setConfig({ ...config, max_duration_seconds: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 pt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_qualify}
                onChange={(e) => setConfig({ ...config, auto_qualify: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              Auto-qualify lead on call end
            </label>
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-sm font-semibold transition-colors min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            {savingConfig ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>

        {/* Right: Live Voice Call Console */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden">
            {/* Console Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-[#172554]">{config.assistant_name}</h2>
                  <span className="text-xs font-medium text-slate-500">
                    · {vapiStatus?.vapi_public_configured ? 'Vapi Live Ready' : 'Simulated Preview'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {callStatusText} · Mic:{' '}
                  {micPermission === 'granted'
                    ? 'Allowed'
                    : micPermission === 'denied'
                    ? 'Blocked (Text fallback enabled)'
                    : 'Pending check'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="font-mono text-base font-semibold text-[#172554] bg-slate-100 px-3 py-1.5 rounded-lg tabular-nums">
                  {formatDuration(elapsedSeconds)}
                </div>

                <button
                  type="button"
                  onClick={() => setSpeechOutputEnabled((v) => !v)}
                  aria-label={speechOutputEnabled ? 'Mute AI voice playback' : 'Unmute AI voice playback'}
                  className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 min-h-[42px] min-w-[42px] flex items-center justify-center"
                >
                  {speechOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {!callActive ? (
                  <button
                    type="button"
                    onClick={startCall}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors whitespace-nowrap min-h-[42px]"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Start Voice Demo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => endCallAndQualify()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors whitespace-nowrap min-h-[42px]"
                  >
                    <PhoneOff className="w-4 h-4" />
                    End Call
                  </button>
                )}
              </div>
            </div>

            {/* Transcript / Dialogue Viewport */}
            <div ref={chatScrollRef} className="h-[340px] overflow-y-auto p-5 sm:p-6 space-y-4 bg-[#F5F7FB]/60">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Mic className="w-5 h-5" />
                  </div>
                  <p className="font-display font-semibold text-slate-900">Ready to conduct a qualification call</p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Click &ldquo;Start Voice Demo&rdquo; to request microphone access, hear the AI greeting,
                    and converse using your voice or text. Ending the call runs Gemini lead qualification automatically.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#172554] text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      <p className="text-[11px] font-semibold opacity-75 mb-0.5">
                        {msg.role === 'user' ? 'Customer' : config.assistant_name}
                      </p>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))
              )}

              {sendingTurn && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs text-slate-500">
                    Thinking &amp; generating spoken response...
                  </div>
                </div>
              )}

              {qualifying && (
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3.5 text-xs text-indigo-900 font-medium">
                  Analyzing completed transcript with Google Gemini and saving qualified lead...
                </div>
              )}
            </div>

            {/* Interactive Voice / Text Input Controls */}
            <div className="p-4 bg-white border-t border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!callActive || callMode === 'vapi_live'}
                  onClick={toggleVoiceInput}
                  title="Speak into microphone"
                  className={`p-2.5 rounded-lg border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    listening
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40'
                  }`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  disabled={!callActive || callMode === 'vapi_live' || sendingTurn}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendCustomerMessage(userInput);
                    }
                  }}
                  placeholder={
                    callActive
                      ? callMode === 'vapi_live'
                        ? 'Speak directly into your microphone (Vapi Live)...'
                        : 'Speak with the mic button or type customer reply...'
                      : 'Start a call to begin conversation...'
                  }
                  className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />

                <button
                  type="button"
                  disabled={!callActive || callMode === 'vapi_live' || !userInput.trim() || sendingTurn}
                  onClick={() => sendCustomerMessage(userInput)}
                  className="px-4 py-2.5 rounded-lg bg-[#172554] hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium min-h-[44px] flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>

              {callActive && callMode === 'simulated_preview' && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Tip: Click the microphone to speak, or type a customer response.</span>
                  <button
                    type="button"
                    onClick={runSampleScript}
                    className="font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                  >
                    Insert sample buyer reply
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Post-Call Gemini Qualification Result Card */}
          {completedResult && (
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display font-bold text-slate-900">
                    Gemini Lead Qualification Complete
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Validated structured output persisted to Calls &amp; Leads
                  </p>
                </div>
                <LeadStatusTag status={completedResult.qualification.lead_status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Customer Name</p>
                  <p className="font-medium text-slate-900 mt-0.5">{completedResult.qualification.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Budget</p>
                  <p className="font-medium text-slate-900 mt-0.5 tabular-nums">{completedResult.qualification.budget}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Purchase Timeline</p>
                  <p className="font-medium text-slate-900 mt-0.5">{completedResult.qualification.purchase_timeline}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Interest Level</p>
                  <p className="font-medium text-slate-900 mt-0.5">{completedResult.qualification.interest_level}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Requirements</p>
                  <p className="text-slate-800 mt-0.5">{completedResult.qualification.customer_requirements}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Summary</p>
                  <p className="text-slate-800 mt-0.5">{completedResult.qualification.summary}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Recommended Follow-Up</p>
                  <p className="text-indigo-900 font-medium mt-0.5">
                    {completedResult.qualification.follow_up_recommendation}
                  </p>
                </div>
              </div>

              {completedResult.callId && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenCallDetail(completedResult.callId!)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Inspect Full Call Record <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

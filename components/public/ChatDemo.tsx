'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Conversation, ChatMessage } from '@/lib/demo-store';

function labelFor(role: ChatMessage['role']) {
  if (role === 'customer') return 'Cliente';
  if (role === 'staff') return 'Equipo';
  return 'Bot';
}

export default function ChatDemo() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedId = window.localStorage.getItem('prostrength-conversation-id');
    if (!savedId) return;

    let alive = true;
    async function load() {
      const res = await fetch(`/api/chat?conversationId=${savedId}`);
      if (!alive || !res.ok) return;
      const data = (await res.json()) as { conversation: Conversation };
      setConversation(data.conversation);
      setCustomerName(data.conversation.customerName);
      setCustomerContact(data.conversation.customerContact);
    }
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation?.messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation?.id,
          customerName,
          customerContact,
          text,
        }),
      });
      const data = (await res.json()) as { conversation?: Conversation; error?: string };
      if (res.ok && data.conversation) {
        setConversation(data.conversation);
        window.localStorage.setItem('prostrength-conversation-id', data.conversation.id);
        setText('');
      }
    } finally {
      setLoading(false);
    }
  }

  const messages = conversation?.messages ?? [];

  return (
    <section className="grid min-h-screen bg-neutral-950 text-white lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
      <div className="flex flex-col justify-between border-b border-white/10 bg-neutral-900 px-6 py-8 lg:border-b-0 lg:border-r lg:px-10">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-red-500">
            Pro Strength Irun
          </div>
          <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
            Asistente demo para clientes del gimnasio
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300">
            Responde dudas frecuentes sobre horarios, ubicación, equipamiento,
            tarifas, entrenamientos personalizados y contacto. Si el cliente pide
            hablar con una persona, el bot se pausa y el equipo puede responder
            desde el panel.
          </p>
        </div>

        <div className="mt-10 grid gap-3 text-sm text-neutral-300">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <span className="block text-neutral-500">Direccion</span>
            Letxumborro Hiribidea, 83, Irun
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <span className="block text-neutral-500">Contacto</span>
            +34 699 84 51 99
          </div>
          <a
            href="/login"
            className="inline-flex w-fit items-center rounded-lg border border-red-500/50 px-4 py-2 font-semibold text-red-200 transition hover:bg-red-500 hover:text-white"
          >
            Panel admin
          </a>
        </div>
      </div>

      <div className="flex min-h-screen flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-neutral-300">
            Nombre
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Cliente demo"
              className="mt-1 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-red-500"
            />
          </label>
          <label className="text-sm font-medium text-neutral-300">
            Email o telefono
            <input
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="cliente@email.com"
              className="mt-1 w-full rounded-md border border-white/10 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-red-500"
            />
          </label>
        </div>

        {conversation?.paused && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            El bot esta pausado en esta conversacion. El equipo respondera desde
            el panel.
          </div>
        )}

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto rounded-lg border border-white/10 bg-neutral-900 p-4"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-80 items-center justify-center text-center text-neutral-500">
              Escribe una pregunta para empezar la conversacion.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const own = message.role === 'customer';
                const staff = message.role === 'staff';
                return (
                  <div
                    key={message.id}
                    className={`flex ${own ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 ${
                        own
                          ? 'bg-red-600 text-white'
                          : staff
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-neutral-950'
                      }`}
                    >
                      <div className="mb-1 text-xs font-bold uppercase opacity-70">
                        {labelFor(message.role)}
                      </div>
                      {message.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={send} className="mt-4 flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pregunta sobre horarios, tarifas, entrenamientos..."
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </section>
  );
}

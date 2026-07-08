'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Conversation, ChatMessage } from '@/lib/demo-store';

function roleName(role: ChatMessage['role']) {
  if (role === 'customer') return 'Cliente';
  if (role === 'staff') return 'Equipo';
  return 'Bot';
}

function time(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export default function ConversationsDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0] ?? null,
    [conversations, selectedId],
  );

  async function load() {
    const res = await fetch('/api/conversations');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    const data = (await res.json()) as { conversations: Conversation[] };
    setConversations(data.conversations);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedId && conversations[0]) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  async function togglePaused(paused: boolean) {
    if (!selected) return;
    const res = await fetch(`/api/conversations/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
    if (res.ok) await load();
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    const res = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: reply }),
    });
    if (res.ok) {
      setReply('');
      await load();
    }
  }

  return (
    <div className="grid h-[calc(100vh-112px)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h1 className="text-xl font-black text-neutral-950">Conversaciones</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Registro temporal de la demo sin base de datos.
          </p>
        </div>

        <div className="h-full overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-neutral-500">Cargando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">
              Todavia no hay conversaciones. Escribe desde la portada para crear una.
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
                className={`block w-full border-b border-neutral-100 p-4 text-left transition ${
                  selected?.id === conversation.id ? 'bg-red-50' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-neutral-950">
                      {conversation.customerName}
                    </div>
                    <div className="truncate text-sm text-neutral-500">
                      {conversation.customerContact || 'Sin contacto'}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      conversation.paused
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {conversation.paused ? 'Pausado' : 'Bot activo'}
                  </span>
                </div>
                <div className="mt-3 truncate text-sm text-neutral-500">
                  {conversation.messages.at(-1)?.text}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col rounded-lg border border-neutral-200 bg-white">
        {selected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-4">
              <div>
                <h2 className="text-lg font-black text-neutral-950">{selected.customerName}</h2>
                <p className="text-sm text-neutral-500">
                  {selected.customerContact || 'Sin contacto'} · Actualizado {time(selected.updatedAt)}
                </p>
              </div>
              <button
                onClick={() => togglePaused(!selected.paused)}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition ${
                  selected.paused ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {selected.paused ? 'Reactivar bot' : 'Pausar bot'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50 p-4">
              <div className="space-y-3">
                {selected.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'customer' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'customer'
                          ? 'bg-white text-neutral-950'
                          : message.role === 'staff'
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-900 text-white'
                      }`}
                    >
                      <div className="mb-1 text-xs font-black uppercase opacity-60">
                        {roleName(message.role)} · {time(message.createdAt)}
                      </div>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-200 p-4">
              <label className="text-sm font-bold text-neutral-700">Responder como equipo</label>
              <div className="mt-2 flex gap-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-red-500"
                  placeholder="Escribe la respuesta al cliente..."
                />
                <button
                  onClick={sendReply}
                  className="rounded-lg bg-red-600 px-5 py-2 font-bold text-white transition hover:bg-red-500"
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-500">
            No hay conversaciones seleccionadas.
          </div>
        )}
      </section>
    </div>
  );
}

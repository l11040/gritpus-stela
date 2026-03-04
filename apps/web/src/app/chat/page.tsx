'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 16 }}>Chat with Claude</h1>
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 16,
          minHeight: 400,
          maxHeight: 600,
          overflowY: 'auto',
          marginBottom: 16,
          background: '#fafafa',
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: '#999' }}>메시지를 보내서 대화를 시작하세요.</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 6,
              background: msg.role === 'user' ? '#e3f2fd' : '#fff',
              border:
                msg.role === 'user'
                  ? '1px solid #90caf9'
                  : '1px solid #e0e0e0',
            }}
          >
            <strong>{msg.role === 'user' ? 'You' : 'Claude'}:</strong>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                margin: '4px 0 0',
                fontFamily: 'inherit',
              }}
            >
              {msg.content}
            </pre>
          </div>
        ))}
        {loading && <p style={{ color: '#666' }}>Claude가 생각 중...</p>}
        <div ref={messagesEndRef} />
      </div>
      {error && (
        <p style={{ color: 'red', marginBottom: 12 }}>Error: {error}</p>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #ccc',
            borderRadius: 6,
            fontSize: 16,
          }}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            padding: '10px 24px',
            background: loading ? '#999' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '전송 중...' : '전송'}
        </button>
      </form>
    </main>
  );
}

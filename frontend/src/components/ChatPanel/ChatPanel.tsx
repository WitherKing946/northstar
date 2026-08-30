import { useState, useRef, useEffect } from 'react';
import styles from './ChatPanel.module.css';
import { postChat } from '@/api/client';

interface ChatPanelProps {
  learnerId: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export function ChatPanel({ learnerId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setSending(true);

    try {
      const res = await postChat({ learner_id: learnerId, question: userMsg });
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.messageList}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.wrapperUser : styles.wrapperAssistant}`}>
            <div className={`${styles.message} ${msg.role === 'user' ? styles.msgUser : styles.msgAssistant}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className={`${styles.messageWrapper} ${styles.wrapperAssistant}`}>
            <div className={styles.typingIndicator}>
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputBar}>
        <input
          type="text"
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question..."
          disabled={sending}
        />
        <button className={styles.sendBtn} onClick={handleSend} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

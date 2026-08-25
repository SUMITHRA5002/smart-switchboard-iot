import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Clock
} from 'lucide-react';
import { sendAssistantMessage } from '../services/api';

const STARTER_QUESTIONS = [
  "Which appliance consumes the most energy?",
  "How can I reduce my electricity bill?",
  "What is my projected monthly bill?",
  "What is my current carbon footprint?",
  "Are there any active energy anomalies?",
  "Which appliance should I optimize first?"
];

export default function EnergyAssistant({ tariff = 7.0, emissionFactor = 0.82 }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hi! I'm your **Energy Assistant**. Ask me about your energy usage, electricity cost, savings opportunities, carbon footprint, or appliance consumption.",
      suggestedQuestions: [
        "Which appliance consumes the most energy?",
        "How can I reduce my electricity bill?",
        "What is my projected monthly bill?",
        "What is my current carbon footprint?"
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  async function handleSendMessage(textToSend) {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessageId = `user_${Date.now()}`;
    const userMsg = {
      id: userMessageId,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await sendAssistantMessage(text, tariff, emissionFactor);
      
      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: response.answer || "I've analyzed your telemetry data.",
        suggestedQuestions: response.suggested_questions || [],
        data: response.data || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Assistant error:', err);
      setErrorMsg(err.message);
      setMessages(prev => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Error: ${err.message || 'Unable to connect to energy assistant engine.'}`,
          suggestedQuestions: STARTER_QUESTIONS.slice(0, 3),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: "Conversation cleared. Ask me anything about your switchboard telemetry!",
        suggestedQuestions: STARTER_QUESTIONS.slice(0, 4),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }

  function formatAssistantMessage(text) {
    if (!text) return '';
    const parts = text.split('\n');
    return parts.map((line, idx) => {
      const boldRegex = /\*\*(.*?)\*\*/g;
      const formattedLine = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          formattedLine.push(line.substring(lastIndex, match.index));
        }
        formattedLine.push(
          <strong key={`bold_${idx}_${match.index}`} style={{ color: '#fff', fontWeight: 700 }}>
            {match[1]}
          </strong>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        formattedLine.push(line.substring(lastIndex));
      }

      return (
        <p key={idx} style={{ margin: '4px 0', minHeight: line.trim() === '' ? '8px' : 'auto' }}>
          {formattedLine.length > 0 ? formattedLine : line}
        </p>
      );
    });
  }

  return (
    <div className="page-container" style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Standardized Page Header Card */}
      <div className="page-header-card">
        <div className="page-header-title-group">
          <h2 className="page-header-title">
            <Bot size={22} color="#10b981" />
            AI-Powered Energy Assistant
          </h2>
          <p className="page-header-subtitle">
            Natural language conversational assistant grounded directly in your SQLite telemetry, forecasting, and appliance models
          </p>
        </div>

        <div className="page-header-actions">
          <button
            onClick={handleClearChat}
            className="btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
          >
            <RotateCcw size={13} />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Chat Conversation Thread */}
      <div className="glass-card" style={{
        minHeight: 460,
        maxHeight: 580,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '18px 20px'
      }}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: 5
              }}
            >
              {/* Message Bubble Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b' }}>
                {isUser ? (
                  <>
                    <span>You</span>
                    <Clock size={10} />
                    <span>{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <Bot size={12} color="#10b981" />
                    <span style={{ color: '#34d399', fontWeight: 600 }}>Energy Assistant</span>
                    <Clock size={10} />
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderTopRightRadius: isUser ? 2 : 'var(--radius-md)',
                  borderTopLeftRadius: !isUser ? 2 : 'var(--radius-md)',
                  background: isUser 
                    ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' 
                    : 'rgba(15, 23, 42, 0.9)',
                  color: isUser ? '#ffffff' : '#cbd5e1',
                  border: isUser 
                    ? '1px solid rgba(56, 189, 248, 0.3)' 
                    : '1px solid var(--border-subtle)',
                  fontSize: '0.86rem',
                  lineHeight: 1.55,
                  boxShadow: isUser 
                    ? '0 4px 14px rgba(2, 132, 199, 0.25)' 
                    : '0 4px 14px rgba(0, 0, 0, 0.2)'
                }}
              >
                {isUser ? msg.text : formatAssistantMessage(msg.text)}
              </div>

              {/* Suggested Follow-up Chips */}
              {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 4,
                  maxWidth: '90%'
                }}>
                  {msg.suggestedQuestions.map((sq, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSendMessage(sq)}
                      className="pill-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Sparkles size={11} />
                      {sq}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
            <div style={{
              width: 26,
              height: 26,
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={15} className="live-pulse" />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
              Analyzing live switchboard telemetry and calculating insights...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Question Starters Carousel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
          Suggested:
        </span>
        {STARTER_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(q)}
            className="pill-btn"
            style={{ whiteSpace: 'nowrap' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '6px 10px'
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question (e.g. Which appliance consumes the most energy?)..."
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            fontSize: '0.88rem',
            padding: '8px 10px'
          }}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="btn-primary"
          style={{
            padding: '8px 16px',
            opacity: inputText.trim() && !isLoading ? 1 : 0.5,
            cursor: inputText.trim() && !isLoading ? 'pointer' : 'not-allowed'
          }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

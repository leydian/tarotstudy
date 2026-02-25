import React from 'react';
import { Message } from '../../types/tarot';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
      <div style={{ 
        padding: '1.2rem 1.8rem', 
        borderRadius: isUser ? '24px 24px 4px 24px' : '24px 24px 24px 24px', 
        backgroundColor: isUser ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.04)',
        color: isUser ? '#0a0a0c' : 'var(--text-primary)',
        border: isUser ? 'none' : '1px solid var(--border-subtle)',
        fontSize: '1.05rem',
        lineHeight: '1.8',
        whiteSpace: 'pre-wrap',
        boxShadow: isUser ? '0 6px 20px rgba(205, 186, 150, 0.2)' : 'none',
      }}>
        {message.text}
      </div>
    </div>
  );
};

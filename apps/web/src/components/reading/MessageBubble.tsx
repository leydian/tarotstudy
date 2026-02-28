import React from 'react';
import { Message } from '../../types/tarot';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = React.memo<MessageBubbleProps>(({ message }) => {
  const isUser = message.role === 'user';
  const isAction = message.isAction === true;

  const wrapperClass = isUser
    ? `${styles.wrapper} ${styles.wrapperUser}`
    : `${styles.wrapper} ${styles.wrapperBot}`;

  const bubbleClass = isAction
    ? `${styles.bubble} ${styles.bubbleAction}`
    : isUser
    ? `${styles.bubble} ${styles.bubbleUser}`
    : `${styles.bubble} ${styles.bubbleBot}`;

  return (
    <div className={wrapperClass}>
      <div className={bubbleClass}>{message.text}</div>
    </div>
  );
});

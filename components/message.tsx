'use client';

import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState, useEffect } from 'react';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon, ChevronUpIcon, ChevronDownIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';

// Tipe untuk pesan UI
type UIMessage = {
  id: string;
  role: string;
  parts: Array<any>;
  createdAt: Date;
  experimental_attachments?: Array<any>;
};

// Fungsi untuk memeriksa dan mengekstrak konten thinking
const extractThinkingContent = (text: string) => {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/;
  const match = text.match(thinkRegex);
  
  if (match) {
    const thinkContent = match[1].trim();
    const remainingText = text.replace(thinkRegex, '').trim();
    return { thinkContent, remainingText, hasThinking: true };
  }
  
  return { thinkContent: '', remainingText: text, hasThinking: false };
};

// Komponen untuk menangani pesan thinking
const ThinkBubble = ({ content }: { content: string }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="w-full mb-2">
      <div 
        className="flex items-center gap-1 px-1 py-1 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Thinking Process</span>
        <button className="text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-1">
          {isCollapsed ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
        </button>
      </div>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/30 rounded-lg mt-1"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Markdown>{content}</Markdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
  selectedChatModel,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: React.Dispatch<React.SetStateAction<Array<UIMessage>>>;
  reload: () => void;
  isReadonly: boolean;
  selectedChatModel?: string;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const getMessageText = () => {
    if (!message.parts || message.parts.length === 0) return '';
    
    return message.parts.map(part => {
      if (typeof part === 'string') return part;
      return part.text || '';
    }).join('\n');
  };

  // Fungsi untuk mendapatkan nama model yang mudah dibaca
  const getModelDisplayName = (modelId?: string) => {
    if (!modelId) return 'AI Model';
    
    // Tambahkan kasus khusus untuk model "auto"
    if (modelId === 'auto') {
      return 'Auto (Meta Llama 3.1 405B)';
    }
    
    // Mapping ID model ke nama yang mudah dibaca
    const modelNames: Record<string, string> = {
      'meta-llama/Meta-Llama-3.1-405B-Instruct': 'Meta Llama 3.1 405B',
      'meta-llama/Meta-Llama-3.1-70B-Instruct': 'Meta Llama 3.1 70B',
      'meta-llama/Meta-Llama-3.1-8B-Instruct': 'Meta Llama 3.1 8B',
      'google-gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-pro': 'Gemini Pro',
      'mistral-large': 'Mistral Large',
      'claude-3-opus': 'Claude 3 Opus',
      'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
      'gpt-4o': 'GPT-4o',
    };
    
    return modelNames[modelId] || modelId;
  };

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full">
            {/* Badge sudah dipindahkan ke dalam konten pesan */}

            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              // Untuk pesan sederhana, part mungkin tidak memiliki type
              const type = part.type || (part.text ? 'text' : 'unknown');
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text' || part.text) {
                const text = part.text || '';
                const { thinkContent, remainingText, hasThinking } = extractThinkingContent(text);
                
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-1', {
                          'bg-primary text-primary-foreground px-3 py-2 rounded-xl':
                            message.role === 'user',
                          'pt-0': message.role === 'assistant' && index === 0
                        })}
                      >
                        {/* Tampilkan badge model di dalam konten pesan */}
                        {message.role === 'assistant' && index === 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                            <span className="bg-muted px-2 py-0.5 rounded-full flex items-center">
                              {getModelDisplayName(selectedChatModel)}
                            </span>
                            <span className="bg-black text-white px-2 py-0.5 rounded-full">
                              uveve.id
                            </span>
                          </div>
                        )}

                        {hasThinking && <ThinkBubble content={thinkContent} />}
                        <Markdown>{remainingText}</Markdown>
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                        chatId={chatId}
                        selectedChatModel={selectedChatModel}
                        onEditStart={() => setIsEditing(true)}
                        onEditEnd={() => setIsEditing(false)}
                      />
                    </div>
                  );
                }
              }

              // Kita sederhanakan untuk saat ini dan hanya fokus pada pesan teks biasa
              return (
                <div key={key} className="flex flex-row gap-2 items-start">
                  <div
                    data-testid="message-content"
                    className={cn('flex flex-col gap-1', {
                      'bg-primary text-primary-foreground px-3 py-2 rounded-xl':
                        message.role === 'user',
                    })}
                  >
                    <Markdown>{JSON.stringify(part)}</Markdown>
                  </div>
                </div>
              );
            })}

            {isLoading && message.role === 'assistant' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking animation-delay-200" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking animation-delay-500" />
                </div>
              </div>
            )}

            {!isLoading && !isEditing && message.role === 'assistant' && (
              <div className="flex flex-row gap-2 items-start">
                <MessageActions 
                  chatId={chatId} 
                  messageId={message.id} 
                  vote={vote} 
                  messageContent={getMessageText()}
                />
              </div>
            )}

            {isEditing && message.role === 'assistant' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking animation-delay-200" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking animation-delay-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (!equal(prevProps.message, nextProps.message)) return false;
  if (!equal(prevProps.vote, nextProps.vote)) return false;
  if (prevProps.isReadonly !== nextProps.isReadonly) return false;

  return true;
});

export const ThinkingMessage = () => {
  const [thinkingText, setThinkingText] = useState<string>('');
  
  useEffect(() => {
    const texts = [
      'Menganalisis permintaan Anda...',
      'Memproses informasi...',
      'Menyiapkan respons...',
      'Mengumpulkan data yang relevan...',
      'Memformulasikan jawaban...'
    ];
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      setThinkingText(texts[currentIndex]);
      currentIndex = (currentIndex + 1) % texts.length;
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="w-full max-w-3xl px-4 mx-auto"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex gap-4 w-full">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
          <div className="translate-y-px">
            <SparklesIcon size={14} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-row gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking" />
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking animation-delay-200" />
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-70 animate-thinking animation-delay-500" />
            </div>
            <motion.span 
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {thinkingText}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

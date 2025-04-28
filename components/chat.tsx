'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';

// Definisikan tipe untuk status chat
type ChatStatus = 'idle' | 'loading' | 'error';

// Fungsi helper sederhana untuk mengirim pesan chat
async function sendChatMessage({ id, message, selectedChatModel }: any) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id,
        messages: message,
        selectedChatModel
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

// Hook chat sederhana sebagai pengganti useChat dari AI SDK
function useSimpleChat({ id, initialMessages, selectedChatModel, onFinish, onError }: any) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  
  const append = async (message: any) => {
    // Cegah pengiriman pesan baru jika masih loading
    if (status === 'loading') {
      toast.error('Please wait for the model to finish its response!');
      return;
    }
    
    try {
      setStatus('loading');
      
      // Tambahkan pesan pengguna ke daftar pesan
      const newMessages = [...messages, message];
      setMessages(newMessages);
      
      // Pastikan format pesan yang dikirim benar
      const formattedMessages = newMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts || [{ text: msg.content || '' }],
        ...(msg.createdAt && { createdAt: msg.createdAt })
      }));
      
      // Kirim pesan ke API
      const response = await sendChatMessage({
        id,
        message: formattedMessages,
        selectedChatModel
      });
      
      // Tambahkan respons asisten ke daftar pesan
      if (response.messages && response.messages.length > 0) {
        setMessages([...newMessages, ...response.messages]);
      }
      
      setStatus('idle');
      if (onFinish) onFinish();
    } catch (error) {
      console.error('Chat error:', error);
      setStatus('error');
      if (onError) onError();
      // Pastikan status kembali ke idle setelah error
      setTimeout(() => setStatus('idle'), 500);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    
    if (!input.trim()) return;
    
    // Cegah pengiriman pesan baru jika masih loading
    if (status === 'loading') {
      toast.error('Please wait for the model to finish its response!');
      return;
    }
    
    const userMessage = {
      id: generateUUID(),
      role: 'user',
      content: input,
      parts: [{ text: input }],
      createdAt: new Date()
    };
    
    setInput('');
    await append(userMessage);
  };
  
  const stop = () => {
    // Set status ke idle saat dihentikan
    setStatus('idle');
  };
  
  const reload = () => {
    // Pastikan status idle saat reload
    setStatus('idle');
  };
  
  return {
    messages,
    setMessages,
    input,
    setInput,
    append,
    status,
    handleSubmit,
    stop,
    reload
  };
}

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<any>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useSimpleChat({
    id,
    initialMessages,
    selectedChatModel,
    onFinish: () => {
      mutate('/api/history');
    },
    onError: () => {
      toast.error('An error occured, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<any>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          selectedChatModel={selectedChatModel}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}

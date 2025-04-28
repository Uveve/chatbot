'use client';

import { Button } from './ui/button';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { Textarea } from './ui/textarea';
import { deleteTrailingMessages } from '@/app/(chat)/actions';
import { toast } from 'sonner';

// Tipe untuk pesan UI
type UIMessage = {
  id: string;
  role: string;
  parts: Array<{ text: string }>;
  createdAt: Date;
  experimental_attachments?: Array<any>;
};

// Fungsi helper sederhana untuk mengirim pesan chat
async function sendChatMessage({ id, message, selectedChatModel }: any) {
  try {
    // Pastikan format pesan yang dikirim benar
    const formattedMessages = message.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts || [{ text: msg.content || '' }],
      ...(msg.createdAt && { createdAt: msg.createdAt })
    }));
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id,
        messages: formattedMessages,
        selectedChatModel: selectedChatModel || 'gemini-pro'
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

export type MessageEditorProps = {
  message: UIMessage;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: Dispatch<SetStateAction<Array<UIMessage>>>;
  reload: () => void;
  chatId?: string; // Tambahkan chatId sebagai prop
  selectedChatModel?: string; // Tambahkan selectedChatModel sebagai prop
  onEditStart?: () => void; // Callback saat mulai edit
  onEditEnd?: () => void; // Callback saat selesai edit
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload,
  chatId,
  selectedChatModel,
  onEditStart,
  onEditEnd,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Ambil teks dari bagian pertama pesan
  const initialText = message.parts[0]?.text || '';
  const [draftContent, setDraftContent] = useState<string>(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        data-testid="message-editor"
        ref={textareaRef}
        className="bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row gap-2 justify-end">
        <Button
          variant="outline"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode('view');
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          className="h-fit py-2 px-3"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            
            // Panggil callback onEditStart jika ada
            if (onEditStart) onEditStart();

            try {
              await deleteTrailingMessages({
                id: message.id,
              });

              // Update pesan dalam state lokal
              let updatedMessages: UIMessage[] = [];
              
              setMessages((currentMessages) => {
                const index = currentMessages.findIndex((m) => m.id === message.id);

                if (index !== -1) {
                  const updatedMessage = {
                    ...message,
                    parts: [{ text: draftContent }],
                  };
                  
                  // Hanya ambil pesan-pesan hingga pesan yang diedit
                  updatedMessages = [...currentMessages.slice(0, index + 1)];
                  updatedMessages[index] = updatedMessage;
                  
                  return updatedMessages;
                }

                updatedMessages = currentMessages;
                return currentMessages;
              });
              
              // Jika chatId tersedia, kirim permintaan untuk mendapatkan respons AI baru
              if (chatId) {
                try {
                  const response = await sendChatMessage({
                    id: chatId,
                    message: updatedMessages,
                    selectedChatModel: selectedChatModel || 'gemini-pro' // Gunakan model yang dipilih atau default
                  });
                  
                  // Tambahkan respons asisten ke daftar pesan
                  if (response.messages && response.messages.length > 0) {
                    setMessages((currentMessages) => [
                      ...updatedMessages, 
                      ...response.messages
                    ]);
                  }
                } catch (error) {
                  console.error('Gagal mendapatkan respons AI baru:', error);
                  toast.error('Gagal mendapatkan respons baru');
                }
              }
              
              reload();
            } catch (error) {
              console.error('Error editing message:', error);
              toast.error('Gagal mengedit pesan');
            } finally {
              setIsSubmitting(false);
              setMode('view');
              
              // Panggil callback onEditEnd jika ada
              if (onEditEnd) onEditEnd();
            }
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}

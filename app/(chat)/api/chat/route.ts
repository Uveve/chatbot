import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { getLogger } from '@/lib/utils/logger';
import { generateTitleFromUserMessage } from '../../actions';
import { getActualModelId } from '@/lib/ai/models';

export const maxDuration = 60;

// Inisialisasi logger
const logger = getLogger('chat-api');

// Fungsi untuk mengirim pesan ke API AI eksternal
async function sendToExternalAPI(messages: any[], selectedModel: string) {
  try {
    // Dapatkan model ID yang sebenarnya (menerjemahkan "auto" jika diperlukan)
    const actualModelId = getActualModelId(selectedModel);
    
    const apiMessages = [
      { role: "system", content: "Anda adalah asisten AI yang membantu. Anda dibuat oleh UVEVE.ID" }
    ];
    
    // Konversi format pesan dari aplikasi ke format yang diharapkan API
    for (const msg of messages) {
      // Hanya tambahkan pesan dengan peran 'user' atau 'assistant'
      if (msg.role === 'user' || msg.role === 'assistant') {
        let content = '';
        // Ambil teks dari bagian parts
        if (msg.parts && msg.parts.length > 0) {
          content = msg.parts.map((part: any) => {
            if (typeof part === 'string') return part;
            return part.text || '';
          }).join(' ');
        }
        
        apiMessages.push({
          role: msg.role,
          content: content
        });
      }
    }
    
    logger.debug('Sending to API:', {
      model: actualModelId,
      messages: apiMessages,
      max_tokens: 50000,
      temperature: 0.7,
      stream: false
    });
    
    const response = await fetch('https://api-ai2.secry.me/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        model: actualModelId,
        messages: apiMessages,
        max_tokens: 100000,
        temperature: 0.7,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API response error:', response.status, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    logger.debug('API Response:', data);
    
    // Ekstrak teks dari respons API
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    logger.error('Error calling external API:', error);
    return `Maaf, terjadi kesalahan saat menghubungi API. Silakan coba lagi nanti. (Error: ${error instanceof Error ? error.message : 'Unknown error'})`;
  }
}

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<any>;
      selectedChatModel: string;
    } = await request.json();

    logger.info('Received request:', { id, selectedChatModel });
    logger.debug('Messages:', messages);

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      logger.warn('Unauthorized access attempt');
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      logger.warn('No user message found in request');
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      logger.info('Creating new chat with ID:', id);
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        logger.warn('Unauthorized access attempt for chat ID:', id);
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // Simpan pesan pengguna ke database
    logger.debug('Saving user message to database');
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // Dapatkan respons dari API eksternal
    logger.info('Getting response from external API');
    const responseContent = await sendToExternalAPI(messages, selectedChatModel);
    
    // Buat pesan asisten
    const assistantId = generateUUID();
    const responseMessage = {
      id: assistantId,
      role: 'assistant',
      parts: [{ text: responseContent }],
      createdAt: new Date()
    };

    // Simpan respons asisten ke database
    logger.debug('Saving assistant response to database');
    await saveMessages({
      messages: [
        {
          id: assistantId,
          chatId: id,
          role: responseMessage.role,
          parts: responseMessage.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    logger.debug('Returning response message');
    logger.end(); // Menutup group log

    // Kembalikan respons dalam format yang diharapkan oleh frontend
    return NextResponse.json({ 
      messages: [responseMessage],
      id: assistantId
    });
  } catch (error) {
    logger.error('Error in chat API:', error);
    logger.end(); // Menutup group log
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    logger.warn('Delete request with no ID');
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    logger.warn('Unauthorized delete attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    logger.info('Processing delete request for chat ID:', id);
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      logger.warn('Unauthorized delete attempt for chat ID:', id);
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });
    logger.info('Chat deleted successfully:', id);
    logger.end(); // Menutup group log

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    logger.error('Error deleting chat:', error);
    logger.end(); // Menutup group log
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

'use server';

import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import { getLogger } from '@/lib/utils/logger';
import { VisibilityType } from '@/components/visibility-selector';

// Inisialisasi logger
const logger = getLogger('chat-actions');

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: any;
}) {
  // Implementasi sederhana tanpa menggunakan AI eksternal
  // Menggunakan teks dari pesan pengguna (maksimal 80 karakter)
  let title = '';
  
  try {
    // Coba ambil teks dari pesan
    if (message.parts && message.parts.length > 0) {
      const firstPart = message.parts[0];
      
      if (typeof firstPart === 'string') {
        title = firstPart;
      } else if (firstPart.text) {
        title = firstPart.text;
      } else {
        title = 'Percakapan Baru';
      }
    } else {
      title = 'Percakapan Baru';
    }
  } catch (error) {
    logger.warn('Error generating title from message:', error);
    title = 'Percakapan Baru';
  }
  
  // Batasi panjang judul
  return title.substring(0, 80);
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    const messages = await getMessageById({ id });
    
    // Cek apakah pesan ditemukan
    if (!messages || messages.length === 0) {
      logger.error('Message not found:', id);
      return;
    }
    
    const message = messages[0];
    
    // Cek apakah chatId ada sebelum menggunakannya
    if (!message || !message.chatId) {
      logger.error('Invalid message or missing chatId:', message);
      return;
    }

    logger.debug('Deleting trailing messages after message ID:', id);
    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  } catch (error) {
    logger.error('Error in deleteTrailingMessages:', error);
  }
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  try {
    logger.debug('Updating chat visibility:', { chatId, visibility });
    await updateChatVisiblityById({ chatId, visibility });
  } catch (error) {
    logger.error('Error updating chat visibility:', error);
  }
}

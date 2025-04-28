// Import data model dari file model.json
import modelData from '@/model.json';

export type ChatModel = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  linkedModelId?: string; // Model ID yang terkait (untuk model "auto")
};

// Fungsi untuk mendapatkan nama model yang lebih pendek dari ID
function getModelName(id: string): string {
  // Hapus prefix provider jika ada
  const parts = id.split('/');
  const modelPart = parts[parts.length - 1];
  
  // Format nama agar lebih mudah dibaca
  return modelPart
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Ubah data dari model.json menjadi format ChatModel
export const models: ChatModel[] = [
  // Tambahkan model "auto" yang mengarah ke Meta Llama 405B
  {
    id: 'auto',
    name: 'Auto',
    description: 'Otomatis menggunakan model terbaik (Meta Llama 3.1 405B)',
    image: '/model-icons/default.jpg',
    linkedModelId: 'meta-llama/Meta-Llama-3.1-405B-Instruct'
  },
  // Tambahkan model-model lain dari model.json
  ...modelData.data.map(model => ({
    id: model.id,
    name: getModelName(model.id),
    description: `Provider: ${model.id.split('/')[0]}`,
    image: '/model-icons/default.jpg' // Gunakan image default untuk saat ini
  }))
];

// Gunakan model "auto" sebagai default
export const defaultModel = models[0];

// Default model yang digunakan ketika tidak ada model yang dipilih
export const DEFAULT_CHAT_MODEL = 'auto';

// Fungsi untuk mengambil model berdasarkan ID
export function getModelById(id: string) {
  return models.find(model => model.id === id) ?? defaultModel;
}

// Fungsi untuk mendapatkan model yang akan digunakan sebenarnya
// Jika model adalah 'auto', akan mengembalikan model yang terkait
export function getActualModelId(id: string): string {
  const model = getModelById(id);
  if (model.linkedModelId) {
    return model.linkedModelId;
  }
  return model.id;
}

import { models } from './models';

export type ModelProvider = {
  id: string;
  name: string;
  models: typeof models;
};

// Provider kustom untuk API AI Anda
export const customProvider: ModelProvider = {
  id: 'custom-provider',
  name: 'Custom AI Provider',
  models
};

// Daftar semua provider yang tersedia
export const providers = [customProvider];

// Provider default
export const defaultProvider = providers[0];

// Fungsi untuk mendapatkan provider berdasarkan ID
export function getProviderById(id: string) {
  return providers.find(provider => provider.id === id) ?? defaultProvider;
}

// Logger utility untuk membuat log di konsol lebih rapi
// Dibuat dengan berbagai level log dan opsi untuk mengaktifkan/menonaktifkan log

// Konfigurasi default logger
const config = {
  // Level log yang diizinkan: 'debug', 'info', 'warn', 'error', 'none'
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Group log berdasarkan kategori (module)
  enableGroups: true,
  // Tampilkan waktu di log
  showTimestamp: true,
  // Format waktu: 'iso' (ISO format) atau 'local' (format lokal)
  timestampFormat: 'local',
};

// Nilai numerik dari level log untuk perbandingan
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

type LogLevel = keyof typeof LOG_LEVELS;

// Fungsi untuk mendapatkan timestamp
const getTimestamp = () => {
  if (!config.showTimestamp) return '';
  
  const now = new Date();
  if (config.timestampFormat === 'iso') {
    return `[${now.toISOString()}] `;
  }
  return `[${now.toLocaleTimeString()}] `;
};

// Logger class
class Logger {
  private module: string;
  private groupStarted: boolean = false;

  constructor(module: string) {
    this.module = module;
  }

  private isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[config.level as LogLevel];
  }

  private startGroupIfNeeded() {
    if (config.enableGroups && !this.groupStarted) {
      console.group(`[${this.module}]`);
      this.groupStarted = true;
    }
  }

  private endGroupIfNeeded() {
    if (config.enableGroups && this.groupStarted) {
      console.groupEnd();
      this.groupStarted = false;
    }
  }

  debug(...args: any[]): void {
    if (!this.isLevelEnabled('debug')) return;
    this.startGroupIfNeeded();
    console.debug(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}DEBUG:`, ...args);
  }

  info(...args: any[]): void {
    if (!this.isLevelEnabled('info')) return;
    this.startGroupIfNeeded();
    console.info(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}INFO:`, ...args);
  }

  warn(...args: any[]): void {
    if (!this.isLevelEnabled('warn')) return;
    this.startGroupIfNeeded();
    console.warn(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}WARN:`, ...args);
  }

  error(...args: any[]): void {
    if (!this.isLevelEnabled('error')) return;
    this.startGroupIfNeeded();
    console.error(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}ERROR:`, ...args);
  }

  // Untuk log data besar (seperti JSON), dengan opsi untuk hanya menampilkan di level debug
  logData(data: any, level: LogLevel = 'debug'): void {
    if (!this.isLevelEnabled(level)) return;
    this.startGroupIfNeeded();
    
    // Jika data adalah objek kompleks, tampilkan dengan format yang lebih baik
    if (typeof data === 'object' && data !== null) {
      if (level === 'debug') {
        console.debug(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}DEBUG:`, 'Data:');
        console.debug(JSON.stringify(data, null, 2));
      } else if (level === 'info') {
        console.info(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}INFO:`, 'Data:');
        console.info(JSON.stringify(data, null, 2));
      } else if (level === 'warn') {
        console.warn(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}WARN:`, 'Data:');
        console.warn(JSON.stringify(data, null, 2));
      } else if (level === 'error') {
        console.error(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}ERROR:`, 'Data:');
        console.error(JSON.stringify(data, null, 2));
      } else {
        // Level 'none' atau tidak diketahui - tidak melakukan apa-apa
      }
    } else {
      if (level === 'debug') {
        console.debug(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}DEBUG:`, data);
      } else if (level === 'info') {
        console.info(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}INFO:`, data);
      } else if (level === 'warn') {
        console.warn(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}WARN:`, data);
      } else if (level === 'error') {
        console.error(`${getTimestamp()}${config.enableGroups ? '' : `[${this.module}] `}ERROR:`, data);
      } else {
        // Level 'none' atau tidak diketahui - tidak melakukan apa-apa
      }
    }
  }

  // Method untuk mengakhiri group log
  end(): void {
    this.endGroupIfNeeded();
  }
}

// Fungsi untuk mengubah konfigurasi logger
export function configureLogger(newConfig: Partial<typeof config>) {
  Object.assign(config, newConfig);
}

// Fungsi untuk mendapatkan instance logger
export function getLogger(module: string): Logger {
  return new Logger(module);
}

// Expor konfigurasi dan LOG_LEVELS untuk digunakan di tempat lain
export { config, LOG_LEVELS }; 
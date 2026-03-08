import { EventEmitter } from 'events';

class SyncStatusService extends EventEmitter {
  private static instance: SyncStatusService;
  private activeSyncs: Set<string> = new Set();

  private constructor() {
    super();
  }

  static getInstance(): SyncStatusService {
    if (!this.instance) {
      this.instance = new SyncStatusService();
    }
    return this.instance;
  }

  startSync(service: string): void {
    const wasSyncing = this.activeSyncs.size > 0;
    this.activeSyncs.add(service);
    console.log(`[SyncStatus] ${service} sync STARTED (active: ${Array.from(this.activeSyncs).join(', ')})`);
    if (!wasSyncing) {
      this.emit('syncStarted');
    }
  }

  endSync(service: string): void {
    this.activeSyncs.delete(service);
    console.log(`[SyncStatus] ${service} sync COMPLETED (active: ${this.activeSyncs.size > 0 ? Array.from(this.activeSyncs).join(', ') : 'none'})`);
    if (this.activeSyncs.size === 0) {
      this.emit('syncCompleted');
    }
  }

  isSyncing(): boolean {
    return this.activeSyncs.size > 0;
  }

  getStatus(): { syncing: boolean; services: string[] } {
    return {
      syncing: this.activeSyncs.size > 0,
      services: Array.from(this.activeSyncs),
    };
  }
}

export const syncStatusService = SyncStatusService.getInstance();

import type { ChoiceEvent, DailySnapshot } from '../app/types'

type ExportShape = { schemaVersion: 1; choices: ChoiceEvent[]; snapshots: DailySnapshot[]; model: unknown | null }

export class ColorDatabase {
  constructor(private name = 'your-color') {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('choices')) db.createObjectStore('choices', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'date' })
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async request<T>(store: string, mode: IDBTransactionMode, action: (objectStore: IDBObjectStore) => IDBRequest<T>) {
    const db = await this.open()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(store, mode)
      const req = action(transaction.objectStore(store))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      transaction.oncomplete = () => db.close()
    })
  }

  addChoice(choice: ChoiceEvent) { return this.request('choices', 'readwrite', store => store.add(choice)) }
  saveChoice(choice: ChoiceEvent) { return this.request('choices', 'readwrite', store => store.put(choice)) }
  getChoices() { return this.request<ChoiceEvent[]>('choices', 'readonly', store => store.getAll()) }
  saveSnapshot(snapshot: DailySnapshot) { return this.request('snapshots', 'readwrite', store => store.put(snapshot)) }
  getSnapshots() { return this.request<DailySnapshot[]>('snapshots', 'readonly', store => store.getAll()) }
  saveModel(model: unknown) { return this.request('meta', 'readwrite', store => store.put(model, 'model')) }
  getModel() { return this.request<unknown | null>('meta', 'readonly', store => store.get('model')).then(value => value ?? null) }

  async exportJson() {
    const data: ExportShape = { schemaVersion: 1, choices: await this.getChoices(), snapshots: await this.getSnapshots(), model: await this.getModel() }
    return JSON.stringify(data, null, 2)
  }

  async importJson(json: string) {
    const data = JSON.parse(json) as Partial<ExportShape>
    if (data.schemaVersion !== 1) throw new Error('Unsupported data schema')
    if (!Array.isArray(data.choices) || !Array.isArray(data.snapshots)) throw new Error('Invalid color data')
    await this.reset()
    for (const choice of data.choices) await this.addChoice(choice)
    for (const snapshot of data.snapshots) await this.saveSnapshot(snapshot)
    if (data.model) await this.saveModel(data.model)
  }

  async reset() {
    const db = await this.open()
    await Promise.all([...db.objectStoreNames].map(storeName => new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const request = transaction.objectStore(storeName).clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })))
    db.close()
  }
}

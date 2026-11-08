class AsyncSemaphore {
  private active = 0
  private readonly waiting: Array<() => void> = []

  constructor(private readonly limit: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await operation()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1
      return Promise.resolve()
    }
    return new Promise((resolve) => this.waiting.push(() => {
      this.active += 1
      resolve()
    }))
  }

  private release() {
    this.active -= 1
    this.waiting.shift()?.()
  }
}

const parsedLimit = Number(process.env.AI_MAX_CONCURRENCY ?? 1)
export const aiImageSemaphore = new AsyncSemaphore(
  Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 1,
)

export class AsyncRequestCoalescer<TKey, TResult> {
  private readonly requestMap: Map<TKey, Promise<TResult>> = new Map();

  constructor() {}

  public async coalesce(key: TKey, requestFn: () => Promise<TResult>): Promise<TResult> {
    if (this.requestMap.has(key)) {
      return this.requestMap.get(key)!;
    }

    const promise = requestFn()
      .finally(() => {
        this.requestMap.delete(key);
      });

    this.requestMap.set(key, promise);
    return promise;
  }
}

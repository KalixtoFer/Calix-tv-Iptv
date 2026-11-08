// iptvWorker.ts - Processes large IPTV lists in chunks to keep UI fluid
self.onmessage = async (e: MessageEvent) => {
  const { type, data, chunkSize = 1000 } = e.data;

  if (!Array.isArray(data)) {
    self.postMessage({ error: 'Data is not an array' });
    return;
  }

  const result: any[] = [];
  const total = data.length;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    
    // Example processing: basic validation and normalization
    const processedChunk = chunk.map(item => {
      // Ensure essential fields exist, or normalize names
      return {
        ...item,
        // We could add more heavy processing here if needed
      };
    });

    result.push(...processedChunk);

    // Notify progress
    self.postMessage({ 
      progress: Math.min(100, Math.round(((i + chunkSize) / total) * 100)),
      type: 'progress'
    });

    // Small delay to allow event loop breathing if this was heavier
    // but since we are in a worker, it doesn't block main thread anyway.
    // However, if we want to yield back to worker's own event loop:
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  self.postMessage({ 
    type: 'complete', 
    data: result,
    count: result.length
  });
};

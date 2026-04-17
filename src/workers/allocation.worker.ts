import { runAllocation } from '../lib/allocation'

self.onmessage = (e: MessageEvent) => {
  try {
    const result = runAllocation(e.data);
    self.postMessage({ type: 'SUCCESS', payload: result });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error });
  }
}

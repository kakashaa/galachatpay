const STORAGE_KEY = 'saved_tracking_codes';

interface SavedRequest {
  id: string;
  type: string;
  galaId: string;
  savedAt: string;
}

export function useSavedRequests() {
  const saveTrackingCode = (id: string, type: string, galaId: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as SavedRequest[];
      existing.push({ id, type, galaId, savedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error('Failed to save tracking code:', e);
    }
  };

  const getSavedRequests = (type?: string): SavedRequest[] => {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as SavedRequest[];
      return type ? all.filter(r => r.type === type) : all;
    } catch {
      return [];
    }
  };

  return { saveTrackingCode, getSavedRequests };
}

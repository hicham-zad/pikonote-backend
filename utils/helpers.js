// Parse summary safely
export const parseSummary = (summary) => {
  if (!summary) return null;
  
  if (typeof summary === 'object') {
    return summary; // Already parsed
  }
  
  if (typeof summary === 'string') {
    try {
      return JSON.parse(summary);
    } catch (e) {
      console.error('Failed to parse summary:', e);
      return null;
    }
  }
  
  return null;
};
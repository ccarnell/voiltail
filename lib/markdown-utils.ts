// Markdown preprocessing utilities to clean up LLM output

export function preprocessMarkdown(content: string): string {
  if (!content) return '';
  
  // Simplified preprocessing - only essential fixes
  let cleaned = content;
  
  // Remove excessive line breaks (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Ensure proper spacing around headers
  cleaned = cleaned.replace(/\n(#{1,6}\s+[^\n]+)\n{0,1}/g, '\n\n$1\n\n');
  
  // Remove empty headers
  cleaned = cleaned.replace(/#{1,6}\s*\n+(?=#{1,6}|\s*$)/g, '');
  
  return cleaned.trim();
}


// Function to clean up individual model responses
export function cleanModelResponse(content: string): string {
  if (!content) return '';
  
  // Basic cleanup for individual responses
  let cleaned = content.trim();
  
  // Remove common LLM artifacts
  cleaned = cleaned.replace(/^(Here's|Here is|I'll|I will|Let me|Based on)/i, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Ensure it ends properly
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned.trim();
}

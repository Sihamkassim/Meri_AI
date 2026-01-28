import React from 'react';

/**
 * Format AI response text with markdown-like formatting
 * Handles: **bold**, bullet points (• or -), numbered lists, and line breaks
 */
export function formatAIResponse(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines but add spacing
    if (!trimmedLine) {
      elements.push(<br key={`br-${index}`} />);
      return;
    }

    // Handle bullet points (• or - or *)
    if (trimmedLine.match(/^[•\-\*]\s/)) {
      const content = trimmedLine.substring(2);
      elements.push(
        <div key={index} className="flex gap-2 my-1">
          <span className="text-emerald-400 flex-shrink-0">•</span>
          <span>{formatInlineText(content)}</span>
        </div>
      );
      return;
    }

    // Handle numbered lists (1. 2. etc.)
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      const [, number, content] = numberedMatch;
      elements.push(
        <div key={index} className="flex gap-2 my-1">
          <span className="text-emerald-400 flex-shrink-0 font-semibold">{number}.</span>
          <span>{formatInlineText(content)}</span>
        </div>
      );
      return;
    }

    // Handle headers (## or ###)
    if (trimmedLine.startsWith('###')) {
      const content = trimmedLine.substring(3).trim();
      elements.push(
        <h4 key={index} className="font-bold text-emerald-400 mt-3 mb-1 text-sm">
          {formatInlineText(content)}
        </h4>
      );
      return;
    }

    if (trimmedLine.startsWith('##')) {
      const content = trimmedLine.substring(2).trim();
      elements.push(
        <h3 key={index} className="font-bold text-emerald-400 mt-4 mb-2">
          {formatInlineText(content)}
        </h3>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={index} className="my-1">
        {formatInlineText(trimmedLine)}
      </p>
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
}

/**
 * Format inline text with bold (**text**) and other inline formatting
 */
function formatInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Match **bold** text
  const boldRegex = /\*\*(.+?)\*\*/g;
  let match;
  let lastIndex = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add bold text
    parts.push(
      <strong key={match.index} className="font-bold text-white">
        {match[1]}
      </strong>
    );
    
    lastIndex = boldRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Mermaid diagram syntax repair helper.
 * Auto-corrects common syntax issues in AI-generated Mermaid code.
 * Specifically, wraps node text labels containing parentheses, brackets, or other
 * special characters in double quotes if they are not already quoted.
 */
export function repairMermaid(mermaid: string): string {
  if (!mermaid) return '';

  return mermaid
    .split('\n')
    .map((line) => {
      // 1. Stadium shape: ID([text])
      line = line.replace(/\b(\w+)\s*\(\s*\[\s*(.+?)\s*\]\s*\)/g, (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        if (/[\(\)\[\]\{\}\:]/.test(text)) {
          return `${id}([ "${text.replace(/"/g, '\\"')}" ])`;
        }
        return match;
      });

      // 2. Subroutine shape: ID[[text]]
      line = line.replace(/\b(\w+)\s*\[\s*\[\s*(.+?)\s*\]\s*\]/g, (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        if (/[\(\)\[\]\{\}\:]/.test(text)) {
          return `${id}[[ "${text.replace(/"/g, '\\"')}" ]]`;
        }
        return match;
      });

      // 3. Database shape: ID[(text)]
      line = line.replace(/\b(\w+)\s*\[\s*\(\s*(.+?)\s*\)\s*\]/g, (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        if (/[\(\)\[\]\{\}\:]/.test(text)) {
          return `${id}[( "${text.replace(/"/g, '\\"')}" )]`;
        }
        return match;
      });

      // 4. Circle shape: ID((text))
      line = line.replace(/\b(\w+)\s*\(\s*\(\s*(.+?)\s*\)\s*\)/g, (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        if (/[\(\)\[\]\{\}\:]/.test(text)) {
          return `${id}(( "${text.replace(/"/g, '\\"')}" ))`;
        }
        return match;
      });

      // 5. Decision shape: ID{text}
      line = line.replace(/\b(\w+)\s*\{\s*(.+?)\s*\}/g, (match, id, text) => {
        if (text.startsWith('"') && text.endsWith('"')) return match;
        if (/[\(\)\[\]\{\}\:]/.test(text)) {
          return `${id}{"${text.replace(/"/g, '\\"')}"}`;
        }
        return match;
      });

      // 6. Round shape: ID(text)
      line = line.replace(/\b(\w+)\s*\(\s*(.+?)\s*\)/g, (match, id, text) => {
        if (text.startsWith('(') || text.startsWith('[') || text.startsWith('{')) return match;
        if (text.startsWith('"') && text.endsWith('"')) return match;
        if (/[\(\)\[\]\{\}\:]/.test(text)) {
          return `${id}("${text.replace(/"/g, '\\"')}")`;
        }
        return match;
      });

      // 7. Box/Rectangle shape: ID[text]
      line = line.replace(/\b(\w+)\s*\[\s*(.+?)\s*\]/g, (match, id, text) => {
        if (text.startsWith('[') || text.startsWith('(') || text.startsWith('{')) return match;
        if (text.startsWith('"') && text.endsWith('"')) return match;
        if (/[\(\)\[\]\{\}\:]/.test(text)) {
          return `${id}["${text.replace(/"/g, '\\"')}"]`;
        }
        return match;
      });

      return line;
    })
    .join('\n');
}

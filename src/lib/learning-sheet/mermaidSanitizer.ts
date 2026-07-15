/**
 * Mermaid diagram syntax sanitizer helper.
 * Auto-corrects common syntax issues in AI-generated Mermaid code.
 */
export function sanitizeMermaid(code: string): string {
  if (!code) return '';

  // 1. Remove Markdown code fences (e.g., ```mermaid ... ``` or just ``` ... ```)
  let clean = code
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```$/, '')
    .trim();

  // 2. Replace smart/curly quotes
  clean = clean
    .replace(/[\u201c\u201d]/g, '"') // left and right double quotes
    .replace(/[\u2018\u2019]/g, "'"); // left and right single quotes

  // 3. Remove HTML tags
  clean = clean.replace(/<[^>]+>/g, '');

  // 4. Remove unsupported Unicode & Emojis
  clean = clean.replace(/[\uD800-\uDFFF\u2600-\u27BF\uE000-\uF8FF\u2011-\u26FF\uFE0F]/g, '');

  // 5. Replace trailing semicolons where invalid (e.g. at the end of lines)
  clean = clean.replace(/;+/g, ';').replace(/;$/gm, '');

  // 6. Fix nested square brackets and parenthesis inside shapes
  clean = clean.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Helper function to sanitize a label text
    const cleanLabel = (text: string) => {
      let t = text.trim();
      // If already quoted, strip the outer quotes first
      const isQuoted = (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
      if (isQuoted) {
        t = t.slice(1, -1);
      }
      // Replace nested brackets/parentheses inside the label
      t = t.replace(/\[/g, '(').replace(/\]/g, ')');
      // Normalize escaped quotes
      t = t.replace(/\\"/g, '"');
      // Escape internal double quotes
      t = t.replace(/"/g, '\\"');
      return t;
    };

    // Subroutine: ID[[label]]
    line = line.replace(/\b(\w+)\s*\[\s*\[\s*(.+?)\s*\]\s*\]/g, (match, id, label) => {
      return `${id}[["${cleanLabel(label)}"]]`;
    });

    // Stadium: ID([label])
    line = line.replace(/\b(\w+)\s*\(\s*\[\s*(.+?)\s*\]\s*\)/g, (match, id, label) => {
      return `${id}(["${cleanLabel(label)}"])`;
    });

    // Database: ID[(label)]
    line = line.replace(/\b(\w+)\s*\[\s*\(\s*(.+?)\s*\)\s*\]/g, (match, id, label) => {
      return `${id}[("${cleanLabel(label)}")]`;
    });

    // Circle/Double Circle: ID((label)) or ID(((label)))
    line = line.replace(/\b(\w+)\s*\(\s*\(\s*\(\s*(.+?)\s*\)\s*\)\s*\)/g, (match, id, label) => {
      return `${id}((("${cleanLabel(label)}")))`;
    });
    line = line.replace(/\b(\w+)\s*\(\s*\(\s*(.+?)\s*\)\s*\)/g, (match, id, label) => {
      return `${id}(("${cleanLabel(label)}"))`;
    });

    // Decision: ID{label}
    line = line.replace(/\b(\w+)\s*\{\s*(.+?)\s*\}/g, (match, id, label) => {
      return `${id}{"${cleanLabel(label)}"}`;
    });

    // Round: ID(label)
    // Make sure we don't match the inner part of already processed shapes like ([label]) or ((label))
    line = line.replace(/\b(\w+)\s*\(\s*([^\[\(\{\s].*?)\s*\)/g, (match, id, label) => {
      if (label.startsWith('"') && label.endsWith('"')) return match;
      return `${id}("${cleanLabel(label)}")`;
    });

    // Box: ID[label]
    // Make sure we don't match subroutine [[label]] or database [(label)]
    line = line.replace(/\b(\w+)\s*\[\s*([^\[\(\{\s].*?)\s*\]/g, (match, id, label) => {
      if (label.startsWith('"') && label.endsWith('"')) return match;
      return `${id}["${cleanLabel(label)}"]`;
    });

    return line;
  }).join('\n');

  // 7. Ensure a diagram declaration exists
  const declarations = [
    /^\s*graph\b/i,
    /^\s*flowchart\b/i,
    /^\s*sequenceDiagram\b/i,
    /^\s*classDiagram\b/i,
    /^\s*stateDiagram\b/i,
    /^\s*stateDiagram-v2\b/i,
    /^\s*erDiagram\b/i,
    /^\s*journey\b/i,
    /^\s*mindmap\b/i,
    /^\s*gantt\b/i,
    /^\s*pie\b/i,
    /^\s*gitGraph\b/i,
  ];

  const hasDeclaration = declarations.some(regex => regex.test(clean));

  if (!hasDeclaration) {
    clean = `graph TD\n${clean}`;
  }

  // 8. Normalize whitespace
  clean = clean
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return clean;
}

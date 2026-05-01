import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Render HTML rich content with KaTeX math formulas.
 * Math is supported via:
 *  - Inline:  $...$  or  \(...\)
 *  - Block:   $$...$$ or \[...\]
 *  - Or TipTap-stored nodes: <span data-math="inline|block">latex</span>
 */
export function renderRichContent(html: string): string {
  if (!html) return "";

  // First, replace data-math spans with rendered KaTeX
  let processed = html.replace(
    /<span[^>]*data-math="(inline|block)"[^>]*>([\s\S]*?)<\/span>/g,
    (_m, mode, latex) => {
      try {
        const decoded = decodeHtml(latex);
        return katex.renderToString(decoded, {
          throwOnError: false,
          displayMode: mode === "block",
        });
      } catch {
        return _m;
      }
    }
  );

  // Replace $$...$$ (block)
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_m, latex) => {
    try {
      return katex.renderToString(decodeHtml(latex), {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return _m;
    }
  });

  // Replace \[...\] (block)
  processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_m, latex) => {
    try {
      return katex.renderToString(decodeHtml(latex), {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return _m;
    }
  });

  // Replace \(...\) (inline)
  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_m, latex) => {
    try {
      return katex.renderToString(decodeHtml(latex), {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return _m;
    }
  });

  // Replace single $...$ (inline) - careful not to match currency
  processed = processed.replace(/(^|[^\\$])\$([^\n$]+?)\$(?!\d)/g, (_m, pre, latex) => {
    try {
      return (
        pre +
        katex.renderToString(decodeHtml(latex), {
          throwOnError: false,
          displayMode: false,
        })
      );
    } catch {
      return _m;
    }
  });

  // Sanitize, allowing KaTeX output
  return DOMPurify.sanitize(processed, {
    ADD_TAGS: ["math", "semantics", "annotation", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mroot", "mtext", "mspace"],
    ADD_ATTR: ["aria-hidden", "data-math", "style", "class"],
  });
}

function decodeHtml(s: string): string {
  const ta = document.createElement("textarea");
  ta.innerHTML = s;
  return ta.value;
}

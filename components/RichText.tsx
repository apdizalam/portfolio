// Plain text with **bold** and blank-line paragraphs. No HTML is ever injected.
export default function RichText({ text }: { text: string }) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((para, i) => (
        <p key={i}>
          {para.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            /^\*\*[^*]+\*\*$/.test(part) ? <strong key={j}>{part.slice(2, -2)}</strong> : part
          )}
        </p>
      ))}
    </>
  );
}

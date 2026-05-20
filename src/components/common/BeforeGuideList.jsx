export function BeforeGuideList({ text, className = '' }) {
  const items = String(text ?? '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <ul className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex items-start gap-2.5">
          <span
            className="mt-[0.68em] h-[3px] w-[3px] rounded-full bg-[var(--ivps-moss)] flex-shrink-0"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 leading-[1.65]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

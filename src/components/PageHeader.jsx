export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm first-letter:uppercase text-soft">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

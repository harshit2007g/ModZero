import { Link } from "react-router-dom";

/** Visible trail. Pair it with breadcrumbSchema() for the structured-data copy. */
export default function Breadcrumbs({ items }: { items: Array<{ name: string; path?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 text-[17px] text-muted">
        {items.map((item, i) => (
          <li key={item.name} className="flex items-center gap-2">
            {item.path ? (
              <Link to={item.path} className="transition-colors hover:text-brand">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-slate">
                {item.name}
              </span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

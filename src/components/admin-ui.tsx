import Link from "next/link";
export function AdminHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="admin-heading">
      <div>
        <p className="admin-kicker">CXA OPERATIONS</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </header>
  );
}
export function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
  return href ? (
    <Link className="admin-stat" href={href}>
      {body}
    </Link>
  ) : (
    <div className="admin-stat">{body}</div>
  );
}
export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`admin-status status-${value.toLowerCase()}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}
export function Pager({
  page,
  hasNext,
  base,
}: {
  page: number;
  hasNext: boolean;
  base: string;
}) {
  return (
    <nav className="admin-pager" aria-label="Pagination">
      {page > 1 && (
        <Link href={`${base}${base.includes("?") ? "&" : "?"}page=${page - 1}`}>
          Previous
        </Link>
      )}
      <span>Page {page}</span>
      {hasNext && (
        <Link href={`${base}${base.includes("?") ? "&" : "?"}page=${page + 1}`}>
          Next
        </Link>
      )}
    </nav>
  );
}

export default function ProductsLoading() {
  return <main className="page-shell shell" aria-busy="true" aria-label="Loading products">
    <div className="skeleton skeleton-title" />
    <div className="skeleton-grid">{Array.from({ length: 3 }, (_, index) => <div className="skeleton skeleton-card" key={index} />)}</div>
  </main>;
}

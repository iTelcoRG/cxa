export function ContentPage({ children, intro, title }: { children: React.ReactNode; intro: string; title: string }) {
  return <main className="page-shell shell content-page"><header className="page-heading"><h1>{title}</h1><p>{intro}</p></header><div className="prose">{children}</div></main>;
}

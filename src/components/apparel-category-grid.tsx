import Image from "next/image";
import Link from "next/link";
import { catalogueRanges } from "../catalogue/ranges.ts";

export function ApparelCategoryGrid() {
  return <div className="launch-category-grid">
        {catalogueRanges.map(category => <Link data-category={category.slug} href={`/products?range=${category.slug}`} key={category.slug}>
          <div aria-hidden="true" className="category-art">
            <Image alt="" src={`/images/categories/${category.slug}.png`} fill sizes="(max-width: 760px) 45vw, (max-width: 1000px) 30vw, 25vw" />
            <Image alt="" className="category-embroidered" src={`/images/categories/embroidered/${category.slug}.png`} fill sizes="(max-width: 760px) 45vw, (max-width: 1000px) 30vw, 25vw" />
          </div>
          <strong>{category.name}</strong><span aria-hidden="true" className="category-arrow">↗</span>
        </Link>)}
      </div>;
}

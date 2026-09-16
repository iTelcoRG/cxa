import type { MetadataRoute } from "next"; import { publicUrl } from "../lib/site.ts";
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:"*",allow:"/",disallow:["/quote/confirmation/","/api/","/admin/"]},sitemap:publicUrl("/sitemap.xml")};}

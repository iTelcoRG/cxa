import "./contact.css";
import type { Metadata } from "next";
import { ContactEnquiryForm } from "../../components/contact-enquiry-form.tsx";
import { subjectFromTechnique } from "../../contact/subject.ts";
export const metadata: Metadata = { title: "Contact CXA | Custom X Apparel", description: "Email CXA at sales@cxa.co.nz for custom apparel, branding and quote enquiries.", alternates: { canonical: "/contact" } };
export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const subject = subjectFromTechnique((await searchParams).technique);
  return <main className="page-shell shell contact-page">
    <header className="page-heading"><h1>We’d love to hear from you.</h1><p>Let’s bring your next project to life.</p></header>
    <div className="contact-content">
      <ContactEnquiryForm key={subject} initialSubject={subject}/>
      <section className="contact-information" aria-labelledby="contact-information-title">
        <h2 id="contact-information-title">Email our team</h2>
        <a href="mailto:sales@cxa.co.nz">sales@cxa.co.nz</a>
        <p>For product questions, branding advice or help with an existing quote.</p>
        <p>Tell us what you have in mind, your quantities and any deadline. If you’re following up on a quote, include your quote reference.</p>
      </section>
    </div>
  </main>;
}

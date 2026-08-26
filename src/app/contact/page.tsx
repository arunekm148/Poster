"use client";

import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/agents-india-logo.png"
              alt="Agents India"
              className="h-14 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded-lg px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 sm:block"
            >
              Home
            </Link>

            <Link
              href="/login"
              className="rounded-xl bg-[#073b7a] px-5 py-2.5 font-semibold text-white transition hover:bg-[#052f63]"
            >
              Agent Login
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#052f63] via-[#073b7a] to-[#0b57a4]">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center text-white">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
            AGENTS INDIA SUPPORT
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Contact Us
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
            Have a question about Agents India, your agent account, marketing
            posters, customers, renewals or platform features? We are here to
            help.
          </p>
        </div>
      </section>

      {/* CONTACT CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT */}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
              Get in touch
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-[#073b7a]">
              How can we help you?
            </h2>

            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Agents India is designed to support insurance professionals with
              customer management, renewals, follow-ups, marketing tools and
              everyday business operations.
            </p>

            <div className="mt-10 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    ✉️
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Email Support
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Send us your questions and support requests.
                    </p>
                    <p className="mt-2 font-semibold text-[#073b7a]">
                      support@agentsindia.org
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                    🤝
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Business Enquiries
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      For partnerships, platform enquiries and business
                      opportunities, contact our team.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-2xl">
                    🛡️
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Account & Technical Support
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Having trouble with login, registration or another
                      platform feature? Send us the details and we will assist
                      you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FORM */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-10">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
                Send a message
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-[#073b7a]">
                We&apos;d love to hear from you
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Complete the form below and our team will get back to you.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  "Thank you. Contact form submission will be connected to the Agents India system next."
                );
              }}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-[#0b57a4] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Mobile Number
                </label>

                <input
                  type="tel"
                  required
                  placeholder="+91"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-[#0b57a4] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-[#0b57a4] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Subject
                </label>

                <select
                  required
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-[#0b57a4] focus:ring-4 focus:ring-blue-100"
                >
                  <option value="" disabled>
                    Select enquiry type
                  </option>
                  <option>General Enquiry</option>
                  <option>Agent Registration</option>
                  <option>Account Support</option>
                  <option>Technical Support</option>
                  <option>Business Partnership</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Message
                </label>

                <textarea
                  required
                  rows={5}
                  placeholder="Tell us how we can help..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 outline-none transition focus:border-[#0b57a4] focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#073b7a] px-6 py-4 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#052f63]"
              >
                Send Message →
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                Please do not include passwords, OTPs or other confidential
                account credentials in your message.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#073b7a] px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Already an Agents India member?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-blue-100">
            Sign in to access your agent dashboard and manage your insurance
            business.
          </p>

          <Link
            href="/login"
            className="mt-7 inline-flex rounded-xl bg-orange-500 px-7 py-3.5 font-bold text-white transition hover:bg-orange-600"
          >
            Login to Dashboard →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-7 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Agents India. All rights reserved.</p>

          <div className="flex gap-6">
            <Link href="/" className="hover:text-[#073b7a]">
              Home
            </Link>

            <Link href="/login" className="hover:text-[#073b7a]">
              Login
            </Link>

            <Link href="/register" className="hover:text-[#073b7a]">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
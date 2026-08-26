"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function BrandLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="flex items-center">
      <Image
        src="/agents-india-logo.png"
        alt="Agents India"
        width={compact ? 190 : 250}
        height={compact ? 70 : 110}
        priority
        className={`h-auto object-contain ${
          compact ? "w-[145px] sm:w-[175px]" : "w-[210px] sm:w-[250px]"
        }`}
      />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>

        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-600">
          Live
        </span>
      </div>

      <div className="mt-3 text-2xl font-black text-slate-950">
        {value}
      </div>

      <div className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        {text}
      </p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [posterStep, setPosterStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosterStep((current) => (current >= 3 ? 0 : current + 1));
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  const goToLogin = () => router.push("/login");
  const goToRegister = () => router.push("/register");
  const goToContact = () => router.push("/contact");

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex items-center"
          >
            <BrandLogo compact />
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Features
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("posters")}
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Posters
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("how")}
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              How It Works
            </button>

            <button
              type="button"
              onClick={goToContact}
              className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
            >
              Contact
            </button>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </button>

            <button
              type="button"
              onClick={goToRegister}
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              Get Started
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white lg:hidden"
            aria-label="Open menu"
          >
            <div className="space-y-1.5">
              <span className="block h-0.5 w-5 bg-slate-800" />
              <span className="block h-0.5 w-5 bg-slate-800" />
              <span className="block h-0.5 w-5 bg-slate-800" />
            </div>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="rounded-xl px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
              >
                Features
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("posters")}
                className="rounded-xl px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
              >
                Posters
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("how")}
                className="rounded-xl px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
              >
                How It Works
              </button>

              <button
                type="button"
                onClick={goToContact}
                className="rounded-xl px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50"
              >
                Contact
              </button>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="rounded-xl border border-slate-200 px-4 py-3 font-bold"
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={goToRegister}
                  className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}

      <section className="relative overflow-hidden bg-[#f8fafc]">
        <div className="pointer-events-none absolute -left-40 top-12 h-[500px] w-[500px] rounded-full bg-blue-100 blur-3xl" />

        <div className="pointer-events-none absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-orange-100/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-28">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                Smart workspace for agents
              </div>

              <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-tight text-blue-950 sm:text-6xl lg:text-7xl">
                Manage. Grow.
                <span className="block text-orange-500">
                  Succeed.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
                Customers, policies, renewals, follow-ups, teams and marketing
                in one powerful platform.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goToRegister}
                  className="group rounded-2xl bg-blue-700 px-7 py-4 text-base font-black text-white shadow-xl shadow-blue-200 transition hover:-translate-y-1 hover:bg-blue-800"
                >
                  Get Started
                  <span className="ml-2 inline-block transition group-hover:translate-x-1">
                    →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="rounded-2xl border border-blue-200 bg-white px-7 py-4 text-base font-black text-blue-800 shadow-sm transition hover:-translate-y-1"
                >
                  Agent Login
                </button>
              </div>

              <div className="mt-9 flex flex-wrap gap-5 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="text-blue-700">✓</span>
                  Secure
                </span>

                <span className="flex items-center gap-2">
                  <span className="text-blue-700">✓</span>
                  Mobile Friendly
                </span>

                <span className="flex items-center gap-2">
                  <span className="text-blue-700">✓</span>
                  Cloud Based
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-blue-300/20 blur-3xl" />

              <div className="relative animate-[floatCard_6s_ease-in-out_infinite] rounded-[32px] border border-white bg-white p-4 shadow-2xl shadow-slate-300/60">
                <div className="rounded-[24px] border border-slate-100 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">
                        Dashboard
                      </div>

                      <div className="mt-1 text-xl font-black text-blue-950">
                        Good morning, Agent 👋
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Here&apos;s what&apos;s happening today.
                      </div>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-black text-blue-700">
                      A
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard icon="👥" value="248" label="Customers" />
                    <StatCard icon="📄" value="316" label="Policies" />
                    <StatCard icon="🔄" value="18" label="Renewals" />
                    <StatCard icon="📞" value="12" label="Follow-ups" />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_.7fr]">
                    <div className="rounded-2xl bg-slate-50 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black">
                            Business Overview
                          </div>

                          <div className="text-xs text-slate-400">
                            Last 7 days
                          </div>
                        </div>

                        <div className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600">
                          +18%
                        </div>
                      </div>

                      <div className="mt-6 flex h-28 items-end gap-2">
                        {[35, 50, 43, 66, 57, 79, 94].map(
                          (height, index) => (
                            <div
                              key={index}
                              className="flex-1 rounded-t-xl bg-gradient-to-t from-blue-700 to-blue-400"
                              style={{ height: `${height}%` }}
                            />
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 p-5 text-white">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-200">
                        Today&apos;s Agenda
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-3">
                          <span className="text-xs font-bold">
                            Follow-ups
                          </span>
                          <span className="font-black">4</span>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-3">
                          <span className="text-xs font-bold">
                            Renewals
                          </span>
                          <span className="font-black">2</span>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-3">
                          <span className="text-xs font-bold">
                            Meetings
                          </span>
                          <span className="font-black">3</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}

      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                Everything you need
              </div>

              <h2 className="mt-4 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">
                All in one place.
              </h2>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={50}>
              <FeatureCard
                icon="👥"
                title="Customers"
                text="Keep customer information organised and ready when you need it."
              />
            </Reveal>

            <Reveal delay={100}>
              <FeatureCard
                icon="📄"
                title="Policies"
                text="Manage policy details and important insurance information."
              />
            </Reveal>

            <Reveal delay={150}>
              <FeatureCard
                icon="🔄"
                title="Renewals"
                text="Stay ahead of upcoming renewals and customer opportunities."
              />
            </Reveal>

            <Reveal delay={200}>
              <FeatureCard
                icon="📞"
                title="Follow-ups"
                text="Track important calls and conversations with less effort."
              />
            </Reveal>

            <Reveal delay={250}>
              <FeatureCard
                icon="✨"
                title="Marketing Posters"
                text="Create personalised marketing posters ready to share."
              />
            </Reveal>

            <Reveal delay={300}>
              <FeatureCard
                icon="🤝"
                title="Sub-Agents"
                text="Organise your team and support your growing business."
              />
            </Reveal>

            <Reveal delay={350}>
              <FeatureCard
                icon="💳"
                title="Wallet"
                text="Track contributor credits and platform rewards."
              />
            </Reveal>

            <Reveal delay={400}>
              <FeatureCard
                icon="📈"
                title="Business View"
                text="See important activity from one clean dashboard."
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* POSTERS */}

      <section
        id="posters"
        className="relative overflow-hidden bg-slate-50 py-24"
      >
        <div className="pointer-events-none absolute -right-40 top-20 h-[420px] w-[420px] rounded-full bg-orange-100 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                Poster Studio
              </div>

              <h2 className="mt-4 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">
                Professional posters.
                <span className="block text-orange-500">
                  Personalised for you.
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Choose. Personalise. Download. Share.
              </p>

              <button
                type="button"
                onClick={goToLogin}
                className="mt-9 rounded-2xl bg-blue-700 px-7 py-4 font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-800"
              >
                Explore Poster Studio →
              </button>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-10 rounded-full bg-blue-300/20 blur-3xl" />

              <div className="relative overflow-hidden rounded-[32px] border border-white bg-white p-4 shadow-2xl">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-800 via-blue-700 to-blue-950 p-7 text-white">
                  <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border-[40px] border-white/10" />

                  <div>
                    <div className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                      Insurance Awareness
                    </div>

                    <h3 className="mt-7 text-3xl font-black leading-tight">
                      Protect what
                      <br />
                      matters most.
                    </h3>

                    <p className="mt-4 max-w-xs text-sm leading-6 text-blue-100">
                      Clean professional marketing content for your customers.
                    </p>
                  </div>

                  <div
                    className={`absolute bottom-5 left-5 right-5 rounded-2xl bg-white p-4 text-slate-950 shadow-xl transition-all duration-700 ${
                      posterStep >= 1
                        ? "translate-y-0 opacity-100"
                        : "translate-y-10 opacity-0"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl transition-all duration-700 ${
                          posterStep >= 1 ? "scale-100" : "scale-50"
                        }`}
                      >
                        👤
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-black transition ${
                            posterStep >= 2 ? "opacity-100" : "opacity-30"
                          }`}
                        >
                          YOUR NAME
                        </div>

                        <div className="text-[10px] font-bold text-slate-500">
                          Insurance Specialist
                        </div>

                        <div
                          className={`mt-1 text-xs font-black text-blue-700 transition ${
                            posterStep >= 2 ? "opacity-100" : "opacity-30"
                          }`}
                        >
                          +91 XXXXX XXXXX
                        </div>
                      </div>

                      <div
                        className={`flex h-12 w-20 items-center justify-center rounded-xl border border-slate-200 text-center text-[9px] font-black text-slate-400 transition ${
                          posterStep >= 3
                            ? "scale-100 opacity-100"
                            : "scale-75 opacity-20"
                        }`}
                      >
                        COMPANY
                        <br />
                        LOGO
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-center gap-2">
                {["Poster", "Photo", "Details", "Logo"].map(
                  (label, index) => (
                    <div
                      key={label}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black transition ${
                        posterStep === index
                          ? "bg-orange-500 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {label}
                    </div>
                  )
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section id="how" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                How it works
              </div>

              <h2 className="mt-4 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">
                Simple from day one.
              </h2>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["01", "Register"],
              ["02", "Setup Profile"],
              ["03", "Add Customers"],
              ["04", "Manage Follow-ups"],
              ["05", "Grow Business"],
            ].map(([number, title], index) => (
              <Reveal key={number} delay={index * 80}>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 text-center transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 font-black text-white">
                    {number}
                  </div>

                  <div className="mt-5 font-black text-blue-950">
                    {title}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}

      <section className="bg-white px-5 py-20 lg:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-800 via-blue-700 to-blue-950 px-6 py-16 text-center text-white shadow-2xl sm:px-12">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full border-[45px] border-white/10" />

            <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full border-[45px] border-orange-400/20" />

            <div className="relative mx-auto max-w-3xl">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Agents India
              </div>

              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Your insurance business
                <span className="block text-orange-400">
                  deserves better tools.
                </span>
              </h2>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goToRegister}
                  className="rounded-2xl bg-orange-500 px-8 py-4 font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-orange-600"
                >
                  Create Account
                </button>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 font-black text-white backdrop-blur transition hover:bg-white/20"
                >
                  Agent Login
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <BrandLogo />

            <div className="flex flex-wrap gap-6 text-sm font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="hover:text-blue-700"
              >
                Features
              </button>

              <button
                type="button"
                onClick={() => scrollToSection("posters")}
                className="hover:text-blue-700"
              >
                Posters
              </button>

              <button
                type="button"
                onClick={goToContact}
                className="hover:text-blue-700"
              >
                Contact
              </button>

              <button
                type="button"
                onClick={goToLogin}
                className="hover:text-blue-700"
              >
                Login
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} Agents India. All rights reserved.
            </span>

            <span>
              Empowering Insurance Professionals
            </span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes floatCard {
          0%,
          100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </main>
  );
}
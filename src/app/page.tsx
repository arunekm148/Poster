"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ============================================================
   SCROLL REVEAL
============================================================ */

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
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0"
      }`}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   BRAND LOGO
============================================================ */

function BrandLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <Image
      src="/agents-india-logo.png"
      alt="Agents India"
      width={compact ? 180 : 270}
      height={compact ? 70 : 120}
      priority
      className={
        compact
          ? "h-auto w-[122px] object-contain sm:w-[150px] lg:w-[170px]"
          : "h-auto w-[185px] object-contain sm:w-[220px] lg:w-[250px]"
      }
    />
  );
}

/* ============================================================
   DASHBOARD STAT
============================================================ */

function StatCard({
  icon,
  value,
  label,
  tone = "blue",
}: {
  icon: string;
  value: string;
  label: string;
  tone?: "blue" | "orange" | "green" | "violet";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${styles[tone]}`}
      >
        {icon}
      </div>

      <div className="mt-3 text-xl font-black text-slate-950 sm:text-2xl">
        {value}
      </div>

      <div className="mt-1 text-[11px] font-bold text-slate-500 sm:text-xs">
        {label}
      </div>
    </div>
  );
}

/* ============================================================
   FEATURE CARD
============================================================ */

function FeatureCard({
  icon,
  title,
  text,
  orange = false,
}: {
  icon: string;
  title: string;
  text: string;
  orange?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
          orange
            ? "bg-orange-50 text-orange-600"
            : "bg-blue-50 text-blue-700"
        }`}
      >
        {icon}
      </div>

      <h3 className="mt-4 text-base font-black text-blue-950 sm:text-lg">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}

/* ============================================================
   STEP
============================================================ */

function StepCard({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:block sm:p-6 sm:text-center">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-black text-white sm:mx-auto sm:h-12 sm:w-12">
        {number}
      </div>

      <div className="font-black text-blue-950 sm:mt-4">
        {title}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN
============================================================ */

export default function Home() {
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [posterStep, setPosterStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosterStep((current) =>
        current >= 3 ? 0 : current + 1
      );
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  const goToLogin = () => router.push("/login");
  const goToRegister = () => router.push("/register");
  const goToContact = () => router.push("/contact");

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-white pb-[88px] text-slate-900 lg:pb-0">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between px-4 py-2 sm:px-5 lg:px-8">
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            aria-label="Agents India home"
            className="flex items-center"
          >
            <BrandLogo compact />
          </button>

          {/* DESKTOP NAV */}

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
              className="min-h-[46px] rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Login
            </button>

            <button
              type="button"
              onClick={goToRegister}
              className="min-h-[46px] rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800"
            >
              Register
            </button>
          </div>

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((current) => !current)
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white lg:hidden"
            aria-label="Open navigation"
          >
            <div className="space-y-1.5">
              <span className="block h-0.5 w-5 rounded bg-slate-800" />
              <span className="block h-0.5 w-5 rounded bg-slate-800" />
              <span className="block h-0.5 w-5 rounded bg-slate-800" />
            </div>
          </button>
        </div>

        {/* MOBILE MENU */}

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <button
                type="button"
                onClick={() =>
                  scrollToSection("features")
                }
                className="min-h-[48px] rounded-xl px-4 text-left font-bold text-slate-700 hover:bg-slate-50"
              >
                Features
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection("posters")
                }
                className="min-h-[48px] rounded-xl px-4 text-left font-bold text-slate-700 hover:bg-slate-50"
              >
                Poster Studio
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection("how")
                }
                className="min-h-[48px] rounded-xl px-4 text-left font-bold text-slate-700 hover:bg-slate-50"
              >
                How It Works
              </button>

              <button
                type="button"
                onClick={goToContact}
                className="min-h-[48px] rounded-xl px-4 text-left font-bold text-slate-700 hover:bg-slate-50"
              >
                Contact Us
              </button>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="min-h-[48px] rounded-xl border border-slate-200 font-black text-blue-800"
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={goToRegister}
                  className="min-h-[48px] rounded-xl bg-blue-700 font-black text-white"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden bg-[#f8fafc]">
        <div className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-blue-100 blur-3xl sm:h-[450px] sm:w-[450px]" />

        <div className="pointer-events-none absolute -right-36 top-0 h-80 w-80 rounded-full bg-orange-100/70 blur-3xl sm:h-[450px] sm:w-[450px]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-10 sm:px-5 sm:pb-20 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <Reveal>
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-blue-700 shadow-sm sm:px-4 sm:text-xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
                Smart workspace for insurance agents
              </div>

              <h1 className="mx-auto mt-6 max-w-xl text-[42px] font-black leading-[0.98] tracking-tight text-blue-950 sm:text-6xl lg:mx-0 lg:text-7xl">
                Manage.
                <br className="sm:hidden" />
                {" "}Track.
                <span className="block text-orange-500">
                  Grow.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 lg:mx-0">
                Customers, policies, renewals, EMI follow-ups,
                marketing and teams — all in one place.
              </p>

              <div className="mx-auto mt-7 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2 lg:mx-0">
                <button
                  type="button"
                  onClick={goToRegister}
                  className="min-h-[54px] rounded-2xl bg-blue-700 px-6 text-base font-black text-white shadow-xl shadow-blue-200 transition active:scale-[0.98] sm:hover:-translate-y-1 sm:hover:bg-blue-800"
                >
                  Register Now →
                </button>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="min-h-[54px] rounded-2xl border border-blue-200 bg-white px-6 text-base font-black text-blue-800 shadow-sm transition active:scale-[0.98]"
                >
                  Agent Login
                </button>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-slate-500 sm:text-xs lg:justify-start">
                <span>✓ Secure</span>
                <span>✓ Mobile Friendly</span>
                <span>✓ Cloud Based</span>
              </div>
            </div>
          </Reveal>

          {/* DASHBOARD PREVIEW */}

          <Reveal delay={120}>
            <div className="relative mx-auto w-full max-w-[620px]">
              <div className="absolute -inset-6 rounded-full bg-blue-300/20 blur-3xl" />

              <div className="relative rounded-[26px] border border-white bg-white p-3 shadow-2xl shadow-slate-300/60 sm:p-4 lg:animate-[floatCard_6s_ease-in-out_infinite]">
                <div className="rounded-[20px] border border-slate-100 bg-white p-4 sm:rounded-[24px] sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 sm:text-xs">
                        Dashboard
                      </div>

                      <div className="mt-1 text-base font-black text-blue-950 sm:text-xl">
                        Good morning 👋
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                        Your business at a glance
                      </div>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 font-black text-blue-700 sm:h-10 sm:w-10">
                      A
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <StatCard
                      icon="👥"
                      value="248"
                      label="Customers"
                      tone="blue"
                    />

                    <StatCard
                      icon="🔄"
                      value="18"
                      label="Renewals"
                      tone="orange"
                    />

                    <StatCard
                      icon="₹"
                      value="23"
                      label="EMI Follow-ups"
                      tone="green"
                    />

                    <StatCard
                      icon="📞"
                      value="12"
                      label="Follow-ups"
                      tone="violet"
                    />
                  </div>

                  <div className="mt-3 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-950 p-4 text-white sm:mt-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-200">
                          Today
                        </div>

                        <div className="mt-1 text-lg font-black">
                          Priority Follow-ups
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black">
                        09
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-white/10 px-3 py-3 text-xs font-bold">
                        📞 4 Customer Calls
                      </div>

                      <div className="rounded-xl bg-white/10 px-3 py-3 text-xs font-bold">
                        🔄 2 Renewals
                      </div>

                      <div className="rounded-xl bg-white/10 px-3 py-3 text-xs font-bold">
                        ₹ 3 EMI Dues
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================================================
          FEATURES
      ====================================================== */}

      <section
        id="features"
        className="bg-white py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 sm:text-xs">
                Everything you need
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-5xl">
                One smart platform.
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
            <Reveal delay={40}>
              <FeatureCard
                icon="👥"
                title="Customer Management"
                text="Keep customer details organised and accessible."
              />
            </Reveal>

            <Reveal delay={80}>
              <FeatureCard
                icon="📄"
                title="Policies"
                text="Manage policy information from one workspace."
              />
            </Reveal>

            <Reveal delay={120}>
              <FeatureCard
                icon="🔄"
                title="Renewals"
                text="Stay ahead of upcoming renewals and opportunities."
                orange
              />
            </Reveal>

            <Reveal delay={160}>
              <FeatureCard
                icon="📞"
                title="Follow-ups"
                text="Track important calls and customer conversations."
              />
            </Reveal>

            <Reveal delay={200}>
              <FeatureCard
                icon="₹"
                title="EMI Follow-up"
                text="Track EMI due dates and follow up with customers on time."
                orange
              />
            </Reveal>

            <Reveal delay={240}>
              <FeatureCard
                icon="✨"
                title="Marketing Posters"
                text="Personalise professional posters and share instantly."
              />
            </Reveal>

            <Reveal delay={280}>
              <FeatureCard
                icon="🤝"
                title="Sub-Agents & Staff"
                text="Organise your team as your business grows."
              />
            </Reveal>

            <Reveal delay={320}>
              <FeatureCard
                icon="📈"
                title="Business Dashboard"
                text="See important business activity in one clean view."
                orange
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ======================================================
          EMI SECTION
      ====================================================== */}

      <section className="bg-slate-50 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <Reveal>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 sm:text-xs">
                EMI Follow-up
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-5xl">
                Never lose track
                <span className="block text-orange-500">
                  of EMI dues.
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Track due dates, follow up at the right time and keep
                customer commitments organised.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  "Track EMI due dates",
                  "See upcoming customer follow-ups",
                  "Keep collection conversations organised",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm font-bold text-slate-700"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      ✓
                    </div>

                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="rounded-[26px] bg-blue-950 p-4 shadow-xl sm:p-6">
              <div className="mb-4 flex items-center justify-between text-white">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-blue-300">
                    EMI Follow-ups
                  </div>

                  <div className="mt-1 text-xl font-black">
                    Upcoming dues
                  </div>
                </div>

                <div className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-black">
                  23
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Customer A", "Due Today", "₹"],
                  ["Customer B", "Due Tomorrow", "₹"],
                  ["Customer C", "Due in 3 Days", "₹"],
                ].map(([name, due, icon]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-2xl bg-white p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 font-black text-orange-600">
                      {icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-blue-950">
                        {name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {due}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
                      aria-label="Call customer"
                    >
                      📞
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================================================
          POSTER STUDIO
      ====================================================== */}

      <section
        id="posters"
        className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24"
      >
        <div className="pointer-events-none absolute -right-40 top-20 h-[350px] w-[350px] rounded-full bg-orange-100 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <div className="text-center lg:text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 sm:text-xs">
                Poster Studio
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-5xl">
                Professional posters.
                <span className="block text-orange-500">
                  Personalised for you.
                </span>
              </h2>

              <p className="mt-5 text-base font-semibold text-slate-600 sm:text-lg">
                Choose. Personalise. Download. Share.
              </p>

              <button
                type="button"
                onClick={goToLogin}
                className="mt-7 min-h-[52px] w-full rounded-2xl bg-blue-700 px-6 font-black text-white shadow-lg transition active:scale-[0.98] sm:w-auto sm:hover:bg-blue-800"
              >
                Explore Poster Studio →
              </button>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="relative mx-auto w-full max-w-[390px]">
              <div className="absolute -inset-8 rounded-full bg-blue-300/20 blur-3xl" />

              <div className="relative overflow-hidden rounded-[28px] border border-white bg-white p-3 shadow-2xl sm:p-4">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[21px] bg-gradient-to-br from-blue-800 via-blue-700 to-blue-950 p-5 text-white sm:rounded-[24px] sm:p-7">
                  <div className="absolute -right-24 -top-24 h-60 w-60 rounded-full border-[36px] border-white/10" />

                  <div>
                    <div className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider">
                      Insurance Awareness
                    </div>

                    <h3 className="mt-5 text-2xl font-black leading-tight sm:mt-7 sm:text-3xl">
                      Protect what
                      <br />
                      matters most.
                    </h3>

                    <p className="mt-3 max-w-[240px] text-xs leading-5 text-blue-100 sm:text-sm sm:leading-6">
                      Professional marketing content for your customers.
                    </p>
                  </div>

                  <div
                    className={`absolute bottom-4 left-4 right-4 rounded-2xl bg-white p-3 text-slate-950 shadow-xl transition-all duration-700 sm:bottom-5 sm:left-5 sm:right-5 sm:p-4 ${
                      posterStep >= 1
                        ? "translate-y-0 opacity-100"
                        : "translate-y-8 opacity-0"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg transition-all duration-500 sm:h-14 sm:w-14 ${
                          posterStep >= 1
                            ? "scale-100"
                            : "scale-50"
                        }`}
                      >
                        👤
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-sm font-black transition sm:text-base ${
                            posterStep >= 2
                              ? "opacity-100"
                              : "opacity-30"
                          }`}
                        >
                          YOUR NAME
                        </div>

                        <div className="text-[9px] font-bold text-slate-500 sm:text-[10px]">
                          Insurance Specialist
                        </div>

                        <div
                          className={`mt-1 text-[10px] font-black text-blue-700 transition sm:text-xs ${
                            posterStep >= 2
                              ? "opacity-100"
                              : "opacity-30"
                          }`}
                        >
                          +91 XXXXX XXXXX
                        </div>
                      </div>

                      <div
                        className={`flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-center text-[7px] font-black text-slate-400 transition sm:h-12 sm:w-20 sm:text-[9px] ${
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

              <div className="mt-4 flex justify-center gap-1.5 sm:gap-2">
                {[
                  "Poster",
                  "Photo",
                  "Details",
                  "Logo",
                ].map((label, index) => (
                  <div
                    key={label}
                    className={`rounded-full px-2.5 py-1.5 text-[9px] font-black transition sm:px-3 sm:text-[10px] ${
                      posterStep === index
                        ? "bg-orange-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================================================
          HOW IT WORKS
      ====================================================== */}

      <section
        id="how"
        className="bg-slate-50 py-16 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 sm:text-xs">
                How it works
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-blue-950 sm:text-5xl">
                Simple from day one.
              </h2>
            </div>
          </Reveal>

          <div className="mt-9 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-5">
            <StepCard
              number="01"
              title="Register"
            />

            <StepCard
              number="02"
              title="Setup Profile"
            />

            <StepCard
              number="03"
              title="Add Customers"
            />

            <StepCard
              number="04"
              title="Track Follow-ups"
            />

            <StepCard
              number="05"
              title="Grow Business"
            />
          </div>
        </div>
      </section>

      {/* ======================================================
          CTA
      ====================================================== */}

      <section className="bg-white px-4 py-16 sm:px-5 sm:py-20 lg:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-800 via-blue-700 to-blue-950 px-5 py-12 text-center text-white shadow-2xl sm:rounded-[36px] sm:px-12 sm:py-16">
            <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full border-[40px] border-white/10" />

            <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full border-[40px] border-orange-400/20" />

            <div className="relative mx-auto max-w-3xl">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300 sm:text-xs">
                Agents India
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Work smarter.
                <span className="block text-orange-400">
                  Grow faster.
                </span>
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                Bring your customers, renewals, EMI follow-ups and
                marketing into one organised workspace.
              </p>

              <div className="mt-7 grid gap-3 sm:flex sm:justify-center">
                <button
                  type="button"
                  onClick={goToRegister}
                  className="min-h-[52px] rounded-2xl bg-orange-500 px-7 font-black text-white shadow-lg transition active:scale-[0.98] sm:hover:bg-orange-600"
                >
                  Register Now
                </button>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="min-h-[52px] rounded-2xl border border-white/30 bg-white/10 px-7 font-black text-white backdrop-blur transition active:scale-[0.98]"
                >
                  Agent Login
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-5 lg:px-8">
          <div className="flex flex-col items-center gap-7 text-center md:flex-row md:justify-between md:text-left">
            <BrandLogo />

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-500">
              <button
                type="button"
                onClick={() =>
                  scrollToSection("features")
                }
                className="hover:text-blue-700"
              >
                Features
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection("posters")
                }
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

          <div className="mt-7 border-t border-slate-200 pt-6 text-center text-[11px] leading-5 text-slate-400 sm:flex sm:items-center sm:justify-between sm:text-left">
            <span>
              ©️ {new Date().getFullYear()} Agents India.
              All rights reserved.
            </span>

            <span className="mt-1 block sm:mt-0">
              Empowering Insurance Professionals
            </span>
          </div>
        </div>
      </footer>

      {/* ======================================================
          MOBILE STICKY ACTION BAR
      ====================================================== */}

      <div
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 px-3 pt-2 shadow-[0_-8px_25px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
        style={{
          paddingBottom:
            "max(10px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
          <button
            type="button"
            onClick={goToLogin}
            className="min-h-[50px] rounded-xl border border-blue-200 bg-white text-sm font-black text-blue-800 active:scale-[0.98]"
          >
            Agent Login
          </button>

          <button
            type="button"
            onClick={goToRegister}
            className="min-h-[50px] rounded-xl bg-orange-500 text-sm font-black text-white shadow-md active:scale-[0.98]"
          >
            Register →
          </button>
        </div>
      </div>

      {/* ======================================================
          GLOBAL STYLES
      ====================================================== */}

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
          -webkit-text-size-adjust: 100%;
        }

        body {
          overflow-x: hidden;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
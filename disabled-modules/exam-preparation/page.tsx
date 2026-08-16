"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

type ExamCategory = {
  id: string;
  name: string;
  description: string;
  emoji: string;
};

type PracticeMode = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  questions: number;
};

/* -------------------------------------------------------------------------- */
/* LANGUAGES                                                                  */
/* -------------------------------------------------------------------------- */

const languages: Language[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
  },
  {
    code: "or",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
  },
  {
    code: "as",
    name: "Assamese",
    nativeName: "অসমীয়া",
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
  },
  {
    code: "ne",
    name: "Nepali",
    nativeName: "नेपाली",
  },
  {
    code: "sa",
    name: "Sanskrit",
    nativeName: "संस्कृतम्",
  },
  {
    code: "sd",
    name: "Sindhi",
    nativeName: "सिन्धी",
  },
  {
    code: "kok",
    name: "Konkani",
    nativeName: "कोंकणी",
  },
  {
    code: "mni",
    name: "Manipuri",
    nativeName: "মৈতৈলোন্",
  },
  {
    code: "brx",
    name: "Bodo",
    nativeName: "बड़ो",
  },
  {
    code: "doi",
    name: "Dogri",
    nativeName: "डोगरी",
  },
  {
    code: "mai",
    name: "Maithili",
    nativeName: "मैथिली",
  },
  {
    code: "ks",
    name: "Kashmiri",
    nativeName: "कॉशुर",
  },
  {
    code: "sat",
    name: "Santali",
    nativeName: "ᱥᱟᱱᱛᱟᱲᱤ",
  },
];

/* -------------------------------------------------------------------------- */
/* EXAM CATEGORIES                                                            */
/* -------------------------------------------------------------------------- */

const examCategories: ExamCategory[] = [
  {
    id: "LIFE",
    name: "Life Insurance",
    description:
      "Life insurance concepts, products, regulations and customer service.",
    emoji: "❤️",
  },
  {
    id: "GENERAL",
    name: "General Insurance",
    description:
      "Motor, property, liability and general insurance fundamentals.",
    emoji: "🚗",
  },
  {
    id: "HEALTH",
    name: "Health Insurance",
    description:
      "Health products, claims, underwriting and policy servicing.",
    emoji: "🏥",
  },
  {
    id: "COMPOSITE",
    name: "Composite",
    description:
      "Combined preparation across major insurance categories.",
    emoji: "📚",
  },
];

/* -------------------------------------------------------------------------- */
/* PRACTICE MODES                                                             */
/* -------------------------------------------------------------------------- */

const practiceModes: PracticeMode[] = [
  {
    id: "STUDY",
    title: "Study Mode",
    description:
      "Learn chapter-by-chapter with answers and explanations.",
    emoji: "📖",
    questions: 0,
  },
  {
    id: "QUICK",
    title: "Quick Practice",
    description:
      "Practice 10 questions for a short revision session.",
    emoji: "⚡",
    questions: 10,
  },
  {
    id: "CHAPTER",
    title: "Chapter Test",
    description:
      "Test yourself on one selected chapter.",
    emoji: "📝",
    questions: 25,
  },
  {
    id: "MOCK",
    title: "Full Mock Exam",
    description:
      "Timed examination experience with final score.",
    emoji: "🎯",
    questions: 50,
  },
  {
    id: "WRONG",
    title: "Wrong Answers",
    description:
      "Practice questions you previously answered incorrectly.",
    emoji: "❌",
    questions: 0,
  },
  {
    id: "BOOKMARKS",
    title: "Bookmarked Questions",
    description:
      "Revise questions you marked as important.",
    emoji: "⭐",
    questions: 0,
  },
];

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function ExamPreparationPage() {
  const [language, setLanguage] =
    useState("en");

  const [category, setCategory] =
    useState("LIFE");

  const [searchLanguage, setSearchLanguage] =
    useState("");

  const selectedLanguage =
    useMemo(
      () =>
        languages.find(
          (item) =>
            item.code === language
        ),
      [language]
    );

  const selectedCategory =
    useMemo(
      () =>
        examCategories.find(
          (item) =>
            item.id === category
        ),
      [category]
    );

  const filteredLanguages =
    useMemo(() => {
      const value =
        searchLanguage
          .trim()
          .toLowerCase();

      if (!value) {
        return languages;
      }

      return languages.filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(value) ||
          item.nativeName
            .toLowerCase()
            .includes(value)
      );
    }, [searchLanguage]);

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white shadow-sm">

        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">

          <div className="flex items-center gap-3">

            <Link
              href="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Agent Learning Centre
              </p>

              <h1 className="text-2xl font-black">
                🎓 Exam Preparation
              </h1>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Study, practice and prepare for insurance examinations.
              </p>

            </div>

          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">

            <p className="text-xs font-black uppercase text-emerald-700">
              Selected Language
            </p>

            <p className="font-black text-emerald-950">
              {selectedLanguage?.nativeName}
            </p>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">

        {/* SUMMARY */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          <SummaryCard
            emoji="📝"
            label="Practice Tests"
            value="0"
          />

          <SummaryCard
            emoji="🎯"
            label="Mock Exams"
            value="0"
          />

          <SummaryCard
            emoji="📊"
            label="Best Score"
            value="0%"
          />

          <SummaryCard
            emoji="🔥"
            label="Study Streak"
            value="0 Days"
          />

        </div>

        {/* EXAM */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div>

            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Examination
            </p>

            <h2 className="mt-1 text-xl font-black">
              IC-38 Insurance Agent Preparation
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Choose the insurance category you want to prepare.
            </p>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {examCategories.map(
              (item) => {
                const active =
                  category === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() =>
                      setCategory(
                        item.id
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >

                    <div className="text-3xl">
                      {item.emoji}
                    </div>

                    <p className="mt-3 font-black">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {item.description}
                    </p>

                    {active && (
                      <p className="mt-3 text-xs font-black text-blue-700">
                        ✓ Selected
                      </p>
                    )}

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* LANGUAGE */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-wrap items-end justify-between gap-3">

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                Language
              </p>

              <h2 className="mt-1 text-xl font-black">
                Choose Preparation Language
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                The platform is designed to support multiple Indian languages.
              </p>

            </div>

            <input
              value={searchLanguage}
              onChange={(event) =>
                setSearchLanguage(
                  event.target.value
                )
              }
              placeholder="Search language..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none sm:w-64"
            />

          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">

            {filteredLanguages.map(
              (item) => {
                const active =
                  item.code ===
                  language;

                return (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() =>
                      setLanguage(
                        item.code
                      )
                    }
                    className={`rounded-xl border p-3 text-left ${
                      active
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 bg-slate-50 hover:border-violet-300"
                    }`}
                  >

                    <p className="font-black">
                      {item.nativeName}
                    </p>

                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      {item.name}
                    </p>

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* CURRENT SELECTION */}

        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Current Preparation
          </p>

          <p className="mt-1 text-lg font-black text-blue-950">
            {selectedCategory?.emoji}{" "}
            {selectedCategory?.name}
            {" • "}
            {selectedLanguage?.nativeName}
          </p>

        </div>

        {/* PRACTICE */}

        <div className="mt-6">

          <div>

            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Preparation Modes
            </p>

            <h2 className="mt-1 text-xl font-black">
              Start Learning
            </h2>

          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {practiceModes.map(
              (mode) => (
                <PracticeCard
                  key={mode.id}
                  mode={mode}
                  category={category}
                  language={language}
                />
              )
            )}

          </div>

        </div>

        {/* PROGRESS */}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-black uppercase tracking-wide text-orange-700">
              📊 My Progress
            </p>

            <h2 className="mt-1 text-lg font-black">
              Preparation Performance
            </h2>

            <div className="mt-5 space-y-4">

              <ProgressLine
                label="Overall Accuracy"
                value={0}
              />

              <ProgressLine
                label="Life Insurance"
                value={0}
              />

              <ProgressLine
                label="General Insurance"
                value={0}
              />

              <ProgressLine
                label="Health Insurance"
                value={0}
              />

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              🎯 Smart Revision
            </p>

            <h2 className="mt-1 text-lg font-black">
              Focus Areas
            </h2>

            <div className="mt-5 space-y-3">

              <InfoBox
                emoji="❌"
                title="Wrong Answer Practice"
                text="Questions answered incorrectly will appear here automatically."
              />

              <InfoBox
                emoji="⭐"
                title="Bookmarked Questions"
                text="Save difficult questions for future revision."
              />

              <InfoBox
                emoji="🧠"
                title="Weak Chapters"
                text="The system will identify chapters where your score is low."
              />

            </div>

          </div>

        </div>

        {/* OFFICIAL RESOURCES */}

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="text-xs font-black uppercase tracking-wide text-amber-700">
            Official Study Resources
          </p>

          <h2 className="mt-1 text-lg font-black text-amber-950">
            Insurance Exam Learning Material
          </h2>

          <p className="mt-2 text-sm font-semibold text-amber-800">
            Official study materials and model question-bank links can be
            maintained here by the platform administrator.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">

            <button
              type="button"
              className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-black text-white"
            >
              📘 Study Material
            </button>

            <button
              type="button"
              className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-black text-amber-800"
            >
              📝 Model Questions
            </button>

          </div>

        </div>

      </section>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="text-2xl">
        {emoji}
      </div>

      <p className="mt-2 text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>

    </div>
  );
}

function PracticeCard({
  mode,
  category,
  language,
}: {
  mode: PracticeMode;
  category: string;
  language: string;
}) {
  const href =
    `/exam-preparation/practice?mode=${encodeURIComponent(
      mode.id
    )}&category=${encodeURIComponent(
      category
    )}&language=${encodeURIComponent(
      language
    )}`;

  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >

      <div className="text-3xl">
        {mode.emoji}
      </div>

      <h3 className="mt-3 text-lg font-black">
        {mode.title}
      </h3>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {mode.description}
      </p>

      {mode.questions > 0 && (
        <p className="mt-3 text-xs font-black text-blue-700">
          {mode.questions} Questions
        </p>
      )}

      <p className="mt-4 text-sm font-black text-blue-700">
        Start →
      </p>

    </Link>
  );
}

function ProgressLine({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>

      <div className="mb-1 flex items-center justify-between gap-3">

        <span className="text-sm font-bold text-slate-700">
          {label}
        </span>

        <span className="text-sm font-black">
          {value}%
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-blue-600"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                value
              )
            )}%`,
          }}
        />

      </div>

    </div>
  );
}

function InfoBox({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex gap-3">

        <div className="text-2xl">
          {emoji}
        </div>

        <div>

          <p className="font-black">
            {title}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {text}
          </p>

        </div>

      </div>

    </div>
  );
}
"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Question = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  chapter: string;
};

type AnswerMap = Record<
  string,
  number
>;

/* -------------------------------------------------------------------------- */
/* DEMO QUESTIONS                                                             */
/* -------------------------------------------------------------------------- */

const demoQuestions: Question[] = [
  {
    id: "Q1",
    question:
      "What is the primary purpose of insurance?",
    options: [
      "To increase investment risk",
      "To provide financial protection against specified risks",
      "To guarantee profit",
      "To avoid all taxes",
    ],
    correctAnswer: 1,
    explanation:
      "Insurance provides financial protection against specified risks and losses.",
    category: "LIFE",
    chapter: "Insurance Basics",
  },
  {
    id: "Q2",
    question:
      "Which principle requires the insured to disclose all material facts?",
    options: [
      "Contribution",
      "Subrogation",
      "Utmost Good Faith",
      "Indemnity",
    ],
    correctAnswer: 2,
    explanation:
      "The principle of utmost good faith requires full disclosure of material facts.",
    category: "LIFE",
    chapter: "Principles of Insurance",
  },
  {
    id: "Q3",
    question:
      "In health insurance, a waiting period generally means:",
    options: [
      "The policy is cancelled",
      "Certain benefits are unavailable for a specified initial period",
      "Premium payment is postponed",
      "Claims are always rejected",
    ],
    correctAnswer: 1,
    explanation:
      "A waiting period is a defined initial period during which specified benefits or conditions may not be covered.",
    category: "HEALTH",
    chapter: "Health Policy Terms",
  },
  {
    id: "Q4",
    question:
      "Third-party motor insurance primarily covers:",
    options: [
      "Damage to the insured's own vehicle only",
      "Liability arising from injury or damage caused to third parties",
      "Vehicle servicing costs",
      "Fuel expenses",
    ],
    correctAnswer: 1,
    explanation:
      "Third-party motor insurance covers legal liability for injury or property damage caused to third parties.",
    category: "GENERAL",
    chapter: "Motor Insurance",
  },
  {
    id: "Q5",
    question:
      "A nominee in a life insurance policy is generally the person who:",
    options: [
      "Collects premium from the customer",
      "Receives policy money on the death of the policyholder, subject to applicable law",
      "Approves claims",
      "Issues the policy",
    ],
    correctAnswer: 1,
    explanation:
      "A nominee is designated to receive policy proceeds on death, subject to policy terms and applicable law.",
    category: "LIFE",
    chapter: "Life Insurance Policy",
  },
  {
    id: "Q6",
    question:
      "What is premium in insurance?",
    options: [
      "Amount paid by the insurer to the agent",
      "Amount paid by the policyholder for insurance coverage",
      "Claim settlement amount",
      "Government tax only",
    ],
    correctAnswer: 1,
    explanation:
      "Premium is the amount paid by the policyholder to obtain insurance coverage.",
    category: "COMPOSITE",
    chapter: "Insurance Basics",
  },
  {
    id: "Q7",
    question:
      "Which document usually contains the terms and conditions of insurance coverage?",
    options: [
      "Policy document",
      "Driving licence",
      "PAN card",
      "Bank passbook",
    ],
    correctAnswer: 0,
    explanation:
      "The policy document contains the contract terms, conditions, benefits and exclusions.",
    category: "COMPOSITE",
    chapter: "Policy Documentation",
  },
  {
    id: "Q8",
    question:
      "What does claim settlement mean?",
    options: [
      "Issuing a new policy",
      "Processing and paying an eligible insurance claim",
      "Changing the agent",
      "Increasing premium automatically",
    ],
    correctAnswer: 1,
    explanation:
      "Claim settlement is the process of evaluating and paying an eligible insurance claim.",
    category: "COMPOSITE",
    chapter: "Claims",
  },
  {
    id: "Q9",
    question:
      "An insurance agent should primarily:",
    options: [
      "Hide policy exclusions",
      "Explain suitable products accurately and fairly",
      "Guarantee every claim",
      "Collect money without records",
    ],
    correctAnswer: 1,
    explanation:
      "An insurance agent should explain products accurately, fairly and according to customer needs and applicable rules.",
    category: "COMPOSITE",
    chapter: "Agent Conduct",
  },
  {
    id: "Q10",
    question:
      "A policy exclusion refers to:",
    options: [
      "A benefit always payable",
      "A condition or event not covered by the policy",
      "A premium discount",
      "A customer reward",
    ],
    correctAnswer: 1,
    explanation:
      "An exclusion is a specified condition, event or circumstance that is not covered under the policy.",
    category: "COMPOSITE",
    chapter: "Policy Terms",
  },
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getModeTitle(
  mode: string
) {
  switch (mode) {
    case "STUDY":
      return "Study Mode";

    case "QUICK":
      return "Quick Practice";

    case "CHAPTER":
      return "Chapter Test";

    case "MOCK":
      return "Full Mock Exam";

    case "WRONG":
      return "Wrong Answer Practice";

    case "BOOKMARKS":
      return "Bookmarked Questions";

    default:
      return "Practice";
  }
}

function getLanguageLabel(
  code: string
) {
  const map: Record<
    string,
    string
  > = {
    en: "English",
    ml: "Malayalam",
    hi: "Hindi",
    ta: "Tamil",
    te: "Telugu",
    kn: "Kannada",
    mr: "Marathi",
    gu: "Gujarati",
    bn: "Bengali",
    pa: "Punjabi",
    or: "Odia",
    as: "Assamese",
    ur: "Urdu",
  };

  return (
    map[code] ||
    code.toUpperCase()
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function ExamPracticePage() {
  const searchParams =
    useSearchParams();

  const mode =
    searchParams.get(
      "mode"
    ) || "QUICK";

  const category =
    searchParams.get(
      "category"
    ) || "COMPOSITE";

  const language =
    searchParams.get(
      "language"
    ) || "en";

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    answers,
    setAnswers,
  ] = useState<AnswerMap>(
    {}
  );

  const [
    submitted,
    setSubmitted,
  ] = useState(false);

  const [
    showExplanation,
    setShowExplanation,
  ] = useState(false);

  const [
    bookmarked,
    setBookmarked,
  ] = useState<string[]>(
    []
  );

  const filteredQuestions =
    useMemo(() => {
      const categoryQuestions =
        demoQuestions.filter(
          (question) =>
            question.category ===
              category ||
            question.category ===
              "COMPOSITE" ||
            category ===
              "COMPOSITE"
        );

      if (
        mode ===
        "QUICK"
      ) {
        return categoryQuestions.slice(
          0,
          10
        );
      }

      if (
        mode ===
        "CHAPTER"
      ) {
        return categoryQuestions.slice(
          0,
          10
        );
      }

      if (
        mode ===
        "MOCK"
      ) {
        return categoryQuestions;
      }

      return categoryQuestions;
    }, [
      category,
      mode,
    ]);

  const currentQuestion =
    filteredQuestions[
      currentIndex
    ];

  const answeredCount =
    Object.keys(
      answers
    ).length;

  const score =
    useMemo(() => {
      return filteredQuestions.reduce(
        (
          total,
          question
        ) => {
          const answer =
            answers[
              question.id
            ];

          if (
            answer ===
            question.correctAnswer
          ) {
            return (
              total + 1
            );
          }

          return total;
        },
        0
      );
    }, [
      answers,
      filteredQuestions,
    ]);

  const scorePercent =
    filteredQuestions.length >
    0
      ? Math.round(
          (score /
            filteredQuestions.length) *
            100
        )
      : 0;

  function selectAnswer(
    optionIndex: number
  ) {
    if (
      submitted
    ) {
      return;
    }

    setAnswers(
      (current) => ({
        ...current,
        [currentQuestion.id]:
          optionIndex,
      })
    );

    if (
      mode ===
      "STUDY"
    ) {
      setShowExplanation(
        true
      );
    }
  }

  function nextQuestion() {
    if (
      currentIndex <
      filteredQuestions.length -
        1
    ) {
      setCurrentIndex(
        (index) =>
          index + 1
      );

      setShowExplanation(
        false
      );
    }
  }

  function previousQuestion() {
    if (
      currentIndex >
      0
    ) {
      setCurrentIndex(
        (index) =>
          index - 1
      );

      setShowExplanation(
        false
      );
    }
  }

  function toggleBookmark() {
    if (!currentQuestion) {
      return;
    }

    setBookmarked(
      (current) => {
        if (
          current.includes(
            currentQuestion.id
          )
        ) {
          return current.filter(
            (id) =>
              id !==
              currentQuestion.id
          );
        }

        return [
          ...current,
          currentQuestion.id,
        ];
      }
    );
  }

  function submitExam() {
    setSubmitted(
      true
    );
  }

  function restart() {
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
    setShowExplanation(
      false
    );
  }

  /* ------------------------------------------------------------------------ */
  /* EMPTY                                                                    */
  /* ------------------------------------------------------------------------ */

  if (
    filteredQuestions.length ===
    0
  ) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">

        <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            📚
          </div>

          <h1 className="mt-4 text-xl font-black">
            Questions Not Added Yet
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Questions for this
            exam category will
            appear after the
            Admin question bank
            is connected.
          </p>

          <Link
            href="/exam-preparation"
            className="mt-5 inline-block rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
          >
            ← Exam Preparation
          </Link>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* RESULT                                                                   */
  /* ------------------------------------------------------------------------ */

  if (
    submitted
  ) {
    return (
      <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

        <header className="border-b border-slate-200 bg-white shadow-sm">

          <div className="mx-auto max-w-5xl px-4 py-5">

            <Link
              href="/exam-preparation"
              className="text-sm font-black text-blue-700"
            >
              ← Exam Preparation
            </Link>

            <h1 className="mt-3 text-2xl font-black">
              🎯 Practice Result
            </h1>

          </div>

        </header>

        <section className="mx-auto max-w-5xl px-4 py-6">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">

            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              {
                getModeTitle(
                  mode
                )
              }
            </p>

            <div className="mt-4 text-6xl font-black text-blue-700">
              {scorePercent}%
            </div>

            <p className="mt-2 text-lg font-black">
              {score} /{" "}
              {
                filteredQuestions.length
              }{" "}
              Correct
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              {scorePercent >=
              80
                ? "Excellent preparation."
                : scorePercent >=
                  60
                ? "Good effort. Continue practising weak areas."
                : "More revision is recommended before the exam."}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">

              <button
                type="button"
                onClick={
                  restart
                }
                className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
              >
                🔄 Try Again
              </button>

              <Link
                href="/exam-preparation"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700"
              >
                Exam Preparation
              </Link>

            </div>

          </div>

          <div className="mt-5 space-y-3">

            {filteredQuestions.map(
              (
                question,
                index
              ) => {
                const answer =
                  answers[
                    question.id
                  ];

                const correct =
                  answer ===
                  question.correctAnswer;

                return (
                  <div
                    key={
                      question.id
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >

                    <div className="flex gap-3">

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black ${
                          correct
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {index +
                          1}
                      </div>

                      <div className="min-w-0">

                        <p className="font-black">
                          {
                            question.question
                          }
                        </p>

                        <p className="mt-3 text-sm font-semibold">
                          Your Answer:{" "}
                          <span
                            className={
                              correct
                                ? "text-emerald-700"
                                : "text-red-700"
                            }
                          >
                            {answer ===
                            undefined
                              ? "Not Answered"
                              : question
                                  .options[
                                  answer
                                ]}
                          </span>
                        </p>

                        {!correct && (
                          <p className="mt-2 text-sm font-semibold text-emerald-700">
                            Correct Answer:{" "}
                            {
                              question
                                .options[
                                question.correctAnswer
                              ]
                            }
                          </p>
                        )}

                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                          💡{" "}
                          {
                            question.explanation
                          }
                        </p>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </section>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PRACTICE UI                                                              */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white shadow-sm">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">

          <div>

            <Link
              href="/exam-preparation"
              className="text-sm font-black text-blue-700"
            >
              ← Exam Preparation
            </Link>

            <p className="mt-3 text-xs font-black uppercase tracking-wide text-violet-700">
              {
                getModeTitle(
                  mode
                )
              }
            </p>

            <h1 className="mt-1 text-2xl font-black">
              IC-38 Exam Practice
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {category}
              {" • "}
              {
                getLanguageLabel(
                  language
                )
              }
            </p>

          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">

            <p className="text-xs font-black uppercase text-blue-700">
              Progress
            </p>

            <p className="font-black text-blue-950">
              {answeredCount} /{" "}
              {
                filteredQuestions.length
              }{" "}
              Answered
            </p>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">

        {/* PROGRESS */}

        <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200">

          <div
            className="h-full rounded-full bg-blue-600"
            style={{
              width: `${
                ((currentIndex +
                  1) /
                  filteredQuestions.length) *
                100
              }%`,
            }}
          />

        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">

          {/* QUESTION */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>

                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Question{" "}
                  {currentIndex +
                    1}{" "}
                  of{" "}
                  {
                    filteredQuestions.length
                  }
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {
                    currentQuestion.chapter
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={
                  toggleBookmark
                }
                className={`rounded-xl border px-3 py-2 text-sm font-black ${
                  bookmarked.includes(
                    currentQuestion.id
                  )
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {bookmarked.includes(
                  currentQuestion.id
                )
                  ? "★ Bookmarked"
                  : "☆ Bookmark"}
              </button>

            </div>

            <h2 className="mt-5 text-xl font-black leading-relaxed">
              {
                currentQuestion.question
              }
            </h2>

            <div className="mt-6 space-y-3">

              {currentQuestion.options.map(
                (
                  option,
                  optionIndex
                ) => {
                  const selected =
                    answers[
                      currentQuestion
                        .id
                    ] ===
                    optionIndex;

                  const showResult =
                    mode ===
                      "STUDY" &&
                    showExplanation;

                  const correct =
                    optionIndex ===
                    currentQuestion.correctAnswer;

                  let optionClass =
                    "border-slate-200 bg-white hover:border-blue-300";

                  if (
                    selected
                  ) {
                    optionClass =
                      "border-blue-500 bg-blue-50";
                  }

                  if (
                    showResult &&
                    correct
                  ) {
                    optionClass =
                      "border-emerald-500 bg-emerald-50";
                  }

                  if (
                    showResult &&
                    selected &&
                    !correct
                  ) {
                    optionClass =
                      "border-red-400 bg-red-50";
                  }

                  return (
                    <button
                      key={
                        optionIndex
                      }
                      type="button"
                      onClick={() =>
                        selectAnswer(
                          optionIndex
                        )
                      }
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${optionClass}`}
                    >

                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                          selected
                            ? "border-blue-500 bg-blue-700 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {String.fromCharCode(
                          65 +
                            optionIndex
                        )}
                      </div>

                      <span className="pt-1 text-sm font-semibold">
                        {
                          option
                        }
                      </span>

                    </button>
                  );
                }
              )}

            </div>

            {mode ===
              "STUDY" &&
              showExplanation && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                  <p className="font-black text-emerald-900">
                    💡 Explanation
                  </p>

                  <p className="mt-2 text-sm font-semibold text-emerald-800">
                    {
                      currentQuestion.explanation
                    }
                  </p>

                </div>
              )}

            {/* NAVIGATION */}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">

              <button
                type="button"
                onClick={
                  previousQuestion
                }
                disabled={
                  currentIndex ===
                  0
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-700 disabled:opacity-40"
              >
                ← Previous
              </button>

              {currentIndex <
              filteredQuestions.length -
                1 ? (
                <button
                  type="button"
                  onClick={
                    nextQuestion
                  }
                  className="rounded-xl bg-blue-700 px-5 py-2.5 font-black text-white"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    submitExam
                  }
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 font-black text-white"
                >
                  ✅ Submit Test
                </button>
              )}

            </div>

          </div>

          {/* QUESTION NAVIGATION */}

          <aside className="space-y-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              <p className="font-black">
                Question Navigator
              </p>

              <div className="mt-4 grid grid-cols-5 gap-2">

                {filteredQuestions.map(
                  (
                    question,
                    index
                  ) => {
                    const answered =
                      answers[
                        question.id
                      ] !==
                      undefined;

                    const active =
                      index ===
                      currentIndex;

                    return (
                      <button
                        type="button"
                        key={
                          question.id
                        }
                        onClick={() => {
                          setCurrentIndex(
                            index
                          );

                          setShowExplanation(
                            false
                          );
                        }}
                        className={`flex h-10 items-center justify-center rounded-lg border text-sm font-black ${
                          active
                            ? "border-blue-700 bg-blue-700 text-white"
                            : answered
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {index +
                          1}
                      </button>
                    );
                  }
                )}

              </div>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              <p className="font-black">
                Test Summary
              </p>

              <div className="mt-4 space-y-3 text-sm font-semibold">

                <SummaryRow
                  label="Questions"
                  value={
                    filteredQuestions.length
                  }
                />

                <SummaryRow
                  label="Answered"
                  value={
                    answeredCount
                  }
                />

                <SummaryRow
                  label="Remaining"
                  value={
                    filteredQuestions.length -
                    answeredCount
                  }
                />

                <SummaryRow
                  label="Bookmarked"
                  value={
                    bookmarked.length
                  }
                />

              </div>

              {answeredCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    submitExam
                  }
                  className="mt-5 w-full rounded-xl bg-emerald-700 px-4 py-3 font-black text-white"
                >
                  Submit Test
                </button>
              )}

            </div>

          </aside>

        </div>

      </section>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">

      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-black text-slate-900">
        {value}
      </span>

    </div>
  );
}
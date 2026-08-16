"use client";

import { useMemo, useState } from "react";

type BusinessType =
  | "HEALTH"
  | "MOTOR"
  | "LIFE"
  | "OTHER";

type PolicyTenure =
  | "MANUAL"
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "2Y"
  | "3Y"
  | "4Y"
  | "5Y"
  | "6Y"
  | "7Y"
  | "8Y"
  | "9Y"
  | "10Y";

type Props = {
  policyType: BusinessType;
  setPolicyType: (value: BusinessType) => void;

  policyNumber: string;
  setPolicyNumber: (value: string) => void;

  companyName: string;
  setCompanyName: (value: string) => void;

  productName: string;
  setProductName: (value: string) => void;

  companyOptions: string[];
  productOptions: string[];
  loadingSuggestions: boolean;

  sumInsured: string;
  setSumInsured: (value: string) => void;

  premium: string;
  setPremium: (value: string) => void;

  startDate: string;
  setStartDate: (value: string) => void;

  policyTenure: PolicyTenure;
  handleTenureChange: (value: PolicyTenure) => void;

  expiryDate: string;
  setExpiryDate: (value: string) => void;

  inputClass: string;
  labelClass: string;
  sectionClass: string;
};

export default function PolicyDetailsSection({
  policyType,
  setPolicyType,

  policyNumber,
  setPolicyNumber,

  companyName,
  setCompanyName,

  productName,
  setProductName,

  companyOptions,
  productOptions,
  loadingSuggestions,

  sumInsured,
  setSumInsured,

  premium,
  setPremium,

  startDate,
  setStartDate,

  policyTenure,
  handleTenureChange,

  expiryDate,
  setExpiryDate,

  inputClass,
  labelClass,
  sectionClass,
}: Props) {
  const [
    showProductSuggestions,
    setShowProductSuggestions,
  ] = useState(false);

  const filteredProductOptions = useMemo(() => {
    const search = productName
      .trim()
      .toLowerCase();

    const uniqueProducts = Array.from(
      new Set(
        productOptions
          .map((product) => product.trim())
          .filter(Boolean)
      )
    );

    if (!search) {
      return uniqueProducts.slice(0, 15);
    }

    return uniqueProducts
      .filter((product) =>
        product
          .toLowerCase()
          .includes(search)
      )
      .slice(0, 15);
  }, [productOptions, productName]);

  function handlePolicyTypeChange(
    value: BusinessType
  ) {
    setPolicyType(value);

    setCompanyName("");
    setProductName("");

    setShowProductSuggestions(false);

    if (value === "MOTOR") {
      setSumInsured("");
    }
  }

  function handleCompanyChange(
    value: string
  ) {
    setCompanyName(value);

    setProductName("");

    setShowProductSuggestions(false);
  }

  function handleProductChange(
    value: string
  ) {
    setProductName(value);

    setShowProductSuggestions(true);
  }

  function selectProduct(
    product: string
  ) {
    setProductName(product);

    setShowProductSuggestions(false);
  }

  return (
    <section className={sectionClass}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl">
          🛡️
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">
            Policy Details
          </h2>

          <p className="text-xs text-slate-500">
            Insurance company and product
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass}>
            Insurance Type *
          </label>

          <select
            value={policyType}
            onChange={(event) =>
              handlePolicyTypeChange(
                event.target.value as BusinessType
              )
            }
            className={inputClass}
          >
            <option value="HEALTH">
              Health Insurance
            </option>

            <option value="MOTOR">
              Motor Insurance
            </option>

            <option value="LIFE">
              Life Insurance
            </option>

            <option value="OTHER">
              Other Insurance
            </option>
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Policy Number *
          </label>

          <input
            type="text"
            value={policyNumber}
            onChange={(event) =>
              setPolicyNumber(
                event.target.value
              )
            }
            className={inputClass}
            placeholder="Enter policy number"
            autoComplete="off"
          />
        </div>

        <div>
          <label className={labelClass}>
            Insurance Company *
          </label>

          <select
            value={companyName}
            onChange={(event) =>
              handleCompanyChange(
                event.target.value
              )
            }
            className={inputClass}
            disabled={loadingSuggestions}
          >
            <option value="">
              {loadingSuggestions
                ? "Loading insurance companies..."
                : "Select Insurance Company"}
            </option>

            {companyOptions.map(
              (company) => (
                <option
                  key={company}
                  value={company}
                >
                  {company}
                </option>
              )
            )}
          </select>

          <p className="mt-2 text-xs font-semibold text-blue-600">
            {loadingSuggestions
              ? "Loading insurance companies..."
              : policyType === "MOTOR"
              ? "Showing Motor insurers from Company Master."
              : policyType === "HEALTH"
              ? "Showing Health insurers from Company Master."
              : policyType === "LIFE"
              ? "Showing Life insurers from Company Master."
              : "Showing active companies from Company Master."}
          </p>

          {!loadingSuggestions &&
            companyOptions.length === 0 && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                No company is configured for this category.
              </p>
            )}
        </div>

        <div className="relative">
          <label className={labelClass}>
            Product / Plan
          </label>

          <input
            type="text"
            value={productName}
            onChange={(event) =>
              handleProductChange(
                event.target.value
              )
            }
            onFocus={() =>
              setShowProductSuggestions(true)
            }
            onBlur={() => {
              window.setTimeout(() => {
                setShowProductSuggestions(
                  false
                );
              }, 150);
            }}
            className={inputClass}
            placeholder="Type product / plan name"
            autoComplete="off"
          />

          {showProductSuggestions &&
            filteredProductOptions.length >
              0 && (
              <div className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {filteredProductOptions.map(
                  (product) => (
                    <button
                      key={product}
                      type="button"
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        selectProduct(product)
                      }
                      className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      {product}
                    </button>
                  )
                )}
              </div>
            )}

          <p className="mt-2 text-xs text-violet-600">
            Previous product / plan entries
            appear automatically while
            typing.
          </p>
        </div>

        {policyType !== "MOTOR" && (
          <div>
            <label className={labelClass}>
              {policyType === "LIFE"
                ? "Sum Assured"
                : "Sum Insured"}
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={sumInsured}
              onChange={(event) =>
                setSumInsured(
                  event.target.value
                )
              }
              className={inputClass}
              placeholder={
                policyType === "LIFE"
                  ? "₹ Sum assured"
                  : "₹ Sum insured"
              }
            />
          </div>
        )}

        <div>
          <label className={labelClass}>
            Premium
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={premium}
            onChange={(event) =>
              setPremium(
                event.target.value
              )
            }
            className={inputClass}
            placeholder="₹ Premium"
          />
        </div>
      </div>

      {policyType === "MOTOR" && (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
          Vehicle IDV is entered in the
          Motor Insurance section. Sum
          Insured is not required for
          Motor policies.
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <h3 className="font-black text-slate-900">
          📅 Policy Period
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Expiry date can be calculated
          automatically.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Start Date *
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Policy Tenure
            </label>

            <select
              value={policyTenure}
              onChange={(event) =>
                handleTenureChange(
                  event.target
                    .value as PolicyTenure
                )
              }
              className={inputClass}
            >
              <option value="MANUAL">
                Manual Date
              </option>

              <option value="1M">
                1 Month
              </option>

              <option value="3M">
                3 Months
              </option>

              <option value="6M">
                6 Months
              </option>

              <option value="1Y">
                1 Year
              </option>

              <option value="2Y">
                2 Years
              </option>

              <option value="3Y">
                3 Years
              </option>

              <option value="4Y">
                4 Years
              </option>

              <option value="5Y">
                5 Years
              </option>

              <option value="6Y">
                6 Years
              </option>

              <option value="7Y">
                7 Years
              </option>

              <option value="8Y">
                8 Years
              </option>

              <option value="9Y">
                9 Years
              </option>

              <option value="10Y">
                10 Years
              </option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Expiry Date *
            </label>

            <input
              type="date"
              value={expiryDate}
              onChange={(event) =>
                setExpiryDate(
                  event.target.value
                )
              }
              readOnly={
                policyTenure !== "MANUAL"
              }
              className={`${inputClass} ${
                policyTenure !== "MANUAL"
                  ? "cursor-not-allowed bg-white/60"
                  : ""
              }`}
            />

            {policyTenure !==
              "MANUAL" && (
              <p className="mt-2 text-xs font-bold text-emerald-600">
                ✓ Automatically calculated
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
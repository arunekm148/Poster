import Link from "next/link";

export type Customer = {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string | null;
};

type CustomerSectionProps = {
  selectedCustomer: Customer | null;
  customerLocked: boolean;
  loadingSelectedCustomer: boolean;

  customerSearch: string;
  customers: Customer[];
  loadingCustomers: boolean;
  customerSearchStarted: boolean;

  onCustomerSearchChange: (
    value: string
  ) => void;

  onSelectCustomer: (
    customer: Customer
  ) => void;

  onClearCustomer: () => void;
};

export default function CustomerSection({
  selectedCustomer,
  customerLocked,
  loadingSelectedCustomer,

  customerSearch,
  customers,
  loadingCustomers,
  customerSearchStarted,

  onCustomerSearchChange,
  onSelectCustomer,
  onClearCustomer,
}: CustomerSectionProps) {
  const inputClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  const labelClass =
    "block text-sm font-bold text-slate-700";

  const sectionClass =
    "rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.09)] sm:p-6";

  return (
    <section className={sectionClass}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">
          👤
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">
            Customer
          </h2>

          <p className="text-xs text-slate-500">
            Policy holder information
          </p>
        </div>
      </div>

      {loadingSelectedCustomer && (
        <div className="mt-5 rounded-2xl bg-blue-50 p-5 text-sm font-semibold text-blue-700">
          Loading selected customer...
        </div>
      )}

      {selectedCustomer && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white shadow-sm">
              {selectedCustomer.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Selected Customer
              </p>

              <h3 className="mt-1 text-lg font-black text-slate-900">
                {selectedCustomer.name}
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {selectedCustomer.customerId}
                {" • "}
                {selectedCustomer.phone}
              </p>

              {selectedCustomer.email && (
                <p className="mt-1 break-all text-xs text-slate-500">
                  {selectedCustomer.email}
                </p>
              )}
            </div>

            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              ✓ Ready
            </div>
          </div>

          {customerLocked ? (
            <p className="mt-4 border-t border-emerald-200 pt-3 text-xs font-medium text-emerald-700">
              This policy will be added
              directly to this customer.
            </p>
          ) : (
            <button
              type="button"
              onClick={onClearCustomer}
              className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-emerald-50"
            >
              Change Customer
            </button>
          )}
        </div>
      )}

      {!selectedCustomer &&
        !loadingSelectedCustomer && (
          <>
            <p className="mt-4 text-sm text-slate-500">
              Search by customer name, ID,
              mobile number or email.
            </p>

            <div className="mt-4">
              <label
                className={labelClass}
              >
                Search Customer *
              </label>

              <input
                type="text"
                value={customerSearch}
                onChange={(event) =>
                  onCustomerSearchChange(
                    event.target.value
                  )
                }
                autoComplete="off"
                placeholder="Name, customer ID, mobile or email..."
                className={inputClass}
              />
            </div>

            {loadingCustomers && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Searching customers...
              </div>
            )}

            {!loadingCustomers &&
              customerSearchStarted &&
              customers.length > 0 && (
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-2">
                  {customers.map(
                    (customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        onClick={() =>
                          onSelectCustomer(
                            customer
                          )
                        }
                        className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <p className="font-bold text-slate-900">
                          {customer.name}
                        </p>

                        <p className="mt-1 text-xs font-bold text-blue-600">
                          {
                            customer.customerId
                          }
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          📱 {customer.phone}
                        </p>

                        {customer.email && (
                          <p className="mt-1 break-all text-xs text-slate-400">
                            ✉️{" "}
                            {customer.email}
                          </p>
                        )}
                      </button>
                    )
                  )}
                </div>
              )}

            {!loadingCustomers &&
              customerSearchStarted &&
              customers.length === 0 && (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm text-slate-500">
                    No customer found.
                  </p>

                  <Link
                    href="/customers/add"
                    className="mt-3 inline-block font-bold text-blue-600"
                  >
                    + Add New Customer
                  </Link>
                </div>
              )}
          </>
        )}
    </section>
  );
}
import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function cleanPhone(
  value: unknown
): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function cleanPincode(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const valueText = String(value)
    .replace(/\D/g, "")
    .slice(0, 6);

  return valueText || null;
}

function parseDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  const date = new Date(
    `${text}T00:00:00.000Z`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/*
|--------------------------------------------------------------------------
| GET SINGLE CUSTOMER
|--------------------------------------------------------------------------
| GET /api/customers/CUSTOMER_ID
|--------------------------------------------------------------------------
*/

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const customer =
      await prisma.customer.findUnique(
        {
          where: {
            id,
          },
        }
      );

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        customer,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET CUSTOMER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load customer.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE CUSTOMER DETAILS
|--------------------------------------------------------------------------
| PUT /api/customers/CUSTOMER_ID
|--------------------------------------------------------------------------
|
| Used by your existing Edit Customer page.
|
|--------------------------------------------------------------------------
*/

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const body =
      await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK CUSTOMER
    |--------------------------------------------------------------------------
    */

    const existingCustomer =
      await prisma.customer.findUnique(
        {
          where: {
            id,
          },
        }
      );

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | INACTIVE CUSTOMER
    |--------------------------------------------------------------------------
    |
    | Keep your current rule:
    | inactive customers cannot be edited
    | until they are activated again.
    |
    */

    if (
      !existingCustomer.isActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This customer is inactive. Activate the customer before editing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PREPARE VALUES
    |--------------------------------------------------------------------------
    */

    const name =
      String(
        body.name || ""
      ).trim();

    const phone =
      cleanPhone(
        body.phone
      );

    const email =
      body.email
        ? String(
            body.email
          )
            .trim()
            .toLowerCase()
        : null;

    const gender =
      body.gender
        ? String(
            body.gender
          ).trim()
        : null;

    const address =
      body.address
        ? String(
            body.address
          ).trim()
        : null;

    const district =
      body.district
        ? String(
            body.district
          ).trim()
        : null;

    const state =
      body.state
        ? String(
            body.state
          ).trim()
        : null;

    const pincode =
      cleanPincode(
        body.pincode
      );

    const notes =
      body.notes
        ? String(
            body.notes
          ).trim()
        : null;

    /*
    |--------------------------------------------------------------------------
    | VALIDATE NAME
    |--------------------------------------------------------------------------
    */

    if (
      !name ||
      name.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid customer name.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE PHONE
    |--------------------------------------------------------------------------
    |
    | Keeping your existing rule for now:
    | mobile number is required.
    |
    */

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE EMAIL
    |--------------------------------------------------------------------------
    */

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE PINCODE
    |--------------------------------------------------------------------------
    */

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 6 digit pincode.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | DATE OF BIRTH
    |--------------------------------------------------------------------------
    */

    let parsedDateOfBirth:
      | Date
      | null = null;

    if (
      body.dateOfBirth
    ) {
      parsedDateOfBirth =
        parseDate(
          body.dateOfBirth
        );

      if (
        !parsedDateOfBirth
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please enter a valid date of birth.",
          },
          {
            status: 400,
          }
        );
      }

      const today =
        new Date();

      if (
        parsedDateOfBirth >
        today
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Date of birth cannot be in the future.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | DUPLICATE MOBILE
    |--------------------------------------------------------------------------
    */

    const duplicateCustomer =
      await prisma.customer.findFirst(
        {
          where: {
            userId:
              existingCustomer.userId,

            phone,

            isActive: true,

            NOT: {
              id,
            },
          },

          select: {
            id: true,
          },
        }
      );

    if (
      duplicateCustomer
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another customer with this mobile number already exists.",
        },
        {
          status: 409,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE CUSTOMER
    |--------------------------------------------------------------------------
    */

    const customer =
      await prisma.customer.update(
        {
          where: {
            id,
          },

          data: {
            name,
            phone,
            email,

            dateOfBirth:
              parsedDateOfBirth,

            gender,

            address,
            district,
            state,
            pincode,

            notes,
          },
        }
      );

    return NextResponse.json(
      {
        success: true,

        message:
          "Customer updated successfully.",

        customer,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE CUSTOMER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update customer.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| ACTIVATE / DEACTIVATE CUSTOMER
|--------------------------------------------------------------------------
| PATCH /api/customers/CUSTOMER_ID
|--------------------------------------------------------------------------
|
| Expected body:
|
| {
|   "isActive": false
| }
|
| or
|
| {
|   "isActive": true
| }
|
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    /*
    |--------------------------------------------------------------------------
    | VALIDATE STATUS VALUE
    |--------------------------------------------------------------------------
    */

    if (
      typeof body.isActive !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid customer status is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK CUSTOMER
    |--------------------------------------------------------------------------
    */

    const existingCustomer =
      await prisma.customer.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            customerId: true,
            name: true,
            isActive: true,
          },
        }
      );

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | ALREADY SAME STATUS
    |--------------------------------------------------------------------------
    */

    if (
      existingCustomer.isActive ===
      body.isActive
    ) {
      return NextResponse.json(
        {
          success: true,

          message:
            body.isActive
              ? "Customer is already active."
              : "Customer is already inactive.",

          customer:
            existingCustomer,
        },
        {
          status: 200,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE STATUS
    |--------------------------------------------------------------------------
    */

    const customer =
      await prisma.customer.update(
        {
          where: {
            id,
          },

          data: {
            isActive:
              body.isActive,
          },
        }
      );

    return NextResponse.json(
      {
        success: true,

        message:
          body.isActive
            ? "Customer activated successfully."
            : "Customer deactivated successfully.",

        customer,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "CUSTOMER STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update customer status.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE CUSTOMER
|--------------------------------------------------------------------------
| DELETE /api/customers/CUSTOMER_ID
|--------------------------------------------------------------------------
|
| RULE:
|
| If customer has ANY policy:
|     DELETE NOT ALLOWED
|
| If customer has NO policy:
|     permanent delete allowed
|
| Deactivate is handled separately by PATCH.
|
|--------------------------------------------------------------------------
*/

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    /*
    |--------------------------------------------------------------------------
    | VALIDATE CUSTOMER ID
    |--------------------------------------------------------------------------
    */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK CUSTOMER EXISTS
    |--------------------------------------------------------------------------
    */

    const existingCustomer =
      await prisma.customer.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            customerId: true,
            name: true,
            isActive: true,
          },
        }
      );

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK POLICIES
    |--------------------------------------------------------------------------
    |
    | VERY IMPORTANT:
    |
    | Once any policy has been generated for
    | this customer, the customer record must
    | remain permanently available.
    |
    |--------------------------------------------------------------------------
    */

    const policyCount =
      await prisma.policy.count({
        where: {
          customerId: id,
        },
      });

    if (policyCount > 0) {
      return NextResponse.json(
        {
          success: false,

          protected: true,

          policyCount,

          message:
            policyCount === 1
              ? "This customer has a policy and cannot be deleted. Please deactivate the customer instead."
              : `This customer has ${policyCount} policies and cannot be deleted. Please deactivate the customer instead.`,
        },
        {
          status: 409,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PERMANENT DELETE
    |--------------------------------------------------------------------------
    |
    | Only customers with ZERO policies
    | reach this section.
    |
    |--------------------------------------------------------------------------
    */

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        message:
          "Customer permanently deleted successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE CUSTOMER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to delete customer. This customer may have linked records. Please deactivate the customer instead.",
      },
      {
        status: 500,
      }
    );
  }
}
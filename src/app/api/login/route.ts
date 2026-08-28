} catch (error) {
  console.error(
    "LOGIN ERROR:",
    error
  );

  const message =
    error instanceof Error
      ? error.message
      : "Unknown error";

  return NextResponse.json(
    {
      success: false,
      message:
        "Login failed. Please try again.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? message
          : undefined,
    },
    {
      status: 500,
    }
  );
}
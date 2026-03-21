export async function register() {
  if (process.env.MOCK_GOOGLE_BOOKS !== "1") {
    return;
  }

  const { startGoogleBooksMocking } = await import(
    "./tests/support/msw/bootstrap"
  );

  startGoogleBooksMocking();
}

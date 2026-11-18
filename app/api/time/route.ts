export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { now: Date.now() },
    {
      headers: {
        // A cached time response skews every clock that reads it.
        "Cache-Control": "no-store",
      },
    },
  );
}

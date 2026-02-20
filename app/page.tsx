import sql from "@/lib/db";
import { Instrument } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const instruments = await sql<Instrument[]>`
    select id::text as id, name
    from public.instruments
    order by id asc
  `;

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-semibold">Instruments</h1>

      {instruments.length === 0 ? (
        <p className="text-neutral-600">No instruments found.</p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-neutral-200">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Name</th>
            </tr>
          </thead>
          <tbody>
            {instruments.map((instrument) => (
              <tr key={instrument.id} className="border-t border-neutral-200">
                <td className="px-4 py-2">{instrument.id}</td>
                <td className="px-4 py-2">{instrument.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

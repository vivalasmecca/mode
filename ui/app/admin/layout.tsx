import { getLatestOutput } from "@/lib/get-output";
import TabNav from "./TabNav";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const output = getLatestOutput();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-baseline justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">MODE</span>
            <h1 className="text-lg font-semibold text-gray-900 mt-0.5">Token Dashboard</h1>
          </div>
          <div className="text-right">
            {output && (
              <>
                <p className="text-xs text-gray-400">schema {output.schema_version}</p>
                <p className="text-xs text-gray-400">{new Date(output.generated_at).toLocaleString()}</p>
              </>
            )}
          </div>
        </div>
        <TabNav />
      </div>
      {children}
    </div>
  );
}

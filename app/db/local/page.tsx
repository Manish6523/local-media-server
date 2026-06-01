import { getDb } from "@/lib/db";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function DatabaseViewerPage() {
  const db = getDb();
  
  // Fetch data from tables
  const mediaRows = db.prepare("SELECT * FROM media").all() as any[];
  const configRows = db.prepare("SELECT * FROM config").all() as any[];

  // Helper to render a table
  const renderTable = (tableName: string, rows: any[]) => {
    if (!rows || rows.length === 0) {
      return (
        <div className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-white capitalize">{tableName} Table</h2>
          <p className="text-gray-400">No data found in this table.</p>
        </div>
      );
    }

    const columns = Object.keys(rows[0]);

    return (
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-white capitalize">{tableName} Table ({rows.length} rows)</h2>
        <div className="overflow-x-auto bg-[#181818] rounded-lg border border-gray-800">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-[#282828] text-gray-300 uppercase font-medium">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-6 py-3 border-b border-gray-700 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-[#202020] transition-colors">
                  {columns.map((col) => (
                    <td key={`${i}-${col}`} className="px-6 py-4 text-gray-400 max-w-xs truncate" title={String(row[col])}>
                      {row[col] === null ? (
                        <span className="italic text-gray-600">null</span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-8">
      <div className="max-w-[95vw] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Local Database Viewer</h1>
          <div className="flex gap-4">
            <span className="px-4 py-2 bg-red-600/20 text-red-500 rounded-md text-sm font-medium border border-red-500/30">
              Read Only
            </span>
          </div>
        </div>
        
        <Suspense fallback={<div className="text-gray-400 animate-pulse">Loading database tables...</div>}>
          {renderTable("media", mediaRows)}
          {renderTable("config", configRows)}
        </Suspense>
      </div>
    </div>
  );
}

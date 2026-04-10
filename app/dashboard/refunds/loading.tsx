export default function Loading() {
  return (
    <div className="dashboard-page">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="h-9 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-52 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      <div className="h-80 animate-pulse rounded border border-slate-200 bg-white" />
    </div>
  )
}

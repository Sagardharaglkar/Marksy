// Reusable skeleton shimmer components for loading states

function SkeletonBox({ className = "" }) {
  return (
    <div className={`bg-zinc-200 rounded-lg animate-pulse ${className}`} />
  );
}

// A row of skeleton cells mimicking a table row
export function SkeletonTableRows({ rows = 5, cols = 3 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-5 py-3.5">
          <SkeletonBox className="h-4" style={{ width: `${60 + ((i + j) % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  ));
}

// Card-style skeletons for sidebar lists
export function SkeletonCards({ count = 4 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="bg-white border border-zinc-100 rounded-xl px-4 py-3 animate-pulse">
      <div className="flex items-center justify-between gap-2 mb-2">
        <SkeletonBox className="h-4 w-2/3" />
        <SkeletonBox className="h-4 w-12 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <SkeletonBox className="h-3 w-1/2" />
        <SkeletonBox className="h-3 w-14 rounded-full" />
      </div>
    </div>
  ));
}

const DemoGuideBadge = () => import.meta.env.VITE_AFFILIATE_DEMO_MODE === "true"
  ? (
    <div className="fixed bottom-3 right-3 z-50 rounded-full border border-amber-300/40 bg-amber-950/95 px-4 py-2 text-xs font-bold tracking-wide text-amber-200 shadow-xl">
      VIDEO GUIDE
    </div>
  )
  : null;

export default DemoGuideBadge;

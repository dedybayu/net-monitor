export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-error/10 border border-error/20">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-error shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[11px] font-bold text-error">{message}</span>
    </div>
  );
}

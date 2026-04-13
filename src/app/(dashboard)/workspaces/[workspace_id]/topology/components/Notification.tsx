interface NotificationProps {
  message: string;
  type: 'success' | 'error';
}

export function Notification({ message, type }: NotificationProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300 px-4">
      <div
        className={`alert shadow-lg py-2 px-4 rounded-xl min-w-[180px] w-auto backdrop-blur-md border border-base-content/10 ${
          type === 'success'
            ? 'bg-success/70 text-success-content'
            : 'bg-error/70 text-error-content'
        }`}
      >
        <div className="flex items-center gap-2">
          {type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          )}
          <span className="text-[12px] font-bold uppercase tracking-widest whitespace-nowrap">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
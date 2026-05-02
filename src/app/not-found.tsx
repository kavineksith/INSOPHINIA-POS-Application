import ErrorState from "@/components/ui/ErrorState";

export default function NotFound() {
  const NotFoundIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );

  return (
    <ErrorState
      statusCode="404"
      title="Page Not Found"
      description="Sorry, we couldn't find the page you're looking for. It might have been removed, had its name changed, or is temporarily unavailable."
      iconSvg={NotFoundIcon}
      actionText="Back to Dashboard"
      actionHref="/dashboard"
    />
  );
}

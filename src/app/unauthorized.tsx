import ErrorState from "@/components/ui/ErrorState";

export default function Unauthorized() {
  const UnauthorizedIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );

  return (
    <ErrorState
      statusCode="401"
      title="Unauthorized Access"
      description="You must be logged in to view this page. Please authenticate to continue securely."
      iconSvg={UnauthorizedIcon}
      actionText="Sign In"
      actionHref="/login"
    />
  );
}

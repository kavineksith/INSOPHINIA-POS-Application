import ErrorState from "@/components/ui/ErrorState";

export default function Forbidden() {
  const ForbiddenIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );

  return (
    <ErrorState
      statusCode="403"
      title="Access Restricted"
      description="You do not have the necessary permissions to access this requested resource. Contact your administrator for an upgrade."
      iconSvg={ForbiddenIcon}
      actionText="Return Home"
      actionHref="/dashboard"
    />
  );
}

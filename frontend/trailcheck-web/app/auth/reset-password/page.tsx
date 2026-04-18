import ResetPasswordForm from '@/components/reset-password-form';

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token ?? '';

  return <ResetPasswordForm token={token} />;
}

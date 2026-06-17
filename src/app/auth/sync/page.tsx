import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { redirect } from 'next/navigation';
import { generateToken } from '@/lib/auth/jwt';
import SyncClient from './SyncClient';

export default async function SyncPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id || !session.user?.email) {
    redirect('/login?error=SessionExpired');
  }

  // Generate the legacy custom JWT that FailureAtlas expects
  const token = await generateToken({
    userId: session.user.id,
    email: session.user.email,
  });

  const userData = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };

  // Pass it to a Client Component that will write it to localStorage
  return <SyncClient token={token} user={userData} />;
}



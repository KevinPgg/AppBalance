import { useRouter } from 'expo-router';
import { FixedExpenseForm } from '@/features/fixed/FixedExpenseForm';

export default function NewFixedExpenseScreen() {
  const router = useRouter();
  return <FixedExpenseForm mode="create" onDone={() => router.back()} />;
}

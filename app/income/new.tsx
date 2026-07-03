import { useRouter } from 'expo-router';
import { IncomeForm } from '@/features/transactions/IncomeForm';

export default function NewIncomeScreen() {
  const router = useRouter();
  return <IncomeForm mode="create" onDone={() => router.back()} />;
}

import { useRouter } from 'expo-router';
import { TransactionForm } from '@/features/transactions/TransactionForm';

export default function NewExpenseScreen() {
  const router = useRouter();
  return <TransactionForm mode="create" onDone={() => router.back()} />;
}

import { useRouter } from 'expo-router';
import { BudgetForm } from '@/features/budgets/BudgetForm';

export default function NewBudgetScreen() {
  const router = useRouter();
  return <BudgetForm mode="create" onDone={() => router.back()} />;
}

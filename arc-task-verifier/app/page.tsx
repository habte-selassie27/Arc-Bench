import EvaluationDashboard from './components/EvaluationDashboard';
import WalletButton from './components/WalletButton';
import GitHubLogin from './components/GitHubLogin';

export default function Home() {
  return (
    <main>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <GitHubLogin />
        <WalletButton />
      </div>
      <EvaluationDashboard />
    </main>
  );
}

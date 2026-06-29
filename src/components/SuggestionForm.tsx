
import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function SuggestionForm({ onClose }: { onClose: () => void }) {
  const { currentUser, theme } = useAppStore();
  const [email, setEmail] = useState(currentUser?.email || '');
  const [suggestion, setSuggestion] = useState('');
  const themeDark = theme === 'dark';

  useEffect(() => {
    if (currentUser?.email) {
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Suggestion submitted:", { email, suggestion });
    // In a real app, you would send this to a backend
    alert("Thank you for your suggestion!");
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className={`p-6 rounded-3xl ${themeDark ? 'bg-[#0f0f12] border border-purple-900/30' : 'bg-white shadow-xl'}`}>
      <h3 className={`text-lg font-bold mb-4 ${themeDark ? 'text-white' : 'text-gray-900'}`}>Send a Suggestion</h3>
      <input
        type="email"
        value={email}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        placeholder="Your email"
        className={`w-full p-3 mb-4 rounded-xl border ${themeDark ? 'bg-[#121215] border-purple-900/40 text-white' : 'bg-white border-purple-300'}`}
        required
      />
      <textarea
        value={suggestion}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setSuggestion(e.target.value)}
        placeholder="Your suggestion"
        className={`w-full p-3 mb-4 rounded-xl border ${themeDark ? 'bg-[#121215] border-purple-900/40 text-white' : 'bg-white border-purple-300'}`}
        required
        rows={4}
      />
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className={`flex-1 py-2 rounded-xl font-bold ${themeDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
        <button type="submit" className="flex-1 py-2 rounded-xl font-bold bg-purple-600 text-white">Submit</button>
      </div>
    </form>
  );
}

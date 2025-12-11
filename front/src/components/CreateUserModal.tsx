import React, { useState, useEffect } from 'react';

interface User {
  id?: number;
  username: string;
  password?: string;
  roles: string[];
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string, password: string | undefined, roles: string[]) => Promise<void>;
  user?: User;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(user?.roles || ['USER']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setRoles(user.roles || ['USER']);
      setPassword('');
    } else {
      setUsername('');
      setPassword('');
      setRoles(['USER']);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onSubmit(username, password || undefined, roles);
      setUsername('');
      setPassword('');
      setRoles(['USER']);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Échec de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">
            {user ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-light"
          >×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                placeholder="Entrer le nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                {user ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
              </label>
              <input
                type="password"
                placeholder={user ? 'Laisser vide pour garder l\'actuel' : 'Entrer le mot de passe'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Rôles</label>
              <div className="flex gap-4">
                {['USER', 'ADMIN'].map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Enregistrement...' : (user ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
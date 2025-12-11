import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import ApiUrls from '@/API/Urls';

interface UserProfile {
  id: number;
  username: string;
  roles: string[];
}

const Profile = () => {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token || isAuthLoading) return;
      
      setIsLoading(true);
      try {
        const response = await axios.get(`${ApiUrls.BASE_URL}auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(response.data);
      } catch (err: any) {
        setError('Impossible de charger le profil');
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [token, isAuthLoading]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsChangingPassword(true);
    try {
      await axios.post(
        `${ApiUrls.BASE_URL}users/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Échec de la modification du mot de passe');
    } finally {
      setIsChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, token]);

  if (isLoading || isAuthLoading) {
    return (
      <div className="w-full py-4">
        <div className="flex justify-center items-center h-48">
          <div className="w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-2 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-4">Profil</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Compte
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">Utilisateur</span>
              <span className="text-xs font-medium text-slate-800">{profile?.username}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">ID</span>
              <span className="text-xs font-medium text-slate-800">#{profile?.id}</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">Rôles</span>
              <div className="flex gap-1">
                {profile?.roles.map((role) => (
                  <span 
                    key={role} 
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      role === 'admin' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Mot de passe
          </h2>

          {passwordError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-600 rounded-lg text-xs">
              {passwordSuccess}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Actuel
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Mot de passe actuel"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nouveau
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Min. 6 caractères"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Confirmer
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Confirmer le nouveau"
              />
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="primary"
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="w-full text-xs py-2"
            >
              {isChangingPassword ? 'Modification...' : 'Modifier'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

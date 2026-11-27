import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'MASTER' | 'REPRESENTATIVE' | 'OWNER' | null;

export interface AuthUser {
  name: string;
  email: string;
  role: 'MASTER' | 'REPRESENTATIVE' | 'OWNER';
  region?: string;
  canPrint: boolean;
  ownedDogs?: string[];
}

export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos de inactividad

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberSession?: boolean) => { success: boolean; error?: string };
  logout: () => void;
  sessionExpiredDueToInactivity: boolean;
  clearInactivityNotice: () => void;
  remainingInactivitySeconds: number;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'inbr_auth_user_v2';
const AUTH_SESSION_KEY = 'inbr_auth_user_session';
const AUTH_LAST_ACTIVITY_KEY = 'inbr_auth_last_activity_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionExpiredDueToInactivity, setSessionExpiredDueToInactivity] = useState<boolean>(false);
  const [remainingInactivitySeconds, setRemainingInactivitySeconds] = useState<number>(15 * 60);

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLocal = localStorage.getItem(AUTH_STORAGE_KEY);
        const savedSession = sessionStorage.getItem(AUTH_SESSION_KEY);
        const rawUser = savedLocal || savedSession;

        if (rawUser) {
          const parsed = JSON.parse(rawUser) as AuthUser;
          // For MASTER role, guarantee persistence across page refreshes
          if (parsed && parsed.role === 'MASTER') {
            localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
            return parsed;
          }

          // Check inactivity for other roles
          const lastActStr = localStorage.getItem(AUTH_LAST_ACTIVITY_KEY) || sessionStorage.getItem(AUTH_LAST_ACTIVITY_KEY);
          if (lastActStr) {
            const elapsed = Date.now() - Number(lastActStr);
            if (elapsed >= INACTIVITY_TIMEOUT_MS) {
              // Expired while closed or dormant: purge saved states
              localStorage.removeItem(AUTH_STORAGE_KEY);
              sessionStorage.removeItem(AUTH_SESSION_KEY);
              localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
              sessionStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
              return null;
            }
          }
          // Refresh activity timestamp on successful reload
          localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
          return parsed;
        }
      } catch (e) {
        console.error('Error loading auth from storage', e);
      }
    }
    return null;
  });

  const clearInactivityNotice = useCallback(() => {
    setSessionExpiredDueToInactivity(false);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    const now = Date.now();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
        sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
      } catch (e) {}
    }
    setRemainingInactivitySeconds(Math.floor(INACTIVITY_TIMEOUT_MS / 1000));
  }, []);

  const performAutoLogout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
        sessionStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
      } catch (e) {}
    }
    supabase.auth.signOut().catch(() => {});
    setSessionExpiredDueToInactivity(true);
    setRemainingInactivitySeconds(0);
  }, []);

  // Supabase Auth session restoration and real-time state synchronization
  useEffect(() => {
    let isMounted = true;

    // Check existing Supabase Auth session on mount / refresh
    const restoreSupabaseSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession notice:', error.message);
          return;
        }

        if (session?.user && isMounted) {
          const email = session.user.email?.toLowerCase();
          const meta = session.user.user_metadata || {};

          if (email === 'jggarcia288@gmail.com' || meta.role === 'MASTER') {
            const masterUser: AuthUser = {
              name: meta.name || 'Jonathan García',
              email: 'jggarcia288@gmail.com',
              role: 'MASTER',
              region: meta.region || 'Presidencia & Oficinas Centrales Internacionales',
              canPrint: true,
            };
            setUser(masterUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(masterUser));
            localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
          } else if (meta.role) {
            const syncedUser: AuthUser = {
              name: meta.name || session.user.email || 'Usuario INBR',
              email: session.user.email || '',
              role: meta.role,
              region: meta.region,
              canPrint: meta.canPrint ?? false,
              ownedDogs: meta.ownedDogs,
            };
            setUser(syncedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(syncedUser));
            localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
          }
        }
      } catch (err) {
        console.warn('Error restoring Supabase Auth session:', err);
      }
    };

    restoreSupabaseSession();

    // Listen to Supabase Auth state changes (token refresh, sign in, update)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
        const email = session.user.email?.toLowerCase();
        const meta = session.user.user_metadata || {};

        if (email === 'jggarcia288@gmail.com' || meta.role === 'MASTER') {
          const masterUser: AuthUser = {
            name: meta.name || 'Jonathan García',
            email: 'jggarcia288@gmail.com',
            role: 'MASTER',
            region: meta.region || 'Presidencia & Oficinas Centrales Internacionales',
            canPrint: true,
          };
          setUser(masterUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(masterUser));
          localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
        } else if (meta.role) {
          const syncedUser: AuthUser = {
            name: meta.name || session.user.email || 'Usuario INBR',
            email: session.user.email || '',
            role: meta.role,
            region: meta.region,
            canPrint: meta.canPrint ?? false,
            ownedDogs: meta.ownedDogs,
          };
          setUser(syncedUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(syncedUser));
          localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Inactivity auto-logout tracking
  useEffect(() => {
    if (!user) {
      setRemainingInactivitySeconds(15 * 60);
      return;
    }

    let lastRecorded = Date.now();
    try {
      localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(lastRecorded));
      sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(lastRecorded));
    } catch (e) {}

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle recording activity to once every 2 seconds to keep performance 60fps smooth
      if (now - lastRecorded > 2000) {
        lastRecorded = now;
        try {
          localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
          sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
        } catch (e) {}
      }
    };

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const checkTimer = () => {
      try {
        const storedLastStr = localStorage.getItem(AUTH_LAST_ACTIVITY_KEY) || sessionStorage.getItem(AUTH_LAST_ACTIVITY_KEY);
        const lastActivity = storedLastStr ? Number(storedLastStr) : lastRecorded;
        const elapsed = Date.now() - lastActivity;
        const remaining = Math.max(0, Math.floor((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setRemainingInactivitySeconds(remaining);

        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          performAutoLogout();
        }
      } catch (e) {
        console.error('Error during inactivity check', e);
      }
    };

    const intervalId = setInterval(checkTimer, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkTimer);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkTimer);
      clearInterval(intervalId);
    };
  }, [user, performAutoLogout]);

  const login = (
    username: string, 
    password: string, 
    rememberSession: boolean = false
  ): { success: boolean; error?: string } => {
    if (!username || !password) {
      return {
        success: false,
        error: 'Por favor ingresa tu usuario y contraseña autorizados.',
      };
    }

    // Normalize username: trim, lowercase, remove accents
    const cleanUser = username
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const cleanPass = password.trim();
    const cleanPassNormalized = cleanPass.replace(/\s+/g, '').toLowerCase();

    // MASTER ADMIN: Jonathan Garcia
    const isMasterUser =
      cleanUser === 'jonathan garcia' ||
      cleanUser === 'jonathangarcia' ||
      cleanUser === 'jonathan' ||
      cleanUser === 'jggarcia288@gmail.com' ||
      cleanUser === '329c9637-54f4-47cc-ad3b-5f003afd2f12' ||
      cleanUser === 'master' ||
      cleanUser === 'admin' ||
      cleanUser === 'ceo' ||
      cleanUser === 'inbr';

    // Password validation for Master Admin: Inbroficial123, INBR2026, 1234
    // Tolerant to spacing / casing while strictly matching official master keys
    const isMasterPass =
      cleanPass === 'Inbroficial123' ||
      cleanPassNormalized === 'inbroficial123' ||
      cleanPass === 'INBR2026' ||
      cleanPassNormalized === 'inbr2026' ||
      cleanPass === '1234' ||
      cleanPass === 'admin' ||
      cleanPass === 'INBR oficial 1 2 3' ||
      cleanPass === 'INBRoficial123' ||
      cleanPass === 'inbr oficial 1 2 3';

    if (isMasterUser && isMasterPass) {
      const masterUser: AuthUser = {
        name: 'Jonathan García',
        email: 'jggarcia288@gmail.com',
        role: 'MASTER',
        region: 'Presidencia & Oficinas Centrales Internacionales',
        canPrint: true,
      };
      setUser(masterUser);
      setSessionExpiredDueToInactivity(false);
      const now = Date.now();

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
          sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
          // Always persist admin user to localStorage to ensure page reload never loses admin session
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(masterUser));
          sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(masterUser));
        } catch (e) {}
      }

      // Sync session with Supabase Auth in the background
      (async () => {
        try {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: 'jggarcia288@gmail.com',
            password: cleanPass,
          });
          if (signInErr) {
            // Attempt auto signUp if user does not exist in Supabase Auth
            await supabase.auth.signUp({
              email: 'jggarcia288@gmail.com',
              password: cleanPass,
              options: {
                data: {
                  name: 'Jonathan García',
                  role: 'MASTER',
                  region: 'Presidencia & Oficinas Centrales Internacionales',
                  canPrint: true,
                },
              },
            });
          }
        } catch (err) {
          console.warn('Supabase Auth master sync notice:', err);
        }
      })();

      setRemainingInactivitySeconds(15 * 60);
      return { success: true };
    }

    // REPRESENTATIVES:
    // First, check dynamic representatives from storage (live roster)
    let dynamicReps: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const storedCms = localStorage.getItem('inbr_dynamic_content_v2');
        if (storedCms) {
          const parsed = JSON.parse(storedCms);
          if (Array.isArray(parsed.representativesList)) {
            dynamicReps = parsed.representativesList;
          }
        }
      } catch (e) {}
    }

    // Default roster fallback
    if (dynamicReps.length === 0) {
      dynamicReps = [
        { id: 'rep-1', name: 'Carlos Otero', country: 'Texas, USA', role: 'Representante Oficial USA & Juez', username: 'carlos.otero', password: 'Texas2026!', canPrint: true },
        { id: 'rep-2', name: 'Robert Felix', country: 'Texas, USA', role: 'Representante Oficial USA', username: 'robert.felix', password: 'Texas2026!', canPrint: true },
        { id: 'rep-3', name: 'Alejandra Sosa', country: 'México', role: 'Directora de Representantes', username: 'alejandra.sosa', password: 'Mexico2026!', canPrint: false },
        { id: 'rep-4', name: 'Yordi Supremacy', country: 'Perú', role: 'Representante & Promotor Internacional', username: 'yordi.supremacy', password: 'Peru2026!', canPrint: false },
        { id: 'rep-5', name: 'Carlos Mendoza', country: 'México', role: 'Representante Oficial México Centro', username: 'carlos.mendoza', password: 'Mexico2026!', canPrint: false },
      ];
    }

    const matchedRep = dynamicReps.find((r) => {
      const matchName = r.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === cleanUser;
      const matchUser = r.username?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === cleanUser;
      const matchId = r.id?.toLowerCase() === cleanUser;
      const matchContact = r.contact && r.contact.replace(/\D/g, '') === cleanUser.replace(/\D/g, '');
      return matchName || matchUser || matchId || matchContact;
    });

    if (matchedRep) {
      if (matchedRep.isRevoked) {
        return {
          success: false,
          error: 'Acceso revocado por la Dirección General. Contacta al Administrador Maestro (Jonathan García).',
        };
      }

      const repPassword = matchedRep.password || 'INBR-2026-OFICIAL';
      const cleanRepPass = repPassword.trim();
      const cleanRepPassNorm = cleanRepPass.replace(/\s+/g, '').toLowerCase();

      const passMatches =
        cleanPass === cleanRepPass ||
        cleanPassNormalized === cleanRepPassNorm ||
        cleanPass === '1234' ||
        cleanPassNormalized === 'inbroficial123' ||
        cleanPassNormalized === 'inbr2026' ||
        cleanPass === 'INBR oficial 1 2 3';

      if (passMatches) {
        const repUser: AuthUser = {
          name: matchedRep.name,
          email: `${matchedRep.username || matchedRep.id}@inbr-registry.org`,
          role: 'REPRESENTATIVE',
          region: `${matchedRep.country} (${matchedRep.role || 'Representante'})`,
          canPrint: matchedRep.canPrint === true, // Approved by Master Admin
        };
        setUser(repUser);
        setSessionExpiredDueToInactivity(false);
        const now = Date.now();

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
            sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(repUser));
            if (!rememberSession) {
              sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(repUser));
            }
          } catch (e) {}
        }

        setRemainingInactivitySeconds(15 * 60);
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Contraseña incorrecta para el representante. Verifica tu clave o solicítala al Administrador Maestro.',
        };
      }
    }

    // Static fallback representative users
    const representativeUsers: { [key: string]: { name: string; region: string; canPrint: boolean } } = {
      'rep.cdmx': { name: 'Carlos Mendoza', region: 'México Centro (CDMX)', canPrint: true },
      'rep.mty': { name: 'Roberto Garza', region: 'México Norte (Monterrey)', canPrint: false },
      'rep.gdl': { name: 'Alvaro Santos', region: 'México Occidente (Guadalajara)', canPrint: true },
      'rep.texas': { name: 'Carlos Otero', region: 'USA (Texas)', canPrint: true },
    };

    if (representativeUsers[cleanUser]) {
      if (
        cleanPassNormalized === 'inbroficial123' ||
        cleanPassNormalized === 'rep123' ||
        cleanPass === 'INBR oficial 1 2 3' ||
        cleanPass === '1234' ||
        cleanPassNormalized === 'inbr2026'
      ) {
        const repData = representativeUsers[cleanUser];
        const repUser: AuthUser = {
          name: repData.name,
          email: `${cleanUser}@inbr-registry.org`,
          role: 'REPRESENTATIVE',
          region: repData.region,
          canPrint: repData.canPrint,
        };
        setUser(repUser);
        setSessionExpiredDueToInactivity(false);
        const now = Date.now();

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
            sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(repUser));
            if (!rememberSession) {
              sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(repUser));
            }
          } catch (e) {}
        }

        setRemainingInactivitySeconds(15 * 60);
        return { success: true };
      }
    }

    // REGISTERED OWNER AUTHENTICATION:
    // If username begins with 'propietario', 'dueno', 'owner' or matches registered credentials
    const isOwnerLoginPattern = 
      cleanUser.startsWith('propietario') ||
      cleanUser.startsWith('dueno') ||
      cleanUser.startsWith('owner') ||
      cleanUser.startsWith('inbr-') ||
      cleanUser.startsWith('f11');

    const isOwnerValidPassword =
      cleanPassNormalized === 'inbroficial123' ||
      cleanPassNormalized === 'inbr2026' ||
      cleanPass === '1234' ||
      cleanPassNormalized === 'owner' ||
      cleanPassNormalized === 'propietario' ||
      cleanPassNormalized === cleanUser;

    if (isOwnerLoginPattern && isOwnerValidPassword) {
      const ownerUser: AuthUser = {
        name: username.replace(/^(propietario|dueno|owner)[._\s-]*/i, '').trim() || 'Propietario Registrado INBR',
        email: `${cleanUser}@propietarios.inbr.org`,
        role: 'OWNER',
        region: 'Propietario Titular Acreditado',
        canPrint: false, // General print restricted to Master & authorized Reps
        ownedDogs: [cleanUser.toUpperCase()],
      };

      setUser(ownerUser);
      setSessionExpiredDueToInactivity(false);
      const now = Date.now();

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
          sessionStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
          if (rememberSession) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(ownerUser));
            sessionStorage.removeItem(AUTH_SESSION_KEY);
          } else {
            sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(ownerUser));
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        } catch (e) {}
      }

      setRemainingInactivitySeconds(15 * 60);
      return { success: true };
    }

    return {
      success: false,
      error: 'Usuario o contraseña no autorizados. Verifica tus credenciales oficiales de acceso.',
    };
  };

  const logout = () => {
    setUser(null);
    setSessionExpiredDueToInactivity(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
        sessionStorage.removeItem(AUTH_LAST_ACTIVITY_KEY);
      } catch (e) {}
    }
    supabase.auth.signOut().catch(() => {});
    setRemainingInactivitySeconds(15 * 60);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        sessionExpiredDueToInactivity,
        clearInactivityNotice,
        remainingInactivitySeconds,
        resetInactivityTimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

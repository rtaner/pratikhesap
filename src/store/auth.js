import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
    user: null,
    profile: null,
    business: null,
    plan: null,
    isLoading: true,

    initialize: async () => {
        set({ isLoading: true });

        // Get Session
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        if (user) {
            await get().countinueFetchProfile(user);
        } else {
            set({ user: null, profile: null, business: null, isLoading: false });
        }

        // Listen to changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            if (currentUser?.id !== get().user?.id) {
                if (currentUser) {
                    await get().countinueFetchProfile(currentUser);
                } else {
                    set({ user: null, profile: null, business: null, isLoading: false });
                }
            }
        });
    },

    countinueFetchProfile: async (user) => {
        // Get Profile & Business
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        let business = null;
        let plan = null;

        if (profile?.business_id) {
            const { data: businessData } = await supabase
                .from('businesses')
                .select('*, plans(*)')
                .eq('id', profile.business_id)
                .single();

            business = businessData;
            plan = businessData?.plans;
        }

        set({ user, profile, business, plan, isLoading: false });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, business: null, plan: null });
    }
}));

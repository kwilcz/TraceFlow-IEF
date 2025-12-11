import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionStoreState<T> {
    data: T | null;
    setData: (data: T | null) => void;
}

const useSessionStore = <T>(key: string) => {
    return create<SessionStoreState<T>>()(
        persist(
            (set) => ({
                data: null,
                setData: (data) => set({ data }),
            }),
            {
                name: key,
                storage: createJSONStorage(() => sessionStorage),
            }
        )
    );
};

export default useSessionStore;
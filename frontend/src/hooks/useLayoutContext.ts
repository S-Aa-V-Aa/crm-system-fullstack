import { useOutletContext } from 'react-router-dom';
import type { User } from '../types';

export interface LayoutContext {
  currentUser: User | null;
}

export const useLayoutContext = () => {
  return useOutletContext<LayoutContext>();
};
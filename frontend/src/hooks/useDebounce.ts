import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Запускаємо таймер на delay мілісекунд
    const timerId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Якщо value змінилося раніше, ніж минув час — скасовуємо попередній таймер
    return () => {
      window.clearTimeout(timerId);
    };
  }, [value, delay]);

  return debouncedValue;
}
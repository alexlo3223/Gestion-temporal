import { useEffect, useState } from 'react';

/**
 * La hora actual, refrescada cada `intervalMs`. Úsalo solo en el componente que la
 * necesita (reloj, cuenta atrás) para no repintar la app entera cada segundo.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** La hora actual, refrescada al cambiar de minuto. Para vistas con horas y "ahora". */
export function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id = 0;
    const schedule = () => {
      const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
      id = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msToNextMinute);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, []);
  return now;
}

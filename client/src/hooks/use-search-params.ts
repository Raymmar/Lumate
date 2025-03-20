import { useLocation } from "wouter";

export function useSearchParams() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  return [searchParams];
}

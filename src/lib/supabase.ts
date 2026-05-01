// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = (sbUrl: string, sbSecret: string) =>
  createClient(sbUrl, sbSecret!);

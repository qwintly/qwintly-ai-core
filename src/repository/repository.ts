import { supabase } from "../lib/supabase.js";
export class DBRepository {
  public client: any;
  public constructor(sbEndpoint: string, sbSecret: string) {
    this.client = supabase(sbEndpoint, sbSecret);
  }
}

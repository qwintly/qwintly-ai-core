import { DBRepository } from "./repository.js";

export class ProjectOpsRepository extends DBRepository {
  /*
   * Table: project_operations
   * Use: Fetch queued project operations
   */

  async fetchProjectOperations(genId: string) {
    const supabase = this.client;

    const { data, error } = await supabase
      .from("project_operations")
      .select("id, operation, route")
      .eq("gen_id", genId)
      .eq("status", "queued")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  }

  /*
   * Table: project_operations
   * Use: Update project operation status
   */
  async markOperationsApplied(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) return;

    const supabase = this.client;
    const { error } = await supabase
      .from("project_operations")
      .update({ status: "applied" })
      .in("id", ids);

    if (error) throw error;
  }

}

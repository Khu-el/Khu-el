// Staff-console database calls that src/data/api.ts does not provide.
//
// Creating a catalog row uses a plain INSERT rather than api.ts's staffUpsert:
// an upsert keyed on `id` would silently overwrite an existing row whose id
// happens to match a new title's slug (for example one another editor created
// a moment ago). An insert refuses that with a unique violation (23505), which
// the console turns into "that ID is taken". Edits still go through
// staffUpsert. RLS (private.is_content_editor) is the real gate either way.
import { requireClient } from '../supabase';

export type CatalogTable = 'learning_tracks' | 'learning_modules' | 'resources' | 'opportunity_pathways';

/** Inserts a new catalog row; throws the Supabase error (code 23505 when the id already exists). */
export async function staffInsert(table: CatalogTable, row: { id: string } & Record<string, unknown>): Promise<void> {
  const res = await requireClient().from(table).insert(row);
  if (res.error) throw res.error;
}

/**
 * Flips only the visibility column (is_published, or is_active for pathways).
 * An UPDATE of one column, so a publish toggle never writes back a stale copy
 * of the row's other fields and never re-creates a row another editor deleted.
 * Throws when no row was changed (it no longer exists, or RLS refused it).
 */
export async function staffSetVisibility(table: CatalogTable, id: string, column: 'is_published' | 'is_active', value: boolean): Promise<void> {
  const res = await requireClient().from(table).update({ [column]: value }).eq('id', id).select('id');
  if (res.error) throw res.error;
  if (!res.data || res.data.length === 0) {
    throw { message: 'Nothing was changed. The item may have been deleted, or your role may not allow this. Reload and try again.' };
  }
}

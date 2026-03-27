import { ilike, or, asc, desc, type SQL, type Column } from 'drizzle-orm';

export interface TableParams {
	page: number;
	limit: number;
	search: string;
	sortBy: string;
	sortDir: 'asc' | 'desc';
	filter: string;
}

export interface TableMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	search: string;
	sortBy: string;
	sortDir: 'asc' | 'desc';
	filter: string;
}

export function parseTableParams(url: URL, defaults?: Partial<TableParams>): TableParams {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const limit = Math.min(
		100,
		Math.max(1, parseInt(url.searchParams.get('limit') ?? String(defaults?.limit ?? 25)))
	);
	const search = url.searchParams.get('search')?.trim() ?? '';
	const sortBy = url.searchParams.get('sortBy') ?? defaults?.sortBy ?? '';
	const sortDir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
	const filter = url.searchParams.get('filter') ?? defaults?.filter ?? '';
	return { page, limit, search, sortBy, sortDir, filter };
}

export function buildSearchFilter(search: string, columns: Column[]): SQL | undefined {
	if (!search) return undefined;
	const pattern = `%${search}%`;
	const conditions = columns.map((col) => ilike(col, pattern));
	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return or(...conditions);
}

export function buildOrderBy(
	sortBy: string,
	sortDir: 'asc' | 'desc',
	columnMap: Record<string, Column | SQL>,
	fallback: Column | SQL
): SQL {
	const col = columnMap[sortBy] ?? fallback;
	return sortDir === 'asc' ? asc(col) : desc(col);
}

export function buildTableMeta(params: TableParams, total: number): TableMeta {
	return {
		...params,
		total,
		totalPages: Math.max(1, Math.ceil(total / params.limit))
	};
}

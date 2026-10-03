/**
 * Leitor de CSV (RFC 4180): campos entre aspas podem ter vírgulas, quebras de linha e aspas
 * duplicadas (""). As reviews do Letterboxd usam tudo isso.
 */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

	for (let i = 0; i < input.length; i++) {
		const char = input[i];
		if (quoted) {
			if (char === '"') {
				if (input[i + 1] === '"') {
					field += '"';
					i++;
				} else quoted = false;
			} else field += char;
		} else if (char === '"') quoted = true;
		else if (char === ',') {
			row.push(field);
			field = '';
		} else if (char === '\n' || char === '\r') {
			if (char === '\r' && input[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += char;
	}
	if (field || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

/** Linhas → objetos pelo cabeçalho (primeira linha); ignora linhas vazias. */
export function csvRecords(rows: string[][]): Record<string, string>[] {
	const [header, ...data] = rows;
	if (!header) return [];
	return data
		.filter((row) => row.some((cell) => cell.trim()))
		.map((row) => Object.fromEntries(header.map((name, i) => [name.trim(), row[i] ?? ''])));
}

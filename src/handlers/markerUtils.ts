/**
 * Shared helpers for stripping optional feature code from generated template files.
 *
 * Optional blocks are delimited with paired line comments, e.g.:
 *   // start grpc
 *   ...code...
 *   // end grpc
 *
 * `removeAllMarkedBlocks` removes every non-overlapping pair (marker lines
 * included) so a single marker vocabulary can be reused across many files.
 */

/**
 * Remove every block delimited by `startMarker` ... `endMarker` (inclusive of
 * the marker lines). Handles multiple, non-overlapping blocks in one pass.
 */
export const removeAllMarkedBlocks = (
    content: string,
    startMarker: string,
    endMarker: string
): string => {
    const lines = content.split('\n');
    const result: string[] = [];
    let inside = false;

    for (const line of lines) {
        if (!inside && line.includes(startMarker)) {
            inside = true;
            continue;
        }

        if (inside && line.includes(endMarker)) {
            inside = false;
            continue;
        }

        if (!inside) {
            result.push(line);
        }
    }

    return result.join('\n');
};

/**
 * Strip a shared `createLogger`/`log` binding once it is no longer referenced.
 *
 * The error handlers only use `log` inside their socket/cron branches. When
 * those branches are removed the binding would otherwise trip `noUnusedLocals`,
 * so remove both the import and the `const log = createLogger(...)` declaration
 * if nothing else in the file still reads `log`.
 */
export const pruneUnusedLogger = (content: string): string => {
    const lines = content.split('\n');

    const isLogDeclaration = (line: string) => /const\s+log\s*=\s*createLogger\(/.test(line);
    const declaresLog = lines.some(isLogDeclaration);
    if (!declaresLog) return content;

    // Match real usage (`log.error(...)`) rather than the bare word so comments
    // like "log it and swallow" don't count as a reference.
    const stillUsesLog = lines.some((line) => /\blog\s*\./.test(line) && !isLogDeclaration(line));
    if (stillUsesLog) return content;

    const isLoggerImport = (line: string) =>
        line.includes('createLogger') && (line.includes('import') || line.includes('require'));

    return lines.filter((line) => !isLogDeclaration(line) && !isLoggerImport(line)).join('\n');
};

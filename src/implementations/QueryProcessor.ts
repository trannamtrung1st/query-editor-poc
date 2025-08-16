import type { IRange } from "monaco-editor";


export class QueryProcessor {
    private _query: string;
    private _lines: string[];

    constructor(query: string) {
        this._query = query;
        this._lines = query.split('\n');
    }

    get query() {
        return this._query;
    }

    replace(range: IRange, text: string) {
        const startLine = range.startLineNumber - 1;
        const startColumn = range.startColumn - 1;
        const endColumn = range.endColumn - 1;
        this._lines[startLine] = this._lines[startLine].substring(0, startColumn) + text + this._lines[startLine].substring(endColumn);
        this._query = this._lines.join('\n');
        return this._query;
    }

}

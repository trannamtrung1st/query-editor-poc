import { Editor } from "@monaco-editor/react";
import { useRef } from "react";
import { editor as MonacoEditor, type IRange } from 'monaco-editor';
import './HiddenConvertEditor.scss';
import type { IRawQuerySourceVM } from "../models/IRawQuerySource";
import { APP_DECORATION_PREFIX } from "../constants";

export interface IHiddenConvertCommand {
  decorationsMap: { [key: string]: MonacoEditor.IModelDecoration };
  sources: IRawQuerySourceVM[];
  query: string;
}

export interface IHiddenConvertResult {
  query: string;
  sourceRangeMap: { [key: string]: IRange };
}

export interface IHiddenConvertEditorProps {
  parentRef: {
    hiddenConvert: (command: IHiddenConvertCommand) => Promise<IHiddenConvertResult>;
  };
}

const HiddenConvertEditor: React.FC<IHiddenConvertEditorProps> = ({ parentRef }) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor>(null);

  const handleEditorDidMount = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }

  parentRef.hiddenConvert = async (command: IHiddenConvertCommand): Promise<IHiddenConvertResult> => {
    const { decorationsMap, sources, query } = command;
    const editor = editorRef.current!;
    const model = editor.getModel()!;
    const oldDecorations = model.getAllDecorations();
    editor.setValue(query);
    editor.removeDecorations(oldDecorations.map(d => d.id));
    editor.createDecorationsCollection(Object.values(decorationsMap).map(d => ({
      ...d,
      options: {
        ...d.options,
        stickiness: MonacoEditor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
      }
    })));

    const edits: MonacoEditor.IIdentifiedSingleEditOperation[] = [];
    const newDecorationSourceMap: { [key: string]: IRawQuerySourceVM } = {};
    const sourceRangeMap: { [key: string]: IRange } = {};

    for (const source of sources) {
      const decorationRange = decorationsMap[source.decorationIds[0]].range;
      const newDecoration = model.getDecorationsInRange(decorationRange)
        ?.find(d => d.options.inlineClassName?.startsWith(APP_DECORATION_PREFIX)
          && d.options.after?.attachedData === source);
      const querySource = newDecoration?.options.after?.attachedData as IRawQuerySourceVM;

      if (newDecoration && querySource)
        newDecorationSourceMap[newDecoration.id] = querySource;

      edits.push({
        range: decorationRange,
        text: `"{{${source.markup}}}"`
      });
    }

    editor.executeEdits('hidden-convert', edits);
    for (const [decorationId, querySource] of Object.entries(newDecorationSourceMap)) {
      const decorationRange = model.getDecorationRange(decorationId);
      if (decorationRange) sourceRangeMap[querySource.markup] = decorationRange;
    }

    const currentQuery = model.getValue();
    return {
      query: currentQuery,
      sourceRangeMap
    };
  };

  return (
    <Editor
      loading=""
      className="hidden-convert-editor"
      height={0}
      width={0}
      defaultLanguage="sql"
      theme="vs-dark" // [IMPORTANT] must same with the main editor
      onMount={handleEditorDidMount}
    />
  )
}

export default HiddenConvertEditor;

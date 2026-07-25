import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  HighlightStyle,
  LanguageDescription,
  syntaxHighlighting,
  type LanguageSupport,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const sourceLensTheme: Extension = [
  EditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "transparent",
      color: "var(--foreground)",
      fontSize: "13px",
    },
    "&.cm-focused": {
      outline: "2px solid color-mix(in oklab, var(--ring) 72%, transparent)",
      outlineOffset: "-2px",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-code)",
      lineHeight: "1.7",
      overflow: "auto",
      overscrollBehavior: "contain",
    },
    ".cm-content": {
      minHeight: "100%",
      padding: "18px 0 96px",
      caretColor: "transparent",
    },
    ".cm-line": {
      padding: "0 24px",
    },
    ".cm-gutters": {
      minWidth: "52px",
      borderRight: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
      backgroundColor:
        "color-mix(in oklab, var(--surface-sunken) 82%, transparent)",
      color: "color-mix(in oklab, var(--muted-foreground) 72%, transparent)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "42px",
      padding: "0 12px 0 8px",
      fontVariantNumeric: "tabular-nums",
    },
    ".cm-foldGutter .cm-gutterElement": {
      color: "var(--muted-foreground)",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "transparent",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection":
      {
        backgroundColor:
          "color-mix(in oklab, var(--primary) 24%, transparent)",
      },
    ".cm-searchMatch": {
      backgroundColor:
        "color-mix(in oklab, var(--status-warning) 24%, transparent)",
      outline:
        "1px solid color-mix(in oklab, var(--status-warning) 52%, transparent)",
    },
    ".cm-panels": {
      borderColor: "var(--border)",
      backgroundColor: "var(--chrome)",
      color: "var(--foreground)",
    },
  }),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: [tags.comment, tags.docComment], color: "var(--syntax-comment)" },
      {
        tag: [tags.keyword, tags.modifier, tags.controlKeyword],
        color: "var(--syntax-keyword)",
        fontWeight: "600",
      },
      {
        tag: [tags.string, tags.special(tags.string), tags.regexp],
        color: "var(--syntax-string)",
      },
      {
        tag: [tags.number, tags.bool, tags.null],
        color: "var(--syntax-number)",
      },
      {
        tag: [tags.typeName, tags.className, tags.namespace],
        color: "var(--syntax-type)",
      },
      {
        tag: [tags.function(tags.variableName), tags.labelName],
        color: "var(--syntax-function)",
      },
      {
        tag: [tags.definition(tags.variableName), tags.propertyName],
        color: "var(--syntax-property)",
      },
      {
        tag: [tags.operator, tags.punctuation, tags.bracket],
        color: "var(--syntax-punctuation)",
      },
      { tag: [tags.meta, tags.annotation], color: "var(--status-special)" },
      { tag: tags.invalid, color: "var(--status-danger)" },
    ]),
  ),
];

export function sourceLanguageName(path: string): string {
  return LanguageDescription.matchFilename(languages, path)?.name ?? "Plain text";
}

export type SourceCodeViewProps = {
  value: string;
  path: string;
};

export function SourceCodeView({ value, path }: SourceCodeViewProps) {
  const description = useMemo(
    () => LanguageDescription.matchFilename(languages, path),
    [path],
  );
  const [language, setLanguage] = useState<LanguageSupport | null>(
    description?.support ?? null,
  );

  useEffect(() => {
    let active = true;
    setLanguage(description?.support ?? null);
    if (!description || description.support) {
      return () => {
        active = false;
      };
    }
    void description.load().then((support) => {
      if (active) setLanguage(support);
    });
    return () => {
      active = false;
    };
  }, [description]);

  const extensions = useMemo<Extension[]>(
    () => [
      sourceLensTheme,
      EditorView.contentAttributes.of({
        "aria-label": `Source code: ${path}`,
        spellcheck: "false",
        translate: "no",
      }),
      ...(language ? [language] : []),
    ],
    [language, path],
  );

  return (
    <CodeMirror
      value={value}
      height="100%"
      width="100%"
      theme="none"
      readOnly
      editable={false}
      indentWithTab={false}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: false,
        foldGutter: true,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: false,
        bracketMatching: true,
        closeBrackets: false,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightActiveLine: false,
        highlightSelectionMatches: true,
        closeBracketsKeymap: false,
        completionKeymap: false,
        history: false,
        historyKeymap: false,
        lintKeymap: false,
        tabSize: 2,
      }}
      extensions={extensions}
      className="h-full min-h-0 overflow-hidden"
    />
  );
}

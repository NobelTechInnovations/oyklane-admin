"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  AutoLink,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  HorizontalLine,
  Alignment,
  PasteFromOffice,
  RemoveFormat,
  SourceEditing,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageInsertViaUrl,
  ImageInsert,
  MediaEmbed,
  Autoformat,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { uploadImage } from "@/lib/uploads";

// CKEditor 5 needs a licence key from 49 on: a commercial/free-plan key from
// ckeditor.com (NEXT_PUBLIC_CKEDITOR_LICENSE_KEY), else the GPL one.
const LICENSE_KEY = process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY || "GPL";

/** Pasted / dropped images go to the store's Files library. */
function uploadAdapter(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) => ({
    upload: async () => {
      const file = await loader.file;
      const row = await uploadImage(file);
      return { default: row.url };
    },
    abort: () => {},
  });
}

/** The blog post body: headings, lists, links, images, tables — saved as
 * HTML, which the storefront shows as written. */
export default function CkBlogEditor({ value, onChange, onReady }) {
  return (
    <div className="oy-ck">
      <CKEditor
        editor={ClassicEditor}
        data={value || ""}
        config={{
          licenseKey: LICENSE_KEY,
          plugins: [Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough, Link, AutoLink, List, BlockQuote, Table, TableToolbar, HorizontalLine, Alignment, PasteFromOffice, RemoveFormat, SourceEditing, Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload, ImageInsertViaUrl, ImageInsert, MediaEmbed, Autoformat],
          extraPlugins: [uploadAdapter],
          toolbar: {
            items: ["heading", "|", "bold", "italic", "underline", "strikethrough", "link", "|", "bulletedList", "numberedList", "blockQuote", "|", "alignment", "insertImage", "insertTable", "mediaEmbed", "horizontalLine", "|", "removeFormat", "sourceEditing", "|", "undo", "redo"],
            shouldNotGroupWhenFull: false,
          },
          heading: {
            options: [
              { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
              { model: "heading2", view: "h2", title: "Heading", class: "ck-heading_heading2" },
              { model: "heading3", view: "h3", title: "Subheading", class: "ck-heading_heading3" },
              { model: "heading4", view: "h4", title: "Small heading", class: "ck-heading_heading4" },
            ],
          },
          image: { toolbar: ["imageTextAlternative", "toggleImageCaption", "|", "imageStyle:inline", "imageStyle:block", "imageStyle:side"] },
          table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
          link: { addTargetToExternalLinks: true, defaultProtocol: "https://" },
          mediaEmbed: { previewsInData: true },
          placeholder: "Start writing…",
        }}
        onReady={(editor) => onReady?.(editor)}
        onChange={(_, editor) => onChange?.(editor.getData())}
      />
    </div>
  );
}

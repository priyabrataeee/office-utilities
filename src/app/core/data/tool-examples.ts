export interface ToolExample {
  readonly title: string;
  readonly steps: readonly string[];
  readonly check: string;
  readonly sample?: { readonly href: string; readonly label: string };
}

export const TOOL_EXAMPLES: Record<string, ToolExample> = {
  'docx-viewer': {
    title: 'Open a meeting brief without Word',
    sample: { href: '/samples/meeting-brief.docx', label: 'Download the sample DOCX' },
    steps: ['Download the fictional meeting brief and choose it in the viewer.', 'Find the heading, the two action items and the Owner / Action table.', 'Use your browser find command to locate Jordan, then try the viewer zoom and print controls.'],
    check: 'Check that the text and table remain readable. This sample demonstrates basic document structure, not exact Microsoft Word pagination or complex floating objects.',
  },
  'excel-to-csv': {
    title: 'Export dates without swapping day and month',
    sample: { href: '/samples/date-export.xlsx', label: 'Download the sample workbook' },
    steps: ['Open the workbook and select the Orders sheet.', 'Export the sheet, then inspect the CSV in a text viewer before opening it in Excel.', 'Check the row for order 00123. Its intended date is 9 March 2026; the next row is 3 September 2026.'],
    check: 'The workbook also includes ISO date text for comparison. CSV contains no cell-type metadata. A spreadsheet can reinterpret dates and remove leading zeros when reopening it; import the identifier and ISO columns as text.',
  },
  'certificate-generator': {
    title: 'Make one completion certificate',
    steps: ['Choose Completion and enter Jordan Reyes as the fictional recipient.', 'Enter Browser Document Workshop as the award reason, add an issuing organisation and choose the date.', 'Export the certificate and check the recipient, date and signatory labels. Change the recipient before exporting the next certificate.'],
    check: 'Certificates are generated individually. There is no CSV batch import, public verification registry or automatic proof that somebody completed a course. Keep your own award records.',
  },
  'merge-pdf': {
    title: 'Combine pages and check the limitations',
    sample: { href: '/samples/bookmarked-brief.pdf', label: 'Download the bookmarked PDF' },
    steps: ['Add the sample PDF twice to make a four-page document.', 'Merge and check that the two source pages repeat in the selected order.', 'Open the result in a PDF viewer and inspect its bookmark panel.'],
    check: 'Page content and page sizes are copied. The sample has an Overview bookmark, but the merged result does not transfer it. Interactive forms and existing digital signatures are also not preserved.',
  },
  'compress-pdf': {
    title: 'Compare a scan with a text document',
    sample: { href: '/samples/bookmarked-brief.pdf', label: 'Download a text-based PDF' },
    steps: ['Open the sample PDF and choose Balanced compression.', 'Compare the resulting size with the original and verify that the text remains selectable.', 'For comparison, try an image-only scan that you are allowed to use. Check small print after compression.'],
    check: 'The text sample is copied rather than rasterised and may not shrink. The original is offered if the result is not smaller. The compressor does not recompress images on pages with detected text, including OCR scans.',
  },
  'file-size-analyzer': {
    title: 'Inspect a presentation archive',
    sample: { href: '/samples/presentation-example.pptx', label: 'Download the sample presentation' },
    steps: ['Open the fictional two-slide presentation in this analyzer.', 'Compare the media group with slide XML and other archive entries.', 'Use the listed entry sizes to identify stored assets before editing the presentation in PowerPoint.'],
    check: 'Archive entry sizes are measurements. PDF page results use heuristic drawing scores instead and cannot tell you the actual bytes occupied by each page or image.',
  },
  'diagram-studio': {
    title: 'Build a simple approval diagram',
    steps: ['Place a start shape, a decision and two outcome shapes.', 'Connect the decision to each outcome and label the branches Yes and No.', 'Export SVG for a document and save JSON if you want to edit the diagram later.'],
    check: 'SVG and PNG are presentation exports. Use Diagram Studio JSON for an editable backup.',
  },
  'flowchart-maker': {
    title: 'Adapt the order approval template',
    steps: ['Start with the Order received and In stock? example.', 'Change the decision to Payment received? and rename both outcomes.', 'Follow each Yes and No connector from the decision to an ending.'],
    check: 'Every decision should have labelled outcomes. The editor does not validate business logic for you.',
  },
  'uml-diagram': {
    title: 'Document a small order domain',
    steps: ['Inspect the Order, Customer, OrderLine and Payable example.', 'Replace attributes and method names with those in your own model.', 'Review relationship labels and arrow types before exporting.'],
    check: 'The editor draws diagrams; it does not compile UML, generate code or validate multiplicity and composition rules.',
  },
  'er-diagram': {
    title: 'Sketch a shop database',
    steps: ['Start with the shop-schema template and identify the customer and order records.', 'Add the fields you need and label primary and foreign keys explicitly.', 'Check every relationship against the intended database before exporting.'],
    check: 'This is a visual schema sketch. There is no database connection, SQL import or automatic validation of keys.',
  },
  'aws-architecture-diagram': {
    title: 'Explain one request through your system',
    steps: ['Use the cloud template as a starting point.', 'Rename components to match your deployment and connect the request path.', 'Label network boundaries and distinguish persistent storage from compute.'],
    check: 'Symbols represent your explanation; the editor does not discover AWS resources or verify security settings.',
  },
  'network-diagram': {
    title: 'Map a small office network',
    steps: ['Open the network template and identify the connection to the outside network.', 'Rename the network devices and add the endpoints you want to document.', 'Label links and check that each endpoint has the intended connection.'],
    check: 'This is manual documentation. No network scan is performed and no connectivity is tested.',
  },
  'mind-map': {
    title: 'Plan a product launch',
    steps: ['Use the launch template and rename the central topic.', 'Edit the marketing, engineering and support branches to match your work.', 'Add one concrete task to each branch and export a snapshot for discussion.'],
    check: 'Branches organise ideas visually. They do not create tracked tasks or enforce dependencies.',
  },
  'org-chart': {
    title: 'Adapt the starter reporting hierarchy',
    steps: ['Replace the fictional names in the organisation template.', 'Add a person by placing a new shape, editing its label and connecting it to a manager.', 'Move nodes with grid and snap enabled, then review reporting lines before export.'],
    check: 'Additional nodes are positioned manually. CSV import and automatic tree layout are not supported; use saved JSON for editable imports.',
  },
  'process-diagram': {
    title: 'Describe a handoff between teams',
    steps: ['Start with the process template and rename the stages.', 'Label who owns each stage and what must be handed to the next team.', 'Trace both the usual path and an exception path before exporting.'],
    check: 'The diagram communicates a process. It does not run a workflow or check BPMN compliance.',
  },
};

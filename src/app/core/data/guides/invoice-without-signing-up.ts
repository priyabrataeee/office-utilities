import type { GuideDefinition } from '../../models/guide.model';

export const guide: GuideDefinition = {
  slug: 'how-to-make-an-invoice-without-signing-up',
  title: 'How to make an invoice without signing up for anything',
  summary:
    'What an invoice has to contain, why most free invoice generators ask for an account, and how to produce a numbered PDF invoice without handing over your client list.',
  answer:
    'Fill in the fields and download the PDF. An invoice needs a unique number, both parties’ details, a date, an itemised list, the total and payment instructions — none of which requires an account. Generators ask for one because your invoices reveal who your clients are and what you charge them.',
  keywords: [
    'free invoice generator no sign up',
    'make an invoice without an account',
    'invoice template pdf',
    'what to put on an invoice',
    'freelance invoice',
  ],
  tools: ['invoice-generator', 'quotation-generator', 'docx-to-pdf'],
  published: '2026-09-06',
  body: [
    {
      type: 'p',
      text: 'Invoicing is a solved problem that keeps being sold back to you. The document itself is simple — a list, some totals, and instructions for paying — and there is no technical reason it should require registration, a subscription, or a trial that quietly becomes a monthly charge.',
    },
    {
      type: 'p',
      text: 'This guide covers what actually has to appear on an invoice, the fields people get wrong, and why the sign-up wall is so common on a document this ordinary.',
    },

    { type: 'h2', text: 'What an invoice has to contain' },
    {
      type: 'p',
      text: 'Requirements vary by country, and if you are registered for a sales tax your tax authority will have its own list. Setting that aside, an invoice that gets paid without a follow-up email contains all of the following.',
    },
    {
      type: 'ul',
      items: [
        'The word “Invoice”. Not “Statement”, not “Summary”. Accounts payable systems and the people who run them sort by document type, and an unlabelled document gets set aside.',
        'A unique invoice number. This is the one field with no sensible default, and it is covered below.',
        'The issue date, and separately the due date. Payment terms without a date to count from are an argument waiting to happen.',
        'Your full legal or trading name, address, and any tax or company registration number you are required to show.',
        'The client’s name and address, and their reference or purchase-order number if they gave you one. A missing PO number is the most common reason an invoice is returned rather than paid.',
        'An itemised list: description, quantity, unit price, line total. One line reading “Consulting — 4,000” invites a query; five lines that add up to 4,000 do not.',
        'The subtotal, any tax, and the final amount due, with the currency stated explicitly rather than implied by a symbol.',
        'Payment instructions — account details, or a note saying the invoice was submitted through a portal.',
      ],
    },
    {
      type: 'p',
      text: 'That is the whole document. Everything else is presentation, and presentation has never been why an invoice went unpaid.',
    },

    { type: 'h2', text: 'Invoice numbers are the field worth thinking about' },
    {
      type: 'p',
      text: 'Numbers must be unique and should be sequential, because that is what makes a set of invoices auditable. Two invoices sharing a number is a real bookkeeping problem, and a gap in the sequence is a question you will eventually be asked to answer.',
    },
    {
      type: 'p',
      text: 'A dated scheme — 2026-014, or ACME-2026-03 — stays readable years later and makes gaps obvious at a glance. Avoid starting at 1 if you would rather not advertise that this is your first invoice; starting at 100 is common and harmless.',
    },
    {
      type: 'note',
      title: 'Nobody else is tracking your sequence',
      text: 'A tool that runs entirely in your browser cannot remember which number you used last month, because it deliberately keeps nothing between visits. Keep the sequence wherever you keep the invoices themselves — a folder, a spreadsheet, or the accounting software you file them into.',
    },

    { type: 'h2', text: 'Why so many invoice generators want an account' },
    {
      type: 'p',
      text: 'Turning a form into a PDF is not difficult, and it has not been difficult for twenty years. The account is not there for the sake of the invoice.',
    },
    {
      type: 'p',
      text: 'An invoice is an unusually rich document to hold. It names a business, names its client, states what was sold and for how much, and does so on a regular schedule. A few dozen of them describe a company’s revenue, its customer list and its pricing — commercially sensitive information most people would never email to a stranger, handed over willingly because a form asked politely.',
    },
    {
      type: 'p',
      text: 'Some of those services are proper accounting products where holding the data is the entire point, and paying for one is a sensible choice. The ones worth being wary of are the free generators with no stated business model at all: with no subscription and no advertising, the data is the only thing left to sell.',
    },
    {
      type: 'tool',
      toolId: 'invoice-generator',
      text: 'Fill in the fields and download the PDF. No account, and the details never leave your browser.',
    },

    { type: 'h2', text: 'Quotes, and the difference that matters' },
    {
      type: 'p',
      text: 'A quotation is an offer. An invoice is a demand for payment. They look similar and are treated very differently, both by accounting systems and by the law in most places, so sending a document headed “Invoice” for work that has not been agreed is at best confusing.',
    },
    {
      type: 'p',
      text: 'The usual sequence is a [quotation](/generate/quotation-generator) first, acceptance in writing, then an invoice quoting that quotation’s number once the work is done. That single reference is what turns a disputed invoice into a short conversation.',
    },

    { type: 'h2', text: 'Send a PDF, not a word processor file' },
    {
      type: 'p',
      text: 'A PDF renders identically for the recipient, cannot be edited by accident, and will not reflow if their software substitutes a font. It is also the format most accounts payable systems expect, and some will reject anything else outright.',
    },
    {
      type: 'p',
      text: 'If you keep invoices as Word documents for your own records, [converting to PDF](/word/word-to-pdf) is the right final step. Keep the editable original — you will want it the first time a client asks for a correction.',
    },
    {
      type: 'note',
      tone: 'warn',
      title: 'Check the metadata before sending',
      text: 'A PDF exported from a word processor usually carries the author name, the original file name and the software that produced it. If that file was named after the client you copied the template from, the name travels with it. See [removing metadata before sharing](/guides/how-to-remove-metadata-from-a-document-before-sharing).',
    },

    { type: 'h2', text: 'Getting paid faster' },
    {
      type: 'p',
      text: 'Most late payment is administrative rather than deliberate. These are the changes that reliably shorten the wait.',
    },
    {
      type: 'ol',
      items: [
        'Invoice on the day the work finishes. Payment terms run from the invoice date, so a week of delay is a week added to the wait.',
        'Send it to accounts payable, not only to your contact. Your contact has to forward it, and forwarding is the step that gets forgotten.',
        'Put the invoice number and the amount in the email subject line, so the email can be found again in the mailbox that has to find it.',
        'State the due date as an actual date. “Due 6 October 2026” gets acted on; “Net 30” has to be calculated first.',
        'Include the purchase-order number if one exists. Without it, many systems cannot route the invoice at all, and nobody will tell you that.',
      ],
    },

    { type: 'h2', text: 'Keeping your own copies' },
    {
      type: 'p',
      text: 'Whatever you use to produce invoices, the copies are your responsibility. Most tax authorities expect records to be kept for several years, and “the free website I used has shut down” is not an accepted answer.',
    },
    {
      type: 'p',
      text: 'Save each PDF into a folder you control, named so it sorts correctly — 2026-014 Acme Ltd rather than invoice, then invoice(1), then invoice(2). This matters more with a browser-based tool rather than less: nothing is being stored on your behalf, which is the entire point, and which makes saving the file the one step you cannot skip.',
    },
  ],
};
